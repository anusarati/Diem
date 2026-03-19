import { type Database, Q } from "@nozbe/watermelondb";
import { FrequencyEmaScope } from "../../types/domain";
import type ActivityHistory from "../models/ActivityHistory";
import { assignDefinedFields, assignFields } from "./writeHelpers";

export interface HistoryCreateInput {
	activityId: string;
	predictedStartTime: Date;
	predictedDuration: number;
	actualStartTime?: Date;
	actualDuration?: number;
	localDayBucket?: string;
	localWeekBucket?: string;
	localMonthBucket?: string;
	bucketTimezone?: string;
	wasCompleted: boolean;
	wasSkipped: boolean;
	wasReplaced: boolean;
	notes?: string;
	createdAt: Date;
}

export interface HistoryUpdateInput {
	predictedStartTime?: Date;
	predictedDuration?: number;
	actualStartTime?: Date | null;
	actualDuration?: number | null;
	localDayBucket?: string;
	localWeekBucket?: string;
	localMonthBucket?: string;
	bucketTimezone?: string;
	wasCompleted?: boolean;
	wasSkipped?: boolean;
	wasReplaced?: boolean;
	notes?: string;
	createdAt?: Date;
}

export interface CompletionUpsertInput {
	historyId?: string;
	activityId: string;
	predictedStartTime: Date;
	predictedDuration: number;
	actualStartTime: Date;
	actualDuration: number;
	localDayBucket?: string;
	localWeekBucket?: string;
	localMonthBucket?: string;
	bucketTimezone?: string;
	notes?: string;
	wasSkipped?: boolean;
	wasReplaced?: boolean;
	createdAt?: Date;
}

export interface HistoryBucketCountRow {
	activityId: string;
	bucketKey: string;
	bucketCount: number;
}

const dayRange = (date: Date): { start: Date; end: Date } => {
	const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const end = new Date(start);
	end.setDate(end.getDate() + 1);
	return { start, end };
};

const nullishToUndefined = <T>(value: T | null | undefined): T | undefined =>
	value === null || value === undefined ? undefined : value;

export class HistoryRepository {
	constructor(private readonly database: Database) {}

	private get collection() {
		return this.database.get<ActivityHistory>("activity_history");
	}

	async listForRange(start: Date, end: Date): Promise<ActivityHistory[]> {
		return this.collection
			.query(
				Q.where("predicted_start_time", Q.gte(start.getTime())),
				Q.where("predicted_start_time", Q.lt(end.getTime())),
			)
			.fetch();
	}

	async listByRange(start: Date, end: Date): Promise<ActivityHistory[]> {
		return this.listForRange(start, end);
	}

	observeForRange(start: Date, end: Date) {
		return this.collection
			.query(
				Q.where("predicted_start_time", Q.gte(start.getTime())),
				Q.where("predicted_start_time", Q.lt(end.getTime())),
			)
			.observe();
	}

	observeByRange(start: Date, end: Date) {
		return this.observeForRange(start, end);
	}

	async listForActivity(activityId: string): Promise<ActivityHistory[]> {
		return this.collection.query(Q.where("activity_id", activityId)).fetch();
	}

	async listByActivity(activityId: string): Promise<ActivityHistory[]> {
		return this.listForActivity(activityId);
	}

	observeForActivity(activityId: string) {
		return this.collection.query(Q.where("activity_id", activityId)).observe();
	}

	async findForActivityOnDate(
		activityId: string,
		date: Date,
	): Promise<ActivityHistory | null> {
		const { start, end } = dayRange(date);
		const rows = await this.collection
			.query(
				Q.where("activity_id", activityId),
				Q.where("predicted_start_time", Q.gte(start.getTime())),
				Q.where("predicted_start_time", Q.lt(end.getTime())),
			)
			.fetch();
		return rows[0] ?? null;
	}

	async create(input: HistoryCreateInput): Promise<ActivityHistory> {
		let created: ActivityHistory | null = null;
		await this.database.write(async () => {
			created = await this.collection.create((record) => {
				assignFields(record, input);
			});
		});

		if (!created) {
			throw new Error("Failed to create activity history");
		}
		return created;
	}

