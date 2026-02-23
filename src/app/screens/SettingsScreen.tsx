import * as Calendar from "expo-calendar";
import * as Location from "expo-location";
// import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useState } from "react";
import {
	Alert,
	Platform,
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../components/Button";
import { IconButton } from "../components/IconButton";
import { colors, spacing } from "../theme";
import type { AppRoute } from "../types";

// Configure notifications to show even when app is foregrounded
/*
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});
*/

type Props = {
	onNavigate: (route: AppRoute) => void;
};

export function SettingsScreen({ onNavigate }: Props) {
	const [notificationsEnabled, _setNotificationsEnabled] = useState(false);
	const [locationEnabled, setLocationEnabled] = useState(false);
	const [calendarAccess, setCalendarAccess] = useState(false);
	const [debugLog, setDebugLog] = useState<string[]>([]);

	const checkPermissions = useCallback(async () => {
		// const { status: notifStatus } = await Notifications.getPermissionsAsync();
		// setNotificationsEnabled(notifStatus === "granted");

		const { status: locStatus } =
			await Location.getForegroundPermissionsAsync();
		setLocationEnabled(locStatus === "granted");

		const { status: calStatus } = await Calendar.getCalendarPermissionsAsync();
		setCalendarAccess(calStatus === "granted");
	}, []);

	useEffect(() => {
		checkPermissions();
	}, [checkPermissions]);

	const toggleNotifications = async () => {
		Alert.alert(
			"Notice",
			"Notifications are temporarily disabled for build compatibility.",
		);
		/*
        if (notificationsEnabled) {
            setNotificationsEnabled(false);
            Alert.alert("Info", "Please disable notifications in system settings.");
        } else {
            const { status } = await Notifications.requestPermissionsAsync();
            setNotificationsEnabled(status === "granted");
        }
        */
	};

	const toggleLocation = async () => {
		if (locationEnabled) {
			setLocationEnabled(false);
			Alert.alert("Info", "Please disable location in system settings.");
		} else {
			const { status } = await Location.requestForegroundPermissionsAsync();
			setLocationEnabled(status === "granted");
		}
	};

	const toggleCalendar = async () => {
		if (calendarAccess) {
			setCalendarAccess(false);
			Alert.alert("Info", "Please disable calendar access in system settings.");
		} else {
			const { status } = await Calendar.requestCalendarPermissionsAsync();
			setCalendarAccess(status === "granted");
		}
	};

	const testNotification = async () => {
		Alert.alert(
			"Notice",
			"Notifications are temporarily disabled for build compatibility.",
		);
		/*
        if (!notificationsEnabled) {
            Alert.alert("Error", "Enable notifications first!");
            return;
        }

        const location = locationEnabled
            ? await Location.getCurrentPositionAsync({})
            : null;
        const locString = location
            ? `Lat: ${location.coords.latitude.toFixed(4)}, Long: ${location.coords.longitude.toFixed(4)}`
            : "Location disabled";

        await Notifications.scheduleNotificationAsync({
            content: {
                title: "Diem Intelligence Check",
                body: `Are you doing your predicted task? \n(Context: ${locString})`,
                data: { location: location?.coords },
            },
            trigger: null,
        });

        setDebugLog((prev) => [
            `[${new Date().toLocaleTimeString()}] Sent notification with ${locString}`,
            ...prev,
        ]);
        */
	};

	const resetModel = () => {
		Alert.alert(
			"Reset Learning Model",
			"Are you sure? This will delete all learned behavior patterns and history.",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Reset",
					style: "destructive",
					onPress: () => setDebugLog((prev) => ["Model reset!", ...prev]),
				},
			],
		);
	};

	return (
		<SafeAreaView style={styles.safe}>
			<View style={styles.header}>
				<IconButton icon="arrow_back" onPress={() => onNavigate("Home")} />
				<Text style={styles.title}>Settings & Setup (Module F5)</Text>
				<View style={{ width: 40 }} />
			</View>

			<ScrollView style={styles.content}>
				{/* Unit: Notification Preferences */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>
						Notifications (Module F5 + F1 Test)
					</Text>
					<View style={styles.row}>
						<Text style={styles.label}>Enable Smart Notifications</Text>
						<Switch
							value={notificationsEnabled}
							onValueChange={toggleNotifications}
							trackColor={{ false: colors.slate200, true: colors.primary }}
						/>
					</View>
					<View style={styles.card}>
						<Text style={styles.cardText}>
							Test the Intelligent Notification System. This simulates a
							"Check-in" to see if you are adhering to the schedule based on
							location context.
						</Text>
						<Button
							label="Test Notification"
							icon="🔔"
							onPress={testNotification}
							style={{ marginTop: spacing.md, alignSelf: "flex-start" }}
						/>
					</View>
				</View>

				{/* Unit: Integrations */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Integrations</Text>
					<View style={styles.row}>
						<Text style={styles.label}>Location Context (For F1/F3)</Text>
						<Switch
							value={locationEnabled}
							onValueChange={toggleLocation}
							trackColor={{ false: colors.slate200, true: colors.primary }}
						/>
					</View>
					<View style={styles.row}>
						<Text style={styles.label}>Calendar Sync</Text>
						<Switch
							value={calendarAccess}
							onValueChange={toggleCalendar}
							trackColor={{ false: colors.slate200, true: colors.primary }}
						/>
					</View>
				</View>

				{/* Unit: Model Management */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Model Management</Text>
					<View style={styles.card}>
						<Text style={styles.cardText}>
							Your behavioral model learns from your history. If predictions are
							inaccurate, you can reset the model.
						</Text>
						<Button
							label="Reset Model"
							icon="🗑️"
							variant="danger"
							onPress={resetModel}
							style={{ marginTop: spacing.md, alignSelf: "flex-start" }}
						/>
					</View>
				</View>

				{/* Unit: Debug Log */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Debug View</Text>
					<View style={styles.logContainer}>
						{debugLog.length === 0 ? (
							<Text style={styles.logText}>No logs yet.</Text>
						) : (
							debugLog.map((log, i) => (
								<Text
									key={`log-${i}-${log.substring(0, 10)}`}
									style={styles.logText}
								>
									{log}
								</Text>
							))
						)}
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: colors.backgroundLight },
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: spacing.lg,
		borderBottomWidth: 1,
		borderBottomColor: colors.slate200,
	},
	title: {
		fontSize: 18,
		fontWeight: "600",
		color: colors.slate800,
	},
	content: { padding: spacing.lg },
	section: { marginBottom: spacing.xl },
	sectionTitle: {
		fontSize: 14,
		fontWeight: "600",
		color: colors.slate500,
		textTransform: "uppercase",
		marginBottom: spacing.md,
		letterSpacing: 1,
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: spacing.md,
		borderBottomWidth: 1,
		borderBottomColor: colors.slate100,
	},
	label: { fontSize: 16, color: colors.slate800 },
	card: {
		backgroundColor: colors.white,
		padding: spacing.md,
		borderRadius: 12,
		marginTop: spacing.sm,
		borderWidth: 1,
		borderColor: colors.slate200,
	},
	cardText: {
		fontSize: 14,
		color: colors.slate600,
		lineHeight: 20,
	},
	logContainer: {
		backgroundColor: colors.slate900,
		padding: spacing.md,
		borderRadius: 8,
		minHeight: 100,
	},
	logText: {
		color: colors.mint,
		fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
		fontSize: 12,
		marginBottom: 4,
	},
});
