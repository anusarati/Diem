import { useEffect, useState } from "react";
import {
	ScrollView,
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
	showTimeFields?: boolean;
	existingActivities?: {
		id: string;
		name: string;
		priority: number;
		defaultDuration: number;
		isReplaceable: boolean;
		categoryId: string;
	}[];
};

export function ActivityForm({
	onSubmit,
	initialData,
	showTimeFields = true,
	existingActivities = [],
}: Props) {
	const { setValue, handleSubmit, watch, errors, reset } =
		useActivityValidation({
			onSubmit,
			defaultValues: initialData,
		});

	useEffect(() => {
		reset(initialData);
	}, [initialData, reset]);

	const title = watch("title");
	const priority = watch("priority");
	const replaceabilityStatus = watch("replaceabilityStatus");
	const isRecurring = watch("isRecurring");
	const startTime = watch("startTime");
	const duration = watch("duration");
	const deadline = watch("deadline");
	const minDuration = watch("minDuration");
	const maxDuration = watch("maxDuration");
	const minFrequency = watch("minFrequency");
	const maxFrequency = watch("maxFrequency");
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

	const handleSelectExisting = (activity: any) => {
		setValue("title", activity.name);
		setValue(
			"priority",
			activity.priority === 3
				? "high"
				: activity.priority === 2
					? "medium"
					: "low",
		);
		setValue("duration", activity.defaultDuration);
		setValue("category", activity.categoryId);
		setValue("replaceabilityStatus", activity.isReplaceable ? "SOFT" : "HARD");
	};

	return (
		<View style={styles.wrap}>
			{existingActivities.length > 0 && showTimeFields && (
				<View style={styles.pickerSection}>
					<Text style={styles.label}>Select from existing</Text>
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						style={styles.pickerScroll}
					>
						{existingActivities.map((act) => (
							<TouchableOpacity
								key={act.id}
								style={styles.pickerBadge}
								onPress={() => handleSelectExisting(act)}
							>
								<Text style={styles.pickerText}>{act.name}</Text>
							</TouchableOpacity>
						))}
					</ScrollView>
				</View>
			)}
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

			{showTimeFields && (
				<View style={styles.row}>
					<View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
						<Text style={styles.label}>Start Time</Text>
						<TextInput
							style={styles.input}
							placeholder="09:00"
							value={startTime}
							onChangeText={(v) => setValue("startTime", v)}
						/>
					</View>
					<View style={[styles.inputGroup, { flex: 1 }]}>
						<Text style={styles.label}>Duration (min)</Text>
						<TextInput
							style={styles.input}
							placeholder="60"
							keyboardType="numeric"
							value={duration?.toString()}
							onChangeText={(v) => setValue("duration", parseInt(v) || 0)}
						/>
					</View>
				</View>
			)}

			<PrioritySelector
				priority={priority}
				setPriority={(v) => setValue("priority", v)}
			/>

			<ConstraintToggle
				status={replaceabilityStatus}
				onChange={(v) => setValue("replaceabilityStatus", v)}
			/>

			<View style={styles.sectionHeader}>
				<Text style={styles.sectionTitle}>Advanced Constraints</Text>
			</View>

			<View style={styles.inputGroup}>
				<Text style={styles.label}>Deadline (Optional)</Text>
				<TextInput
					style={styles.input}
					placeholder="YYYY-MM-DD"
					value={deadline}
					onChangeText={(v) => setValue("deadline", v)}
				/>
			</View>

			<View style={styles.row}>
				<View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
					<Text style={styles.label}>Min Dur (m)</Text>
					<TextInput
						style={styles.input}
						keyboardType="numeric"
						value={minDuration?.toString()}
						onChangeText={(v) => setValue("minDuration", parseInt(v) || 0)}
					/>
				</View>
				<View style={[styles.inputGroup, { flex: 1 }]}>
					<Text style={styles.label}>Max Dur (m)</Text>
					<TextInput
						style={styles.input}
						keyboardType="numeric"
						value={maxDuration?.toString()}
						onChangeText={(v) => setValue("maxDuration", parseInt(v) || 0)}
					/>
				</View>
			</View>

			<View style={styles.row}>
				<View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
					<Text style={styles.label}>Min Freq (/wk)</Text>
					<TextInput
						style={styles.input}
						keyboardType="numeric"
						value={minFrequency?.toString()}
						onChangeText={(v) => setValue("minFrequency", parseInt(v) || 0)}
					/>
				</View>
				<View style={[styles.inputGroup, { flex: 1 }]}>
					<Text style={styles.label}>Max Freq (/wk)</Text>
					<TextInput
						style={styles.input}
						keyboardType="numeric"
						value={maxFrequency?.toString()}
						onChangeText={(v) => setValue("maxFrequency", parseInt(v) || 0)}
					/>
				</View>
			</View>

			<CategoryManager
				categories={categories}
				onAddCategory={(cat) => {
					setCategories([...categories, cat]);
					setValue("category", cat.name);
				}}
				onDeleteCategory={(name) => {
					setCategories(categories.filter((c) => c.name !== name));
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
	row: { flexDirection: "row", marginBottom: 16 },
	sectionHeader: {
		marginTop: 8,
		marginBottom: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#E2E8F0",
		paddingBottom: 4,
	},
	sectionTitle: {
		fontSize: 12,
		fontWeight: "800",
		color: "#94A3B8",
		textTransform: "uppercase",
		letterSpacing: 1,
	},
	pickerSection: { marginBottom: 16 },
	pickerScroll: { flexDirection: "row", gap: 8 },
	pickerBadge: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		backgroundColor: "#F1F5F9",
		borderRadius: 16,
		marginRight: 8,
		borderWidth: 1,
		borderColor: "#E2E8F0",
	},
	pickerText: { fontSize: 12, fontWeight: "600", color: "#475569" },
	submitButton: {
		backgroundColor: "#475569",
		paddingVertical: 14,
		borderRadius: 8,
		alignItems: "center",
		marginTop: 12,
	},
	submitText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
