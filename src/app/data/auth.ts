/**
 * Auth: register, login, current user.
 * User records are persisted in WatermelonDB.
 * AsyncStorage is only used for current session pointer.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { getDatabase } from "../../data/database";
import { UserRepository } from "../../data/repositories";

const CURRENT_USER_KEY = "diem_current_user";

export type CurrentUser = {
	id: string;
	username: string;
	name: string;
};

type SessionPayload = {
	id?: string;
	username?: string;
	name?: string;
};

function userRepository(): UserRepository {
	return new UserRepository(getDatabase("default"));
}

function toCurrentUser(user: {
	id: string;
	username?: string | null;
	name?: string | null;
	email?: string | null;
}): CurrentUser {
	const normalizedUsername = (user.username ?? "").trim().toLowerCase();
	const fallbackEmail = (user.email ?? "").trim().toLowerCase();
	const username =
		normalizedUsername || fallbackEmail || `user-${user.id.toLowerCase()}`;
	const name = (user.name ?? "").trim() || username;
	return {
		id: user.id,
		username,
		name,
	};
}

function parseSessionPayload(raw: string): SessionPayload | null {
	try {
		const parsed = JSON.parse(raw) as SessionPayload | string | null;
		if (typeof parsed === "string") {
			return { id: parsed };
		}
		if (!parsed || typeof parsed !== "object") {
			return null;
		}
		return parsed;
	} catch {
		return null;
	}
}

async function hashPassword(password: string): Promise<string> {
	return Crypto.digestStringAsync(
		Crypto.CryptoDigestAlgorithm.SHA256,
		password,
		{ encoding: Crypto.CryptoEncoding.HEX },
	);
}

/** Get the currently logged-in user, or null. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
	const raw = await AsyncStorage.getItem(CURRENT_USER_KEY);
	if (!raw) {
		return null;
	}

	const payload = parseSessionPayload(raw);
	if (!payload) {
		return null;
	}

	const repository = userRepository();
	const byId = payload.id ? await repository.findById(payload.id) : null;
	if (byId) {
		const user = toCurrentUser(byId);
		const payloadUsername = payload.username?.trim().toLowerCase();
		if (payloadUsername !== user.username || payload.name !== user.name) {
			await setCurrentUser(user);
		}
		return user;
	}

	const byUsername = payload.username
		? await repository.findByUsername(payload.username)
		: null;
	if (byUsername) {
		const user = toCurrentUser(byUsername);
		await setCurrentUser(user);
		return user;
	}

	await clearCurrentUser();
	return null;
}

export async function setCurrentUser(user: CurrentUser): Promise<void> {
	const normalizedUser = toCurrentUser(user);
	await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(normalizedUser));
}

export type RegisterParams = {
	username: string;
	password: string;
	name: string;
};

export async function clearCurrentUser(): Promise<void> {
	await AsyncStorage.removeItem(CURRENT_USER_KEY);
}

/** Register a new user. Username must be unique. */
export async function register(
	params: RegisterParams,
): Promise<{ error?: string }> {
	const { username, password, name } = params;
	const trimmed = username.trim().toLowerCase();
	if (!trimmed) return { error: "Username is required" };
	if (!password || password.length < 4) {
		return { error: "Password must be at least 4 characters" };
	}
	const nameTrim = name.trim();
	if (!nameTrim) return { error: "Name is required" };

	const repository = userRepository();
	const existing = await repository.findByUsername(trimmed);
	if (existing) return { error: "Username already taken" };

	const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
	const passwordHash = await hashPassword(password);
	await repository.create({
		id,
		username: trimmed,
		passwordHash,
		name: nameTrim,
		email: "",
		createdAt: new Date(),
		notificationSettings: { notificationsEnabled: true },
	});

	await setCurrentUser({
		id,
		username: trimmed,
		name: nameTrim,
	});
	return {};
}

/** Log in. Returns error message if invalid. */
export async function login(
	username: string,
	password: string,
): Promise<{ error?: string }> {
	const trimmed = username.trim().toLowerCase();
	if (!trimmed) return { error: "Username is required" };
	if (!password) return { error: "Password is required" };

	const repository = userRepository();
	const user = await repository.findByUsername(trimmed);
	if (!user) {
		const localUsers = await repository.listAll();
		if (localUsers.length === 0) {
			return {
				error:
					"No local account found on this device/app instance. Private/incognito sessions use separate local storage.",
			};
		}
		return { error: "Username or password is incorrect" };
	}

	const hash = await hashPassword(password);
	if (!user.passwordHash || hash !== user.passwordHash) {
		return { error: "Username or password is incorrect" };
	}

	await setCurrentUser({
		id: user.id,
		username: user.username || trimmed,
		name: user.name || user.username || trimmed,
	});
	return {};
}

/** Log out. */
export async function logout(): Promise<void> {
	await clearCurrentUser();
}
