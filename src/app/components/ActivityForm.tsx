import { useState } from "react";
import {
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import type { ActivityFormData } from "../hooks/useActivityValidation";
import { ConstraintToggle } from "./ConstraintToggle";
import { PrioritySelector } from "./PrioritySelector";
import { RecurrenceEditor, type RecurrencePattern } from "./RecurrenceEditor";

type Props = {
	onSubmit: (data: ActivityFormData) => void;
	initialData?: Partial<ActivityFormData>;
};

export function ActivityForm({ onSubmit }: Props) {
	const [title, setTitle] = useState("");
	const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
	const [replaceabilityStatus, setReplaceabilityStatus] = useState<
		"HARD" | "SOFT"
	>("SOFT");

	const [isRecurring, setIsRecurring] = useState(false);
	const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>(
		{
			frequency: "WEEKLY",
			interval: 1,
			daysOfWeek: [],
		},
	);

	const handleSubmit = () => {
		if (title.trim()) {
			onSubmit({
				title,
				priority,
				replaceabilityStatus,
				isRecurring,
				...(isRecurring && { recurrencePattern }),
			});
		}
	};

	return (
		<View style={styles.wrap}>
			<View style={styles.inputGroup}>
				<Text style={styles.label}>Activity Title</Text>
				<TextInput
					style={styles.input}
					placeholder="Enter activity name"
					placeholderTextColor="#94A3B8"
					value={title}
					onChangeText={setTitle}
				/>
			</View>

			<PrioritySelector priority={priority} setPriority={setPriority} />

			<ConstraintToggle
				status={replaceabilityStatus}
				onChange={setReplaceabilityStatus}
			/>

			<View style={styles.toggleGroup}>
				<Text style={styles.label}>Make this a recurring activity?</Text>
				<TouchableOpacity
					style={[styles.toggleButton, isRecurring && styles.activeToggle]}
					onPress={() => setIsRecurring(!isRecurring)}
				>
					<Text
						style={[styles.toggleText, isRecurring && styles.activeToggleText]}
					>
						{isRecurring ? "Yes, Recurring" : "No, One-time"}
					</Text>
				</TouchableOpacity>
			</View>

			{isRecurring && (
				<RecurrenceEditor
					pattern={recurrencePattern}
					setPattern={setRecurrencePattern}
				/>
			)}

			<TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
				<Text style={styles.submitText}>Save Activity</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: { paddingBottom: 24 },
	inputGroup: { marginBottom: 16 },
	label: { fontSize: 14, fontWeight: "700", color: "#475569", marginBottom: 8 },
	input: {
		height: 48,
		backgroundColor: "#F8FAFC",
		borderRadius: 8,
		paddingHorizontal: 16,
		borderWidth: 1,
		borderColor: "#E2E8F0",
		fontSize: 14,
		fontWeight: "600",
		color: "#0F172A",
	},
	toggleGroup: {
		marginBottom: 16,
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	toggleButton: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		backgroundColor: "#F8FAFC",
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#E2E8F0",
	},
	activeToggle: { backgroundColor: "#475569", borderColor: "#475569" },
	toggleText: { fontSize: 12, fontWeight: "700", color: "#64748B" },
	activeToggleText: { color: "#FFFFFF" },
	submitButton: {
		backgroundColor: "#475569",
		paddingVertical: 14,
		borderRadius: 8,
		alignItems: "center",
		marginTop: 12,
	},
	submitText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
