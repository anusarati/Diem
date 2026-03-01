import { type Database, Q } from "@nozbe/watermelondb";
import type User from "../models/User";
import { assignDefinedFields, assignFields, assignRawId } from "./writeHelpers";

export interface UserCreateInput {
	id?: string;
	username: string;
	passwordHash: string;
	name: string;
	email?: string;
	timezone?: string;
	notificationSettings?: Record<string, unknown>;
	createdAt?: Date;
}

export interface UserUpdateInput {
	username?: string;
	passwordHash?: string;
	name?: string;
	email?: string;
	timezone?: string;
	notificationSettings?: Record<string, unknown>;
}

const defaultTimezone = (): string => {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
	} catch {
		return "UTC";
	}
};

const defaultNotificationSettings = (): Record<string, unknown> => ({
	notificationsEnabled: true,
});

const normalizeUsername = (username: string): string =>
	username.trim().toLowerCase();

export class UserRepository {
	constructor(private readonly database: Database) {}

	private get collection() {
		return this.database.get<User>("users");
	}

	async listAll(): Promise<User[]> {
		return this.collection.query().fetch();
	}

	observeAll() {
		return this.collection.query().observe();
	}

	async findById(id: string): Promise<User | null> {
		try {
			return await this.collection.find(id);
		} catch {
			return null;
		}
	}

	observeById(id: string) {
		return this.collection.findAndObserve(id);
	}

	async findByUsername(username: string): Promise<User | null> {
		const normalized = normalizeUsername(username);
		if (!normalized) {
			return null;
		}

		const rows = await this.collection
			.query(Q.where("username", normalized))
			.fetch();
		return rows[0] ?? null;
	}

	async create(input: UserCreateInput): Promise<User> {
		let created: User | null = null;

		await this.database.write(async () => {
			created = await this.collection.create((record) => {
				assignRawId(record, input.id);
				assignFields(record, {
					username: normalizeUsername(input.username),
					passwordHash: input.passwordHash,
					name: input.name,
					email: input.email ?? "",
					timezone: input.timezone ?? defaultTimezone(),
					createdAt: input.createdAt ?? new Date(),
					notificationSettings:
						input.notificationSettings ?? defaultNotificationSettings(),
				});
			});
		});

		if (!created) {
			throw new Error("Failed to create user");
		}
		return created;
	}

	async upsert(input: UserCreateInput): Promise<User> {
		const byId = input.id ? await this.findById(input.id) : null;
		const byUsername = await this.findByUsername(input.username);
		const existing = byId ?? byUsername;

		if (!existing) {
			return this.create(input);
		}

		await this.update(existing.id, {
			username: input.username,
			passwordHash: input.passwordHash,
			name: input.name,
			email: input.email,
			timezone: input.timezone,
			notificationSettings: input.notificationSettings,
		});
		return existing;
	}

	async update(id: string, input: UserUpdateInput): Promise<User | null> {
		const existing = await this.findById(id);
		if (!existing) {
			return null;
		}

		await this.database.write(async () => {
			await existing.update((record) => {
				const { username, ...rest } = input;
				assignDefinedFields(record, {
					...rest,
					username:
						username === undefined ? undefined : normalizeUsername(username),
				});
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
}
