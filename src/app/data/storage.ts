/**
 * Persistence for tasks and user settings, scoped by current user.
 * Uses AsyncStorage; keys include user id when logged in.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ActivityItem, ScheduledActivity, UserSettings } from "../types";
import { getCurrentUser } from "./auth";

const TASKS_KEY_PREFIX = "diem_tasks_";
const SETTINGS_KEY_PREFIX = "diem_settings_";
const TASK_ID_KEY_PREFIX = "diem_task_id_";
const SCHEDULED_KEY_PREFIX = "diem_scheduled_";
const SCHEDULED_ID_KEY_PREFIX = "diem_scheduled_id_";

const DEFAULT_SETTINGS: UserSettings = {
	notificationsEnabled: true,
};

function dateKey(date: Date): string {
	return date.toISOString().slice(0, 10);
}

async function userId(): Promise<string | null> {
	const user = await getCurrentUser();
	return user?.id ?? null;
}

function taskIdKey(uid: string): string {
	return TASK_ID_KEY_PREFIX + uid;
}

/** Load tasks for a given date for the current user. Returns [] if none or not logged in. */
export async function getTasksForDate(date: Date): Promise<ActivityItem[]> {
	const uid = await userId();
	if (!uid) return [];
	try {
		const key = `${TASKS_KEY_PREFIX + uid}_${dateKey(date)}`;
		const raw = await AsyncStorage.getItem(key);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as ActivityItem[];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

/** Save full task list for a date (overwrites). No-op if not logged in. */
export async function saveTasksForDate(
	date: Date,
	tasks: ActivityItem[],
): Promise<void> {
	const uid = await userId();
	if (!uid) return;
	const key = `${TASKS_KEY_PREFIX + uid}_${dateKey(date)}`;
	await AsyncStorage.setItem(key, JSON.stringify(tasks));
}

async function nextId(): Promise<string> {
	const uid = await userId();
	const key = uid ? taskIdKey(uid) : "diem_task_id";
	const raw = await AsyncStorage.getItem(key);
	const n = raw ? Number.parseInt(raw, 10) + 1 : 1;
	await AsyncStorage.setItem(key, String(n));
	return String(n);
}

/** Toggle completed for a task and persist. When marking complete, pass completedMinutes to log time spent (used in Analytics "Done"). */
export async function toggleTaskCompleted(
	date: Date,
	taskId: string,
	options?: { completedMinutes?: number },
): Promise<ActivityItem[]> {
	const tasks = await getTasksForDate(date);
	const updated = tasks.map((t) => {
		if (t.id !== taskId) return t;
		const completed = !t.completed;
		return {
			...t,
			completed,
			...(completed && options?.completedMinutes != null
				? { completedMinutes: options.completedMinutes }
				: {}),
		};
	});
	await saveTasksForDate(date, updated);
	return updated;
}

/** Add a new task for the date and persist. Returns the created item. */
export async function addTask(
	date: Date,
	title: string,
	subtitle?: string,
): Promise<ActivityItem> {
	const tasks = await getTasksForDate(date);
	const id = await nextId();
	const newTask: ActivityItem = {
		id,
		title,
		subtitle: subtitle ?? "",
		icon: "edit_note",
		iconBg: "primary",
		completed: false,
	};
	tasks.push(newTask);
	await saveTasksForDate(date, tasks);
	return newTask;
}

/** Update a checklist task by id. */
export async function updateTask(
	date: Date,
	taskId: string,
	patch: Partial<
		Pick<ActivityItem, "title" | "subtitle" | "completedMinutes" | "category">
	>,
): Promise<ActivityItem[]> {
	const tasks = await getTasksForDate(date);
	const updated = tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t));
	await saveTasksForDate(date, updated);
	return updated;
}

/** Delete a task (optional, for future use). */
export async function removeTask(
	date: Date,
	taskId: string,
): Promise<ActivityItem[]> {
	const tasks = (await getTasksForDate(date)).filter((t) => t.id !== taskId);
	await saveTasksForDate(date, tasks);
	return tasks;
}

/** Tasks for each date in range [start, end) for analytics. */
export async function getTasksForDateRange(
	start: Date,
	end: Date,
): Promise<{ date: string; tasks: ActivityItem[] }[]> {
	const out: { date: string; tasks: ActivityItem[] }[] = [];
	const cur = new Date(start);
	while (cur < end) {
		const key = dateKey(cur);
		const tasks = await getTasksForDate(cur);
		out.push({ date: key, tasks });
		cur.setDate(cur.getDate() + 1);
	}
	return out;
}