	async recordCompletion(
		input: Omit<
			HistoryCreateInput,
			"wasCompleted" | "wasSkipped" | "wasReplaced" | "createdAt"
		> & {
			wasSkipped?: boolean;
			wasReplaced?: boolean;
			createdAt?: Date;
		},
	): Promise<ActivityHistory> {
		return this.create({
			...input,
			wasCompleted: true,
			wasSkipped: input.wasSkipped ?? false,
			wasReplaced: input.wasReplaced ?? false,
			createdAt: input.createdAt ?? new Date(),
		});
	}

	async upsertCompletion(
		input: CompletionUpsertInput,
	): Promise<ActivityHistory> {
		const {
			historyId,
			createdAt,
			activityId,
			wasSkipped,
			wasReplaced,
			...completionBase
		} = input;
		const completionCreate = {
			...completionBase,
			wasCompleted: true,
			wasSkipped: wasSkipped ?? false,
			wasReplaced: wasReplaced ?? false,
		} satisfies Omit<HistoryCreateInput, "createdAt" | "activityId">;
		const completionPatch: HistoryUpdateInput = completionCreate;

		if (historyId) {
			const existing = await this.update(historyId, completionPatch);
			if (existing) {
				return existing;
			}
		}

		return this.create({
			activityId,
			...completionCreate,
			createdAt: createdAt ?? new Date(),
		});
	}

	async listDistinctCompletedActivityIdsByTimezone(
		timeZone: string,
	): Promise<string[]> {
		const rows = (await this.collection
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

	async listCompletedBucketCounts(
		scope: FrequencyEmaScope,
		timeZone: string,
		activityIds: string[],
	): Promise<HistoryBucketCountRow[]> {
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

		const rows = (await this.collection
			.query(Q.unsafeSqlQuery(sqlParts.join("\n"), args))
			.unsafeFetchRaw()) as {
			activity_id: string;
			bucket_key: string;
			bucket_count: number | string;
		}[];

		return rows
			.map((row) => ({
				activityId: row.activity_id,
				bucketKey: row.bucket_key,
				bucketCount: Number.parseInt(String(row.bucket_count), 10),
			}))
			.filter(
				(row) =>
					Boolean(row.activityId) &&
					Boolean(row.bucketKey) &&
					Number.isFinite(row.bucketCount),
			);
	}

	async update(
		id: string,
		input: HistoryUpdateInput,
	): Promise<ActivityHistory | null> {
		let existing: ActivityHistory;
		try {
			existing = await this.collection.find(id);
		} catch {
			return null;
		}

		await this.database.write(async () => {
			await existing.update((record) => {
				const { actualStartTime, actualDuration, ...rest } = input;
				assignDefinedFields(record, {
					...rest,
					actualStartTime: nullishToUndefined(actualStartTime),
					actualDuration: nullishToUndefined(actualDuration),
				});
			});
		});

		return existing;
	}

	async deleteForRange(start: Date, end: Date): Promise<number> {
		const rows = await this.listForRange(start, end);
		await this.database.write(async () => {
			await Promise.all(rows.map((row) => row.destroyPermanently()));
		});
		return rows.length;
	}

	async deleteForActivity(activityId: string): Promise<number> {
		const rows = await this.listForActivity(activityId);
		await this.database.write(async () => {
			await Promise.all(rows.map((row) => row.destroyPermanently()));
		});
		return rows.length;
	}

	async deleteForActivityOnDate(
		activityId: string,
		date: Date,
	): Promise<number> {
		const { start, end } = dayRange(date);
		const rows = await this.collection
			.query(
				Q.where("activity_id", activityId),
				Q.where("predicted_start_time", Q.gte(start.getTime())),
				Q.where("predicted_start_time", Q.lt(end.getTime())),
			)
			.fetch();
		await this.database.write(async () => {
			await Promise.all(rows.map((row) => row.destroyPermanently()));
		});
		return rows.length;
	}

	/**
	 * Looks up history row for an activity at the exact predicted start time.
	 * Used to make .ics imports idempotent and to avoid missing history for
	 * recurring occurrences.
	 */
	async findForActivityAndPredictedStartTime(
		activityId: string,
		predictedStartTime: Date,
	): Promise<ActivityHistory | null> {
		const rows = await this.collection
			.query(
				Q.where("activity_id", activityId),
				Q.where("predicted_start_time", predictedStartTime.getTime()),
			)
			.fetch();
		return rows[0] ?? null;
	}
}
