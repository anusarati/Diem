import type { Database } from "@nozbe/watermelondb";
import { Q } from "@nozbe/watermelondb";
import type ActivityHistory from "../../data/models/ActivityHistory";
import type {
	FrequencyEmaStateRepository,
	UserBehaviorRepository,
} from "../../data/repositories";
import { BehaviorPeriod, FrequencyEmaScope } from "../../types/domain";
import type { CompletedActivityEvent } from "../types";
import {
	bucketKeyForScope,
	compareBucketKeys,
	deriveLocalBucketKeys,
	nextBucketKey,
} from "./buckets";

const DEFAULT_DAILY_ALPHA = 0.25;
const DEFAULT_WEEKLY_ALPHA = 0.2;
const DEFAULT_MONTHLY_ALPHA = 0.15;
const DEFAULT_STALE_AFTER_MS = 24 * 60 * 60 * 1000;

const EMA_SCOPES: readonly FrequencyEmaScope[] = [
	FrequencyEmaScope.DAILY,
	FrequencyEmaScope.WEEKLY,
	FrequencyEmaScope.MONTHLY,
];

interface EmaAccumulatorState {
	emaValue: number;
	sampleSize: number;
	lastClosedBucketKey?: string;
}

interface RawBucketCountRow {
	activity_id: string;
	bucket_key: string;
	bucket_count: number | string;
}

export interface FrequencyEmaMinerOptions {
	dailyAlpha?: number;
	weeklyAlpha?: number;
	monthlyAlpha?: number;
	staleAfterMs?: number;
	nowProvider?: () => Date;
}

export interface FrequencyEmaRepositories {
	emaStateRepository: FrequencyEmaStateRepository;
	userBehaviorRepository: UserBehaviorRepository;
}

export interface FrequencyEmaIngestResult {
	updatedScopes: number;
	publishedScopes: number;
	dirtyScopes: number;
}

export interface FrequencyEmaReconcileInput {
	database: Database;
	repositories: FrequencyEmaRepositories;
	timeZone: string;
	staleActivities?: string[];
}

export interface FrequencyEmaReconcileResult {
	activities: number;
	rebuiltScopes: number;
	publishedScopes: number;
}

const applyObserved = (
	state: EmaAccumulatorState,
	observedCount: number,
	alpha: number,
	bucketKey: string,
): void => {
	const observed = Math.max(0, observedCount);
	if (state.sampleSize === 0) {
		state.emaValue = observed;
		state.sampleSize = 1;
		state.lastClosedBucketKey = bucketKey;
		return;
	}
	state.emaValue = state.emaValue * (1 - alpha) + observed * alpha;
	state.sampleSize += 1;
	state.lastClosedBucketKey = bucketKey;
};

const periodForScope = (scope: FrequencyEmaScope): BehaviorPeriod => {
	switch (scope) {
		case FrequencyEmaScope.DAILY:
			return BehaviorPeriod.DAILY;
		case FrequencyEmaScope.WEEKLY:
			return BehaviorPeriod.WEEKLY;
		case FrequencyEmaScope.MONTHLY:
			return BehaviorPeriod.MONTHLY;
		default:
			return BehaviorPeriod.DAILY;
	}
};

export class FrequencyEmaMiner {
	private readonly dailyAlpha: number;
	private readonly weeklyAlpha: number;
	private readonly monthlyAlpha: number;
	private readonly staleAfterMs: number;
	private readonly nowProvider: () => Date;

	constructor(options: FrequencyEmaMinerOptions = {}) {
		this.dailyAlpha = options.dailyAlpha ?? DEFAULT_DAILY_ALPHA;
		this.weeklyAlpha = options.weeklyAlpha ?? DEFAULT_WEEKLY_ALPHA;
		this.monthlyAlpha = options.monthlyAlpha ?? DEFAULT_MONTHLY_ALPHA;
		this.staleAfterMs = options.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;
		this.nowProvider = options.nowProvider ?? (() => new Date());
	}

	private alphaForScope(scope: FrequencyEmaScope): number {
		switch (scope) {
			case FrequencyEmaScope.DAILY:
				return this.dailyAlpha;
			case FrequencyEmaScope.WEEKLY:
				return this.weeklyAlpha;
			case FrequencyEmaScope.MONTHLY:
				return this.monthlyAlpha;
			default:
				return this.dailyAlpha;
		}
	}

