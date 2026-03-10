import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";
import type { ActivityItem } from "../types";

type Props = {
	activity: Partial<ActivityItem> & {
		name: string;
		defaultDuration: number;
		categoryId: string;
	};
	/** Optional date label for week view (e.g. "Mon, Jan 6"). */
	dateLabel?: string;
	onToggle?: () => void;
	last?: boolean;
	onPress?: () => void;
};

function formatDateLabel(isoOrUndefined: string | undefined): string {
	if (!isoOrUndefined) return "";
	const d = new Date(isoOrUndefined);
	return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function ActivityRow({ activity, dateLabel, onToggle, last, onPress }: Props) {
	const datePart = dateLabel ?? formatDateLabel(activity.predictedStartTime);
	const subtitle = datePart
		? `${datePart} • ${activity.defaultDuration} min • ${activity.categoryId}`
		: `${activity.defaultDuration} min • ${activity.categoryId}`;
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
		paddingVertical: 16,
		gap: 16,
	},
	border: { borderBottomWidth: 0.5, borderBottomColor: colors.slate200 },
	content: { flex: 1 },
	title: { fontSize: 15, fontWeight: "300", color: colors.slate700 },
	titleCompleted: {
		textDecorationLine: "line-through",
		color: colors.slate400,
	},
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
