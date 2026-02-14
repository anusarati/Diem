const SLOT_MINUTES = 15;
const MINUTES_PER_DAY = 24 * 60;

export const clampWeekday = (weekday: number): number => {
	if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
		throw new Error(`Invalid weekday index: ${weekday}`);
	}
	return weekday;
};

export const weekdayToMask = (weekday: number): number => {
	const safeWeekday = clampWeekday(weekday);
	return 1 << safeWeekday;
};

export const allWeekdaysMask = (): number => 0b1111111;

export const minutesToSlots = (minutes: number): number => {
	if (!Number.isFinite(minutes)) {
		return 1;
	}
	return Math.max(1, Math.round(minutes / SLOT_MINUTES));
};

export const dateToSlot = (date: Date, horizonStart: Date): number => {
	const deltaMs = date.getTime() - horizonStart.getTime();
	const deltaMinutes = deltaMs / 60_000;
	return Math.max(0, Math.floor(deltaMinutes / SLOT_MINUTES));
};

export const slotToDate = (slot: number, horizonStart: Date): Date => {
	const ms = horizonStart.getTime() + slot * SLOT_MINUTES * 60_000;
	return new Date(ms);
};

export const getWeekdayMondayIndex = (date: Date): number => {
	// JS: 0=Sun..6=Sat, Rust bitmask expects 0=Mon..6=Sun.
	const jsDay = date.getDay();
	return (jsDay + 6) % 7;
};

export const getDayBucket = (slot: number): number =>
	Math.floor(slot / (MINUTES_PER_DAY / SLOT_MINUTES));

export const getWeekBucket = (slot: number): number =>
	Math.floor(slot / ((MINUTES_PER_DAY * 7) / SLOT_MINUTES));

export const getMonthBucket = (date: Date): number =>
	date.getUTCFullYear() * 12 + date.getUTCMonth();
