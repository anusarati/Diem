import {
	toActivityEntity,
	toScheduledEventEntity,
} from "../../../data/mappers/model_to_dto";
import type ActivityModel from "../../../data/models/Activity";
import type ActivityHistory from "../../../data/models/ActivityHistory";
import { HistoryWriteService } from "../../../mining";
import { EventStatus } from "../../../types/domain";
import type { ActivityItem, ScheduledActivity } from "../../types";
import {
	currentTimeZone,
	DEFAULT_ACTIVITY_COLOR,
	DEFAULT_ACTIVITY_DURATION,
	DEFAULT_ACTIVITY_PRIORITY,
	DEFAULT_CATEGORY_ID,
	dayRange,
	makeRepositories,
	type RepoBundle,
	resolveCurrentScope,
	weekRange,
	withScopedRepositories,
} from "./repositoryContext";

export interface HomeData {
	activities: ActivityItem[];
	scheduled: ScheduledActivity[];
}

function toActivityItem(
	activity: ActivityModel,
	history: ActivityHistory | null,
): ActivityItem {
	const base = toActivityEntity(activity);
	const predictedStartTime =
		history?.predictedStartTime != null
			? typeof history.predictedStartTime === "string"
				? history.predictedStartTime
				: new Date(history.predictedStartTime).toISOString()
			: undefined;
	return {
		...base,
		completed: history?.wasCompleted ?? false,
		completedDuration: history?.actualDuration ?? undefined,
		predictedStartTime,
	};
}

async function listActivitiesForDateWithRepositories(
	repositories: RepoBundle,
	date: Date,
): Promise<ActivityItem[]> {
	const { start, end } = dayRange(date);
	return listActivitiesForRangeWithRepositories(repositories, start, end);
}

async function listActivitiesForRangeWithRepositories(
	repositories: RepoBundle,
	start: Date,
	end: Date,
): Promise<ActivityItem[]> {
	const historyRows = await repositories.history.listForRange(start, end);
	const out: ActivityItem[] = [];
	for (const history of historyRows) {
		const activity = await repositories.activity.findById(history.activityId);
		if (!activity) continue;
		out.push(toActivityItem(activity, history));
	}
	return out.sort((left, right) => {
		const a = left.predictedStartTime ?? left.createdAt;
		const b = right.predictedStartTime ?? right.createdAt;
		return a.localeCompare(b);
	});
}

async function _listScheduledForDateWithRepositories(
	repositories: RepoBundle,
	date: Date,
): Promise<ScheduledActivity[]> {
	const { start, end } = dayRange(date);
	return listScheduledForRangeWithRepositories(repositories, start, end);
}

async function listScheduledForRangeWithRepositories(
	repositories: RepoBundle,
	start: Date,
	end: Date,
): Promise<ScheduledActivity[]> {
	const rows = await repositories.schedule.listForRange(start, end);
	return rows
		.map(toScheduledEventEntity)
		.sort(
			(left, right) =>
				new Date(left.startTime).getTime() -
				new Date(right.startTime).getTime(),
		);
}

export async function loadHomeData(date: Date): Promise<HomeData> {
	return withScopedRepositories(async (repositories) => {
		const { start, end } = weekRange(date);
		return {
			activities: await listActivitiesForRangeWithRepositories(
				repositories,
				start,
				end,
			),
			scheduled: await listScheduledForRangeWithRepositories(
				repositories,
				start,
				end,
			),
		};
	});
}

export async function observeHomeData(
	date: Date,
	onChange: (data: HomeData) => void,
): Promise<() => void> {
	const { scope } = await resolveCurrentScope();
	const repositories = makeRepositories(scope);
	const { start, end } = weekRange(date);

	let disposed = false;
	let refreshQueued = false;

	const emit = async () => {
		if (disposed || refreshQueued) return;
		refreshQueued = true;
		try {
			const [activities, scheduled] = await Promise.all([
				listActivitiesForRangeWithRepositories(repositories, start, end),
				listScheduledForRangeWithRepositories(repositories, start, end),
			]);
			if (!disposed) onChange({ activities, scheduled });
		} finally {
			refreshQueued = false;
		}
	};

	const historySubscription = repositories.history
		.observeForRange(start, end)
		.subscribe(() => void emit());
	const activitySubscription = repositories.activity
		.observeAll()
		.subscribe(() => void emit());
	const scheduleSubscription = repositories.schedule
		.observeForRange(start, end)
		.subscribe(() => void emit());

	void emit();

	return () => {
		disposed = true;
		historySubscription.unsubscribe();
		activitySubscription.unsubscribe();
		scheduleSubscription.unsubscribe();
	};
}

export async function observeActivitiesForDate(
	date: Date,
	onChange: (activities: ActivityItem[]) => void,
): Promise<() => void> {
	return observeHomeData(date, (data) => {
		onChange(data.activities);
	});
}

export async function getActivitiesForDate(
	date: Date,
): Promise<ActivityItem[]> {
	return withScopedRepositories((repositories) =>
		listActivitiesForDateWithRepositories(repositories, date),
	);
}

export async function getActivitiesForDateRange(
	start: Date,
	end: Date,
): Promise<{ date: string; activities: ActivityItem[] }[]> {
	return withScopedRepositories(async (repositories) => {
		const out: { date: string; activities: ActivityItem[] }[] = [];
		const cur = new Date(start);
		while (cur < end) {
			const key = cur.toISOString().slice(0, 10);
			const activities = await listActivitiesForDateWithRepositories(
				repositories,
				cur,
			);
			out.push({ date: key, activities });
			cur.setDate(cur.getDate() + 1);
		}
		return out;
	});
}

