import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";
import type { GoalTimeData } from "../types";
import { formatMinutes } from "../utils/formatTime";

type Props = {
	goal: GoalTimeData;
	last?: boolean;
};

export function GoalTimeRow({ goal, last }: Props) {
	const pct =
		goal.targetMinutes > 0
			? Math.min(
					100,
					Math.round((goal.completedMinutes / goal.targetMinutes) * 100),
				)
			: 0;

	return (
		<View style={[styles.row, !last && styles.rowBorder]}>
			<View style={styles.header}>
				<Text style={styles.label}>{goal.label}</Text>
				<View style={styles.badges}>
					<Text style={styles.doneLabel}>Done</Text>
					<Text style={styles.value}>
						{formatMinutes(goal.completedMinutes)}
					</Text>
					<Text style={styles.sep}>/</Text>
					<Text style={styles.targetLabel}>Target</Text>
					<Text style={styles.target}>{formatMinutes(goal.targetMinutes)}</Text>
				</View>
			</View>
			<View style={styles.projectedRow}>
				<Text style={styles.projectedLabel}>Projected</Text>
				<Text style={styles.projectedValue}>
					{formatMinutes(goal.projectedMinutes)}
				</Text>
			</View>
			<View style={styles.track}>
				<View
					style={[
						styles.fill,
						{
							width: `${pct}%`,
							backgroundColor: goal.onTrack
								? colors.mintDark
								: colors.peachDark,
						},
					]}
				/>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		marginBottom: 16,
		paddingBottom: 16,
	},
	rowBorder: {
		borderBottomWidth: 1,
		borderBottomColor: colors.slate100,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 6,
	},
	label: { fontSize: 14, fontWeight: "700", color: colors.slate700 },
	badges: { flexDirection: "row", alignItems: "baseline", gap: 4, flexWrap: "wrap" },
	doneLabel: { fontSize: 10, fontWeight: "600", color: colors.slate400, textTransform: "uppercase", marginRight: 2 },
	value: { fontSize: 14, fontWeight: "700", color: colors.mintDark },
	sep: { fontSize: 12, color: colors.slate400 },
	targetLabel: { fontSize: 10, fontWeight: "600", color: colors.slate400, textTransform: "uppercase", marginRight: 2 },
	target: { fontSize: 12, fontWeight: "600", color: colors.slate500 },
	projectedRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 8,
	},
	projectedLabel: {
		fontSize: 11,
		fontWeight: "600",
		color: colors.slate400,
		textTransform: "uppercase",
	},
	projectedValue: {
		fontSize: 12,
		fontWeight: "700",
		color: colors.lavenderDark,
	},
	track: {
		height: 6,
		width: "100%",
		backgroundColor: colors.slate100,
		borderRadius: 3,
		overflow: "hidden",
	},
	fill: { height: "100%", borderRadius: 3 },
});
