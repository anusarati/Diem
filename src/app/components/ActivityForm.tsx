import { useState } from "react";
import {
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import {
	type ActivityFormData,
	useActivityValidation,
} from "../hooks/useActivityValidation";
import { CategoryManager } from "./CategoryManager";
import { ConstraintToggle } from "./ConstraintToggle";
import { PrioritySelector } from "./PrioritySelector";
import { RecurrenceEditor } from "./RecurrenceEditor";

type Props = {
	onSubmit: (data: ActivityFormData) => void;
	initialData?: Partial<ActivityFormData>;
};

export function ActivityForm({ onSubmit, initialData }: Props) {
	const { setValue, handleSubmit, watch, errors } = useActivityValidation({
		onSubmit,
		defaultValues: initialData,
	});

	const title = watch("title");
	const priority = watch("priority");
	const replaceabilityStatus = watch("replaceabilityStatus");
	const isRecurring = watch("isRecurring");
	const recurrencePattern = (watch(
		"recurrencePattern",
	) as ActivityFormData["recurrencePattern"]) || {
		frequency: "WEEKLY" as const,
		interval: 1,
		daysOfWeek: [] as number[],
	};

	const [categories, setCategories] = useState([
		{ name: "Work", color: "#3B82F6" },
		{ name: "Personal", color: "#10B981" },
	]);

	return (
		<View style={styles.wrap}>
			<View style={styles.inputGroup}>
				<Text style={styles.label}>Activity Title</Text>
				<TextInput
					style={[styles.input, errors.title && styles.inputError]}
					placeholder="Enter activity name"
					placeholderTextColor="#94A3B8"
					value={title}
					onChangeText={(v) => setValue("title", v)}
				/>
				{errors.title && (
					<Text style={styles.errorText}>{errors.title.message}</Text>
				)}
			</View>

			<PrioritySelector
				priority={priority}
				setPriority={(v) => setValue("priority", v)}
			/>

			<ConstraintToggle
				status={replaceabilityStatus}
				onChange={(v) => setValue("replaceabilityStatus", v)}
			/>

			<CategoryManager
				categories={categories}
				onAddCategory={(cat) => {
					setCategories([...categories, cat]);
					setValue("category", cat.name);
				}}
			/>

			<View style={styles.toggleGroup}>
				<Text style={styles.label}>Make this a recurring activity?</Text>
				<TouchableOpacity
					style={[styles.toggleButton, isRecurring && styles.activeToggle]}
					onPress={() => setValue("isRecurring", !isRecurring)}
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
					setPattern={(v) => setValue("recurrencePattern", v)}
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
	inputError: { borderColor: "#EF4444" },
	errorText: { color: "#EF4444", fontSize: 12, marginTop: 4 },
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
