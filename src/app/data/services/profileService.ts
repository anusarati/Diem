import type { UserSettings } from "../../types";
import { getCurrentUser } from "../auth";
import { makeRepositories } from "./repositoryContext";

const DEFAULT_SETTINGS: UserSettings = {
	notificationsEnabled: true,
};

export interface CurrentUserProfileData {
	name: string;
	settings: UserSettings;
}

function parseNotificationsEnabled(value: unknown): boolean | null {
	if (typeof value !== "object" || value === null) {
		return null;
	}
	const maybeEnabled = (value as Record<string, unknown>).notificationsEnabled;
	return typeof maybeEnabled === "boolean" ? maybeEnabled : null;
}

function parseUserSettings(value: unknown): UserSettings {
	const notificationsEnabled = parseNotificationsEnabled(value);
	return {
		notificationsEnabled:
			notificationsEnabled ?? DEFAULT_SETTINGS.notificationsEnabled,
	};
}

export async function getUserSettings(): Promise<UserSettings> {
	const currentUser = await getCurrentUser();
	if (!currentUser?.id) {
		return { ...DEFAULT_SETTINGS };
	}
	const repositories = makeRepositories(currentUser.id);
	const user = await repositories.user.findById(currentUser.id);
	if (!user) {
		return { ...DEFAULT_SETTINGS };
	}
	return parseUserSettings(user.notificationSettings);
}

export async function saveUserSettings(settings: UserSettings): Promise<void> {
	const currentUser = await getCurrentUser();
	if (!currentUser?.id) {
		return;
	}
	const repositories = makeRepositories(currentUser.id);
	const user = await repositories.user.findById(currentUser.id);
	if (!user) {
		return;
	}
	await repositories.user.update(user.id, {
		notificationSettings: {
			...user.notificationSettings,
			notificationsEnabled: settings.notificationsEnabled,
		},
	});
}

export async function observeCurrentUserProfileData(
	onChange: (profile: CurrentUserProfileData) => void,
): Promise<() => void> {
	const currentUser = await getCurrentUser();
	if (!currentUser?.id) {
		onChange({
			name: "",
			settings: { ...DEFAULT_SETTINGS },
		});
		return () => {};
	}

	const repositories = makeRepositories(currentUser.id);
	const user = await repositories.user.findById(currentUser.id);
	if (!user) {
		onChange({
			name: currentUser.name,
			settings: { ...DEFAULT_SETTINGS },
		});
		return () => {};
	}

	onChange({
		name: user.name || currentUser.name,
		settings: parseUserSettings(user.notificationSettings),
	});

	const subscription = repositories.user
		.observeById(user.id)
		.subscribe((updatedUser) => {
			onChange({
				name: updatedUser.name || currentUser.name,
				settings: parseUserSettings(updatedUser.notificationSettings),
			});
		});

	return () => {
		subscription.unsubscribe();
	};
}
