import { type Database, Q } from "@nozbe/watermelondb";
import type Activity from "../../data/models/Activity";
import type Constraint from "../../data/models/Constraint";
import type HNetArcCount from "../../data/models/HNetArcCount";
import type HNetPairCount from "../../data/models/HNetPairCount";
import type MarkovTransitionCount from "../../data/models/MarkovTransitionCount";
import type ScheduledEvent from "../../data/models/ScheduledEvent";
import type UserBehavior from "../../data/models/UserBehavior";
import type { ProblemBuilderInput } from "./problem_builder";

export interface LoadProblemInputParams {
	horizonStart: Date;
	totalSlots: number;
}

export class BridgeDataSource {
	constructor(private readonly database: Database) {}

	async load(params: LoadProblemInputParams): Promise<ProblemBuilderInput> {
		const horizonEnd = new Date(
			params.horizonStart.getTime() + params.totalSlots * 15 * 60_000,
		);

		const [
			activities,
			constraints,
			userBehavior,
			markovTransitions,
			hnetArcCounts,
			hnetPairCounts,
			scheduledEvents,
		] = await Promise.all([
			this.database.get<Activity>("activities").query().fetch(),
			this.database
				.get<Constraint>("constraints")
				.query(Q.where("is_active", true))
				.fetch(),
			this.database.get<UserBehavior>("user_behavior").query().fetch(),
			this.database
				.get<MarkovTransitionCount>("markov_transition_counts")
				.query()
				.fetch(),
			this.database.get<HNetArcCount>("hnet_arc_counts").query().fetch(),
			this.database.get<HNetPairCount>("hnet_pair_counts").query().fetch(),
			this.database
				.get<ScheduledEvent>("scheduled_events")
				.query(
					Q.where("start_time", Q.gte(params.horizonStart.getTime())),
					Q.where("start_time", Q.lte(horizonEnd.getTime())),
				)
				.fetch(),
		]);

		return {
			activities,
			constraints,
			userBehavior,
			markovTransitions,
			hnetArcCounts,
			hnetPairCounts,
			scheduledEvents,
			horizonStart: params.horizonStart,
			totalSlots: params.totalSlots,
		};
	}
}
