import { toScheduledEventEntity } from "../../../data/mappers/model_to_dto";
import {
	ActivitySource,
	Replaceability,
	type ScheduledEventEntity,
} from "../../../types/domain";
import { rebuildMarkovTransitionCountsFromHistory } from "./markovService";
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
	const activity = await repositories.activity.upsertByName({
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

export async function getScheduledActivitiesForMonth(
	startDate: Date,
): Promise<ScheduledEventEntity[]> {
	return withScopedRepositories(async (repositories) => {
		const start = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
		const end = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
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

interface RecurrencePattern {
	frequency: "DAILY" | "WEEKLY" | "MONTHLY";
	interval: number;
	daysOfWeek?: number[];
	dayOfMonth?: number;
}

function generateRecurrenceDates(
	startDate: Date,
	pattern: RecurrencePattern,
	maxInstances: number = 15,
): Date[] {
	const dates: Date[] = [];
	const current = new Date(startDate);

	if (pattern.frequency === "DAILY") {
		for (let i = 0; i < maxInstances; i++) {
			dates.push(new Date(current));
			current.setDate(current.getDate() + pattern.interval);
		}
	} else if (pattern.frequency === "WEEKLY") {
		const days =
			pattern.daysOfWeek && pattern.daysOfWeek.length > 0
				? pattern.daysOfWeek
				: [current.getDay()];

		for (let week = 0; week < maxInstances; week++) {
			const weekStart = new Date(current);
			for (const dayIndex of days) {
				const dayOffset = dayIndex - weekStart.getDay();
				const instanceDate = new Date(weekStart);
				instanceDate.setDate(weekStart.getDate() + dayOffset);
				if (instanceDate >= startDate) {
					dates.push(instanceDate);
				}
			}
			current.setDate(current.getDate() + 7 * pattern.interval);
		}
	} else if (pattern.frequency === "MONTHLY") {
		for (let i = 0; i < maxInstances; i++) {
			dates.push(new Date(current));
			current.setMonth(current.getMonth() + pattern.interval);
		}
	}

	return dates.sort((a, b) => a.getTime() - b.getTime());
}

export async function addScheduledActivity(
	event: ScheduledActivityInput,
	options?: { recurrencePattern?: RecurrencePattern },
): Promise<ScheduledEventEntity> {
	return withScopedRepositories(async (repositories) => {
		const activityId = await ensureActivityForScheduledEvent(
			repositories,
			event,
		);
		const now = new Date();

		const pattern = options?.recurrencePattern || {
			frequency: "DAILY",
			interval: 1,
			daysOfWeek: [],
		};

		// 1. Create RecurringActivity template record if applicable
		if (event.isRecurring) {
			const { RecurrenceFrequency } = await import("../../../types/domain");
			// Check if template already exists
			const existing =
				await repositories.recurringActivity.findByTemplateId(activityId);
			if (!existing) {
				await repositories.recurringActivity.create({
					templateId: activityId,
					categoryId: event.categoryId,
					title: event.title,
					frequency: pattern.frequency as any,
					interval: pattern.interval,
					daysOfWeek: pattern.daysOfWeek || [],
					startDate: new Date(event.startTime),
					preferredStartTime: new Date(event.startTime).toLocaleTimeString([], {
						hour: "2-digit",
						minute: "2-digit",
						hour12: false,
					}),
					typicalDuration: event.duration,
					priority: event.priority,
					isActive: true,
				});
			}
		}

		// 2. Expand multiple events if it's recurring
		if (event.isRecurring) {
			const dates = generateRecurrenceDates(new Date(event.startTime), pattern);

			let firstCreated: ScheduledEventEntity | null = null;

			for (const date of dates) {
				const durationMinutes = event.duration;
				const instanceStart = new Date(date);
				const instanceEnd = new Date(instanceStart);
				instanceEnd.setMinutes(instanceEnd.getMinutes() + durationMinutes);

				const created = await repositories.schedule.create({
					activityId,
					categoryId: event.categoryId,
					title: event.title,
					startTime: instanceStart,
					endTime: instanceEnd,
					duration: event.duration,
					status: event.status,
					replaceabilityStatus: event.replaceabilityStatus,
					priority: event.priority,
					isRecurring: true,
					recurringTemplateId: activityId, // useful for tracking
					source: event.source ?? ActivitySource.USER_CREATED,
					isLocked: event.isLocked,
					createdAt: event.createdAt ? new Date(event.createdAt) : now,
					updatedAt: event.updatedAt ? new Date(event.updatedAt) : now,
				});

				if (!firstCreated) {
					firstCreated = toScheduledEventEntity(created);
				}
			}

			if (firstCreated) {
				return firstCreated;
			}
		}

		// Fallback/Single instance creation
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
	options?: { recurrencePattern?: RecurrencePattern },
): Promise<ScheduledEventEntity | null> {
	return withScopedRepositories(async (repositories) => {
		const existing = await repositories.schedule.findById(id);
		if (!existing) {
			return null;
		}

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

		if (!updated) return null;

		// Expand into multiple future events if transitioning to recurring
		if (patch.isRecurring) {
			const pattern = options?.recurrencePattern || {
				frequency: "DAILY",
				interval: 1,
				daysOfWeek: [],
			};

			// Create template record
			const { RecurrenceFrequency } = await import("../../../types/domain");
			const tempId = patch.activityId || updated.activityId;
			const existingTemplate =
				await repositories.recurringActivity.findByTemplateId(tempId);

			if (!existingTemplate) {
				await repositories.recurringActivity.create({
					templateId: tempId,
					categoryId: patch.categoryId || updated.categoryId,
					title: patch.title || updated.title,
					frequency: pattern.frequency as any,
					interval: pattern.interval,
					daysOfWeek: pattern.daysOfWeek || [],
					startDate: patch.startTime
						? new Date(patch.startTime)
						: updated.startTime,
					preferredStartTime: (patch.startTime
						? new Date(patch.startTime)
						: updated.startTime
					).toLocaleTimeString([], {
						hour: "2-digit",
						minute: "2-digit",
						hour12: false,
					}),
					typicalDuration: patch.duration || updated.duration,
					priority: patch.priority || updated.priority,
					isActive: true,
				});
			}

			// Generate future dates starting from the updated event time
			const startDate = patch.startTime
				? new Date(patch.startTime)
				: updated.startTime;
			// Advance to next period to skip creating a duplicate event on the exact same startTime day!
			const nextStart = new Date(startDate);
			if (pattern.frequency === "DAILY") {
				nextStart.setDate(nextStart.getDate() + pattern.interval);
			} else if (pattern.frequency === "WEEKLY") {
				nextStart.setDate(nextStart.getDate() + 1); // just offset by 1 day and loop advances it properly
			} else if (pattern.frequency === "MONTHLY") {
				nextStart.setMonth(nextStart.getMonth() + pattern.interval);
			}

			const dates = generateRecurrenceDates(nextStart, pattern);
			const now = new Date();

			for (const date of dates) {
				const durationMinutes = patch.duration || updated.duration;
				const instanceStart = new Date(date);
				const instanceEnd = new Date(instanceStart);
				instanceEnd.setMinutes(instanceEnd.getMinutes() + durationMinutes);

				await repositories.schedule.create({
					activityId: tempId,
					categoryId: patch.categoryId || updated.categoryId,
					title: patch.title || updated.title,
					startTime: instanceStart,
					endTime: instanceEnd,
					duration: durationMinutes,
					status: patch.status || updated.status,
					replaceabilityStatus:
						patch.replaceabilityStatus || updated.replaceabilityStatus,
					priority: patch.priority || updated.priority,
					isRecurring: true,
					recurringTemplateId: tempId,
					source: patch.source || updated.source,
					isLocked:
						patch.isLocked !== undefined ? patch.isLocked : updated.isLocked,
					createdAt: now,
					updatedAt: now,
				});
			}
		}

		return toScheduledEventEntity(updated);
	});
}

export async function removeScheduledActivity(id: string): Promise<boolean> {
	return withScopedRepositories(async (repositories) => {
		const scheduled = await repositories.schedule.findById(id);
		if (!scheduled) return false;

		const wasRemoved = await repositories.schedule.remove(id);
		if (!wasRemoved) return false;

		// Keep analytics consistent: removing a scheduled event should remove
		// any recorded completion history for the same activity on that day.
		await repositories.history.deleteForActivityOnDate(
			scheduled.activityId,
			scheduled.startTime,
		);

		await rebuildMarkovTransitionCountsFromHistory(repositories);
		return true;
	});
}

/**
 * Removes all calendar events (all sources) and imported activities. For testing only.
 */
export async function clearAllCalendarEvents(): Promise<number> {
	console.log("[ClearAll] clearAllCalendarEvents() called");
	return withScopedRepositories(async (repositories) => {
		console.log(
			"[ClearAll] Got repositories, listing all events and activities",
		);
		const allEvents = await repositories.schedule.listAll();
		const allActivities = await repositories.activity.listAll();
		const icsActivities = allActivities.filter((a) => a.id.startsWith("ics_"));

		console.log(
			"[ClearAll] Found",
			allEvents.length,
			"events and",
			icsActivities.length,
			"imported activities",
		);

		await repositories.database.write(async () => {
			// Clear all events
			for (const event of allEvents) {
				await event.destroyPermanently();
			}
			// Clear ics activities
			for (const activity of icsActivities) {
				await activity.destroyPermanently();
			}
		});

		console.log("[ClearAll] Batch delete done");
		return allEvents.length;
	});
}
