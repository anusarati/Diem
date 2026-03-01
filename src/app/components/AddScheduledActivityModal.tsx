import { useEffect, useState } from "react";
import {
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import {
	ActivitySource,
	EventStatus,
	Replaceability,
} from "../../types/domain";
import {
	addScheduledActivity,
	updateScheduledActivity,
} from "../data/services";
import { colors, spacing } from "../theme";
import type { ActivityCategory, ScheduledActivity } from "../types";
import { Dropdown } from "./Dropdown";

const PRIORITY_OPTIONS = [
	{ label: "Low", value: 1 },
	{ label: "Medium", value: 3 },
	{ label: "High", value: 5 },
] as const;

const CATEGORY_OPTIONS: ActivityCategory[] = [
	"Work",
	"Personal",
	"Fitness",
	"Study",
	"Other",
];

/** Hour 00–23 */
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) =>
	String(i).padStart(2, "0"),
) as readonly string[];

/** Minute 00, 15, 30, 45 */
const MINUTE_OPTIONS = ["00", "15", "30", "45"] as const;

function dateKey(date: Date): string {
	return date.toISOString().slice(0, 10);
}

function formatDateLabel(date: Date): string {
	return date.toLocaleDateString(undefined, {
		weekday: "short",
		month: "short",
		day: "numeric",
	});
}

function buildActivityId(name: string): string {
	const normalized = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return `activity-${normalized || Date.now().toString()}`;
}

type Props = {
	visible: boolean;
	onClose: () => void;
	/** Date this activity is scheduled for (e.g. selected in calendar). */
	initialDate: Date;
	/** When set, form is in edit mode: prefill and save updates. */
	activityToEdit?: ScheduledActivity | null;
	onAdded?: (activity: ScheduledActivity) => void;
};

