/**
 * One-time import from Google Calendar into scheduled_events and into activities + history
 * so imported events also appear in "Your activities" with category from event name (or Other).
 */
import { ActivitySource, EventStatus, Replaceability } from "../../types/domain";
import type { GoogleCalendarEvent, GoogleCalendarDateTime } from "./googleCalendarApi";
import { fetchGoogleCalendarEvents } from "./googleCalendarApi";
import { ACTIVITY_CATEGORIES, matchCategoryFromText } from "./categories";
import {
	DEFAULT_ACTIVITY_COLOR,
	DEFAULT_CATEGORY_ID,
	makeRepositories,
	resolveCurrentScope,
} from "./services/repositoryContext";

const GOOGLE_CALENDAR_ACTIVITY_ID = "google_calendar_import";
const DEFAULT_PRIORITY = 2;
/** Prefix for per-event activities so they show in Your activities; id = gc_${googleEventId} */
const GC_ACTIVITY_ID_PREFIX = "gc_";

function parseGoogleDateTime(d: GoogleCalendarDateTime): Date {
	if (d.dateTime) {
		return new Date(d.dateTime);
	}
	if (d.date) {
		return new Date(`${d.date}T00:00:00`);
	}
	return new Date();
}

function durationMinutes(start: Date, end: Date): number {
	return Math.round((end.getTime() - start.getTime()) / (60 * 1000));
}

export interface ImportGoogleCalendarOptions {
	/** Start of range to import (inclusive). */
	timeMin: Date;
	/** End of range to import (exclusive). */
	timeMax: Date;
}

export interface ImportGoogleCalendarResult {
	imported: number;
	skipped: number;
	cancelled: number;
}

/**
 * Import events from Google Calendar (primary) into the DB.
 * Uses one shared Activity "Google Calendar". Skips cancelled events; skips events already present (by external_id).
 */
export async function importGoogleCalendar(
	accessToken: string,
	options: ImportGoogleCalendarOptions,
): Promise<ImportGoogleCalendarResult> {
	const { timeMin, timeMax } = options;
	const { scope } = await resolveCurrentScope();
	const repos = makeRepositories(scope);

	let activity = await repos.activity.findById(GOOGLE_CALENDAR_ACTIVITY_ID);
	if (!activity) {
		activity = await repos.activity.create({
			id: GOOGLE_CALENDAR_ACTIVITY_ID,
			categoryId: DEFAULT_CATEGORY_ID,
			name: "Google Calendar",
			priority: DEFAULT_PRIORITY,
			defaultDuration: 30,
			isReplaceable: true,
			color: DEFAULT_ACTIVITY_COLOR,
			createdAt: new Date(),
		});
	}

	const activityId = activity.id;
	console.log("[Google Calendar Import] scope", scope, "range", timeMin.toISOString(), "to", timeMax.toISOString());
	const events = await fetchGoogleCalendarEvents(accessToken, timeMin, timeMax);
	console.log("[Google Calendar Import] fetched", events.length, "events");

	let imported = 0;
	let skipped = 0;
	let cancelled = 0;

	for (const event of events) {
		if (event.status === "cancelled") {
			cancelled += 1;
			continue;
		}

		const existing = await repos.schedule.findByExternalId(event.id);
		if (existing) {
			skipped += 1;
			continue;
		}

		const start = event.start
			? parseGoogleDateTime(event.start)
			: new Date();
		const end = event.end ? parseGoogleDateTime(event.end) : new Date(start.getTime() + 60 * 60 * 1000);
		const duration = Math.max(1, durationMinutes(start, end));
		const title = event.summary?.trim() || "(無標題)";
		const created = event.created ? new Date(event.created) : new Date();
		const updated = event.updated ? new Date(event.updated) : created;
		const categoryId = matchCategoryFromText(title);
		const safeCategoryId = ACTIVITY_CATEGORIES.includes(categoryId as (typeof ACTIVITY_CATEGORIES)[number])
			? categoryId
			: DEFAULT_CATEGORY_ID;

		await repos.schedule.create({
			activityId,
			categoryId: safeCategoryId,
			title,
			startTime: start,
			endTime: end,
			duration,
			status: EventStatus.CONFIRMED,
			replaceabilityStatus: Replaceability.SOFT,
			priority: DEFAULT_PRIORITY,
			isRecurring: Boolean(event.recurrence?.length || event.recurringEventId),
			recurringTemplateId: event.recurringEventId,
			source: ActivitySource.EXTERNAL_IMPORT,
			isLocked: Boolean(event.locked),
			createdAt: created,
			updatedAt: updated,
			externalId: event.id,
		});

		// Also add to Your activities: one activity + history for this event's date (category from event name or Other)
		const gcActivityId = `${GC_ACTIVITY_ID_PREFIX}${event.id}`;
		let eventActivity = await repos.activity.findById(gcActivityId);
		if (!eventActivity) {
			eventActivity = await repos.activity.create({
				id: gcActivityId,
				categoryId: safeCategoryId,
				name: title,
				priority: DEFAULT_PRIORITY,
				defaultDuration: duration,
				isReplaceable: true,
				color: DEFAULT_ACTIVITY_COLOR,
				createdAt: created,
			});
			await repos.history.create({
				activityId: gcActivityId,
				predictedStartTime: start,
				predictedDuration: duration,
				wasCompleted: false,
				wasSkipped: false,
				wasReplaced: false,
				createdAt: created,
			});
		}

		imported += 1;
	}

	console.log("[Google Calendar Import] done", { imported, skipped, cancelled });
	return { imported, skipped, cancelled };
}
