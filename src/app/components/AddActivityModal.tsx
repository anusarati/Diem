import { useState } from "react";
import {
	Modal,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { colors, spacing } from "../theme";

type Props = {
	visible: boolean;
	onClose: () => void;
	onSave: (name: string) => void | Promise<void>;
};

export function AddActivityModal({ visible, onClose, onSave }: Props) {
	const [name, setName] = useState("");
	const [saving, setSaving] = useState(false);

	const handleSave = async () => {
		const t = name.trim();
		if (!t) return;
		setSaving(true);
		try {
			await onSave(t);
			setName("");
			onClose();
		} finally {
			setSaving(false);
		}
	};

	const handleClose = () => {
		setName("");
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
						<Text style={styles.title}>Add Activity</Text>
						<Pressable onPress={handleClose} hitSlop={12}>
							<Text style={styles.cancel}>Cancel</Text>
						</Pressable>
					</View>
					<TextInput
						style={styles.input}
						placeholder="Activity name"
						placeholderTextColor={colors.slate400}
						value={name}
						onChangeText={setName}
						autoFocus
					/>
					<Pressable
						onPress={handleSave}
						style={[
							styles.saveBtn,
							(!name.trim() || saving) && styles.saveBtnDisabled,
						]}
						disabled={!name.trim() || saving}
					>
						<Text style={styles.saveLabel}>
							{saving ? "Saving..." : "Save"}
						</Text>
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
	saveBtn: {
		backgroundColor: colors.primary,
		borderRadius: 12,
		paddingVertical: spacing.md,
		alignItems: "center",
	},
	saveBtnDisabled: { opacity: 0.5 },
	saveLabel: { fontSize: 16, fontWeight: "600", color: colors.slate800 },
});
