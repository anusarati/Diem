import { useState } from "react";
import {
	Modal,
	Pressable,
	StyleSheet, Text,
	TextInput,
	View,
} from "react-native";
import { colors, spacing } from "../theme";

type Props = {
	visible: boolean;
	onClose: () => void;
	onSave: (title: string, subtitle: string) => void;
};

export function AddTaskModal({ visible, onClose, onSave }: Props) {
	const [title, setTitle] = useState("");
	const [subtitle, setSubtitle] = useState("");

	const handleSave = () => {
		const t = title.trim();
		if (!t) return;
		onSave(t, subtitle.trim());
		setTitle("");
		setSubtitle("");
		onClose();
	};

	const handleClose = () => {
		setTitle("");
		setSubtitle("");
		onClose();
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
					<View style={styles.header}>
						<Text style={styles.title}>Add Task</Text>
						<Pressable onPress={handleClose} hitSlop={12}>
							<Text style={styles.cancel}>Cancel</Text>
						</Pressable>
					</View>
					<TextInput
						style={styles.input}
						placeholder="Task title"
						placeholderTextColor={colors.slate400}
						value={title}
						onChangeText={setTitle}
						autoFocus
					/>
					<TextInput
						style={[styles.input, styles.inputSub]}
						placeholder="Optional note or time"
						placeholderTextColor={colors.slate400}
						value={subtitle}
						onChangeText={setSubtitle}
					/>
					<Pressable
						onPress={handleSave}
						style={[styles.saveBtn, !title.trim() && styles.saveBtnDisabled]}
						disabled={!title.trim()}
					>
						<Text style={styles.saveLabel}>Save</Text>
					</Pressable>
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
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: spacing.lg,
	},
	title: { fontSize: 18, fontWeight: "600", color: colors.slate800 },
	cancel: { fontSize: 16, color: colors.slate500 },
	input: {
		borderWidth: 1,
		borderColor: colors.slate200,
		borderRadius: 12,
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.md,
		fontSize: 16,
		color: colors.slate800,
		marginBottom: spacing.md,
	},
	inputSub: { marginBottom: spacing.lg },
	saveBtn: {
		backgroundColor: colors.primary,
		borderRadius: 12,
		paddingVertical: spacing.md,
		alignItems: "center",
	},
	saveBtnDisabled: { opacity: 0.5 },
	saveLabel: { fontSize: 16, fontWeight: "600", color: colors.slate800 },
});
