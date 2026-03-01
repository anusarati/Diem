import { toScheduledEventEntity } from "../../../data/mappers/model_to_dto";
import {
	ActivitySource,
	Replaceability,
	type ScheduledEventEntity,
} from "../../../types/domain";
import {
	DEFAULT_ACTIVITY_COLOR,
	dayRange,
	makeRepositories,
	type RepoBundle,
	resolveCurrentScope,
	withScopedRepositories,
} from "./repositoryContext";

type ScheduledActivityInput = Omit<ScheduledEventEntity, "id">;

async function ensureActivityForScheduledEvent(
	repositories: RepoBundle,
	event: ScheduledActivityInput,
): Promise<string> {
	const createdAt = new Date(event.createdAt);
	const activity = await repositories.activity.upsert({
		id: event.activityId,
		categoryId: event.categoryId,
		name: event.title,
		priority: event.priority,
		defaultDuration: event.duration,
		isReplaceable: event.replaceabilityStatus !== Replaceability.HARD,
		color: DEFAULT_ACTIVITY_COLOR,
		createdAt,
	});
	return activity.id;
}

export async function getAllScheduledActivities(): Promise<
	ScheduledEventEntity[]
> {
	return withScopedRepositories(async (repositories) =>
		(await repositories.schedule.listAll()).map(toScheduledEventEntity),
	);
}

export async function getScheduledActivitiesForDate(
	date: Date,
): Promise<ScheduledEventEntity[]> {
	return withScopedRepositories(async (repositories) => {
		const { start, end } = dayRange(date);
		return (await repositories.schedule.listForRange(start, end)).map(
			toScheduledEventEntity,
		);
	});
}

export async function getScheduledActivitiesForWeek(
	startDate: Date,
): Promise<ScheduledEventEntity[]> {
	return withScopedRepositories(async (repositories) => {
		const start = new Date(startDate);
		const end = new Date(startDate);
		end.setDate(end.getDate() + 7);
		return (await repositories.schedule.listForRange(start, end)).map(
			toScheduledEventEntity,
		);
	});
}

export async function observeScheduledActivitiesForDate(
	date: Date,
	onChange: (events: ScheduledEventEntity[]) => void,
): Promise<() => void> {
	const { scope } = await resolveCurrentScope();
	const repositories = makeRepositories(scope);
	const { start, end } = dayRange(date);

	const subscription = repositories.schedule
		.observeForRange(start, end)
		.subscribe((rows) => {
			onChange(rows.map(toScheduledEventEntity));
		});

	return () => {
		subscription.unsubscribe();
	};
}

export async function addScheduledActivity(
	event: ScheduledActivityInput,
): Promise<ScheduledEventEntity> {
	return withScopedRepositories(async (repositories) => {
		const activityId = await ensureActivityForScheduledEvent(
			repositories,
			event,
		);
		const now = new Date();
		const created = await repositories.schedule.create({
			activityId,
			categoryId: event.categoryId,
			title: event.title,
			startTime: new Date(event.startTime),
			endTime: new Date(event.endTime),
			duration: event.duration,
			status: event.status,
			replaceabilityStatus: event.replaceabilityStatus,
			priority: event.priority,
			isRecurring: event.isRecurring,
			recurringTemplateId: event.recurringTemplateId,
			source: event.source ?? ActivitySource.USER_CREATED,
			isLocked: event.isLocked,
			createdAt: event.createdAt ? new Date(event.createdAt) : now,
			updatedAt: event.updatedAt ? new Date(event.updatedAt) : now,
		});
		return toScheduledEventEntity(created);
	});
}

export async function updateScheduledActivity(
	id: string,
	patch: Partial<ScheduledActivityInput>,
): Promise<ScheduledEventEntity | null> {
	return withScopedRepositories(async (repositories) => {
		const updated = await repositories.schedule.update(id, {
			activityId: patch.activityId,
			categoryId: patch.categoryId,
			title: patch.title,
			startTime: patch.startTime ? new Date(patch.startTime) : undefined,
			endTime: patch.endTime ? new Date(patch.endTime) : undefined,
			duration: patch.duration,
			status: patch.status,
			replaceabilityStatus: patch.replaceabilityStatus,
			priority: patch.priority,
			isRecurring: patch.isRecurring,
			recurringTemplateId: patch.recurringTemplateId,
			source: patch.source,
			isLocked: patch.isLocked,
			createdAt: patch.createdAt ? new Date(patch.createdAt) : undefined,
			updatedAt: patch.updatedAt ? new Date(patch.updatedAt) : new Date(),
		});
		return updated ? toScheduledEventEntity(updated) : null;
	});
}

export async function removeScheduledActivity(id: string): Promise<boolean> {
	return withScopedRepositories((repositories) =>
		repositories.schedule.remove(id),
	);
}