export function AddScheduledActivityModal({
	visible,
	onClose,
	initialDate,
	activityToEdit = null,
	onAdded,
}: Props) {
	const isEdit = Boolean(activityToEdit);
	const [title, setTitle] = useState("");
	const [startHour, setStartHour] = useState("10");
	const [startMinute, setStartMinute] = useState("00");
	const [duration, setDuration] = useState("60");
	const [priority, setPriority] = useState<number>(3);
	const [isReplaceable, setIsReplaceable] = useState(true);
	const [categoryId, setCategoryId] = useState<ActivityCategory>("Work");
	const [error, setError] = useState("");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (visible && activityToEdit) {
			const start = new Date(activityToEdit.startTime);
			setTitle(activityToEdit.title);
			setStartHour(String(start.getHours()).padStart(2, "0"));
			setStartMinute(String(start.getMinutes()).padStart(2, "0"));
			setDuration(String(activityToEdit.duration));
			setPriority(activityToEdit.priority);
			setIsReplaceable(
				activityToEdit.replaceabilityStatus === Replaceability.SOFT,
			);
			setCategoryId(activityToEdit.categoryId);
		} else if (visible && !activityToEdit) {
			setTitle("");
			setStartHour("10");
			setStartMinute("00");
			setDuration("60");
			setPriority(3);
			setIsReplaceable(true);
			setCategoryId("Work");
		}
		setError("");
	}, [visible, activityToEdit]);

	const baseDate = activityToEdit
		? new Date(activityToEdit.startTime)
		: initialDate;

	const handleClose = () => {
		setTitle("");
		setStartHour("10");
		setStartMinute("00");
		setDuration("60");
		setPriority(3);
		setIsReplaceable(true);
		setCategoryId("Work");
		setError("");
		onClose();
	};

	const handleAdd = async () => {
		const trimmedTitle = title.trim();
		if (!trimmedTitle) {
			setError("Title is required");
			return;
		}

		const parsedDuration = Number.parseInt(duration, 10);
		if (
			Number.isNaN(parsedDuration) ||
			parsedDuration < 1 ||
			parsedDuration > 1440
		) {
			setError("Duration must be 1–1440 minutes");
			return;
		}

		const start = new Date(
			`${dateKey(baseDate)}T${startHour.padStart(2, "0")}:${startMinute.padStart(2, "0")}:00`,
		);
		if (Number.isNaN(start.getTime())) {
			setError("Invalid date/time");
			return;
		}

		const nowIso = new Date().toISOString();
		const startIso = start.toISOString();
		const endIso = new Date(
			start.getTime() + parsedDuration * 60_000,
		).toISOString();
		const replaceabilityStatus = isReplaceable
			? Replaceability.SOFT
			: Replaceability.HARD;

		setError("");
		setSaving(true);
		try {
			if (isEdit && activityToEdit) {
				const updated = await updateScheduledActivity(activityToEdit.id, {
					activityId: activityToEdit.activityId,
					categoryId,
					title: trimmedTitle,
					startTime: startIso,
					endTime: endIso,
					duration: parsedDuration,
					status: activityToEdit.status,
					replaceabilityStatus,
					priority,
					isRecurring: activityToEdit.isRecurring,
					recurringTemplateId: activityToEdit.recurringTemplateId,
					source: activityToEdit.source,
					isLocked: !isReplaceable,
					createdAt: activityToEdit.createdAt,
					updatedAt: nowIso,
				});
				onAdded?.(updated ?? activityToEdit);
			} else {
				const activity = await addScheduledActivity({
					activityId: buildActivityId(trimmedTitle),
					categoryId,
					title: trimmedTitle,
					startTime: startIso,
					endTime: endIso,
					duration: parsedDuration,
					status: EventStatus.CONFIRMED,
					replaceabilityStatus,
					priority,
					isRecurring: false,
					source: ActivitySource.USER_CREATED,
					isLocked: !isReplaceable,
					createdAt: nowIso,
					updatedAt: nowIso,
				});
				onAdded?.(activity);
			}
			handleClose();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Failed to save");
		} finally {
			setSaving(false);
		}
	};

	return (
		<Modal
			visible={visible}
			transparent
			animationType="slide"
			onRequestClose={handleClose}
		>
			<Pressable style={styles.overlay} onPress={handleClose}>
				<Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
					<ScrollView
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
					>
						<View style={styles.header}>
							<Text style={styles.title}>
								{isEdit ? "Edit activity" : "Add New Activity"}
							</Text>
							<Pressable onPress={handleClose} hitSlop={12}>
								<Text style={styles.cancel}>Cancel</Text>
							</Pressable>
						</View>

						<Text style={styles.dateLabel}>{formatDateLabel(baseDate)}</Text>

						<Text style={styles.fieldLabel}>Title</Text>
						<TextInput
							style={styles.input}
							placeholder="e.g. Design Review"
							placeholderTextColor={colors.slate400}
							value={title}
							onChangeText={(value) => {
								setTitle(value);
								setError("");
							}}
						/>

						<View style={styles.timeRow}>
							<View style={styles.timeHalf}>
								<Dropdown
									label="Start time"
									placeholder="Hour"
									value={startHour}
									options={HOUR_OPTIONS}
									onSelect={(value) => {
										setStartHour(value);
										setError("");
									}}
								/>
							</View>
							<View style={styles.timeHalf}>
								<Dropdown
									label="  "
									placeholder="Min"
									value={startMinute}
									options={[...MINUTE_OPTIONS]}
									onSelect={(value) => {
										setStartMinute(value);
										setError("");
									}}
								/>
							</View>
						</View>

						<Text style={styles.fieldLabel}>Duration (min)</Text>
						<TextInput
							style={styles.input}
							placeholder="60"
							placeholderTextColor={colors.slate400}
							value={duration}
							onChangeText={(value) => {
								setDuration(value);
								setError("");
							}}
							keyboardType="number-pad"
						/>

						<Text style={styles.fieldLabel}>Priority</Text>
						<View style={styles.segmented}>
							{PRIORITY_OPTIONS.map((option) => (
								<Pressable
									key={option.label}
									onPress={() => setPriority(option.value)}
									style={[
										styles.segOption,
										priority === option.value && styles.segOptionSelected,
									]}
								>
									<Text
										style={[
											styles.segText,
											priority === option.value && styles.segTextSelected,
										]}
									>
										{option.label}
									</Text>
								</Pressable>
							))}
						</View>

						<View style={styles.row}>
							<Text style={styles.fieldLabel}>Replaceable?</Text>
							<Pressable
								onPress={() => setIsReplaceable(!isReplaceable)}
								style={[
									styles.checkbox,
									isReplaceable && styles.checkboxChecked,
								]}
							>
								{isReplaceable ? <Text style={styles.checkmark}>✓</Text> : null}
							</Pressable>
						</View>

						<Text style={styles.fieldLabel}>Category</Text>
						<View style={styles.chips}>
							{CATEGORY_OPTIONS.map((option) => (
								<Pressable
									key={option}
									onPress={() => setCategoryId(option)}
									style={[
										styles.chip,
										categoryId === option && styles.chipSelected,
									]}
								>
									<Text
										style={[
											styles.chipText,
											categoryId === option && styles.chipTextSelected,
										]}
									>
										{option}
									</Text>
								</Pressable>
							))}
						</View>

						{error ? <Text style={styles.error}>{error}</Text> : null}

						<Pressable
							onPress={handleAdd}
							style={[styles.addBtn, saving && styles.addBtnDisabled]}
							disabled={saving}
						>
							<Text style={styles.addBtnLabel}>
								{saving
									? "Saving…"
									: isEdit
										? "Save changes"
										: "Add to Schedule"}
							</Text>
						</Pressable>
					</ScrollView>
				</Pressable>
			</Pressable>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.4)",
		justifyContent: "flex-end",
	},
	sheet: {
		backgroundColor: colors.white,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		padding: spacing.xl,
		paddingBottom: spacing.xxl + 24,
		maxHeight: "90%",
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: spacing.sm,
	},
	title: { fontSize: 18, fontWeight: "600", color: colors.slate800 },
	cancel: { fontSize: 16, color: colors.slate500 },
	dateLabel: {
		fontSize: 14,
		color: colors.slate500,
		marginBottom: spacing.lg,
	},
	fieldLabel: {
		fontSize: 14,
		fontWeight: "600",
		color: colors.slate700,
		marginBottom: spacing.sm,
	},
	input: {
		borderWidth: 1,
		borderColor: colors.slate200,
		borderRadius: 12,
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.md,
		fontSize: 16,
		color: colors.slate800,
		marginBottom: spacing.lg,
	},
	timeRow: {
		flexDirection: "row",
		gap: spacing.md,
		marginBottom: spacing.md,
	},
	timeHalf: { flex: 1 },
	segmented: {
		flexDirection: "row",
		gap: spacing.sm,
		marginBottom: spacing.lg,
	},
	segOption: {
		flex: 1,
		borderWidth: 1,
		borderColor: colors.slate200,
		borderRadius: 10,
		paddingVertical: spacing.sm,
		alignItems: "center",
	},
	segOptionSelected: {
		borderColor: colors.primary,
		backgroundColor: colors.background,
	},
	segText: { color: colors.slate600, fontWeight: "500" },
	segTextSelected: { color: colors.slate800, fontWeight: "600" },
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: spacing.lg,
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
	chips: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: spacing.sm,
		marginBottom: spacing.lg,
	},
	chip: {
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.md,
		borderWidth: 1,
		borderColor: colors.slate200,
		borderRadius: 999,
		backgroundColor: colors.white,
	},
	chipSelected: {
		borderColor: colors.primary,
		backgroundColor: colors.background,
	},
	chipText: { color: colors.slate600, fontWeight: "500" },
	chipTextSelected: { color: colors.slate800, fontWeight: "600" },
	error: {
		color: colors.red300,
		marginBottom: spacing.md,
		fontSize: 13,
	},
	addBtn: {
		backgroundColor: colors.primary,
		borderRadius: 12,
		paddingVertical: spacing.md,
		alignItems: "center",
	},
	addBtnDisabled: {
		opacity: 0.6,
	},
	addBtnLabel: { fontSize: 16, fontWeight: "600", color: colors.slate800 },
});
