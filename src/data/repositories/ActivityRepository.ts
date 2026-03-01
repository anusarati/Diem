import type { Database } from "@nozbe/watermelondb";
import type Activity from "../models/Activity";
import {
	assignDefinedFields,
	assignFields,
	assignRawId,
	stripId,
} from "./writeHelpers";

export interface ActivityCreateInput {
	id?: string;
	categoryId: string;
	name: string;
	priority: number;
	defaultDuration: number;
	isReplaceable: boolean;
	color: string;
	createdAt: Date;
}

export interface ActivityUpdateInput {
	categoryId?: string;
	name?: string;
	priority?: number;
	defaultDuration?: number;
	isReplaceable?: boolean;
	color?: string;
}

export class ActivityRepository {
	constructor(private readonly database: Database) {}

	private get collection() {
		return this.database.get<Activity>("activities");
	}

	async listAll(): Promise<Activity[]> {
		return this.collection.query().fetch();
	}

	async list(): Promise<Activity[]> {
		return this.listAll();
	}

	observeAll() {
		return this.collection.query().observe();
	}

	observeList() {
		return this.observeAll();
	}

	async findById(id: string): Promise<Activity | null> {
		try {
			return await this.collection.find(id);
		} catch {
			return null;
		}
	}

	async get(id: string): Promise<Activity | null> {
		return this.findById(id);
	}

	observeById(id: string) {
		return this.collection.findAndObserve(id);
	}

	async create(input: ActivityCreateInput): Promise<Activity> {
		let created: Activity | null = null;
		await this.database.write(async () => {
			created = await this.collection.create((record) => {
				assignRawId(record, input.id);
				assignFields(record, stripId(input));
			});
		});

		if (!created) {
			throw new Error("Failed to create activity");
		}
		return created;
	}

	async upsert(input: ActivityCreateInput): Promise<Activity> {
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
		input: ActivityUpdateInput,
	): Promise<Activity | null> {
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