	async ingestCompletion(
		event: CompletedActivityEvent,
		repositories: FrequencyEmaRepositories,
		timeZone: string,
	): Promise<FrequencyEmaIngestResult> {
		const now = this.nowProvider();
		const bucketKeys = deriveLocalBucketKeys(event.startTime, timeZone);
		let updatedScopes = 0;
		let publishedScopes = 0;
		let dirtyScopes = 0;

		for (const scope of EMA_SCOPES) {
			const incomingBucket = bucketKeyForScope(bucketKeys, scope);
			const alpha = this.alphaForScope(scope);
			const existing = await repositories.emaStateRepository.find(
				event.activityId,
				scope,
			);

			const state = {
				emaValue: existing?.emaValue ?? 0,
				sampleSize: existing?.sampleSize ?? 0,
				openBucketKey: existing?.openBucketKey,
				openBucketCount: existing?.openBucketCount ?? 0,
				lastClosedBucketKey: existing?.lastClosedBucketKey,
				dirty: existing?.dirty ?? false,
			};

			if (state.dirty) {
				if (state.openBucketKey === incomingBucket) {
					state.openBucketCount += 1;
				} else if (
					!state.openBucketKey ||
					compareBucketKeys(scope, incomingBucket, state.openBucketKey) > 0
				) {
					state.openBucketKey = incomingBucket;
					state.openBucketCount = 1;
				}
				await repositories.emaStateRepository.upsert({
					activityId: event.activityId,
					scope,
					emaValue: state.emaValue,
					sampleSize: state.sampleSize,
					openBucketKey: state.openBucketKey,
					openBucketCount: state.openBucketCount,
					lastClosedBucketKey: state.lastClosedBucketKey,
					dirty: true,
					updatedAt: now,
				});
				updatedScopes += 1;
				dirtyScopes += 1;
				continue;
			}

			if (!state.openBucketKey) {
				await repositories.emaStateRepository.upsert({
					activityId: event.activityId,
					scope,
					emaValue: state.emaValue,
					sampleSize: state.sampleSize,
					openBucketKey: incomingBucket,
					openBucketCount: 1,
					lastClosedBucketKey: state.lastClosedBucketKey,
					dirty: false,
					updatedAt: now,
				});
				updatedScopes += 1;
				continue;
			}

			const bucketDelta = compareBucketKeys(
				scope,
				incomingBucket,
				state.openBucketKey,
			);
			if (bucketDelta < 0) {
				await repositories.emaStateRepository.upsert({
					activityId: event.activityId,
					scope,
					emaValue: state.emaValue,
					sampleSize: state.sampleSize,
					openBucketKey: state.openBucketKey,
					openBucketCount: state.openBucketCount,
					lastClosedBucketKey: state.lastClosedBucketKey,
					dirty: true,
					updatedAt: now,
				});
				updatedScopes += 1;
				dirtyScopes += 1;
				continue;
			}

			if (bucketDelta === 0) {
				await repositories.emaStateRepository.upsert({
					activityId: event.activityId,
					scope,
					emaValue: state.emaValue,
					sampleSize: state.sampleSize,
					openBucketKey: state.openBucketKey,
					openBucketCount: state.openBucketCount + 1,
					lastClosedBucketKey: state.lastClosedBucketKey,
					dirty: false,
					updatedAt: now,
				});
				updatedScopes += 1;
				continue;
			}

			const accumulator: EmaAccumulatorState = {
				emaValue: state.emaValue,
				sampleSize: state.sampleSize,
				lastClosedBucketKey: state.lastClosedBucketKey,
			};
			applyObserved(
				accumulator,
				state.openBucketCount,
				alpha,
				state.openBucketKey,
			);
			let cursor = nextBucketKey(scope, state.openBucketKey);
			while (compareBucketKeys(scope, cursor, incomingBucket) < 0) {
				applyObserved(accumulator, 0, alpha, cursor);
				cursor = nextBucketKey(scope, cursor);
			}

			await repositories.emaStateRepository.upsert({
				activityId: event.activityId,
				scope,
				emaValue: accumulator.emaValue,
				sampleSize: accumulator.sampleSize,
				openBucketKey: incomingBucket,
				openBucketCount: 1,
				lastClosedBucketKey: accumulator.lastClosedBucketKey,
				dirty: false,
				updatedAt: now,
			});
			await repositories.userBehaviorRepository.upsertObservedFrequency({
				activityId: event.activityId,
				period: periodForScope(scope),
				value: accumulator.emaValue,
				sampleSize: accumulator.sampleSize,
				observedAt: now,
			});
			updatedScopes += 1;
			publishedScopes += 1;
		}

		return {
			updatedScopes,
			publishedScopes,
			dirtyScopes,
		};
	}

