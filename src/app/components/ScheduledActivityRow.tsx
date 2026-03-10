import { Pressable, StyleSheet, Text, View } from "react-native";
import { EventStatus } from "../../types/domain";
import { colors } from "../theme";
import type { ScheduledActivity } from "../types";

type Props = {
	activity: ScheduledActivity;
	onToggle: () => void;
	onPress?: () => void;
	last?: boolean;
	style?: any;
};

export function ScheduledActivityRow({
	activity,
	onToggle,
	onPress,
	last,
	style,
}: Props) {
	const completed = activity.status === EventStatus.COMPLETED;
	const startDate = new Date(activity.startTime);
	const dateLabel = startDate.toLocaleDateString(undefined, {
		weekday: "short",
		month: "short",
		day: "numeric",
	});
	const timeLabel = startDate.toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});
	const subtitle = `${dateLabel} • ${timeLabel} • ${activity.duration} min • ${activity.categoryId}`;

	return (
		<View style={[styles.row, !last && styles.border, style]}>
			<Pressable
				onPress={onToggle}
				style={[styles.checkbox, completed && styles.checkboxChecked]}
			>
				{completed && <Text style={styles.checkmark}>✓</Text>}
			</Pressable>
			<Pressable style={styles.content} onPress={onPress}>
				<Text style={[styles.title, completed && styles.titleCompleted]}>
					{activity.title}
				</Text>
				<Text style={styles.subtitle}>{subtitle}</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flex: 1,
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
