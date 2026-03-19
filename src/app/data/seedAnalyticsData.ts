import { deriveLocalBucketKeys } from "../../mining/frequency/buckets";
import { HistoryAnalyzer } from "../../mining/processor/history_analyzer";
import {
	ActivitySource,
	EventStatus,
	Replaceability,
} from "../../types/domain";
import {
	currentTimeZone,
	DEFAULT_ACTIVITY_COLOR,
	DEFAULT_ACTIVITY_PRIORITY,
	DEFAULT_CATEGORY_ID,
	weekRange,
	withScopedRepositories,
} from "./services/repositoryContext";

const BLOCK_DURATION_MIN = 25;

/** University-student-style activities for seed data. */
const STUDENT_ACTIVITY_NAMES = [
	"Lecture",
	"Study",
	"Exercise",
	"Meals",
	"Break",
	"Social",
	"Chores",
	"Relax",
] as const;

/** Category per activity so Day/Week/Month breakdowns show variation. */
const ACTIVITY_CATEGORY: Record<
	(typeof STUDENT_ACTIVITY_NAMES)[number],
	string
> = {
	Lecture: "Study",
	Study: "Study",
	Exercise: "Fitness",
	Meals: "Personal",
	Break: "Personal",
	Social: "Social",
	Chores: "Personal",
	Relax: "Personal",
};

/** Schedule: day offset (0=Mon), hour, minute, activity name. 45-min spacing so consecutive blocks form Markov transitions. */
const STUDENT_WEEK_SCHEDULE: ReadonlyArray<{
	dayOffset: number;
	hour: number;
	minute: number;
	activityName: (typeof STUDENT_ACTIVITY_NAMES)[number];
}> = [
	// Monday
	{ dayOffset: 0, hour: 8, minute: 0, activityName: "Meals" },
	{ dayOffset: 0, hour: 8, minute: 45, activityName: "Break" },
	{ dayOffset: 0, hour: 9, minute: 30, activityName: "Lecture" },
	{ dayOffset: 0, hour: 10, minute: 15, activityName: "Study" },
	{ dayOffset: 0, hour: 11, minute: 0, activityName: "Meals" },
	{ dayOffset: 0, hour: 11, minute: 45, activityName: "Lecture" },
	{ dayOffset: 0, hour: 12, minute: 30, activityName: "Study" },
	{ dayOffset: 0, hour: 13, minute: 15, activityName: "Break" },
	{ dayOffset: 0, hour: 14, minute: 0, activityName: "Exercise" },
	{ dayOffset: 0, hour: 14, minute: 45, activityName: "Meals" },
	{ dayOffset: 0, hour: 15, minute: 30, activityName: "Study" },
	{ dayOffset: 0, hour: 16, minute: 15, activityName: "Relax" },
	// Tuesday
	{ dayOffset: 1, hour: 8, minute: 0, activityName: "Meals" },
	{ dayOffset: 1, hour: 8, minute: 45, activityName: "Study" },
	{ dayOffset: 1, hour: 9, minute: 30, activityName: "Lecture" },
	{ dayOffset: 1, hour: 10, minute: 15, activityName: "Break" },
	{ dayOffset: 1, hour: 11, minute: 0, activityName: "Meals" },
	{ dayOffset: 1, hour: 11, minute: 45, activityName: "Study" },
	{ dayOffset: 1, hour: 12, minute: 30, activityName: "Lecture" },
	{ dayOffset: 1, hour: 13, minute: 15, activityName: "Break" },
	{ dayOffset: 1, hour: 14, minute: 0, activityName: "Chores" },
	{ dayOffset: 1, hour: 14, minute: 45, activityName: "Social" },
	{ dayOffset: 1, hour: 15, minute: 30, activityName: "Meals" },
	{ dayOffset: 1, hour: 16, minute: 15, activityName: "Study" },
	{ dayOffset: 1, hour: 17, minute: 0, activityName: "Relax" },
	// Wednesday
	{ dayOffset: 2, hour: 8, minute: 0, activityName: "Meals" },
	{ dayOffset: 2, hour: 8, minute: 45, activityName: "Lecture" },
	{ dayOffset: 2, hour: 9, minute: 30, activityName: "Study" },
	{ dayOffset: 2, hour: 10, minute: 15, activityName: "Break" },
	{ dayOffset: 2, hour: 11, minute: 0, activityName: "Meals" },
	{ dayOffset: 2, hour: 11, minute: 45, activityName: "Lecture" },
	{ dayOffset: 2, hour: 12, minute: 30, activityName: "Study" },
	{ dayOffset: 2, hour: 13, minute: 15, activityName: "Exercise" },
	{ dayOffset: 2, hour: 14, minute: 0, activityName: "Break" },
	{ dayOffset: 2, hour: 14, minute: 45, activityName: "Meals" },
	{ dayOffset: 2, hour: 15, minute: 30, activityName: "Study" },
	{ dayOffset: 2, hour: 16, minute: 15, activityName: "Social" },
	{ dayOffset: 2, hour: 17, minute: 0, activityName: "Relax" },
	// Thursday
	{ dayOffset: 3, hour: 8, minute: 0, activityName: "Meals" },
	{ dayOffset: 3, hour: 8, minute: 45, activityName: "Study" },
	{ dayOffset: 3, hour: 9, minute: 30, activityName: "Lecture" },
	{ dayOffset: 3, hour: 10, minute: 15, activityName: "Break" },
	{ dayOffset: 3, hour: 11, minute: 0, activityName: "Meals" },
	{ dayOffset: 3, hour: 11, minute: 45, activityName: "Study" },
	{ dayOffset: 3, hour: 12, minute: 30, activityName: "Lecture" },
	{ dayOffset: 3, hour: 13, minute: 15, activityName: "Study" },
	{ dayOffset: 3, hour: 14, minute: 0, activityName: "Break" },
	{ dayOffset: 3, hour: 14, minute: 45, activityName: "Exercise" },
	{ dayOffset: 3, hour: 15, minute: 30, activityName: "Meals" },
	{ dayOffset: 3, hour: 16, minute: 15, activityName: "Study" },
	{ dayOffset: 3, hour: 17, minute: 0, activityName: "Relax" },
	// Friday (lighter)
	{ dayOffset: 4, hour: 8, minute: 0, activityName: "Meals" },
	{ dayOffset: 4, hour: 8, minute: 45, activityName: "Lecture" },
	{ dayOffset: 4, hour: 9, minute: 30, activityName: "Break" },
	{ dayOffset: 4, hour: 10, minute: 15, activityName: "Study" },
	{ dayOffset: 4, hour: 11, minute: 0, activityName: "Meals" },
	{ dayOffset: 4, hour: 11, minute: 45, activityName: "Study" },
	{ dayOffset: 4, hour: 12, minute: 30, activityName: "Break" },
	{ dayOffset: 4, hour: 13, minute: 15, activityName: "Social" },
	{ dayOffset: 4, hour: 14, minute: 0, activityName: "Meals" },
	{ dayOffset: 4, hour: 14, minute: 45, activityName: "Study" },
	{ dayOffset: 4, hour: 15, minute: 30, activityName: "Relax" },
];

