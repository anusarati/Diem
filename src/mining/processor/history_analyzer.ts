import type { Database } from "@nozbe/watermelondb";
import type ActivityHistory from "../../data/models/ActivityHistory";
import type {
	FrequencyEmaStateRepository,
	HeuristicNetArcRepository,
	HeuristicNetPairRepository,
	MarkovTransitionRepository,
	UserBehaviorRepository,
} from "../../data/repositories";
import { FrequencyEmaMiner } from "../frequency/ema_miner";
import { HeuristicNetMiner } from "../hnet/miner";
import { MarkovTransitionMiner } from "../transition/miner";
import type { CompletedActivityEvent, MinedHeuristicBatch } from "../types";

export interface HistoryAnalyzerResult {
	completedEvents: number;
	markovUpdates: number;
	hnetArcUpdates: number;
	hnetPairUpdates: number;
	frequencyScopeUpdates: number;
	frequencyPublishes: number;
}

const toCompletedEvent = (
	history: ActivityHistory,
): CompletedActivityEvent | null => {
	if (!history.wasCompleted || !history.actualStartTime) {
		return null;
	}

	const durationMinutes =
		history.actualDuration ?? history.predictedDuration ?? 15;
	if (durationMinutes <= 0) {
		return null;
	}

	return {
		activityId: history.activityId,
		startTime: history.actualStartTime,
		durationMinutes,
	};
};

export class HistoryAnalyzer {
	private readonly markovMiner: MarkovTransitionMiner;
	private readonly hnetMiner: HeuristicNetMiner;
	private readonly frequencyMiner: FrequencyEmaMiner;

	constructor() {
		this.markovMiner = new MarkovTransitionMiner();
		this.hnetMiner = new HeuristicNetMiner();
		this.frequencyMiner = new FrequencyEmaMiner();
	}

	async replay(
		historyRows: ActivityHistory[],
		repositories: {
			markov: MarkovTransitionRepository;
			hnetArc: HeuristicNetArcRepository;
			hnetPair: HeuristicNetPairRepository;
			frequencyEma: FrequencyEmaStateRepository;
			userBehavior: UserBehaviorRepository;
		},
		timeZone = "UTC",
	): Promise<HistoryAnalyzerResult> {
		const completedEvents = historyRows
			.map(toCompletedEvent)
			.filter((event): event is CompletedActivityEvent => event !== null)
			.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

		const markovUpdates = await this.markovMiner.persist(
			completedEvents,
			repositories.markov,
		);

		const hnetUpdates = await this.hnetMiner.persist(
			completedEvents,
			repositories.hnetArc,
			repositories.hnetPair,
		);

		let frequencyScopeUpdates = 0;
		let frequencyPublishes = 0;
		for (const event of completedEvents) {
			const result = await this.frequencyMiner.ingestCompletion(
				event,
				{
					emaStateRepository: repositories.frequencyEma,
					userBehaviorRepository: repositories.userBehavior,
				},
				timeZone,
			);
			frequencyScopeUpdates += result.updatedScopes;
			frequencyPublishes += result.publishedScopes;
		}

		return {
			completedEvents: completedEvents.length,
			markovUpdates: markovUpdates.length,
			hnetArcUpdates: hnetUpdates.arcs.length,
			hnetPairUpdates: hnetUpdates.pairs.length,
			frequencyScopeUpdates,
			frequencyPublishes,
		};
	}

	async reconcileFrequency(
		database: Database,
		repositories: {
			frequencyEma: FrequencyEmaStateRepository;
			userBehavior: UserBehaviorRepository;
		},
		timeZone: string,
		staleActivities?: string[],
	) {
		return this.frequencyMiner.reconcile({
			database,
			repositories: {
				emaStateRepository: repositories.frequencyEma,
				userBehaviorRepository: repositories.userBehavior,
			},
			timeZone,
			staleActivities,
		});
	}

	mineBatch(historyRows: ActivityHistory[]): {
		markov: ReturnType<MarkovTransitionMiner["mineCounts"]>;
		hnet: MinedHeuristicBatch;
		completedEvents: CompletedActivityEvent[];
	} {
		const completedEvents = historyRows
			.map(toCompletedEvent)
			.filter((event): event is CompletedActivityEvent => event !== null)
			.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

		return {
			markov: this.markovMiner.mineCounts(completedEvents),
			hnet: this.hnetMiner.mineCounts(completedEvents),
			completedEvents,
		};
	}
}
