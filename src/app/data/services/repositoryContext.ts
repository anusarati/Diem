import type { Database } from "@nozbe/watermelondb";
import { getDatabase } from "../../../data/database";
import {
	ActivityRepository,
	ConstraintRepository,
	FrequencyEmaStateRepository,
	HeuristicNetArcRepository,
	HeuristicNetPairRepository,
	HistoryRepository,
	MarkovTransitionRepository,
	ScheduleRepository,
	UserBehaviorRepository,
	UserRepository,
} from "../../../data/repositories";
import { getCurrentUser } from "../auth";

export const DEFAULT_ACTIVITY_COLOR = "#6B7280";
export const DEFAULT_CATEGORY_ID = "Other";
export const DEFAULT_ACTIVITY_PRIORITY = 3;
export const DEFAULT_ACTIVITY_DURATION = 30;

export interface RepoBundle {
	database: Database;
	activity: ActivityRepository;
	constraint: ConstraintRepository;
	history: HistoryRepository;
	schedule: ScheduleRepository;
	userBehavior: UserBehaviorRepository;
	user: UserRepository;
	hnetArc: HeuristicNetArcRepository;
	hnetPair: HeuristicNetPairRepository;
	markov: MarkovTransitionRepository;
	frequencyEma: FrequencyEmaStateRepository;
}

export function makeRepositories(scope: string): RepoBundle {
	const database = getDatabase(scope);
	return {
		database,
		activity: new ActivityRepository(database),
		constraint: new ConstraintRepository(database),
		history: new HistoryRepository(database),
		schedule: new ScheduleRepository(database),
		userBehavior: new UserBehaviorRepository(database),
		user: new UserRepository(getDatabase("default")),
		hnetArc: new HeuristicNetArcRepository(database),
		hnetPair: new HeuristicNetPairRepository(database),
		markov: new MarkovTransitionRepository(database),
		frequencyEma: new FrequencyEmaStateRepository(database),
	};
}

export async function resolveCurrentScope(): Promise<{
	scope: string;
	userId: string | null;
}> {
	const currentUser = await getCurrentUser();
	return {
		scope: currentUser?.id ?? "guest",
		userId: currentUser?.id ?? null,
	};
}

export async function withScopedRepositories<T>(
	runner: (
		repositories: RepoBundle,
		context: { scope: string; userId: string | null },
	) => Promise<T>,
): Promise<T> {
	const context = await resolveCurrentScope();
	return runner(makeRepositories(context.scope), context);
}

export function dayRange(date: Date): { start: Date; end: Date } {
	const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const end = new Date(start);
	end.setDate(end.getDate() + 1);
	return { start, end };
}

/** Week range: Monday 00:00:00 through next Monday 00:00:00 (exclusive). */
export function weekRange(date: Date): { start: Date; end: Date } {
	const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const day = d.getDay();
	const diff = d.getDate() - day + (day === 0 ? -6 : 1);
	const start = new Date(d);
	start.setDate(diff);
	const end = new Date(start);
	end.setDate(end.getDate() + 7);
	return { start, end };
}

export function dateKey(date: Date): string {
	return date.toISOString().slice(0, 10);
}

export function currentTimeZone(): string {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
	} catch {
		return "UTC";
	}
}