/** Previous week: fewer blocks, more Study/Chores so Month view differs from Week. */
const PREVIOUS_WEEK_SCHEDULE: ReadonlyArray<{
	dayOffset: number;
	hour: number;
	minute: number;
	activityName: (typeof STUDENT_ACTIVITY_NAMES)[number];
}> = [
	{ dayOffset: 0, hour: 9, minute: 0, activityName: "Study" },
	{ dayOffset: 0, hour: 9, minute: 45, activityName: "Study" },
	{ dayOffset: 0, hour: 10, minute: 30, activityName: "Break" },
	{ dayOffset: 0, hour: 11, minute: 15, activityName: "Chores" },
	{ dayOffset: 0, hour: 12, minute: 0, activityName: "Meals" },
	{ dayOffset: 0, hour: 12, minute: 45, activityName: "Relax" },
	{ dayOffset: 1, hour: 9, minute: 0, activityName: "Lecture" },
	{ dayOffset: 1, hour: 9, minute: 45, activityName: "Study" },
	{ dayOffset: 1, hour: 10, minute: 30, activityName: "Chores" },
	{ dayOffset: 1, hour: 11, minute: 15, activityName: "Meals" },
	{ dayOffset: 1, hour: 12, minute: 0, activityName: "Study" },
	{ dayOffset: 1, hour: 12, minute: 45, activityName: "Relax" },
	{ dayOffset: 2, hour: 9, minute: 0, activityName: "Study" },
	{ dayOffset: 2, hour: 9, minute: 45, activityName: "Study" },
	{ dayOffset: 2, hour: 10, minute: 30, activityName: "Break" },
	{ dayOffset: 2, hour: 11, minute: 15, activityName: "Meals" },
	{ dayOffset: 2, hour: 12, minute: 0, activityName: "Exercise" },
	{ dayOffset: 2, hour: 12, minute: 45, activityName: "Relax" },
	{ dayOffset: 3, hour: 9, minute: 0, activityName: "Chores" },
	{ dayOffset: 3, hour: 9, minute: 45, activityName: "Study" },
	{ dayOffset: 3, hour: 10, minute: 30, activityName: "Meals" },
	{ dayOffset: 3, hour: 11, minute: 15, activityName: "Social" },
	{ dayOffset: 3, hour: 12, minute: 0, activityName: "Study" },
	{ dayOffset: 3, hour: 12, minute: 45, activityName: "Relax" },
	{ dayOffset: 4, hour: 9, minute: 0, activityName: "Study" },
	{ dayOffset: 4, hour: 9, minute: 45, activityName: "Break" },
	{ dayOffset: 4, hour: 10, minute: 30, activityName: "Meals" },
	{ dayOffset: 4, hour: 11, minute: 15, activityName: "Relax" },
];

