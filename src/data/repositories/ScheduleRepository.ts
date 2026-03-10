import { type Database, Q } from "@nozbe/watermelondb";
import type ScheduledEvent from "../models/ScheduledEvent";
import {
	assignDefinedFields,
	assignFields,
	assignRawId,
	stripId,
} from "./writeHelpers";

export interface ScheduledEventCreateInput {
	id?: string;
	activityId: string;
	categoryId: string;
	title: string;
	startTime: Date;
	endTime: Date;
	duration: number;
	status: ScheduledEvent["status"];
	replaceabilityStatus: ScheduledEvent["replaceabilityStatus"];
	priority: number;
	isRecurring: boolean;
	recurringTemplateId?: string;
	source: ScheduledEvent["source"];
	isLocked: boolean;
	createdAt: Date;
	updatedAt: Date;
	externalId?: string;
}

export interface ScheduledEventUpdateInput {
	activityId?: string;
	categoryId?: string;
	title?: string;
	startTime?: Date;
	endTime?: Date;
	duration?: number;
	status?: ScheduledEvent["status"];
	replaceabilityStatus?: ScheduledEvent["replaceabilityStatus"];
	priority?: number;
	isRecurring?: boolean;
	recurringTemplateId?: string;
	source?: ScheduledEvent["source"];
	isLocked?: boolean;
	createdAt?: Date;
	updatedAt?: Date;
}

export class ScheduleRepository {
	constructor(private readonly database: Database) {}

	private get collection() {
		return this.database.get<ScheduledEvent>("scheduled_events");
	}

	async listAll(): Promise<ScheduledEvent[]> {
		return this.collection.query().fetch();
	}

	async list(): Promise<ScheduledEvent[]> {
		return this.listAll();
	}

	observeAll() {
		return this.collection.query().observe();
	}

	observeList() {
		return this.observeAll();
	}

	async listForRange(start: Date, end: Date): Promise<ScheduledEvent[]> {
		return this.collection
			.query(
				Q.where("start_time", Q.gte(start.getTime())),
				Q.where("start_time", Q.lt(end.getTime())),
			)
			.fetch();
	}

	async listRange(start: Date, end: Date): Promise<ScheduledEvent[]> {
		return this.listForRange(start, end);
	}

	observeForRange(start: Date, end: Date) {
		return this.collection
			.query(
				Q.where("start_time", Q.gte(start.getTime())),
				Q.where("start_time", Q.lt(end.getTime())),
			)
			.observe();
	}

	observeRange(start: Date, end: Date) {
		return this.observeForRange(start, end);
	}

	async findById(id: string): Promise<ScheduledEvent | null> {
		try {
			return await this.collection.find(id);
		} catch {
			return null;
		}
	}

	async get(id: string): Promise<ScheduledEvent | null> {
		return this.findById(id);
	}

	async findByExternalId(externalId: string): Promise<ScheduledEvent | null> {
		const rows = await this.collection
			.query(Q.where("external_id", externalId))
			.fetch();
		return rows[0] ?? null;
	}

	async listBySource(source: string): Promise<ScheduledEvent[]> {
		return this.collection.query(Q.where("source", source)).fetch();
	}

	observeById(id: string) {
		return this.collection.findAndObserve(id);
	}

	async create(input: ScheduledEventCreateInput): Promise<ScheduledEvent> {
		let created: ScheduledEvent | null = null;
		await this.database.write(async () => {
			created = await this.collection.create((record) => {
				assignRawId(record, input.id);
				assignFields(record, stripId(input));
			});
		});

		if (!created) {
			throw new Error("Failed to create scheduled event");
		}
		return created;
	}

	async update(
		id: string,
		input: ScheduledEventUpdateInput,
	): Promise<ScheduledEvent | null> {
		const existing = await this.findById(id);
		if (!existing) {
			return null;
		}

		await this.database.write(async () => {
			await existing.update((record) => {
				assignDefinedFields(record, input);
			});
		});

		return existing;
	}

	async remove(id: string): Promise<boolean> {
		const existing = await this.findById(id);
		if (!existing) {
			return false;
		}
		await this.database.write(async () => {
			await existing.destroyPermanently();
		});
		return true;
	}

	async delete(id: string): Promise<boolean> {
		return this.remove(id);
	}
}
