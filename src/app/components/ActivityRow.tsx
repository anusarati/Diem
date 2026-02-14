import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";
import type { ActivityItem } from "../types";

type Props = {
	activity: ActivityItem;
	onToggle: () => void;
	last?: boolean;
};

const iconBgMap = {
	marshmallow: { bg: "#FEE2E2", icon: colors.red300 },
	primary: { bg: "rgba(19, 236, 164, 0.1)", icon: colors.primary },
	neutral: { bg: colors.slate100, icon: colors.slate400 },
};

const ICONS: Record<string, string> = {
	self_improvement: "🧘",
	edit_note: "📝",
	local_florist: "🌱",
	book_2: "📖",
};

export function ActivityRow({ activity, onToggle, last }: Props) {
	const { bg } = iconBgMap[activity.iconBg];
	const iconChar = ICONS[activity.icon] ?? "•";

	return (
		<View style={[styles.row, !last && styles.border]}>
			<View style={[styles.iconBox, { backgroundColor: bg }]}>
				<Text style={styles.iconText}>{iconChar}</Text>
			</View>
			<View style={styles.content}>
				<Text style={styles.title}>{activity.title}</Text>
				<Text style={styles.subtitle}>{activity.subtitle}</Text>
			</View>
			<Pressable
				onPress={onToggle}
				style={[styles.checkbox, activity.completed && styles.checkboxChecked]}
			>
				{activity.completed && <Text style={styles.checkmark}>✓</Text>}
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 16,
		gap: 16,
	},
	border: { borderBottomWidth: 0.5, borderBottomColor: "#E5E7EB" },
	iconBox: {
		width: 40,
		height: 40,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	iconText: { fontSize: 18 },
	content: { flex: 1 },
	title: { fontSize: 15, fontWeight: "300", color: colors.slate700 },
	subtitle: {
		fontSize: 11,
		fontWeight: "300",
		color: colors.slate400,
		marginTop: 2,
	},
	checkbox: {
		width: 24,
		height: 24,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#d1d5db",
		alignItems: "center",
		justifyContent: "center",
	},
	checkboxChecked: {
		borderColor: colors.primary,
		backgroundColor: "transparent",
	},
	checkmark: { color: colors.primary, fontSize: 14, fontWeight: "600" },
});
