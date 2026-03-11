import type { ActivityFormData } from "app/hooks/useActivityValidation";
import {
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { colors, spacing } from "../theme";
import { TimeRestrictionPicker } from "./TimeRestrictionPicker";

type Props = {
	values: ActivityFormData;
	onChange: <T extends keyof ActivityFormData>(
		field: T,
		value: ActivityFormData[T],
	) => void;
	onClose: () => void;
};

export function AdvancedConstraintsSheet({ values, onChange, onClose }: Props) {
	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity onPress={onClose} hitSlop={12}>
					<Text style={styles.backBtn}>← Back</Text>
				</TouchableOpacity>
				<Text style={styles.title}>Advanced Constraints</Text>
				<View style={{ width: 40 }} />
			</View>

			<ScrollView
				style={styles.content}
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingBottom: 40 }}
			>
				{/* Frequency Constraints */}
				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>Frequency & Duration</Text>
				</View>

				<View style={styles.row}>
					<View style={styles.field}>
						<Text style={styles.label}>Min Frequency (/wk)</Text>
						<TextInput
							style={styles.input}
							keyboardType="numeric"
							value={String(values.minFrequency || "")}
							onChangeText={(v) =>
								onChange("minFrequency", parseInt(v, 10) || 0)
							}
						/>
					</View>
					<View style={styles.field}>
						<Text style={styles.label}>Max Frequency (/wk)</Text>
						<TextInput
							style={styles.input}
							keyboardType="numeric"
							value={String(values.maxFrequency || "")}
							onChangeText={(v) =>
								onChange("maxFrequency", parseInt(v, 10) || 0)
							}
						/>
					</View>
				</View>

				<View style={styles.row}>
					<View style={styles.field}>
						<Text style={styles.label}>Min Duration (mins)</Text>
						<TextInput
							style={styles.input}
							keyboardType="numeric"
							value={String(values.minDuration || "")}
							onChangeText={(v) =>
								onChange("minDuration", parseInt(v, 10) || 0)
							}
						/>
					</View>
					<View style={styles.field}>
						<Text style={styles.label}>Max Duration (mins)</Text>
						<TextInput
							style={styles.input}
							keyboardType="numeric"
							value={String(values.maxDuration || "")}
							onChangeText={(v) =>
								onChange("maxDuration", parseInt(v, 10) || 0)
							}
						/>
					</View>
				</View>

				{/* Monthly Recurrence Details */}
				{values.isRecurring &&
					values.recurrencePattern?.frequency === "MONTHLY" && (
						<View style={styles.field}>
							<Text style={styles.label}>Day of Month (1-31)</Text>
							<TextInput
								style={styles.input}
								keyboardType="numeric"
								placeholder="e.g. 15"
								value={String(values.recurrencePattern?.dayOfMonth || "")}
								onChangeText={(v) =>
									onChange("recurrencePattern", {
										...values.recurrencePattern,
										frequency: values.recurrencePattern?.frequency || "MONTHLY",
										interval: values.recurrencePattern?.interval || 1,
										dayOfMonth: parseInt(v, 10) || undefined,
									})
								}
							/>
						</View>
					)}

				<View style={styles.separator} />

				{/* Time Restrictions */}
				<TimeRestrictionPicker
					restrictions={values.timeRestrictions || []}
					onChange={(res) => onChange("timeRestrictions", res)}
				/>

				<View style={styles.field}>
					<Text style={styles.label}>Strict Deadline</Text>
					<TextInput
						style={styles.input}
						placeholder="YYYY-MM-DD HH:MM"
						value={values.deadline || ""}
						onChangeText={(v) => onChange("deadline", v)}
					/>
				</View>

				<TouchableOpacity style={styles.saveBtn} onPress={onClose}>
					<Text style={styles.saveBtnText}>Done</Text>
				</TouchableOpacity>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.white },
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: spacing.xl,
		paddingVertical: spacing.lg,
		borderBottomWidth: 1,
		borderBottomColor: colors.slate100,
	},
	backBtn: { fontSize: 16, fontWeight: "600", color: colors.primary },
	title: { fontSize: 18, fontWeight: "700", color: colors.slate800 },
	content: { flex: 1, padding: spacing.xl },
	sectionHeader: { marginBottom: 16 },
	sectionTitle: {
		fontSize: 12,
		fontWeight: "800",
		color: colors.slate400,
		textTransform: "uppercase",
		letterSpacing: 1,
	},
	row: { flexDirection: "row", gap: 12, marginBottom: 16 },
	field: { flex: 1, marginBottom: 16 },
	label: {
		fontSize: 13,
		fontWeight: "600",
		color: colors.slate700,
		marginBottom: 8,
	},
	input: {
		height: 44,
		backgroundColor: colors.slate50,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.slate200,
		paddingHorizontal: 12,
		fontSize: 15,
		color: colors.slate800,
	},
	separator: {
		height: 1,
		backgroundColor: colors.slate100,
		marginVertical: 12,
	},
	saveBtn: {
		backgroundColor: colors.slate800,
		height: 50,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		marginTop: 20,
	},
	saveBtnText: { color: colors.white, fontSize: 16, fontWeight: "700" },
});
