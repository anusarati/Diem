import {
	MarkovTransitionMiner,
	type MarkovTransitionMinerOptions,
} from "../../../mining/transition/miner";
import type { CompletedActivityEvent } from "../../../mining/types";
import type { RepoBundle } from "./repositoryContext";

function endOfTodayLocal(now: Date): Date {
	return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
}

/**
 * Rebuilds `markov_transition_counts` from *current* completed history.
 *
 * This is intentionally a "recompute from scratch" approach so we don't
 * accumulate stale transition counts after deletions/edits.
 */
export async function rebuildMarkovTransitionCountsFromHistory(
	repositories: RepoBundle,
	options: MarkovTransitionMinerOptions = {},
): Promise<void> {
	const now = new Date();
	const endOfToday = endOfTodayLocal(now);

	// Include the full earlier range so cross-day transitions before "today"
	// can still be represented, but do not include events after today.
	const historyRows = await repositories.history.listForRange(
		new Date(0),
		endOfToday,
	);

	await repositories.markov.clear();

	const completedEvents: CompletedActivityEvent[] = historyRows
		.map((history) => {
			if (!history.wasCompleted || !history.actualStartTime) return null;

			const durationMinutes =
				history.actualDuration ?? history.predictedDuration ?? 15;
			if (durationMinutes <= 0) return null;

			return {
				activityId: history.activityId,
				startTime: history.actualStartTime,
				durationMinutes,
			};
		})
		.filter((event): event is CompletedActivityEvent => event !== null)
		.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

	if (completedEvents.length === 0) return;

	const markovMiner = new MarkovTransitionMiner(options);
	const updates = markovMiner.mineCounts(completedEvents);

	for (const update of updates) {
		await repositories.markov.incrementTransition(
			update.fromActivityId,
			update.toActivityId,
			update.lastObservedAt,
			update.count,
		);
	}
}
