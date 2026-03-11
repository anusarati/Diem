/**
 * Parse .ics (iCalendar) file content and import into scheduled_events + Your activities.
 * Supports VEVENT with DTSTART, DTEND, SUMMARY, UID, STATUS. Category from event name (or Other).
 */
import {
	ActivitySource,
	EventStatus,
	Replaceability,
} from "../../types/domain";
import { ACTIVITY_CATEGORIES, matchCategoryFromText } from "./categories";
import {
	DEFAULT_ACTIVITY_COLOR,
	DEFAULT_CATEGORY_ID,
	makeRepositories,
	resolveCurrentScope,
} from "./services/repositoryContext";

const ICS_ACTIVITY_ID = "ics_import";
const DEFAULT_PRIORITY = 2;
const ICS_ACTIVITY_ID_PREFIX = "ics_";

export interface IcsParsedEvent {
	start: Date;
	end: Date;
	title: string;
	uid: string;
	status?: string;
}

/**
 * Unfold iCalendar lines (continuation lines start with space/tab).
 */
function unfold(raw: string): string {
	return raw.replace(/\r\n?|\n/g, "\n").replace(/\n[ \t]/g, "");
}

/**
 * Parse a single VEVENT block (content between BEGIN:VEVENT and END:VEVENT, without those lines).
 */
function parseVeventBlock(block: string): IcsParsedEvent | null {
	const lines = block.split(/\n/).filter(Boolean);
	let dtstart = "";
	let dtend = "";
	let summary = "";
	let uid = "";
	let status = "";
	for (const line of lines) {
		const colon = line.indexOf(":");
		if (colon === -1) continue;
		const keyPart = line.slice(0, colon);
		const value = line.slice(colon + 1).trim();
		const key = keyPart.split(";")[0];
		switch (key) {
			case "DTSTART":
				dtstart = value;
				break;
			case "DTEND":
				dtend = value;
				break;
			case "SUMMARY":
				summary = value;
				break;
			case "UID":
				uid = value;
				break;
			case "STATUS":
				status = value;
				break;
			default:
				break;
		}
	}
	if (!dtstart) return null;

	const start = parseIcsDateTime(dtstart);
	const end = dtend
		? parseIcsDateTime(dtend)
		: new Date(start.getTime() + 60 * 60 * 1000);
	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

	return {
		start,
		end,
		title: summary.trim() || "(No title)",
		uid: uid || `ics_${start.getTime()}_${Math.random().toString(36).slice(2)}`,
		status: status || "",
	};
}

/**
 * Parse iCalendar date-time: 20240615T140000Z, 20240615T140000, or 20240615 (date only).
 */
function parseIcsDateTime(value: string): Date {
	const cleaned = value.replace(/\s/g, "");
	// DATE format YYYYMMDD
	if (cleaned.length === 8) {
		return new Date(
			Number(cleaned.slice(0, 4)),
			Number(cleaned.slice(4, 6)) - 1,
			Number(cleaned.slice(6, 8)),
		);
	}
	// DATETIME: YYYYMMDDTHHmmss or YYYYMMDDTHHmmssZ
	if (cleaned.length >= 15 && cleaned[8] === "T") {
		const year = Number(cleaned.slice(0, 4));
		const month = Number(cleaned.slice(4, 6)) - 1;
		const day = Number(cleaned.slice(6, 8));
		const hour = Number(cleaned.slice(9, 11));
		const min = Number(cleaned.slice(11, 13));
		const sec = Number(cleaned.slice(13, 15));
		const date = new Date(year, month, day, hour, min, sec);
		// If Z suffix, treat as UTC then we have correct instant
		if (cleaned.endsWith("Z")) {
			return new Date(Date.UTC(year, month, day, hour, min, sec));
		}
		return date;
	}
	return new Date(cleaned);
}

/**
 * Parse .ics file content and return array of events.
 */
export function parseIcsContent(icsText: string): IcsParsedEvent[] {
	const unfolded = unfold(icsText);
	const veventRegex = /BEGIN:VEVENT\s*([\s\S]*?)END:VEVENT/gi;
	const events: IcsParsedEvent[] = [];
	let m = veventRegex.exec(unfolded);
	while (m !== null) {
		const block = m[1].trim();
		const event = parseVeventBlock(block);
		if (event) events.push(event);
		m = veventRegex.exec(unfolded);
	}
	return events;
}

export interface ImportIcsResult {
	imported: number;
	skipped: number;
	cancelled: number;
}

/**
 * Import parsed .ics events into the DB (scheduled_events + activities for Your activities).
 * Uses external_id = uid for dedup. Category from event title keyword match or Other.
 */
export async function importFromIcs(
	parsedEvents: IcsParsedEvent[],
): Promise<ImportIcsResult> {
	const { scope } = await resolveCurrentScope();
	const repos = makeRepositories(scope);

	let activity = await repos.activity.findById(ICS_ACTIVITY_ID);
	if (!activity) {
		activity = await repos.activity.create({
			id: ICS_ACTIVITY_ID,
			categoryId: DEFAULT_CATEGORY_ID,
			name: "ICS Import",
			priority: DEFAULT_PRIORITY,
			defaultDuration: 30,
			isReplaceable: true,
			color: DEFAULT_ACTIVITY_COLOR,
			createdAt: new Date(),
		});
	}

	const activityId = activity.id;
	let imported = 0;
	let skipped = 0;
	let cancelled = 0;

	for (const ev of parsedEvents) {
		if (ev.status?.toUpperCase() === "CANCELLED") {
			cancelled += 1;
			continue;
		}

		const existing = await repos.schedule.findByExternalId(ev.uid);
		if (existing) {
			skipped += 1;
			continue;
		}

		const duration = Math.max(
			1,
			Math.round((ev.end.getTime() - ev.start.getTime()) / (60 * 1000)),
		);
		const categoryId = matchCategoryFromText(ev.title);
		const safeCategoryId = ACTIVITY_CATEGORIES.includes(
			categoryId as (typeof ACTIVITY_CATEGORIES)[number],
		)
			? categoryId
			: DEFAULT_CATEGORY_ID;
		const now = new Date();

		await repos.schedule.create({
			activityId,
			categoryId: safeCategoryId,
			title: ev.title,
			startTime: ev.start,
			endTime: ev.end,
			duration,
			status: EventStatus.CONFIRMED,
			replaceabilityStatus: Replaceability.SOFT,
			priority: DEFAULT_PRIORITY,
			isRecurring: false,
			source: ActivitySource.EXTERNAL_IMPORT,
			isLocked: false,
			createdAt: now,
			updatedAt: now,
			externalId: ev.uid,
		});

		const eventActivityId = `${ICS_ACTIVITY_ID_PREFIX}${ev.uid}`;
		let eventActivity = await repos.activity.findById(eventActivityId);
		if (!eventActivity) {
			eventActivity = await repos.activity.create({
				id: eventActivityId,
				categoryId: safeCategoryId,
				name: ev.title,
				priority: DEFAULT_PRIORITY,
				defaultDuration: duration,
				isReplaceable: true,
				color: DEFAULT_ACTIVITY_COLOR,
				createdAt: ev.start,
			});
			await repos.history.create({
				activityId: eventActivityId,
				predictedStartTime: ev.start,
				predictedDuration: duration,
				wasCompleted: false,
				wasSkipped: false,
				wasReplaced: false,
				createdAt: ev.start,
			});
		}

		imported += 1;
	}

	return { imported, skipped, cancelled };
}
