import { type Database, Q } from "@nozbe/watermelondb";
import type { ConstraintValue } from "../../types/domain";
import type Constraint from "../models/Constraint";
import {
	assignDefinedFields,
	assignFields,
	assignRawId,
	stripId,
} from "./writeHelpers";

export interface ConstraintCreateInput {
	id?: string;
	type: Constraint["type"];
	activityId?: string;
	categoryId?: string;
	value: ConstraintValue;
	isActive: boolean;
	createdAt: Date;
}

export interface ConstraintUpdateInput {
	type?: Constraint["type"];
	activityId?: string;
	categoryId?: string;
	value?: ConstraintValue;
	isActive?: boolean;
	createdAt?: Date;
}

export class ConstraintRepository {
	constructor(private readonly database: Database) {}

	private get collection() {
		return this.database.get<Constraint>("constraints");
	}

	async listAll(): Promise<Constraint[]> {
		return this.collection.query().fetch();
	}

	async listForActivity(activityId: string): Promise<Constraint[]> {
		return this.collection.query(Q.where("activity_id", activityId)).fetch();
	}

	async list(): Promise<Constraint[]> {
		return this.listAll();
	}

	observeAll() {
		return this.collection.query().observe();
	}

	observeList() {
		return this.observeAll();
	}

	async listActive(): Promise<Constraint[]> {
		return this.collection.query(Q.where("is_active", true)).fetch();
	}

	observeActive() {
		return this.collection.query(Q.where("is_active", true)).observe();
	}

	async findById(id: string): Promise<Constraint | null> {
		try {
			return await this.collection.find(id);
		} catch {
			return null;
		}
	}

	async get(id: string): Promise<Constraint | null> {
		return this.findById(id);
	}

	observeById(id: string) {
		return this.collection.findAndObserve(id);
	}

	async create(input: ConstraintCreateInput): Promise<Constraint> {
		let created: Constraint | null = null;
		await this.database.write(async () => {
			created = await this.collection.create((record) => {
				assignRawId(record, input.id);
				assignFields(record, stripId(input));
			});
		});

		if (!created) {
			throw new Error("Failed to create constraint");
		}
		return created;
	}

	async upsert(input: ConstraintCreateInput): Promise<Constraint> {
		if (!input.id) {
			return this.create(input);
		}

		const existing = await this.findById(input.id);
		if (!existing) {
			return this.create(input);
		}

		await this.update(input.id, stripId(input));
		return existing;
	}

	async update(
		id: string,
		input: ConstraintUpdateInput,
	): Promise<Constraint | null> {
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

	async setActive(id: string, isActive: boolean): Promise<Constraint | null> {
		return this.update(id, { isActive });
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
