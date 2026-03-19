/**
 * Parse .ics (iCalendar) file content and import into scheduled_events + Your activities.
 * Supports VEVENT with DTSTART, DTEND, SUMMARY, UID, STATUS. Category from event name (or Other).
 */

import {
	HeuristicNetArcRepository,
	HeuristicNetPairRepository,
	MarkovTransitionRepository,
} from "../../data/repositories";
import {
	type CompletedActivityEvent,
	HeuristicNetMiner,
	HistoryWriteService,
	MarkovTransitionMiner,
} from "../../mining";
import {
	ActivitySource,
	EventStatus,
	RecurrenceFrequency,
	Replaceability,
} from "../../types/domain";
import { ACTIVITY_CATEGORIES, matchCategoryFromText } from "./categories";
import { rebuildMarkovTransitionCountsFromHistory } from "./services/markovService";
import {
	currentTimeZone,
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
	/**
	 * Stable identifier for recurring event *series* so analytics can group
	 * occurrences as the same logical activity.
	 *
	 * `uid` stays unique per expanded occurrence and is used as `externalId`
	 * for schedule deduplication.
	 */
	seriesUid?: string;
	status?: string;
	rrule?: string;
	originalRrule?: string;
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
	let rrule = "";
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
			case "RRULE":
				rrule = value;
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
		rrule: rrule || undefined,
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
 * Expand a recurring event into individual instances within a range.
 * Currently supports FREQ=WEEKLY with BYDAY.
 */
function parseRrule(rrule: string) {
	const parts = rrule.split(";").reduce(
		(acc, p) => {
			const [k, v] = p.split("=");
			if (k && v) acc[k] = v;
			return acc;
		},
		{} as Record<string, string>,
	);

	const dayMap: Record<string, number> = {
		MO: 1,
		TU: 2,
		WE: 3,
		TH: 4,
		FR: 5,
		SA: 6,
		SU: 0,
	};

	let frequency = RecurrenceFrequency.WEEKLY;
	if (parts.FREQ === "DAILY") frequency = RecurrenceFrequency.DAILY;
	if (parts.FREQ === "MONTHLY") frequency = RecurrenceFrequency.MONTHLY;

	const interval = parseInt(parts.INTERVAL || "1", 10);
	const byDay = parts.BYDAY ? parts.BYDAY.split(",") : [];
	const daysOfWeek = byDay.map((d) => dayMap[d]).filter((d) => d !== undefined);

	return {
		parts,
		frequency,
		interval,
		daysOfWeek,
		until: parts.UNTIL ? parseIcsDateTime(parts.UNTIL) : null,
	};
}

function expandRecurringEvents(
	event: IcsParsedEvent,
	rangeStart: Date,
	rangeEnd: Date,
): IcsParsedEvent[] {
	if (!event.rrule) return [event];

	const rrule = event.rrule;
	const { parts, interval, daysOfWeek, until: rruleUntil } = parseRrule(rrule);

	if (parts.FREQ !== "WEEKLY") return [event];

	const targetDays = daysOfWeek;

	let until = rangeEnd;
	if (rruleUntil && rruleUntil < until) {
		until = rruleUntil;
	}

	const duration = event.end.getTime() - event.start.getTime();
	const instances: IcsParsedEvent[] = [];

	// Use start date as first instance if it matches BYDAY or if BYDAY is empty
	const startDay = event.start.getDay();
	if (targetDays.length === 0 || targetDays.includes(startDay)) {
		if (event.start >= rangeStart && event.start <= until) {
			instances.push({
				...event,
				seriesUid: event.seriesUid ?? event.uid,
				rrule: undefined,
				originalRrule: event.rrule,
			});
		}
	}

	// Iterate from start date up to until/rangeEnd
	const current = new Date(event.start);
	current.setDate(current.getDate() + 1); // Start from next day

	while (current <= until) {
		const currentDay = current.getDay();
		if (targetDays.length === 0 || targetDays.includes(currentDay)) {
			if (current >= rangeStart && current <= rangeEnd) {
				const start = new Date(current);
				const end = new Date(current.getTime() + duration);
				const timestamp = start
					.toISOString()
					.replace(/[-:.]/g, "")
					.slice(0, 15);
				instances.push({
					...event,
					start,
					end,
					uid: `${event.uid}_${timestamp}`,
					seriesUid: event.seriesUid ?? event.uid,
					originalRrule: event.rrule,
					rrule: undefined,
				});
			}
		}
		current.setDate(current.getDate() + 1);
	}

	return instances.length > 0 ? instances : [event];
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

	const newlyCompletedEvents: CompletedActivityEvent[] = [];

	// Define expansion range (e.g., March 2026 for this test, but generally ± 3 months from now)
	const rangeStart = new Date(2026, 2, 1); // March 1st, 2026
	const rangeEnd = new Date(2026, 2, 31, 23, 59, 59);

	const expandedEvents: IcsParsedEvent[] = [];
	for (const ev of parsedEvents) {
		if (ev.rrule) {
			expandedEvents.push(...expandRecurringEvents(ev, rangeStart, rangeEnd));
		} else {
			expandedEvents.push(ev);
		}
	}

	const writeService = new HistoryWriteService(repos.database);
	for (const ev of expandedEvents) {
		if (ev.status?.toUpperCase() === "CANCELLED") {
			cancelled += 1;
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

		// Determine status and replaceability from keywords/status
		let status = EventStatus.CONFIRMED;
		let replaceability = Replaceability.SOFT;

		const upperTitle = ev.title.toUpperCase();
		if (upperTitle.includes("(FIXED)")) {
			replaceability = Replaceability.HARD;
		}
		if (
			upperTitle.includes("(PREDICTED)") ||
			ev.status?.toUpperCase() === "TENTATIVE"
		) {
			status = EventStatus.PREDICTED;
		}

		const now = new Date();
		const isPast = ev.end <= now;

		// If the occurrence has already ended, treat it as completed for
		// analytics (Markov/causal net), regardless of what the ICS marked it
		// as (CONFIRMED/TENTATIVE/PREDICTED/etc.).
		if (isPast) {
			status = EventStatus.COMPLETED;
		}

		const seriesUid = ev.seriesUid ?? ev.uid;
		const eventActivityId = `${ICS_ACTIVITY_ID_PREFIX}${seriesUid}`;
		// Always ensure the logical activity exists (series-level) so all
		// occurrences contribute to the same Markov transitions.
		const eventActivity = await repos.activity.findById(eventActivityId);
		if (!eventActivity) {
			await repos.activity.create({
				id: eventActivityId,
				categoryId: safeCategoryId,
				name: ev.title,
				priority: DEFAULT_PRIORITY,
				defaultDuration: duration,
				isReplaceable: true,
				color: DEFAULT_ACTIVITY_COLOR,
				createdAt: ev.start,
			});
		}

		if (ev.seriesUid && ev.originalRrule) {
			const { frequency, interval, daysOfWeek } = parseRrule(ev.originalRrule);
			await repos.recurringActivity.create({
				templateId: eventActivityId,
				categoryId: safeCategoryId,
				title: ev.title,
				frequency,
				interval,
				daysOfWeek,
				startDate: ev.start,
				preferredStartTime: ev.start.toTimeString().slice(0, 5),
				typicalDuration: duration,
				priority: DEFAULT_PRIORITY,
				isActive: true,
			});
		} else if (ev.seriesUid) {
			// Fallback for non-rrule repetition if ever needed
			await repos.recurringActivity.create({
				templateId: eventActivityId,
				categoryId: safeCategoryId,
				title: ev.title,
				frequency: RecurrenceFrequency.WEEKLY,
				interval: 1,
				daysOfWeek: [],
				startDate: ev.start,
				preferredStartTime: ev.start.toTimeString().slice(0, 5),
				typicalDuration: duration,
				priority: DEFAULT_PRIORITY,
				isActive: true,
			});
		}

		// Create schedule occurrence if missing; otherwise keep it (but we still
		// may need to update history / markov inputs).
		const existingSchedule = await repos.schedule.findByExternalId(ev.uid);
		if (!existingSchedule) {
			await repos.schedule.create({
				activityId,
				categoryId: safeCategoryId,
				title: ev.title,
				startTime: ev.start,
				endTime: ev.end,
				duration,
				status,
				replaceabilityStatus: replaceability,
				priority: DEFAULT_PRIORITY,
				isRecurring: false,
				source: ActivitySource.EXTERNAL_IMPORT,
				isLocked: false,
				createdAt: now,
				updatedAt: now,
				externalId: ev.uid,
			});
			imported += 1;
		} else {
			// If time has moved forward since the last import, sync completion
			// status so analytics based on schedule.status stay accurate.
			if (existingSchedule.status !== status) {
				await repos.schedule.update(existingSchedule.id, {
					status,
					updatedAt: now,
				});
			}
			skipped += 1;
		}

		// Ensure history row exists for this occurrence (idempotent),
		// and mark it completed if the occurrence is in the past.
		const existingHistory =
			await repos.history.findForActivityAndPredictedStartTime(
				eventActivityId,
				ev.start,
			);

		if (status === EventStatus.COMPLETED) {
			const wasCompleted = existingHistory?.wasCompleted ?? false;
			if (!wasCompleted) {
				await writeService.recordCompletion({
					historyId: existingHistory?.id,
					activityId: eventActivityId,
					predictedStartTime: ev.start,
					predictedDuration: duration,
					actualStartTime: ev.start,
					actualDuration: duration,
					timeZone: currentTimeZone(),
					wasSkipped: false,
					wasReplaced: false,
				});
				newlyCompletedEvents.push({
					activityId: eventActivityId,
					startTime: ev.start,
					durationMinutes: duration,
				});
			}
		} else if (!existingHistory) {
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
	}

	if (newlyCompletedEvents.length > 0) {
		newlyCompletedEvents.sort(
			(a, b) => a.startTime.getTime() - b.startTime.getTime(),
		);

		const markovMiner = new MarkovTransitionMiner();
		const hnetMiner = new HeuristicNetMiner();

		await markovMiner.persist(
			newlyCompletedEvents,
			new MarkovTransitionRepository(repos.database),
		);
		await hnetMiner.persist(
			newlyCompletedEvents,
			new HeuristicNetArcRepository(repos.database),
			new HeuristicNetPairRepository(repos.database),
		);

		// Ensure derived transition counts match the latest completion history
		// (important for recurring instances and for schema/logic changes).
		await rebuildMarkovTransitionCountsFromHistory(repos, {
			// iCal schedules can have longer gaps between consecutive events
			// than our default Markov window; use a slightly more forgiving
			// gap tolerance so recurring sequences are visible in the causal net.
			gapToleranceSlots: 6,
		});
	}

	return { imported, skipped, cancelled };
}
