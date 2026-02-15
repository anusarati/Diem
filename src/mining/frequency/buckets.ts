import { FrequencyEmaScope } from "../../types/domain";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_TO_INDEX: Record<string, number> = {
	Mon: 0,
	Tue: 1,
	Wed: 2,
	Thu: 3,
	Fri: 4,
	Sat: 5,
	Sun: 6,
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

const formatDateKey = (year: number, month: number, day: number): string =>
	`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const parseDateKey = (
	key: string,
): { year: number; month: number; day: number } => {
	const [yearRaw, monthRaw, dayRaw] = key.split("-");
	const year = Number.parseInt(yearRaw ?? "", 10);
	const month = Number.parseInt(monthRaw ?? "", 10);
	const day = Number.parseInt(dayRaw ?? "", 10);
	if (
		!Number.isInteger(year) ||
		!Number.isInteger(month) ||
		!Number.isInteger(day)
	) {
		throw new Error(`Invalid date bucket key: ${key}`);
	}
	return { year, month, day };
};

const parseMonthKey = (key: string): { year: number; month: number } => {
	const [yearRaw, monthRaw] = key.split("-");
	const year = Number.parseInt(yearRaw ?? "", 10);
	const month = Number.parseInt(monthRaw ?? "", 10);
	if (!Number.isInteger(year) || !Number.isInteger(month)) {
		throw new Error(`Invalid month bucket key: ${key}`);
	}
	return { year, month };
};

const getFormatter = (timeZone: string): Intl.DateTimeFormat => {
	const cached = formatterCache.get(timeZone);
	if (cached) {
		return cached;
	}
	const formatter = new Intl.DateTimeFormat("en-US", {
		timeZone,
		weekday: "short",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
	formatterCache.set(timeZone, formatter);
	return formatter;
};

const normalizeTimeZone = (timeZone: string): string => {
	try {
		// Throws on invalid IANA name.
		new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
		return timeZone;
	} catch {
		return "UTC";
	}
};

const getZonedDateParts = (
	date: Date,
	timeZone: string,
): { year: number; month: number; day: number; weekdayMondayIndex: number } => {
	const formatter = getFormatter(timeZone);
	const parts = formatter.formatToParts(date);
	const year = Number.parseInt(
		parts.find((part) => part.type === "year")?.value ?? "",
		10,
	);
	const month = Number.parseInt(
		parts.find((part) => part.type === "month")?.value ?? "",
		10,
	);
	const day = Number.parseInt(
		parts.find((part) => part.type === "day")?.value ?? "",
		10,
	);
	const weekdayRaw = parts.find((part) => part.type === "weekday")?.value ?? "";
	const weekday = WEEKDAY_TO_INDEX[weekdayRaw];
	if (
		!Number.isInteger(year) ||
		!Number.isInteger(month) ||
		!Number.isInteger(day) ||
		weekday === undefined
	) {
		throw new Error(
			`Could not derive zoned date parts for timezone ${timeZone}`,
		);
	}
	return { year, month, day, weekdayMondayIndex: weekday };
};

export interface LocalBucketKeys {
	dayBucket: string;
	weekBucket: string;
	monthBucket: string;
	timeZone: string;
}

export const deriveLocalBucketKeys = (
	date: Date,
	timeZone: string,
): LocalBucketKeys => {
	const safeTimeZone = normalizeTimeZone(timeZone);
	const parts = getZonedDateParts(date, safeTimeZone);
	const dayBucket = formatDateKey(parts.year, parts.month, parts.day);
	const monthBucket = `${parts.year}-${String(parts.month).padStart(2, "0")}`;
	const dayUtcMs = Date.UTC(parts.year, parts.month - 1, parts.day);
	const mondayUtc = new Date(dayUtcMs - parts.weekdayMondayIndex * DAY_MS);
	const weekBucket = formatDateKey(
		mondayUtc.getUTCFullYear(),
		mondayUtc.getUTCMonth() + 1,
		mondayUtc.getUTCDate(),
	);

	return {
		dayBucket,
		weekBucket,
		monthBucket,
		timeZone: safeTimeZone,
	};
};

export const bucketKeyForScope = (
	keys: LocalBucketKeys,
	scope: FrequencyEmaScope,
): string => {
	switch (scope) {
		case FrequencyEmaScope.DAILY:
			return keys.dayBucket;
		case FrequencyEmaScope.WEEKLY:
			return keys.weekBucket;
		case FrequencyEmaScope.MONTHLY:
			return keys.monthBucket;
		default:
			return keys.dayBucket;
	}
};

export const bucketKeyToIndex = (
	scope: FrequencyEmaScope,
	key: string,
): number => {
	switch (scope) {
		case FrequencyEmaScope.DAILY:
		case FrequencyEmaScope.WEEKLY: {
			const { year, month, day } = parseDateKey(key);
			return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
		}
		case FrequencyEmaScope.MONTHLY: {
			const { year, month } = parseMonthKey(key);
			return year * 12 + (month - 1);
		}
		default:
			return 0;
	}
};

export const compareBucketKeys = (
	scope: FrequencyEmaScope,
	left: string,
	right: string,
): number => bucketKeyToIndex(scope, left) - bucketKeyToIndex(scope, right);

export const nextBucketKey = (
	scope: FrequencyEmaScope,
	key: string,
): string => {
	switch (scope) {
		case FrequencyEmaScope.DAILY: {
			const { year, month, day } = parseDateKey(key);
			const next = new Date(Date.UTC(year, month - 1, day + 1));
			return formatDateKey(
				next.getUTCFullYear(),
				next.getUTCMonth() + 1,
				next.getUTCDate(),
			);
		}
		case FrequencyEmaScope.WEEKLY: {
			const { year, month, day } = parseDateKey(key);
			const next = new Date(Date.UTC(year, month - 1, day + 7));
			return formatDateKey(
				next.getUTCFullYear(),
				next.getUTCMonth() + 1,
				next.getUTCDate(),
			);
		}
		case FrequencyEmaScope.MONTHLY: {
			const { year, month } = parseMonthKey(key);
			const monthIndex = year * 12 + (month - 1) + 1;
			const nextYear = Math.floor(monthIndex / 12);
			const nextMonth = (monthIndex % 12) + 1;
			return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
		}
		default:
			return key;
	}
};
