import React, { useState } from "react";
import {
	Modal,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { colors, spacing } from "../theme";

interface AddActivitySheetProps {
	visible: boolean;
	onClose: () => void;
	onAdd: (activity: {
		title: string;
		startTime: string;
		duration: number;
		type: "fixed" | "flexible";
		priority: "high" | "medium" | "low";
	}) => void;
	initialActivity?: {
		title: string;
		startTime: string;
		duration: number;
		type: "fixed" | "flexible";
		priority?: "high" | "medium" | "low";
	} | null;
}

export function AddActivitySheet({
	visible,
	onClose,
	onAdd,
	initialActivity,
}: AddActivitySheetProps) {
	const [title, setTitle] = useState("");
	const [startTime, setStartTime] = useState("");
	const [duration, setDuration] = useState("");
	const [isFlexible, setIsFlexible] = useState(false);
	const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");

	// Reset or populate form when modal opens matches mock data
	React.useEffect(() => {
		if (visible) {
			if (initialActivity) {
				setTitle(initialActivity.title);
				setStartTime(initialActivity.startTime);
				setDuration(initialActivity.duration.toString());
				setIsFlexible(initialActivity.type === "flexible");
				setPriority(initialActivity.priority || "medium");
			} else {
				setTitle("");
				setStartTime("");
				setDuration("");
				setIsFlexible(false);
				setPriority("medium");
			}
		}
	}, [visible, initialActivity]);

	const handleSubmit = () => {
		if (!title || !startTime || !duration) return;
		onAdd({
			title,
			startTime,
			duration: parseInt(duration, 10),
			type: isFlexible ? "flexible" : "fixed",
			priority,
		});
		onClose();
	};

	return (
		<Modal
			animationType="slide"
			transparent={true}
			visible={visible}
			onRequestClose={onClose}
		>
			<View style={styles.overlay}>
				<Pressable style={styles.backdrop} onPress={onClose} />
				<View style={styles.sheet}>
					<Text style={styles.header}>
						{initialActivity ? "Edit Activity" : "Add New Activity"}
					</Text>

					<View style={styles.formGroup}>
						<Text style={styles.label}>Title</Text>
						<TextInput
							style={styles.input}
							placeholder="e.g. Design Review"
							placeholderTextColor={colors.slate300}
							value={title}
							onChangeText={setTitle}
						/>
					</View>

					<View style={styles.row}>
						<View
							style={[styles.formGroup, { flex: 1, marginRight: spacing.md }]}
						>
							<Text style={styles.label}>Start Time (24h)</Text>
							<TextInput
								style={styles.input}
								placeholder="10:00"
								placeholderTextColor={colors.slate300}
								value={startTime}
								onChangeText={setStartTime}
								keyboardType="numbers-and-punctuation"
							/>
						</View>
						<View style={[styles.formGroup, { flex: 1 }]}>
							<Text style={styles.label}>Duration (min)</Text>
							<TextInput
								style={styles.input}
								placeholder="60"
								placeholderTextColor={colors.slate300}
								value={duration}
								onChangeText={setDuration}
								keyboardType="number-pad"
							/>
						</View>
					</View>

					{/* Priority Selector */}
					<View style={styles.formGroup}>
						<Text style={styles.label}>Priority</Text>
						<View style={styles.priorityRow}>
							{(["low", "medium", "high"] as const).map((p) => {
								const priorityBtnStyle = {
									high: styles.priorityBtnHigh,
									medium: styles.priorityBtnMedium,
									low: styles.priorityBtnLow,
								};

								return (
									<TouchableOpacity
										key={p}
										style={[
											styles.priorityBtn,
											priority === p && priorityBtnStyle[p],
											priority !== p && styles.priorityBtnInactive,
										]}
										onPress={() => setPriority(p)}
									>
										<Text
											style={[
												styles.priorityText,
												priority === p
													? styles.priorityTextActive
													: styles.priorityTextInactive,
											]}
										>
											{p.charAt(0).toUpperCase() + p.slice(1)}
										</Text>
									</TouchableOpacity>
								);
							})}
						</View>
					</View>

					<View style={styles.switchRow}>
						<Text style={styles.label}>Flexible?</Text>
						<TouchableOpacity
							onPress={() => setIsFlexible(!isFlexible)}
							style={[
								styles.checkbox,
								isFlexible && {
									backgroundColor: colors.primary,
									borderColor: colors.primary,
								},
							]}
						>
							{isFlexible && <Text style={{ color: "white" }}>✓</Text>}
						</TouchableOpacity>
					</View>

					<TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
						<Text style={styles.submitBtnText}>
							{initialActivity ? "Save Changes" : "Add to Schedule"}
						</Text>
					</TouchableOpacity>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		justifyContent: "flex-end",
		backgroundColor: "rgba(0,0,0,0.5)",
	},
	backdrop: {
		...StyleSheet.absoluteFillObject,
	},
	sheet: {
		backgroundColor: colors.white,
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		padding: spacing.xl,
		paddingBottom: 40,
	},
	header: {
		fontSize: 20,
		fontWeight: "700",
		color: colors.slate800,
		marginBottom: spacing.xl,
		textAlign: "center",
	},
	formGroup: {
		marginBottom: spacing.lg,
	},
	row: {
		flexDirection: "row",
	},
	label: {
		fontSize: 14,
		fontWeight: "500",
		color: colors.slate600,
		marginBottom: 8,
	},
	input: {
		borderWidth: 1,
		borderColor: colors.slate200,
		borderRadius: 12,
		padding: 12,
		fontSize: 16,
		color: colors.slate800,
		backgroundColor: colors.slate50,
	},
	priorityRow: {
		flexDirection: "row",
		gap: 8,
	},
	priorityBtn: {
		flex: 1,
		paddingVertical: 10,
		borderRadius: 8,
		alignItems: "center",
		borderWidth: 1,
	},
	priorityBtnInactive: {
		borderColor: colors.slate200,
		backgroundColor: colors.slate50,
	},
	priorityBtnHigh: {
		backgroundColor: colors.red400,
		borderColor: colors.red400,
	},
	priorityBtnMedium: {
		backgroundColor: colors.peachDark,
		borderColor: colors.peachDark,
	},
	priorityBtnLow: {
		backgroundColor: colors.mintDark,
		borderColor: colors.mintDark,
	},
	priorityText: {
		fontSize: 14,
		fontWeight: "600",
	},
	priorityTextActive: {
		color: colors.white,
	},
	priorityTextInactive: {
		color: colors.slate500,
	},
	switchRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: spacing.xl,
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
	submitBtn: {
		backgroundColor: colors.primary,
		padding: 16,
		borderRadius: 16,
		alignItems: "center",
	},
	submitBtnText: {
		color: colors.white,
		fontSize: 16,
		fontWeight: "600",
	},
});
