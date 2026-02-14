import {
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
	],
});
