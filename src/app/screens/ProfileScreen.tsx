import { useCallback, useEffect, useState } from "react";
import {
	Pressable,
	SafeAreaView,
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	View,
} from "react-native";
import { getCurrentUser } from "../data/auth";
import { getUserSettings, saveUserSettings } from "../data/storage";
import { colors, spacing } from "../theme";
import type { UserSettings } from "../types";

type Props = {
	onLogout: () => void;
};

export function ProfileScreen({ onLogout }: Props) {
	const [name, setName] = useState<string>("");
	const [settings, setSettings] = useState<UserSettings | null>(null);
	const [saved, setSaved] = useState(false);

	useEffect(() => {
		getCurrentUser().then((u) => {
			if (u) setName(u.name);
		});
	}, []);

	useEffect(() => {
		getUserSettings().then(setSettings);
	}, []);

	const update = useCallback((patch: Partial<UserSettings>) => {
		setSettings((prev) => (prev ? { ...prev, ...patch } : null));
		setSaved(false);
	}, []);

	const handleSave = async () => {
		if (!settings) return;
		await saveUserSettings(settings);
		setSaved(true);
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
	logoutBtn: {
		marginTop: spacing.xxl,
		paddingVertical: spacing.md,
		alignItems: "center",
	},
	logoutLabel: { fontSize: 16, fontWeight: "500", color: colors.slate500 },
});
