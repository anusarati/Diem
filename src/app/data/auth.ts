/**
 * Auth: register, login, current user.
 * Users stored in AsyncStorage; passwords hashed with SHA-256 (expo-crypto).
 * Replace with your backend or WatermelonDB user table when wiring the app.
 */
import * as Crypto from "expo-crypto";
import AsyncStorage from "@react-native-async-storage/async-storage";

const USERS_KEY = "diem_users";
const CURRENT_USER_KEY = "diem_current_user";

export type StoredUser = {
	id: string;
	username: string;
	passwordHash: string;
	name: string;
};

export type CurrentUser = {
	id: string;
	username: string;
	name: string;
};

async function hashPassword(password: string): Promise<string> {
	return Crypto.digestStringAsync(
		Crypto.CryptoDigestAlgorithm.SHA256,
		password,
		{ encoding: Crypto.CryptoEncoding.HEX },
	);
}

async function getUsers(): Promise<StoredUser[]> {
	try {
		const raw = await AsyncStorage.getItem(USERS_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as StoredUser[];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

async function saveUsers(users: StoredUser[]): Promise<void> {
	await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/** Get the currently logged-in user, or null. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
	try {
		const raw = await AsyncStorage.getItem(CURRENT_USER_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as CurrentUser & { name?: string };
		if (!parsed?.id || !parsed?.username) return null;
		return {
			id: parsed.id,
			username: parsed.username,
			name: parsed.name ?? parsed.username,
		};
	} catch {
		return null;
	}
}

export async function setCurrentUser(user: CurrentUser): Promise<void> {
	await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

export type RegisterParams = {
	username: string;
	password: string;
	name: string;
};

export async function clearCurrentUser(): Promise<void> {
	await AsyncStorage.removeItem(CURRENT_USER_KEY);
}

/** Register a new user. Username must be unique. Saves name. */
export async function register(params: RegisterParams): Promise<{ error?: string }> {
	const { username, password, name } = params;
	const trimmed = username.trim().toLowerCase();
	if (!trimmed) return { error: "Username is required" };
	if (!password || password.length < 4)
		return { error: "Password must be at least 4 characters" };
	const nameTrim = name.trim();
	if (!nameTrim) return { error: "Name is required" };

	const users = await getUsers();
	if (users.some((u) => u.username === trimmed))
		return { error: "Username already taken" };

	const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
	const passwordHash = await hashPassword(password);
	users.push({
		id,
		username: trimmed,
		passwordHash,
		name: nameTrim,
	});
	await saveUsers(users);
	await setCurrentUser({ id, username: trimmed, name: nameTrim });
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

	const users = await getUsers();
	const user = users.find((u) => u.username === trimmed);
	if (!user) return { error: "Username or password is incorrect" };

	const hash = await hashPassword(password);
	if (hash !== user.passwordHash) return { error: "Username or password is incorrect" };

	await setCurrentUser({
		id: user.id,
		username: user.username,
		name: user.name ?? user.username,
	});
	return {};
}

/** Log out. */
export async function logout(): Promise<void> {
	await clearCurrentUser();
}