	async reconcile(
		input: FrequencyEmaReconcileInput,
	): Promise<FrequencyEmaReconcileResult> {
		const now = this.nowProvider();
		const staleBefore = new Date(now.getTime() - this.staleAfterMs);
		const dirtyOrStale =
			await input.repositories.emaStateRepository.listDirtyOrStale(staleBefore);

		const activityIds = new Set<string>(input.staleActivities ?? []);
		for (const row of dirtyOrStale) {
			activityIds.add(row.activityId);
		}
		if (!input.staleActivities || input.staleActivities.length === 0) {
			const bootstrapIds = await this.listDistinctCompletedActivityIds(
				input.database,
				input.timeZone,
			);
			for (const activityId of bootstrapIds) {
				activityIds.add(activityId);
			}
		}

		if (activityIds.size === 0) {
			return {
				activities: 0,
				rebuiltScopes: 0,
				publishedScopes: 0,
			};
		}

		const activityIdList = [...activityIds];
		let rebuiltScopes = 0;
		let publishedScopes = 0;
		const nowBucketKeys = deriveLocalBucketKeys(now, input.timeZone);

		for (const scope of EMA_SCOPES) {
			const rows = await this.fetchBucketCounts(
				input.database,
				scope,
				input.timeZone,
				activityIdList,
			);
			const rowsByActivity = new Map<
				string,
				{ bucketKey: string; count: number }[]
			>();
			for (const row of rows) {
				const bucketRows = rowsByActivity.get(row.activity_id) ?? [];
				bucketRows.push({
					bucketKey: row.bucket_key,
					count: Number.parseInt(String(row.bucket_count), 10),
				});
				rowsByActivity.set(row.activity_id, bucketRows);
			}

			const currentOpenBucket = bucketKeyForScope(nowBucketKeys, scope);
			const alpha = this.alphaForScope(scope);
			for (const activityId of activityIdList) {
				const ordered = (rowsByActivity.get(activityId) ?? []).sort(
					(left, right) =>
						compareBucketKeys(scope, left.bucketKey, right.bucketKey),
				);
				const accumulator: EmaAccumulatorState = {
					emaValue: 0,
					sampleSize: 0,
					lastClosedBucketKey: undefined,
				};
				let openBucketCount = 0;
				let prevClosedBucket: string | undefined;

				for (const row of ordered) {
					const cmp = compareBucketKeys(
						scope,
						row.bucketKey,
						currentOpenBucket,
					);
					if (cmp > 0) {
						continue;
					}
					if (cmp === 0) {
						openBucketCount = row.count;
						continue;
					}

					if (prevClosedBucket) {
						let gap = nextBucketKey(scope, prevClosedBucket);
						while (compareBucketKeys(scope, gap, row.bucketKey) < 0) {
							applyObserved(accumulator, 0, alpha, gap);
							gap = nextBucketKey(scope, gap);
						}
					}

					applyObserved(accumulator, row.count, alpha, row.bucketKey);
					prevClosedBucket = row.bucketKey;
				}

				if (prevClosedBucket) {
					let gap = nextBucketKey(scope, prevClosedBucket);
					while (compareBucketKeys(scope, gap, currentOpenBucket) < 0) {
						applyObserved(accumulator, 0, alpha, gap);
						gap = nextBucketKey(scope, gap);
					}
				}

				await input.repositories.emaStateRepository.upsert({
					activityId,
					scope,
					emaValue: accumulator.emaValue,
					sampleSize: accumulator.sampleSize,
					openBucketKey: currentOpenBucket,
					openBucketCount,
					lastClosedBucketKey: accumulator.lastClosedBucketKey,
					dirty: false,
					updatedAt: now,
				});
				await input.repositories.userBehaviorRepository.upsertObservedFrequency(
					{
						activityId,
						period: periodForScope(scope),
						value: accumulator.emaValue,
						sampleSize: accumulator.sampleSize,
						observedAt: now,
					},
				);
				rebuiltScopes += 1;
				publishedScopes += 1;
			}
		}

		return {
			activities: activityIdList.length,
			rebuiltScopes,
			publishedScopes,
		};
	}

	private async listDistinctCompletedActivityIds(
		database: Database,
		timeZone: string,
	): Promise<string[]> {
		const rows = (await database
			.get<ActivityHistory>("activity_history")
			.query(
				Q.unsafeSqlQuery(
					`
						SELECT DISTINCT activity_id
						FROM activity_history
						WHERE was_completed = 1
							AND actual_start_time IS NOT NULL
							AND bucket_timezone = ?
					`,
					[timeZone],
				),
			)
			.unsafeFetchRaw()) as { activity_id: string }[];

		return rows
			.map((row) => row.activity_id)
			.filter((activityId): activityId is string => Boolean(activityId));
	}

	private async fetchBucketCounts(
		database: Database,
		scope: FrequencyEmaScope,
		timeZone: string,
		activityIds: string[],
	): Promise<RawBucketCountRow[]> {
		const bucketColumn =
			scope === FrequencyEmaScope.DAILY
				? "local_day_bucket"
				: scope === FrequencyEmaScope.WEEKLY
					? "local_week_bucket"
					: "local_month_bucket";

		const sqlParts: string[] = [
			`
				SELECT
					activity_id,
					${bucketColumn} AS bucket_key,
					COUNT(*) AS bucket_count
				FROM activity_history
				WHERE was_completed = 1
					AND actual_start_time IS NOT NULL
					AND ${bucketColumn} IS NOT NULL
					AND bucket_timezone = ?
			`,
		];
		const args: (string | number)[] = [timeZone];

		if (activityIds.length > 0) {
			const placeholders = activityIds.map(() => "?").join(", ");
			sqlParts.push(`AND activity_id IN (${placeholders})`);
			args.push(...activityIds);
		}

		sqlParts.push(`
			GROUP BY activity_id, ${bucketColumn}
			ORDER BY activity_id ASC, ${bucketColumn} ASC
		`);

		return (await database
			.get<ActivityHistory>("activity_history")
			.query(Q.unsafeSqlQuery(sqlParts.join("\n"), args))
			.unsafeFetchRaw()) as RawBucketCountRow[];
	}
}
