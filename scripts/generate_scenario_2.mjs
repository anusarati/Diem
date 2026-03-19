import fs from "fs";

const TIMEZONE = "America/Los_Angeles";

function createId() {
	return Math.random().toString(36).substring(2, 12);
}

function deriveLocalBucketKeys(date, timeZone) {
	const formatter = new Intl.DateTimeFormat("en-US", {
		timeZone,
		weekday: "short",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});

	const parts = formatter.formatToParts(date);
	const year = parseInt(parts.find((p) => p.type === "year").value, 10);
	const month = parseInt(parts.find((p) => p.type === "month").value, 10);
	const day = parseInt(parts.find((p) => p.type === "day").value, 10);
	const weekdayRaw = parts.find((p) => p.type === "weekday").value;

	const WEEKDAY_TO_INDEX = {
		Mon: 0,
		Tue: 1,
		Wed: 2,
		Thu: 3,
		Fri: 4,
		Sat: 5,
		Sun: 6,
	};
	const weekdayMondayIndex = WEEKDAY_TO_INDEX[weekdayRaw];

	const formatDateKey = (y, m, d) =>
		`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

	const dayBucket = formatDateKey(year, month, day);
	const monthBucket = `${year}-${String(month).padStart(2, "0")}`;

	const dayUtcMs = Date.UTC(year, month - 1, day);
	const DAY_MS = 24 * 60 * 60 * 1000;
	const mondayUtc = new Date(dayUtcMs - weekdayMondayIndex * DAY_MS);

	const weekBucket = formatDateKey(
		mondayUtc.getUTCFullYear(),
		mondayUtc.getUTCMonth() + 1,
		mondayUtc.getUTCDate(),
	);

	return { dayBucket, weekBucket, monthBucket };
}

const activities = [
	{
		id: "act_fixed_a",
		category_id: "Work",
		name: "Meeting A (Fixed)",
		priority: 1,
		default_duration: 60,
		is_replaceable: false,
		color: "#EF4444",
		created_at: Date.now(),
		_status: "synced",
	},
	{
		id: "act_fixed_b",
		category_id: "Work",
		name: "Meeting B (Fixed)",
		priority: 1,
		default_duration: 60,
		is_replaceable: false,
		color: "#EF4444",
		created_at: Date.now(),
		_status: "synced",
	},
	{
		id: "act_high_1",
		category_id: "Study",
		name: "High Priority Task 1",
		priority: 1,
		default_duration: 60,
		is_replaceable: true,
		color: "#2563EB",
		created_at: Date.now(),
		_status: "synced",
	},
	{
		id: "act_high_2",
		category_id: "Study",
		name: "High Priority Task 2",
		priority: 1,
		default_duration: 60,
		is_replaceable: true,
		color: "#2563EB",
		created_at: Date.now(),
		_status: "synced",
	},
	{
		id: "act_high_3",
		category_id: "Study",
		name: "High Priority Task 3",
		priority: 1,
		default_duration: 60,
		is_replaceable: true,
		color: "#2563EB",
		created_at: Date.now(),
		_status: "synced",
	},
];

const scheduled_events = [];
const activity_history = [];

function addEvent({
	activityId,
	categoryId,
	title,
	startHour,
	startMin,
	durationMin,
	dateStr,
	status = "CONFIRMED",
	replaceability = "SOFT",
	isLocked = false,
	priority = 1,
}) {
	const start = new Date(
		`${dateStr}T${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}:00-07:00`,
	);
	const end = new Date(start.getTime() + durationMin * 60 * 1000);

	const eventId = `ev_${createId()}`;

	scheduled_events.push({
		id: eventId,
		activity_id: activityId,
		category_id: categoryId,
		title: title,
		start_time: start.getTime(),
		end_time: end.getTime(),
		duration: durationMin,
		status: status,
		replaceability_status: replaceability,
		priority: priority,
		is_recurring: false,
		source: "EXTERNAL_IMPORT",
		is_locked: isLocked,
		created_at: Date.now(),
		updated_at: Date.now(),
		_status: "synced",
	});
}

const scenarioDate = "2026-03-20";

// 1. Fixed Events creating a 1-hour gap (10:00 - 11:00)
addEvent({
	activityId: "act_fixed_a",
	categoryId: "Work",
	title: "Meeting A (Fixed)",
	startHour: 9,
	startMin: 0,
	durationMin: 60,
	dateStr: scenarioDate,
	replaceability: "HARD",
	isLocked: true,
});

addEvent({
	activityId: "act_fixed_b",
	categoryId: "Work",
	title: "Meeting B (Fixed)",
	startHour: 11,
	startMin: 0,
	durationMin: 60,
	dateStr: scenarioDate,
	replaceability: "HARD",
	isLocked: true,
});

// 2. Three High Priority Tasks competing for the 10:00 - 11:00 slot
addEvent({
	activityId: "act_high_1",
	categoryId: "Study",
	title: "High Priority Task 1",
	startHour: 10,
	startMin: 0,
	durationMin: 60,
	dateStr: scenarioDate,
	replaceability: "SOFT",
	isLocked: false,
});

addEvent({
	activityId: "act_high_2",
	categoryId: "Study",
	title: "High Priority Task 2",
	startHour: 10,
	startMin: 0,
	durationMin: 60,
	dateStr: scenarioDate,
	replaceability: "SOFT",
	isLocked: false,
});

addEvent({
	activityId: "act_high_3",
	categoryId: "Study",
	title: "High Priority Task 3",
	startHour: 10,
	startMin: 0,
	durationMin: 60,
	dateStr: scenarioDate,
	replaceability: "SOFT",
	isLocked: false,
});

const backup = {
	version: 6,
	tables: {
		activities,
		scheduled_events,
		activity_history,
	},
	exportedAt: Date.now(),
};

fs.writeFileSync("diem_scenario_2.json", JSON.stringify(backup, null, 2));
console.log("diem_scenario_2.json created successfully");
