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
import { Dropdown } from "./Dropdown";
import { addScheduledActivity, updateScheduledActivity } from "../data/storage";
import { colors, spacing } from "../theme";
import type { ActivityCategory, ActivityPriority, ScheduledActivity } from "../types";

const PRIORITY_OPTIONS: ActivityPriority[] = ["Low", "Medium", "High"];
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

/** Next 14 days as YYYY-MM-DD + label for dropdown */
function deadlineOptions(from: Date): { value: string; label: string }[] {
	return Array.from({ length: 14 }, (_, i) => {
		const d = new Date(from);
		d.setDate(d.getDate() + i);
		return {
			value: dateKey(d),
			label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : formatDateLabel(d),
		};
	});
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
	const startTime = `${startHour.padStart(2, "0")}:${startMinute}`;
	const [duration, setDuration] = useState("60");
	const [priority, setPriority] = useState<ActivityPriority>("Medium");
	const [flexible, setFlexible] = useState(false);
	const [category, setCategory] = useState<ActivityCategory>("Work");
	const [deadline, setDeadline] = useState("");
	const [error, setError] = useState("");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (visible && activityToEdit) {
			setTitle(activityToEdit.title);
			setStartHour(activityToEdit.startTime.slice(0, 2));
			setStartMinute(activityToEdit.startTime.slice(3, 5));
			setDuration(String(activityToEdit.durationMinutes));
			setPriority(activityToEdit.priority);
			setFlexible(activityToEdit.flexible);
			setCategory(activityToEdit.category);
			setDeadline(activityToEdit.deadline);
		} else if (visible && !activityToEdit) {
			setTitle("");
			setStartHour("10");
			setStartMinute("00");
			setDuration("60");
			setPriority("Medium");
			setFlexible(false);
			setCategory("Work");
			setDeadline("");
		}
		setError("");
	}, [visible, activityToEdit]);

	const baseDate = activityToEdit
		? new Date(activityToEdit.date + "T12:00:00")
		: initialDate;
	const deadlineOpts = deadlineOptions(baseDate);
	const effectiveDeadline = deadline || dateKey(baseDate);

	const handleClose = () => {
		setTitle("");
		setStartHour("10");
		setStartMinute("00");
		setDuration("60");
		setPriority("Medium");
		setFlexible(false);
		setCategory("Work");
		setDeadline("");
		setError("");
		onClose();
	};

	const handleAdd = async () => {
		const t = title.trim();
		if (!t) {
			setError("Title is required");
			return;
		}
		const dur = Number.parseInt(duration, 10);
		if (Number.isNaN(dur) || dur < 1 || dur > 1440) {
			setError("Duration must be 1–1440 minutes");
			return;
		}
		setError("");
		setSaving(true);
		try {
			if (isEdit && activityToEdit) {
				const updated = await updateScheduledActivity(activityToEdit.id, {
					title: t,
					date: activityToEdit.date,
					startTime,
					durationMinutes: dur,
					priority,
					flexible,
					category,
					deadline: effectiveDeadline,
					completed: activityToEdit.completed,
				});
				onAdded?.(updated ?? activityToEdit);
			} else {
				const activity = await addScheduledActivity({
					title: t,
					date: dateKey(initialDate),
					startTime,
					durationMinutes: dur,
					priority,
					flexible,
					category,
					deadline: effectiveDeadline,
					completed: false,
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

						<Text style={styles.dateLabel}>
							{formatDateLabel(activityToEdit ? new Date(activityToEdit.date + "T12:00:00") : initialDate)}
						</Text>

						<Text style={styles.fieldLabel}>Title</Text>
						<TextInput
							style={styles.input}
							placeholder="e.g. Design Review"
							placeholderTextColor={colors.slate400}
							value={title}
							onChangeText={(v) => { setTitle(v); setError(""); }}
						/>

						<View style={styles.timeRow}>
							<View style={styles.timeHalf}>
								<Dropdown
									label="Start time"
									placeholder="Hour"
									value={startHour}
									options={HOUR_OPTIONS}
									onSelect={(v) => { setStartHour(v); setError(""); }}
								/>
							</View>
							<View style={styles.timeHalf}>
								<Dropdown
									label="  "
									placeholder="Min"
									value={startMinute}
									options={[...MINUTE_OPTIONS]}
									onSelect={(v) => { setStartMinute(v); setError(""); }}
								/>
							</View>
						</View>

						<Text style={styles.fieldLabel}>Duration (min)</Text>
						<TextInput
							style={styles.input}
							placeholder="60"
							placeholderTextColor={colors.slate400}
							value={duration}
							onChangeText={(v) => { setDuration(v); setError(""); }}
							keyboardType="number-pad"
						/>

						<Text style={styles.fieldLabel}>Priority</Text>
						<View style={styles.segmented}>
							{PRIORITY_OPTIONS.map((opt) => (
								<Pressable
									key={opt}
									onPress={() => setPriority(opt)}
									style={[
										styles.segOption,
										priority === opt && styles.segOptionSelected,
									]}
								>
									<Text
										style={[
											styles.segText,
											priority === opt && styles.segTextSelected,
										]}
									>
										{opt}
									</Text>
								</Pressable>
							))}
						</View>

						<View style={styles.row}>
							<Text style={styles.fieldLabel}>Flexible?</Text>
							<Pressable
								onPress={() => setFlexible(!flexible)}
								style={[styles.checkbox, flexible && styles.checkboxChecked]}
							>
								{flexible ? (
									<Text style={styles.checkmark}>✓</Text>
								) : null}
							</Pressable>
						</View>

						<Dropdown
							label="Deadline"
							placeholder="Select deadline"
							value={effectiveDeadline}
							options={deadlineOpts.map((o) => o.value)}
							onSelect={(v) => { setDeadline(v); setError(""); }}
						/>
						<Text style={styles.fieldLabel}>Category</Text>
						<View style={styles.chips}>
							{CATEGORY_OPTIONS.map((opt) => (
								<Pressable
									key={opt}
									onPress={() => setCategory(opt)}
									style={[
										styles.chip,
										category === opt && styles.chipSelected,
									]}
								>
									<Text
										style={[
											styles.chipText,
											category === opt && styles.chipTextSelected,
										]}
									>
										{opt}
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
								{saving ? "Saving…" : isEdit ? "Save changes" : "Add to Schedule"}
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
		backgroundColor: colors.white,
	},
	timeRow: {
		flexDirection: "row",
		gap: spacing.md,
		marginBottom: spacing.lg,
	},
	timeHalf: { flex: 1 },
	segmented: {
		flexDirection: "row",
		gap: spacing.sm,
		marginBottom: spacing.lg,
	},
	segOption: {
		flex: 1,
		paddingVertical: spacing.md,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.slate200,
		backgroundColor: colors.white,
	},
	segOptionSelected: {
		borderColor: colors.primary,
		backgroundColor: "rgba(19, 236, 164, 0.12)",
	},
	segText: { fontSize: 14, color: colors.slate700 },
	segTextSelected: { color: colors.primary, fontWeight: "600" },
	row: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: spacing.lg,
		gap: spacing.md,
	},
	checkbox: {
		width: 24,
		height: 24,
		borderRadius: 6,
		borderWidth: 2,
		borderColor: colors.slate300,
		alignItems: "center",
		justifyContent: "center",
	},
	checkboxChecked: {
		backgroundColor: colors.primary,
		borderColor: colors.primary,
	},
	checkmark: { color: colors.slate800, fontSize: 14, fontWeight: "700" },
	chips: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: spacing.sm,
		marginBottom: spacing.lg,
	},
	chip: {
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.md,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: colors.slate200,
		backgroundColor: colors.white,
	},
	chipSelected: {
		borderColor: colors.primary,
		backgroundColor: "rgba(19, 236, 164, 0.12)",
	},
	chipText: { fontSize: 14, color: colors.slate700 },
	chipTextSelected: { color: colors.primary, fontWeight: "600" },
	error: {
		fontSize: 14,
		color: colors.red400,
		marginBottom: spacing.md,
	},
	addBtn: {
		backgroundColor: colors.primary,
		borderRadius: 12,
		paddingVertical: spacing.md,
		alignItems: "center",
	},
	addBtnDisabled: { opacity: 0.7 },
	addBtnLabel: { fontSize: 16, fontWeight: "600", color: colors.slate800 },
});
