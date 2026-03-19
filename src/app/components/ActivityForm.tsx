import { useEffect, useState } from "react";
import {
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import type { ActivityEntity } from "types/domain";
import {
	type ActivityFormData,
	useActivityValidation,
} from "../hooks/useActivityValidation";
import { colors, spacing } from "../theme";
import { AdvancedConstraintsSheet } from "./AdvancedConstraintsSheet";
import { CategoryManager } from "./CategoryManager";
import { ConstraintToggle } from "./ConstraintToggle";
import { PrioritySelector } from "./PrioritySelector";
import { RecurrenceEditor } from "./RecurrenceEditor";

/** Subset of ActivityEntity used for "select from existing" list. */
export type ExistingActivityOption = Pick<
	ActivityEntity,
	| "id"
	| "name"
	| "priority"
	| "defaultDuration"
	| "categoryId"
	| "isReplaceable"
>;

type Props = {
	onSubmit: (data: ActivityFormData) => void;
	initialData?: Partial<ActivityFormData>;
	showTimeFields?: boolean;
	existingActivities?: ExistingActivityOption[];
};

function priorityLabel(p: number): "high" | "medium" | "low" {
	return p >= 4 ? "high" : p >= 3 ? "medium" : "low";
}

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

	const [showAdvanced, setShowAdvanced] = useState(false);
	/** The activity template that was selected from the picker, or null when in
	 *  free-form mode. Once set, all activity-level fields are locked. */
	const [selectedActivity, setSelectedActivity] =
		useState<ExistingActivityOption | null>(null);

	useEffect(() => {
		reset({
			title: "",
			startTime: "",
			duration: 60,
			priority: "medium",
			replaceabilityStatus: "SOFT",
			category: "Other",
			isRecurring: false,
			...initialData,
		});
		// Clear selection when the sheet is re-opened with new initialData
		setSelectedActivity(null);
	}, [initialData, reset]);

	const priority = watch("priority");
	const replaceabilityStatus = watch("replaceabilityStatus");
	const isRecurring = watch("isRecurring");
	const startTime = watch("startTime");
	const duration = watch("duration");
	const recurrencePattern = watch("recurrencePattern") || {
		frequency: "DAILY" as const,
		interval: 1,
		daysOfWeek: [] as number[],
	};

	const allValues = watch();

	const [categories, setCategories] = useState<
		{ name: string; color: string }[]
	>([
		{ name: "Work", color: colors.primary },
		{ name: "Personal", color: colors.mintDark },
		{ name: "Fitness", color: colors.mintDark },
		{ name: "Study", color: colors.mintDark },
		{ name: "Other", color: colors.mintDark },
	]);

	const handleSelectExisting = (activity: ExistingActivityOption) => {
		setSelectedActivity(activity);
		// Lock all activity-level fields to the template values
		setValue("title", activity.name);
		setValue("priority", priorityLabel(activity.priority));
		setValue("duration", activity.defaultDuration);
		setValue("category", activity.categoryId);
		setValue("replaceabilityStatus", activity.isReplaceable ? "SOFT" : "HARD");
		// Reset event-level fields to sensible defaults for a new event
		setValue("startTime", "");
		setValue("isRecurring", false);
	};

	const handleDeselectActivity = () => {
		setSelectedActivity(null);
		reset({
			title: "",
			startTime: "",
			duration: 60,
			priority: "medium",
			replaceabilityStatus: "SOFT",
			category: "Other",
			isRecurring: false,
			...initialData,
		});
	};

	if (showAdvanced) {
		return (
			<AdvancedConstraintsSheet
				values={allValues}
				onChange={(field, value) =>
					setValue(field as keyof ActivityFormData, value)
				}
				onClose={() => setShowAdvanced(false)}
			/>
		);
	}

	// ── LOCKED MODE: activity selected from existing ──────────────────────────
	if (selectedActivity) {
		return (
			<View style={styles.wrap}>
				{/* Activity summary card (read-only) */}
				<View style={styles.lockedCard}>
					<View style={styles.lockedCardHeader}>
						<Text style={styles.lockedCardTitle}>{selectedActivity.name}</Text>
						<TouchableOpacity
							style={styles.deselectBtn}
							onPress={handleDeselectActivity}
						>
							<Text style={styles.deselectBtnText}>✕ Change</Text>
						</TouchableOpacity>
					</View>

					<View style={styles.lockedMeta}>
						<View style={styles.lockedMetaBadge}>
							<Text style={styles.lockedMetaLabel}>Priority</Text>
							<Text style={styles.lockedMetaValue}>
								{priorityLabel(selectedActivity.priority)
									.charAt(0)
									.toUpperCase() +
									priorityLabel(selectedActivity.priority).slice(1)}
							</Text>
						</View>
						<View style={styles.lockedMetaBadge}>
							<Text style={styles.lockedMetaLabel}>Default</Text>
							<Text style={styles.lockedMetaValue}>
								{selectedActivity.defaultDuration} min
							</Text>
						</View>
						<View style={styles.lockedMetaBadge}>
							<Text style={styles.lockedMetaLabel}>Category</Text>
							<Text style={styles.lockedMetaValue}>
								{selectedActivity.categoryId || "Other"}
							</Text>
						</View>
						<View style={styles.lockedMetaBadge}>
							<Text style={styles.lockedMetaLabel}>Type</Text>
							<Text style={styles.lockedMetaValue}>
								{selectedActivity.isReplaceable ? "Flexible" : "Fixed"}
							</Text>
						</View>
					</View>
				</View>

				{/* Event-level fields only */}
				<View style={styles.row}>
					<View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
						<Text style={styles.label}>Start Time</Text>
						<TextInput
							style={styles.input}
							placeholder="10:00"
							placeholderTextColor={colors.slate400}
							value={startTime}
							onChangeText={(v) => setValue("startTime", v)}
						/>
					</View>
					<View style={[styles.inputGroup, { flex: 1 }]}>
						<Text style={styles.label}>Duration (min)</Text>
						<TextInput
							style={styles.input}
							placeholder={selectedActivity.defaultDuration.toString()}
							placeholderTextColor={colors.slate400}
							keyboardType="numeric"
							value={duration?.toString()}
							onChangeText={(v) =>
								setValue(
									"duration",
									parseInt(v, 10) || selectedActivity.defaultDuration,
								)
							}
						/>
					</View>
				</View>

				<TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
					<Text style={styles.submitText}>Add to Schedule</Text>
				</TouchableOpacity>
			</View>
		);
	}

	// ── FREE-FORM MODE ────────────────────────────────────────────────────────
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
				<Text style={styles.label}>Title</Text>
				<TextInput
					style={[styles.input, errors.title && styles.inputError]}
					placeholder="e.g. Design Review"
					placeholderTextColor={colors.slate400}
					value={watch("title")}
					onChangeText={(v) => setValue("title", v)}
				/>
				{errors.title && (
					<Text style={styles.errorText}>{errors.title.message}</Text>
				)}
			</View>

			{showTimeFields ? (
				<View style={styles.row}>
					<View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
						<Text style={styles.label}>Start Time</Text>
						<TextInput
							style={styles.input}
							placeholder="10:00"
							placeholderTextColor={colors.slate400}
							value={startTime}
							onChangeText={(v) => setValue("startTime", v)}
						/>
					</View>
					<View style={[styles.inputGroup, { flex: 1 }]}>
						<Text style={styles.label}>Duration (min)</Text>
						<TextInput
							style={[styles.input, errors.duration && styles.inputError]}
							placeholder="60"
							placeholderTextColor={colors.slate400}
							keyboardType="numeric"
							value={duration?.toString()}
							onChangeText={(v) => setValue("duration", parseInt(v, 10) || 0)}
						/>
						{errors.duration && (
							<Text style={styles.errorText}>{errors.duration.message}</Text>
						)}
					</View>
				</View>
			) : (
				<View style={styles.inputGroup}>
					<Text style={styles.label}>Default Duration (min)</Text>
					<TextInput
						style={[styles.input, errors.duration && styles.inputError]}
						placeholder="60"
						placeholderTextColor={colors.slate400}
						keyboardType="numeric"
						value={duration?.toString()}
						onChangeText={(v) => setValue("duration", parseInt(v, 10) || 0)}
					/>
					{errors.duration && (
						<Text style={styles.errorText}>{errors.duration.message}</Text>
					)}
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

			<TouchableOpacity
				style={styles.advancedBtn}
				onPress={() => setShowAdvanced(true)}
			>
				<Text style={styles.advancedBtnText}>Configure Constraints</Text>
				<Text style={styles.advancedBtnSubtitle}>
					Frequencies, durations, and restrictions
				</Text>
			</TouchableOpacity>

			{Object.keys(errors).length > 0 && (
				<View style={styles.errorSummary}>
					<Text style={styles.errorSummaryTitle}>
						Please fix the following:
					</Text>
					{Object.entries(errors).map(([key, error]) => (
						<Text key={key} style={styles.errorText}>
							• {key}: {error?.message || "Invalid value"}
						</Text>
					))}
				</View>
			)}

			<TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
				<Text style={styles.submitText}>Save Activity</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: { paddingBottom: spacing.xxl },
	inputGroup: { marginBottom: spacing.lg },
	label: {
		fontSize: 14,
		fontWeight: "600",
		color: colors.slate700,
		marginBottom: spacing.sm,
	},
	input: {
		height: 48,
		backgroundColor: colors.white,
		borderRadius: 12,
		paddingHorizontal: spacing.lg,
		borderWidth: 1,
		borderColor: colors.slate200,
		fontSize: 16,
		color: colors.slate800,
	},
	inputError: { borderColor: colors.red400 },
	errorText: { color: colors.red400, fontSize: 12, marginTop: 4 },
	toggleGroup: {
		marginBottom: spacing.lg,
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	toggleButton: {
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.sm,
		backgroundColor: colors.white,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.slate200,
	},
	activeToggle: {
		backgroundColor: colors.slate600,
		borderColor: colors.slate600,
	},
	toggleText: { fontSize: 12, fontWeight: "600", color: colors.slate600 },
	activeToggleText: { color: colors.white },
	row: { flexDirection: "row", marginBottom: spacing.sm },
	pickerSection: { marginBottom: spacing.lg },
	pickerScroll: { flexDirection: "row", gap: spacing.sm },
	pickerBadge: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		backgroundColor: colors.slate50,
		borderRadius: 20,
		marginRight: 8,
		borderWidth: 1,
		borderColor: colors.slate200,
	},
	pickerText: { fontSize: 13, fontWeight: "600", color: colors.slate600 },
	// Locked mode styles
	lockedCard: {
		backgroundColor: colors.slate50,
		borderRadius: 16,
		borderWidth: 1.5,
		borderColor: colors.primary,
		padding: spacing.lg,
		marginBottom: spacing.lg,
	},
	lockedCardHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: spacing.md,
	},
	lockedCardTitle: {
		fontSize: 18,
		fontWeight: "700",
		color: colors.slate800,
		flex: 1,
	},
	deselectBtn: {
		paddingHorizontal: 12,
		paddingVertical: 5,
		backgroundColor: colors.white,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.slate300,
	},
	deselectBtnText: {
		fontSize: 12,
		fontWeight: "600",
		color: colors.slate500,
	},
	lockedMeta: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	lockedMetaBadge: {
		backgroundColor: colors.white,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.slate200,
		paddingHorizontal: 10,
		paddingVertical: 6,
	},
	lockedMetaLabel: {
		fontSize: 10,
		fontWeight: "600",
		color: colors.slate400,
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginBottom: 2,
	},
	lockedMetaValue: {
		fontSize: 13,
		fontWeight: "700",
		color: colors.slate700,
	},
	advancedBtn: {
		padding: spacing.lg,
		backgroundColor: colors.slate50,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: colors.slate200,
		marginTop: 8,
		alignItems: "center",
	},
	advancedBtnText: {
		fontSize: 15,
		fontWeight: "700",
		color: colors.slate800,
		marginBottom: 4,
	},
	advancedBtnSubtitle: {
		fontSize: 12,
		color: colors.slate500,
	},
	submitButton: {
		backgroundColor: colors.primary,
		borderRadius: 12,
		paddingVertical: spacing.lg,
		alignItems: "center",
		marginTop: spacing.xl,
		shadowColor: colors.primary,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 10,
		elevation: 4,
	},
	submitText: { color: colors.white, fontSize: 16, fontWeight: "700" },
	errorSummary: {
		backgroundColor: "#FEF2F2",
		borderRadius: 12,
		padding: spacing.md,
		marginTop: spacing.lg,
		borderWidth: 1,
		borderColor: "#FEE2E2",
	},
	errorSummaryTitle: {
		fontSize: 14,
		fontWeight: "700",
		color: colors.red400,
		marginBottom: 4,
	},
});
