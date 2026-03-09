import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../theme";
import type { ActivityItem } from "../types";

type Props = {
	activity: Partial<ActivityItem> & {
		name: string;
		defaultDuration: number;
		categoryId: string;
	};
	onToggle?: () => void;
	last?: boolean;
	onPress?: () => void;
};

export function ActivityRow({ activity, onToggle, last, onPress }: Props) {
	const subtitle = `${activity.defaultDuration} min • ${activity.categoryId}`;
	return (
		<View style={[styles.row, !last && styles.border]}>
			{onToggle && (
				<Pressable
					onPress={onToggle}
					style={[
						styles.checkbox,
						activity.completed && styles.checkboxChecked,
					]}
				>
					{activity.completed && <Text style={styles.checkmark}>✓</Text>}
				</Pressable>
			)}
			<Pressable style={styles.content} onPress={onPress}>
				<Text
					style={[styles.title, activity.completed && styles.titleCompleted]}
				>
					{activity.name}
				</Text>
				<Text style={styles.subtitle}>{subtitle}</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: spacing.lg,
		gap: spacing.lg,
	},
	border: { borderBottomWidth: 1, borderBottomColor: colors.slate100 },
	content: { flex: 1 },
	title: {
		fontSize: 16,
		fontWeight: "500",
		color: colors.slate800,
	},
	titleCompleted: {
		textDecorationLine: "line-through",
		color: colors.slate400,
	},
	subtitle: {
		fontSize: 13,
		fontWeight: "400",
		color: colors.slate500,
		marginTop: 2,
	},
	checkbox: {
		width: 24,
		height: 24,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.slate300,
		alignItems: "center",
		justifyContent: "center",
	},
	checkboxChecked: {
		borderColor: colors.primary,
		backgroundColor: "transparent",
	},
	checkmark: { color: colors.primary, fontSize: 14, fontWeight: "600" },
});
