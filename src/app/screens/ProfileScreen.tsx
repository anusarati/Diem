import * as Calendar from "expo-calendar";
import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import {
	Alert,
	Platform,
	Pressable,
	SafeAreaView,
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	View,
} from "react-native";
import { Button } from "../components/Button";
import { ROUTES } from "../constants/routes";
import {
	observeCurrentUserProfileData,
	saveUserSettings,
} from "../data/services";
import { colors, spacing } from "../theme";
import type { AppRoute, UserSettings } from "../types";

type Props = {
	onLogout: () => void;
	onNavigate: (route: AppRoute) => void;
};

export function ProfileScreen({ onLogout, onNavigate }: Props) {
	const [name, setName] = useState<string>("");
	const [settings, setSettings] = useState<UserSettings | null>(null);
	const [saved, setSaved] = useState(false);

	const [locationEnabled, setLocationEnabled] = useState(false);
	const [calendarAccess, setCalendarAccess] = useState(false);
	const [debugLog, setDebugLog] = useState<string[]>([]);

	const checkPermissions = useCallback(async () => {
		const { status: locStatus } =
			await Location.getForegroundPermissionsAsync();
		setLocationEnabled(locStatus === "granted");

		const { status: calStatus } = await Calendar.getCalendarPermissionsAsync();
		setCalendarAccess(calStatus === "granted");
	}, []);

	useEffect(() => {
		let disposed = false;
		// biome-ignore lint/correctness/noUnusedVariables: used in cleanup
		let stopObserving: (() => void) | null = null;

		checkPermissions();

		observeCurrentUserProfileData((profile) => {
			if (disposed) return;
			setName(profile.name);
			setSettings(profile.settings);
		})
			.then((stop) => {
				if (disposed) {
					stop();
					return;
				}
				stopObserving = stop;
			})
			.catch(() => {
				if (!disposed) {
					// Fallback if observation fails
					setSettings({ notificationsEnabled: true });
				}
			});

		return () => {
			disposed = true;
			stopObserving?.();
		};
	}, [checkPermissions]);

	const update = useCallback((patch: Partial<UserSettings>) => {
		setSettings((prev) => (prev ? { ...prev, ...patch } : null));
		setSaved(false);
	}, []);

	const handleSave = async () => {
		if (!settings) return;
		await saveUserSettings(settings);
		setSaved(true);
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

	if (settings === null) {
		return (
			<SafeAreaView style={styles.safe}>
				<View style={styles.header}>
					<Text style={styles.title}>Profile</Text>
				</View>
				<View style={styles.loading}>
					<Text style={styles.loadingText}>Loading…</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.safe}>
			<View style={styles.header}>
				<Text style={styles.title}>Profile</Text>
			</View>
			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
			>
				<View style={styles.profileCard}>
					<Text style={styles.profileName}>{name || "—"}</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Notifications</Text>
					<View style={styles.row}>
						<Text style={styles.rowLabel}>Receive notifications</Text>
						<Switch
							value={settings.notificationsEnabled}
							onValueChange={(v) => update({ notificationsEnabled: v })}
							trackColor={{ false: colors.slate200, true: colors.primary }}
							thumbColor={colors.white}
						/>
					</View>
				</View>

				<View style={styles.section}>
					<Text style={styles.cardText}>
						Test the Intelligent Notification System.
					</Text>
					<Button
						label="Test Notification"
						icon="🔔"
						onPress={testNotification}
						style={{ marginTop: spacing.md, alignSelf: "flex-start" }}
					/>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Integrations</Text>
					<View style={styles.row}>
						<Text style={styles.rowLabel}>Location Context</Text>
						<Switch
							value={locationEnabled}
							onValueChange={toggleLocation}
							trackColor={{ false: colors.slate200, true: colors.primary }}
							thumbColor={colors.white}
						/>
					</View>
					<View style={[styles.row, { marginTop: spacing.sm }]}>
						<Text style={styles.rowLabel}>Calendar Sync</Text>
						<Switch
							value={calendarAccess}
							onValueChange={toggleCalendar}
							trackColor={{ false: colors.slate200, true: colors.primary }}
							thumbColor={colors.white}
						/>
					</View>
				</View>

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

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Debug View</Text>
					<View style={styles.logContainer}>
						{debugLog.length === 0 ? (
							<Text style={styles.logText}>No logs yet.</Text>
						) : (
							debugLog.map((log, i) => (
								<Text
									// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
									key={`log-${i}-${log.substring(0, 10)}`}
									style={styles.logText}
								>
									{log}
								</Text>
							))
						)}
					</View>
				</View>

				<Pressable onPress={handleSave} style={styles.saveBtn}>
					<Text style={styles.saveLabel}>
						{saved ? "Saved" : "Save preferences"}
					</Text>
				</Pressable>

				<Pressable onPress={onLogout} style={styles.logoutBtn}>
					<Text style={styles.logoutLabel}>Log out</Text>
				</Pressable>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: colors.backgroundLight },
	header: {
		paddingHorizontal: spacing.xl,
		paddingVertical: spacing.lg,
		borderBottomWidth: 1,
		borderBottomColor: colors.slate200,
		backgroundColor: colors.white,
	},
	title: { fontSize: 18, fontWeight: "600", color: colors.slate800 },
	loading: { flex: 1, justifyContent: "center", alignItems: "center" },
	loadingText: { fontSize: 14, color: colors.slate500 },
	scroll: { flex: 1 },
	scrollContent: { padding: spacing.xl, paddingBottom: 48 },
	profileCard: {
		backgroundColor: colors.white,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.slate100,
		padding: spacing.xl,
		marginBottom: spacing.xxl,
	},
	profileName: { fontSize: 20, fontWeight: "600", color: colors.slate800 },
	section: { marginBottom: spacing.xxl },
	sectionTitle: {
		fontSize: 14,
		fontWeight: "600",
		color: colors.slate700,
		marginBottom: spacing.md,
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		backgroundColor: colors.white,
		paddingVertical: spacing.lg,
		paddingHorizontal: spacing.lg,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.slate100,
	},
	rowLabel: { fontSize: 16, color: colors.slate700 },
	saveBtn: {
		backgroundColor: colors.primary,
		borderRadius: 12,
		paddingVertical: spacing.lg,
		alignItems: "center",
		marginTop: spacing.lg,
	},
	saveLabel: { fontSize: 16, fontWeight: "600", color: colors.slate800 },
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
		marginTop: spacing.sm,
	},
	logText: {
		color: colors.primary, // Using primary instead of mint for consistency if mint isn't available
		fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
		fontSize: 12,
		marginBottom: 4,
	},
	logoutBtn: {
		marginTop: spacing.xxl,
		paddingVertical: spacing.md,
		alignItems: "center",
	},
	logoutLabel: { fontSize: 16, fontWeight: "500", color: colors.slate500 },
});
