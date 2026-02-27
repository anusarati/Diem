import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { addScheduledActivity, updateScheduledActivity } from "../data/storage";
import { colors, spacing } from "../theme";
import type { ScheduledActivity } from "../types";
import { ActivityForm } from "./ActivityForm";

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
	const [error, setError] = useState("");
	const [_saving, setSaving] = useState(false);

	const handleSave = async (data: any) => {
		setError("");
		setSaving(true);
		try {
			const mapped = {
				title: data.title,
				date: activityToEdit
					? activityToEdit.date
					: initialDate.toISOString().slice(0, 10),
				startTime: data.startTime || "10:00",
				durationMinutes: data.duration || 60,
				priority:
					data.priority.charAt(0).toUpperCase() + data.priority.slice(1),
				flexible: data.replaceabilityStatus === "SOFT",
				category: data.category || "Other",
				deadline: activityToEdit
					? activityToEdit.deadline
					: initialDate.toISOString().slice(0, 10),
				completed: activityToEdit ? activityToEdit.completed : false,
			};

			if (isEdit && activityToEdit) {
				const updated = await updateScheduledActivity(
					activityToEdit.id,
					mapped,
				);
				onAdded?.(updated ?? activityToEdit);
			} else {
				const activity = await addScheduledActivity(mapped as any);
				onAdded?.(activity);
			}
			onClose();
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
			onRequestClose={onClose}
		>
			<Pressable style={styles.overlay} onPress={onClose}>
				<Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
					<View style={styles.header}>
						<Text style={styles.title}>
							{isEdit ? "Edit activity" : "Add New Activity"}
						</Text>
						<Pressable onPress={onClose} hitSlop={12}>
							<Text style={styles.cancel}>Cancel</Text>
						</Pressable>
					</View>

					{error ? <Text style={styles.error}>{error}</Text> : null}

					<ActivityForm
						onSubmit={handleSave}
						initialData={
							activityToEdit
								? {
										title: activityToEdit.title,
										priority: activityToEdit.priority.toLowerCase() as any,
										replaceabilityStatus: activityToEdit.flexible
											? "SOFT"
											: "HARD",
										category: activityToEdit.category,
										duration: activityToEdit.durationMinutes,
										startTime: activityToEdit.startTime,
									}
								: undefined
						}
					/>
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
		marginBottom: spacing.lg,
	},
	title: { fontSize: 18, fontWeight: "600", color: colors.slate800 },
	cancel: { fontSize: 16, color: colors.slate500 },
	error: {
		fontSize: 14,
		color: colors.red400,
		marginBottom: spacing.md,
	},
});
