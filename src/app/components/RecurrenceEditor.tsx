import {
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

type Frequency = "DAILY" | "WEEKLY" | "MONTHLY";

export type RecurrencePattern = {
	frequency: Frequency;
	interval: number;
	daysOfWeek: number[];
};

type Props = {
	pattern: RecurrencePattern;
	setPattern: (pattern: RecurrencePattern) => void;
};

export function RecurrenceEditor({ pattern, setPattern }: Props) {
	const frequencies: Frequency[] = ["DAILY", "WEEKLY", "MONTHLY"];
	const daysOfWeekLabels = ["S", "M", "T", "W", "T", "F", "S"];

	const toggleDay = (dayIndex: number) => {
		const currentDays = pattern.daysOfWeek || [];
		const newDays = currentDays.includes(dayIndex)
			? currentDays.filter((d) => d !== dayIndex)
			: [...currentDays, dayIndex].sort();
		setPattern({ ...pattern, daysOfWeek: newDays });
	};

	return (
		<View style={styles.wrap}>
			<View style={styles.header}>
				<Text style={styles.label}>Recurrence Pattern</Text>
			</View>

			<View style={styles.row}>
				{frequencies.map((freq) => (
					<TouchableOpacity
						key={freq}
						style={[
							styles.button,
							pattern.frequency === freq && styles.activeButton,
						]}
						onPress={() => setPattern({ ...pattern, frequency: freq })}
					>
						<Text
							style={[
								styles.buttonText,
								pattern.frequency === freq && styles.activeText,
							]}
						>
							{freq}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			<View style={[styles.row, styles.intervalRow]}>
				<Text style={styles.subLabel}>Interval (Every N periods):</Text>
				<TextInput
					style={styles.input}
					keyboardType="numeric"
					value={String(pattern.interval)}
					onChangeText={(text) =>
						setPattern({ ...pattern, interval: parseInt(text, 10) || 1 })
					}
				/>
			</View>

			{pattern.frequency === "WEEKLY" && (
				<View style={styles.daysRow}>
					{daysOfWeekLabels.map((day, index) => {
						const isSelected = pattern.daysOfWeek.includes(index);
						return (
							<TouchableOpacity
								key={day}
								style={[styles.dayCircle, isSelected && styles.activeButton]}
								onPress={() => toggleDay(index)}
							>
								<Text style={[styles.dayText, isSelected && styles.activeText]}>
									{day}
								</Text>
							</TouchableOpacity>
						);
					})}
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: { marginBottom: 16 },
	header: { marginBottom: 8 },
	label: { fontSize: 14, fontWeight: "700", color: "#475569" },
	subLabel: { fontSize: 14, fontWeight: "600", color: "#64748B" },
	row: { flexDirection: "row", gap: 8, marginBottom: 12 },
	intervalRow: { alignItems: "center", justifyContent: "space-between" },
	button: {
		flex: 1,
		paddingVertical: 8,
		backgroundColor: "#F8FAFC",
		borderRadius: 8,
		alignItems: "center",
		borderWidth: 1,
		borderColor: "#E2E8F0",
	},
	activeButton: { backgroundColor: "#475569", borderColor: "#475569" },
	buttonText: { fontSize: 12, fontWeight: "700", color: "#64748B" },
	activeText: { color: "#FFFFFF" },
	input: {
		width: 60,
		height: 36,
		backgroundColor: "#F8FAFC",
		borderRadius: 8,
		textAlign: "center",
		borderWidth: 1,
		borderColor: "#E2E8F0",
		fontWeight: "700",
		color: "#475569",
	},
	daysRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 4,
	},
	dayCircle: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: "#F8FAFC",
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		borderColor: "#E2E8F0",
	},
	dayText: { fontSize: 14, fontWeight: "700", color: "#64748B" },
});
