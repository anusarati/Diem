import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

const isExpoGo =
	Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

function getNotifications() {
	return require("expo-notifications");
}

/**
 * Configure global notification behavior
 */
export async function initNotificationService() {
	console.log(
		`[Notification] initNotificationService called. Env: ${Constants.executionEnvironment}, isExpoGo: ${isExpoGo}`,
	);
	if (isExpoGo) {
		console.log(
			"Notification system: skipping setNotificationHandler in Expo Go to avoid hang.",
		);
		return;
	}

	const Notifications = getNotifications();
	Notifications.setNotificationHandler({
		handleNotification: async () => ({
			shouldPlaySound: true,
			shouldSetBadge: false,
			shouldShowBanner: true,
			shouldShowList: true,
		}),
	});

	// Define categories for interactive notifications
	await registerNotificationCategories();
	console.log("[Notification] Categories registration complete.");
}

/**
 * Registers interactive actions for notifications.
 */
export async function registerNotificationCategories() {
	if (isExpoGo || Platform.OS === "web") return;

	try {
		const Notifications = getNotifications();
		// Note: Using singular setNotificationCategoryAsync as plural is not available in this version
		await Notifications.setNotificationCategoryAsync("ACTIVITY_INQUIRY", [
			{
				identifier: "ACTION_STARTED",
				buttonTitle: "🚀 Started",
				options: { opensAppToForeground: false },
			},
			{
				identifier: "ACTION_DELAY",
				buttonTitle: "⏰ Delay 30m",
				options: { opensAppToForeground: false },
			},
			{
				identifier: "ACTION_SKIP",
				buttonTitle: "⏭️ Skip",
				options: { opensAppToForeground: false, isDestructive: true },
			},
		]);
		console.log(
			"[Notification] Successfully registered category: ACTIVITY_INQUIRY",
		);
	} catch (error) {
		console.error("[Notification] Failed to register category:", error);
	}
}

/**
 * Schedules a local notification.
 */
export async function scheduleNotification(
	title: string,
	body: string,
	triggerDate: Date,
	data?: any,
) {
	// Don't schedule if date is in the past
	if (triggerDate.getTime() <= Date.now()) {
		return null;
	}

	const Notifications = getNotifications();
	const content: any = {
		title,
		body,
		data,
	};

	if (data?.category) {
		content.categoryIdentifier = data.category;
	}

	console.log(
		`[Notification] Scheduling "${title}" with category: ${content.categoryIdentifier || "none"}. Full content:`,
		JSON.stringify(content),
	);

	const id = await Notifications.scheduleNotificationAsync({
		content,
		trigger: {
			type: Notifications.SchedulableTriggerInputTypes.DATE,
			date: triggerDate,
		},
	});
	console.log(
		`[Notification] Successfully scheduled notification "${title}" (ID: ${id})`,
	);
	return id;
}

/**
 * Cancels all scheduled notifications.
 */
export async function cancelAllNotifications() {
	const Notifications = getNotifications();
	await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Cancels a specific notification by ID.
 */
export async function cancelNotification(id: string) {
	const Notifications = getNotifications();
	await Notifications.cancelScheduledNotificationAsync(id);
}