/** Load user settings for the current user. Returns defaults if none saved or not logged in. */
export async function getUserSettings(): Promise<UserSettings> {
	const uid = await userId();
	if (!uid) return { ...DEFAULT_SETTINGS };
	try {
		const key = SETTINGS_KEY_PREFIX + uid;
		const raw = await AsyncStorage.getItem(key);
		if (!raw) return { ...DEFAULT_SETTINGS };
		const parsed = JSON.parse(raw) as Partial<UserSettings>;
		return {
			notificationsEnabled:
				parsed.notificationsEnabled ?? DEFAULT_SETTINGS.notificationsEnabled,
		};
	} catch {
		return { ...DEFAULT_SETTINGS };
	}
}

/** Save user settings for the current user. No-op if not logged in. */
export async function saveUserSettings(settings: UserSettings): Promise<void> {
	const uid = await userId();
	if (!uid) return;
	const key = SETTINGS_KEY_PREFIX + uid;
	await AsyncStorage.setItem(key, JSON.stringify(settings));
}

// --- Scheduled activities (calendar / recommendation system) ---

async function scheduledKey(uid: string): Promise<string> {
	return SCHEDULED_KEY_PREFIX + uid;
}

async function scheduledIdKey(uid: string): Promise<string> {
	return SCHEDULED_ID_KEY_PREFIX + uid;
}

const DEFAULT_CATEGORY = "Other" as const;

async function getScheduledRaw(): Promise<ScheduledActivity[]> {
	const uid = await userId();
	if (!uid) return [];
	try {
		const key = await scheduledKey(uid);
		const raw = await AsyncStorage.getItem(key);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as (ScheduledActivity & {
			category?: string;
		})[];
		if (!Array.isArray(parsed)) return [];
		return parsed.map((a) => {
			const date = a.date ?? "";
			const raw = a as ScheduledActivity & {
				deadline?: string;
				completed?: boolean;
			};
			return {
				...a,
				category: (a.category ??
					DEFAULT_CATEGORY) as ScheduledActivity["category"],
				deadline: raw.deadline ?? date,
				completed: raw.completed ?? false,
			};
		});
	} catch {
		return [];
	}
}

async function nextScheduledId(): Promise<string> {
	const uid = await userId();
	const key = uid ? await scheduledIdKey(uid) : "diem_scheduled_id";
	const raw = await AsyncStorage.getItem(key);
	const n = raw ? Number.parseInt(raw, 10) + 1 : 1;
	await AsyncStorage.setItem(key, String(n));
	return `sched_${n}`;
}

/** All scheduled activities for the current user (for recommendations / full calendar). */
export async function getAllScheduledActivities(): Promise<
	ScheduledActivity[]
> {
	return getScheduledRaw();
}

/** Scheduled activities for a single date (YYYY-MM-DD). */
export async function getScheduledActivitiesForDate(
	date: Date,
): Promise<ScheduledActivity[]> {
	const key = dateKey(date);
	const all = await getScheduledRaw();
	return all.filter((a) => a.date === key);
}

/** Scheduled activities for a week starting at the given date (inclusive, 7 days). */
export async function getScheduledActivitiesForWeek(
	startDate: Date,
): Promise<ScheduledActivity[]> {
	const all = await getScheduledRaw();
	const start = dateKey(startDate);
	const endDate = new Date(startDate);
	endDate.setDate(endDate.getDate() + 7);
	const end = dateKey(endDate);
	return all.filter((a) => a.date >= start && a.date < end);
}

/** Add a scheduled activity. Returns the created item with id. */
export async function addScheduledActivity(
	activity: Omit<ScheduledActivity, "id">,
): Promise<ScheduledActivity> {
	const uid = await userId();
	if (!uid) throw new Error("Not logged in");
	const id = await nextScheduledId();
	const item: ScheduledActivity = { ...activity, id };
	const all = await getScheduledRaw();
	all.push(item);
	await AsyncStorage.setItem(await scheduledKey(uid), JSON.stringify(all));
	return item;
}

/** Update an existing scheduled activity by id. */
export async function updateScheduledActivity(
	id: string,
	patch: Partial<Omit<ScheduledActivity, "id">>,
): Promise<ScheduledActivity | null> {
	const uid = await userId();
	if (!uid) return null;
	const all = await getScheduledRaw();
	const idx = all.findIndex((a) => a.id === id);
	if (idx < 0) return null;
	all[idx] = { ...all[idx], ...patch };
	await AsyncStorage.setItem(await scheduledKey(uid), JSON.stringify(all));
	return all[idx] ?? null;
}

/** Remove a scheduled activity by id. */
export async function removeScheduledActivity(id: string): Promise<boolean> {
	const uid = await userId();
	if (!uid) return false;
	const all = await getScheduledRaw();
	const filtered = all.filter((a) => a.id !== id);
	if (filtered.length === all.length) return false;
	await AsyncStorage.setItem(await scheduledKey(uid), JSON.stringify(filtered));
	return true;
}
