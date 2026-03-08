import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const PRIORITY_LEVELS: { value: "low" | "medium" | "high"; label: string }[] = [
	{ value: "low", label: "Low" },
	{ value: "medium", label: "Med" },
	{ value: "high", label: "High" },
];

type Props = {
	priority: "low" | "medium" | "high";
	setPriority: (p: "low" | "medium" | "high") => void;
};

export function PrioritySelector({ priority, setPriority }: Props) {
	return (
		<View style={styles.wrap}>
			<Text style={styles.label}>Priority Level</Text>
			<View style={styles.row}>
				{PRIORITY_LEVELS.map((level) => (
					<TouchableOpacity
						key={level.value}
						style={[styles.pill, priority === level.value && styles.activePill]}
						onPress={() => setPriority(level.value)}
					>
						<Text
							style={[
								styles.levelText,
								priority === level.value && styles.activeLevelText,
							]}
						>
							{level.label}
						</Text>
					</TouchableOpacity>
				))}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: { marginBottom: 16 },
	label: { fontSize: 14, fontWeight: "700", color: "#475569", marginBottom: 8 },
	row: { flexDirection: "row", justifyContent: "space-between" },
	pill: {
		flex: 1,
		marginHorizontal: 4,
		height: 40,
		borderRadius: 8,
		backgroundColor: "#F8FAFC",
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		borderColor: "#E2E8F0",
	},
	activePill: { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
	levelText: { fontSize: 14, fontWeight: "600", color: "#64748B" },
	activeLevelText: { color: "#FFFFFF" },
});
