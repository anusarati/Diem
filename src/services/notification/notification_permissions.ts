// No top-level expo-notifications import to avoid Expo Go hang

/**
 * Requests notification permissions from the user.
 * Connects to user preferences in a full implementation.
 */
export async function requestNotificationPermission() {
	const Notifications = require("expo-notifications");
	const settings = await Notifications.getPermissionsAsync();

	if (!settings.granted && settings.canAskAgain) {
		const result = await Notifications.requestPermissionsAsync();
		return result.granted;
	}

	return settings.granted;
}
