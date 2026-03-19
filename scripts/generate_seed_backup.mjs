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
		id: "act_study",
		category_id: "Study",
		name: "Study",
		priority: 1,
		default_duration: 60,
		is_replaceable: true,
		color: "#2563EB",
		created_at: Date.now(),
		_status: "synced",
	},
	{
		id: "act_gym",
		category_id: "Fitness",
		name: "Gym",
		priority: 1,
		default_duration: 60,
		is_replaceable: true,
		color: "#10B981",
		created_at: Date.now(),
		_status: "synced",
	},
	{
		id: "act_shower",
		category_id: "Other",
		name: "Shower",
		priority: 2,
		default_duration: 30,
		is_replaceable: true,
		color: "#6B7280",
		created_at: Date.now(),
		_status: "synced",
	},
];

const scheduled_events = [];
const activity_history = [];

function addEvent(
	activityId,
	categoryId,
	name,
	startHour,
	startMin,
	durationMin,
	dateStr,
) {
	// Parse with specific offset to match local time intention
	const start = new Date(
		`${dateStr}T${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}:00-07:00`,
	);
	const end = new Date(start.getTime() + durationMin * 60 * 1000);

	const localBuckets = deriveLocalBucketKeys(start, TIMEZONE);
	const eventId = `ev_${createId()}`;

	scheduled_events.push({
		id: eventId,
		activity_id: activityId,
		category_id: categoryId,
		title: name,
		start_time: start.getTime(),
		end_time: end.getTime(),
		duration: durationMin,
		status: "COMPLETED",
		replaceability_status: "SOFT",
		priority: name === "Study" || name === "Gym" ? 1 : 2,
		is_recurring: false,
		source: "EXTERNAL_IMPORT",
		is_locked: false,
		created_at: Date.now(),
		updated_at: Date.now(),
		_status: "synced",
	});

	activity_history.push({
		id: `his_${createId()}`,
		activity_id: activityId,
		predicted_start_time: start.getTime(),
		predicted_duration: durationMin,
		actual_start_time: start.getTime(),
		actual_duration: durationMin,
		local_day_bucket: localBuckets.dayBucket,
		local_week_bucket: localBuckets.weekBucket,
		local_month_bucket: localBuckets.monthBucket,
		bucket_timezone: TIMEZONE,
		was_completed: true,
		was_skipped: false,
		was_replaced: false,
		created_at: start.getTime(),
		_status: "synced",
	});
}

// 1. Study: March 8 to March 18, 9 AM to 10 AM
for (let d = 8; d <= 18; d++) {
	const dayStr = String(d).padStart(2, "0");
	addEvent("act_study", "Study", "Study", 9, 0, 60, `2026-03-${dayStr}`);
}

// 2. Gym
addEvent("act_gym", "Fitness", "Gym", 12, 0, 60, "2026-03-11");
addEvent("act_gym", "Fitness", "Gym", 15, 0, 60, "2026-03-12");
addEvent("act_gym", "Fitness", "Gym", 14, 0, 60, "2026-03-18");

// 3. Shower
addEvent("act_shower", "Other", "Shower", 13, 0, 30, "2026-03-11");
addEvent("act_shower", "Other", "Shower", 16, 0, 30, "2026-03-12");
addEvent("act_shower", "Other", "Shower", 15, 0, 30, "2026-03-18");

const backup = {
	version: 6,
	tables: {
		activities,
		scheduled_events,
		activity_history,
	},
	exportedAt: Date.now(),
};

fs.writeFileSync("diem_backup_seed.json", JSON.stringify(backup, null, 2));
console.log("diem_backup_seed.json created successfully");
