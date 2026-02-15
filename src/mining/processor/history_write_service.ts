import type { Database } from "@nozbe/watermelondb";
import type ActivityHistory from "../../data/models/ActivityHistory";
import {
	FrequencyEmaStateRepository,
	UserBehaviorRepository,
} from "../../data/repositories";
import { deriveLocalBucketKeys } from "../frequency/buckets";
import {
	FrequencyEmaMiner,
	type FrequencyEmaReconcileResult,
} from "../frequency/ema_miner";
import type { CompletedActivityEvent } from "../types";

export interface RecordCompletionInput {
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
	private readonly frequencyMiner: FrequencyEmaMiner;
	private readonly frequencyStateRepository: FrequencyEmaStateRepository;
	private readonly userBehaviorRepository: UserBehaviorRepository;

	constructor(
		private readonly database: Database,
		options: {
			frequencyMiner?: FrequencyEmaMiner;
		} = {},
	) {
		this.frequencyMiner = options.frequencyMiner ?? new FrequencyEmaMiner();
		this.frequencyStateRepository = new FrequencyEmaStateRepository(database);
		this.userBehaviorRepository = new UserBehaviorRepository(database);
	}

	async recordCompletion(input: RecordCompletionInput): Promise<string> {
		const bucketKeys = deriveLocalBucketKeys(
			input.actualStartTime,
			input.timeZone,
		);
		const history = await this.database.write(async () =>
			this.database
				.get<ActivityHistory>("activity_history")
				.create((record) => {
					record.activityId = input.activityId;
					record.predictedStartTime = input.predictedStartTime;
					record.predictedDuration = input.predictedDuration;
					record.actualStartTime = input.actualStartTime;
					record.actualDuration = input.actualDuration;
					record.localDayBucket = bucketKeys.dayBucket;
					record.localWeekBucket = bucketKeys.weekBucket;
					record.localMonthBucket = bucketKeys.monthBucket;
					record.bucketTimezone = bucketKeys.timeZone;
					record.wasCompleted = true;
					record.wasSkipped = input.wasSkipped ?? false;
					record.wasReplaced = input.wasReplaced ?? false;
					record.notes = input.notes;
					record.createdAt = new Date();
				}),
		);

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
			database: this.database,
			repositories: {
				emaStateRepository: this.frequencyStateRepository,
				userBehaviorRepository: this.userBehaviorRepository,
			},
			timeZone,
			staleActivities,
		});
	}
}
