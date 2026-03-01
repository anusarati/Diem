import type { Database } from "@nozbe/watermelondb";
import {
	FrequencyEmaStateRepository,
	HistoryRepository,
	UserBehaviorRepository,
} from "../../data/repositories";
import { deriveLocalBucketKeys } from "../frequency/buckets";
import {
	FrequencyEmaMiner,
	type FrequencyEmaReconcileResult,
} from "../frequency/ema_miner";
import type { CompletedActivityEvent } from "../types";

export interface RecordCompletionInput {
	historyId?: string;
	activityId: string;
	predictedStartTime: Date;
	predictedDuration: number;
	actualStartTime: Date;
	actualDuration: number;
	notes?: string;
	timeZone: string;
	wasSkipped?: boolean;
	wasReplaced?: boolean;
}

export class HistoryWriteService {
	private readonly historyRepository: HistoryRepository;
	private readonly frequencyMiner: FrequencyEmaMiner;
	private readonly frequencyStateRepository: FrequencyEmaStateRepository;
	private readonly userBehaviorRepository: UserBehaviorRepository;

	constructor(
		database: Database,
		options: {
			frequencyMiner?: FrequencyEmaMiner;
			historyRepository?: HistoryRepository;
			frequencyStateRepository?: FrequencyEmaStateRepository;
			userBehaviorRepository?: UserBehaviorRepository;
		} = {},
	) {
		this.frequencyMiner = options.frequencyMiner ?? new FrequencyEmaMiner();
		this.historyRepository =
			options.historyRepository ?? new HistoryRepository(database);
		this.frequencyStateRepository =
			options.frequencyStateRepository ??
			new FrequencyEmaStateRepository(database);
		this.userBehaviorRepository =
			options.userBehaviorRepository ?? new UserBehaviorRepository(database);
	}

	async recordCompletion(input: RecordCompletionInput): Promise<string> {
		const bucketKeys = deriveLocalBucketKeys(
			input.actualStartTime,
			input.timeZone,
		);
		const history = await this.historyRepository.upsertCompletion({
			historyId: input.historyId,
			activityId: input.activityId,
			predictedStartTime: input.predictedStartTime,
			predictedDuration: input.predictedDuration,
			actualStartTime: input.actualStartTime,
			actualDuration: input.actualDuration,
			localDayBucket: bucketKeys.dayBucket,
			localWeekBucket: bucketKeys.weekBucket,
			localMonthBucket: bucketKeys.monthBucket,
			bucketTimezone: bucketKeys.timeZone,
			wasSkipped: input.wasSkipped,
			wasReplaced: input.wasReplaced,
			notes: input.notes,
		});

		const completionEvent: CompletedActivityEvent = {
			activityId: input.activityId,
			startTime: input.actualStartTime,
			durationMinutes: input.actualDuration,
		};
		await this.frequencyMiner.ingestCompletion(
			completionEvent,
			{
				emaStateRepository: this.frequencyStateRepository,
				userBehaviorRepository: this.userBehaviorRepository,
			},
			bucketKeys.timeZone,
		);

		return history.id;
	}

	async markActivityDirty(activityId: string): Promise<void> {
		await this.frequencyStateRepository.markDirtyForActivity(
			activityId,
			new Date(),
		);
	}

	async reconcileLearnedFrequency(
		timeZone: string,
		staleActivities?: string[],
	): Promise<FrequencyEmaReconcileResult> {
		return this.frequencyMiner.reconcile({
			repositories: {
				historyRepository: this.historyRepository,
				emaStateRepository: this.frequencyStateRepository,
				userBehaviorRepository: this.userBehaviorRepository,
			},
			timeZone,
			staleActivities,
		});
	}
}
