import type ActivityHistory from "../../data/models/ActivityHistory";
import type {
	HeuristicNetArcRepository,
	HeuristicNetPairRepository,
	MarkovTransitionRepository,
} from "../../data/repositories";
import { HeuristicNetMiner } from "../hnet/miner";
import { MarkovTransitionMiner } from "../transition/miner";
import type { CompletedActivityEvent, MinedHeuristicBatch } from "../types";

export interface HistoryAnalyzerResult {
	completedEvents: number;
	markovUpdates: number;
	hnetArcUpdates: number;
	hnetPairUpdates: number;
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

	constructor() {
		this.markovMiner = new MarkovTransitionMiner();
		this.hnetMiner = new HeuristicNetMiner();
	}

	async replay(
		historyRows: ActivityHistory[],
		repositories: {
			markov: MarkovTransitionRepository;
			hnetArc: HeuristicNetArcRepository;
			hnetPair: HeuristicNetPairRepository;
		},
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

		return {
			completedEvents: completedEvents.length,
			markovUpdates: markovUpdates.length,
			hnetArcUpdates: hnetUpdates.arcs.length,
			hnetPairUpdates: hnetUpdates.pairs.length,
		};
	}

	mineBatch(historyRows: ActivityHistory[]): {
		markov: ReturnType<MarkovTransitionMiner["mineCounts"]>;
		hnet: MinedHeuristicBatch;
	} {
		const completedEvents = historyRows
			.map(toCompletedEvent)
			.filter((event): event is CompletedActivityEvent => event !== null)
			.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

		return {
			markov: this.markovMiner.mineCounts(completedEvents),
			hnet: this.hnetMiner.mineCounts(completedEvents),
		};
	}
}
