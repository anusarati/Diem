import type { Database } from "@nozbe/watermelondb";
import type { RecurrenceFrequency } from "../../types/domain";
import type RecurringActivity from "../models/RecurringActivity";
import { assignFields, assignRawId, stripId } from "./writeHelpers";

export interface RecurringActivityCreateInput {
	id?: string;
	templateId: string;
	categoryId: string;
	title: string;
	frequency: RecurrenceFrequency;
	interval: number;
	daysOfWeek: number[];
	startDate: Date;
	preferredStartTime: string;
	typicalDuration: number;
	priority: number;
	isActive: boolean;
}

export class RecurringActivityRepository {
	constructor(private readonly database: Database) {}

	private get collection() {
		return this.database.get<RecurringActivity>("recurring_activities");
	}

	async listAll(): Promise<RecurringActivity[]> {
		return this.collection.query().fetch();
	}

	async findByTemplateId(
		templateId: string,
	): Promise<RecurringActivity | null> {
		const all = await this.listAll();
		return all.find((r) => r.templateId === templateId) ?? null;
	}

	async create(
		input: RecurringActivityCreateInput,
	): Promise<RecurringActivity> {
		let created: RecurringActivity | null = null;
		await this.database.write(async () => {
			created = await this.collection.create((record) => {
				assignRawId(record, input.id);
				assignFields(record, stripId(input));
			});
		});

		if (!created) {
			throw new Error("Failed to create recurring activity");
		}
		return created;
	}

	async remove(id: string): Promise<boolean> {
		try {
			const record = await this.collection.find(id);
			await this.database.write(async () => {
				await record.destroyPermanently();
			});
			return true;
		} catch {
			return false;
		}
	}

	async deleteByTemplateId(templateId: string): Promise<void> {
		const existing = await this.findByTemplateId(templateId);
		if (existing) {
			await this.remove(existing.id);
		}
	}
}