export interface SeedResult {
	historyCreated: number;
	markovUpdates: number;
	activitiesUsed: number;
}

/**
 * Seeds completed activity history for the current week with a realistic
 * university student schedule (lectures, study, meals, exercise, social, etc.)
 * and runs the history analyzer so the causal net updates.
 */
export async function seedAnalyticsDataForWeek(): Promise<SeedResult> {
	return withScopedRepositories(async (repos) => {
		const tz = currentTimeZone();
		const activities = await repos.activity.listAll();
		const nameToActivity = new Map(activities.map((a) => [a.name, a]));

		for (const name of STUDENT_ACTIVITY_NAMES) {
			if (nameToActivity.has(name)) continue;
			const a = await repos.activity.create({
				categoryId: ACTIVITY_CATEGORY[name] ?? DEFAULT_CATEGORY_ID,
				name,
				priority: DEFAULT_ACTIVITY_PRIORITY,
				defaultDuration: BLOCK_DURATION_MIN,
				isReplaceable: false,
				color: DEFAULT_ACTIVITY_COLOR,
				createdAt: new Date(),
			});
			nameToActivity.set(name, a);
		}

		const now = new Date();
		const endOfToday = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate() + 1,
		);
		const { start: weekStart } = weekRange(now);
		const previousWeekStart = new Date(weekStart);
		previousWeekStart.setDate(previousWeekStart.getDate() - 7);

		let historyCreated = 0;

		const seedSlots = (
			rangeStart: Date,
			slots: ReadonlyArray<{
				dayOffset: number;
				hour: number;
				minute: number;
				activityName: (typeof STUDENT_ACTIVITY_NAMES)[number];
			}>,
			beforeEnd?: Date,
		) => {
			return (async () => {
				for (const slot of slots) {
					const at = new Date(rangeStart);
					at.setDate(at.getDate() + slot.dayOffset);
					at.setHours(slot.hour, slot.minute, 0, 0);
					if (beforeEnd != null && at.getTime() >= beforeEnd.getTime())
						continue;

					const activity = nameToActivity.get(slot.activityName);
					if (!activity) continue;

					const endTime = new Date(
						at.getTime() + BLOCK_DURATION_MIN * 60 * 1000,
					);
					const bucketKeys = deriveLocalBucketKeys(at, tz);

					await repos.history.create({
						activityId: activity.id,
						predictedStartTime: at,
						predictedDuration: BLOCK_DURATION_MIN,
						actualStartTime: at,
						actualDuration: BLOCK_DURATION_MIN,
						localDayBucket: bucketKeys.dayBucket,
						localWeekBucket: bucketKeys.weekBucket,
						localMonthBucket: bucketKeys.monthBucket,
						bucketTimezone: bucketKeys.timeZone,
						wasCompleted: true,
						wasSkipped: false,
						wasReplaced: false,
						createdAt: at,
					});
					historyCreated++;

					await repos.schedule.create({
						activityId: activity.id,
						categoryId: activity.categoryId,
						title: activity.name,
						startTime: at,
						endTime,
						duration: BLOCK_DURATION_MIN,
						status: EventStatus.COMPLETED,
						replaceabilityStatus: Replaceability.SOFT,
						priority: DEFAULT_ACTIVITY_PRIORITY,
						isRecurring: false,
						source: ActivitySource.USER_CREATED,
						isLocked: false,
						createdAt: now,
						updatedAt: now,
					});
				}
			})();
		};

		await seedSlots(previousWeekStart, PREVIOUS_WEEK_SCHEDULE);
		await seedSlots(weekStart, STUDENT_WEEK_SCHEDULE, endOfToday);

		const rangeStartForReplay = new Date(previousWeekStart);
		rangeStartForReplay.setHours(0, 0, 0, 0);
		const historyRows = await repos.history.listForRange(
			rangeStartForReplay,
			endOfToday,
		);
		const analyzer = new HistoryAnalyzer();
		const result = await analyzer.replay(
			historyRows,
			{
				markov: repos.markov,
				hnetArc: repos.hnetArc,
				hnetPair: repos.hnetPair,
				frequencyEma: repos.frequencyEma,
				userBehavior: repos.userBehavior,
			},
			tz,
		);

		return {
			historyCreated,
			markovUpdates: result.markovUpdates,
			activitiesUsed: nameToActivity.size,
		};
	});
}
