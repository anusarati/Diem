import {
	addColumns,
	createTable,
	schemaMigrations,
} from "@nozbe/watermelondb/Schema/migrations";

export default schemaMigrations({
	migrations: [
		{
			toVersion: 2,
			steps: [
				createTable({
					name: "markov_transition_counts",
					columns: [
						{ name: "from_activity_id", type: "string", isIndexed: true },
						{ name: "to_activity_id", type: "string", isIndexed: true },
						{ name: "count", type: "number" },
						{ name: "last_observed_at", type: "number" },
					],
				}),
				createTable({
					name: "hnet_arc_counts",
					columns: [
						{
							name: "predecessor_activity_id",
							type: "string",
							isIndexed: true,
						},
						{
							name: "successor_activity_id",
							type: "string",
							isIndexed: true,
						},
						{ name: "time_scope", type: "string", isIndexed: true },
						{ name: "weekday_mask", type: "number" },
						{ name: "count", type: "number" },
						{ name: "last_observed_at", type: "number" },
					],
				}),
				createTable({
					name: "hnet_pair_counts",
					columns: [
						{ name: "anchor_activity_id", type: "string", isIndexed: true },
						{ name: "first_activity_id", type: "string", isIndexed: true },
						{ name: "second_activity_id", type: "string", isIndexed: true },
						{ name: "pair_type", type: "string", isIndexed: true },
						{ name: "time_scope", type: "string", isIndexed: true },
						{ name: "weekday_mask", type: "number" },
						{ name: "co_occurrence_count", type: "number" },
						{ name: "anchor_sample_size", type: "number" },
						{ name: "last_observed_at", type: "number" },
					],
				}),
			],
		},
		{
			toVersion: 3,
			steps: [
				addColumns({
					table: "activity_history",
					columns: [
						{
							name: "local_day_bucket",
							type: "string",
							isOptional: true,
							isIndexed: true,
						},
						{
							name: "local_week_bucket",
							type: "string",
							isOptional: true,
							isIndexed: true,
						},
						{
							name: "local_month_bucket",
							type: "string",
							isOptional: true,
							isIndexed: true,
						},
						{ name: "bucket_timezone", type: "string", isOptional: true },
					],
				}),
				createTable({
					name: "frequency_ema_state",
					columns: [
						{ name: "activity_id", type: "string", isIndexed: true },
						{ name: "scope", type: "string", isIndexed: true },
						{ name: "ema_value", type: "number" },
						{ name: "sample_size", type: "number" },
						{ name: "open_bucket_key", type: "string", isOptional: true },
						{ name: "open_bucket_count", type: "number" },
						{
							name: "last_closed_bucket_key",
							type: "string",
							isOptional: true,
						},
						{ name: "dirty", type: "boolean" },
						{ name: "updated_at", type: "number", isIndexed: true },
					],
				}),
			],
		},
	],
});
