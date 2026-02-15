import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";
import type { ActivityItem } from "../types";

type Props = {
	activity: ActivityItem;
	onToggle: () => void;
	last?: boolean;
	onPress?: () => void;
};

export function ActivityRow({ activity, onToggle, last, onPress }: Props) {
	return (
		<View style={[styles.row, !last && styles.border]}>
			<Pressable
				onPress={onToggle}
				style={[styles.checkbox, activity.completed && styles.checkboxChecked]}
			>
				{activity.completed && <Text style={styles.checkmark}>✓</Text>}
			</Pressable>
			<Pressable style={styles.content} onPress={onPress}>
				<Text
					style={[styles.title, activity.completed && styles.titleCompleted]}
				>
					{activity.title}
				</Text>
				<Text style={styles.subtitle}>{activity.subtitle}</Text>
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
	border: { borderBottomWidth: 0.5, borderBottomColor: colors.slate200 },
	content: { flex: 1 },
	title: { fontSize: 15, fontWeight: "300", color: colors.slate700 },
	titleCompleted: { textDecorationLine: "line-through", color: colors.slate400 },
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