export async function saveActivitiesForDate(
	date: Date,
	activities: ActivityItem[],
): Promise<void> {
	await withScopedRepositories(async (repositories) => {
		const { start, end } = dayRange(date);
		await repositories.history.deleteForRange(start, end);

		for (const item of activities) {
			const activity = await repositories.activity.upsert({
				id: item.id,
				categoryId: item.categoryId,
				name: item.name,
				priority: item.priority,
				defaultDuration: item.defaultDuration,
				isReplaceable: item.isReplaceable,
				color: item.color,
				createdAt: new Date(item.createdAt),
			});

			await repositories.history.create({
				activityId: activity.id,
				predictedStartTime: start,
				predictedDuration: item.defaultDuration,
				actualStartTime: item.completed ? start : undefined,
				actualDuration: item.completedDuration,
				wasCompleted: item.completed,
				wasSkipped: false,
				wasReplaced: false,
				createdAt: new Date(item.createdAt),
			});
		}
	});
}

export async function toggleActivityCompletion(
	date: Date,
	activityId: string,
	options?: { completedDuration?: number },
): Promise<ActivityItem[]> {
	return withScopedRepositories(async (repositories) => {
		const history = await repositories.history.findForActivityOnDate(
			activityId,
			date,
		);

		if (history?.wasCompleted) {
			await repositories.history.update(history.id, {
				wasCompleted: false,
				actualStartTime: null,
				actualDuration: null,
				wasSkipped: false,
				wasReplaced: false,
			});
			const writeService = new HistoryWriteService(repositories.database);
			await writeService.markActivityDirty(activityId);
			return listActivitiesForDateWithRepositories(repositories, date);
		}

		const activity = await repositories.activity.findById(activityId);
		const predictedStartTime =
			history?.predictedStartTime ?? dayRange(date).start;
		const predictedDuration =
			history?.predictedDuration ??
			activity?.defaultDuration ??
			DEFAULT_ACTIVITY_DURATION;
		const actualDuration =
			options?.completedDuration ??
			history?.predictedDuration ??
			predictedDuration;

		const writeService = new HistoryWriteService(repositories.database);
		await writeService.recordCompletion({
			historyId: history?.id,
			activityId,
			predictedStartTime,
			predictedDuration,
			actualStartTime: new Date(),
			actualDuration,
			timeZone: currentTimeZone(),
			wasSkipped: false,
			wasReplaced: false,
		});

		return listActivitiesForDateWithRepositories(repositories, date);
	});
}

export async function updateActivity(
	date: Date,
	activityId: string,
	patch: Partial<
		Pick<
			ActivityItem,
			| "name"
			| "categoryId"
			| "priority"
			| "defaultDuration"
			| "isReplaceable"
			| "color"
			| "completedDuration"
		>
	>,
): Promise<ActivityItem[]> {
	return withScopedRepositories(async (repositories) => {
		await repositories.activity.update(activityId, {
			name: patch.name,
			categoryId: patch.categoryId,
			priority: patch.priority,
			defaultDuration: patch.defaultDuration,
			isReplaceable: patch.isReplaceable,
			color: patch.color,
		});

		if (patch.completedDuration !== undefined) {
			const history = await repositories.history.findForActivityOnDate(
				activityId,
				date,
			);
			if (history) {
				await repositories.history.update(history.id, {
					actualDuration: patch.completedDuration,
				});
			}
		}

		return listActivitiesForDateWithRepositories(repositories, date);
	});
}

export async function removeActivity(
	date: Date,
	activityId: string,
): Promise<ActivityItem[]> {
	return withScopedRepositories(async (repositories) => {
		await repositories.history.deleteForActivity(activityId);
		await repositories.activity.remove(activityId);
		return listActivitiesForDateWithRepositories(repositories, date);
	});
}

export async function toggleScheduledCompletion(
	eventId: string,
	currentStatus: EventStatus,
): Promise<ScheduledActivity | null> {
	return withScopedRepositories(async (repositories) => {
		const nextStatus =
			currentStatus === EventStatus.COMPLETED
				? EventStatus.CONFIRMED
				: EventStatus.COMPLETED;
		const updated = await repositories.schedule.update(eventId, {
			status: nextStatus,
			updatedAt: new Date(),
		});
		return updated ? toScheduledEventEntity(updated) : null;
	});
}

export async function renameActivity(
	date: Date,
	activityId: string,
	name: string,
): Promise<ActivityItem[]> {
	return withScopedRepositories(async (repositories) => {
		await repositories.activity.update(activityId, {
			name: name.trim(),
		});
		return listActivitiesForDateWithRepositories(repositories, date);
	});
}

export interface CreateActivityOptions {
	categoryId?: string;
	priority?: number;
	defaultDuration?: number;
}

export async function createActivity(
	date: Date,
	name: string,
	options?: CreateActivityOptions,
): Promise<ActivityItem> {
	return withScopedRepositories(async (repositories) => {
		const trimmedName = name.trim();
		const { start } = dayRange(date);
		const createdAt = new Date();
		const categoryId = options?.categoryId ?? DEFAULT_CATEGORY_ID;
		const priority = options?.priority ?? DEFAULT_ACTIVITY_PRIORITY;
		const defaultDuration =
			options?.defaultDuration ?? DEFAULT_ACTIVITY_DURATION;

		const activity = await repositories.activity.create({
			categoryId,
			name: trimmedName,
			priority,
			defaultDuration,
			isReplaceable: true,
			color: DEFAULT_ACTIVITY_COLOR,
			createdAt,
		});

		await repositories.history.create({
			activityId: activity.id,
			predictedStartTime: start,
			predictedDuration: defaultDuration,
			wasCompleted: false,
			wasSkipped: false,
			wasReplaced: false,
			createdAt,
		});

		return toActivityItem(activity, null);
	});
}
