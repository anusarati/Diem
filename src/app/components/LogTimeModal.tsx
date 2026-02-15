import { useEffect, useState } from "react";
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
	title: string;
	/** Pre-fill with this many minutes (e.g. scheduled duration). */
	defaultMinutes?: number;
	onSelect: (minutes: number | null) => void;
	onClose: () => void;
};

export function LogTimeModal({
	visible,
	title,
	defaultMinutes,
	onSelect,
	onClose,
}: Props) {
	const [input, setInput] = useState("");

	useEffect(() => {
		if (visible) {
			setInput(defaultMinutes != null ? String(defaultMinutes) : "");
		}
	}, [visible, defaultMinutes]);

	const handleSubmit = () => {
		const trimmed = input.trim();
		if (!trimmed) {
			onSelect(null);
			return;
		}
		const minutes = Number.parseInt(trimmed, 10);
		if (Number.isNaN(minutes) || minutes < 0 || minutes > 1440) {
			return;
		}
		onSelect(minutes);
	};

	const trimmed = input.trim();
	const parsed = trimmed ? Number.parseInt(trimmed, 10) : NaN;
	const isValid = !trimmed || (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 1440);

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={onClose}
		>
			<Pressable style={styles.overlay} onPress={onClose}>
				<Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
					<Text style={styles.title}>{title}</Text>
					<Text style={styles.label}>How many minutes did it take?</Text>
					<TextInput
						style={styles.input}
						placeholder="e.g. 45 or 90"
						placeholderTextColor={colors.slate400}
						value={input}
						onChangeText={setInput}
						keyboardType="number-pad"
						maxLength={4}
					/>
					<View style={styles.actions}>
						<Pressable
							style={[styles.submitBtn, !isValid && styles.submitBtnDisabled]}
							onPress={handleSubmit}
							disabled={!isValid}
						>
							<Text style={styles.submitLabel}>
								{trimmed ? "Save" : "Mark done (no time)"}
							</Text>
						</Pressable>
						<Pressable style={styles.skipBtn} onPress={() => onSelect(null)}>
							<Text style={styles.skipLabel}>Skip</Text>
						</Pressable>
					</View>
				</Pressable>
			</Pressable>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.4)",
		justifyContent: "center",
		alignItems: "center",
		padding: 24,
	},
	sheet: {
		backgroundColor: colors.white,
		borderRadius: 16,
		padding: 24,
		width: "100%",
		maxWidth: 320,
	},
	title: {
		fontSize: 18,
		fontWeight: "600",
		color: colors.slate800,
		marginBottom: 12,
		textAlign: "center",
	},
	label: {
		fontSize: 14,
		color: colors.slate600,
		marginBottom: 8,
	},
	input: {
		borderWidth: 1,
		borderColor: colors.slate200,
		borderRadius: 12,
		paddingVertical: 12,
		paddingHorizontal: 16,
		fontSize: 16,
		color: colors.slate800,
		marginBottom: 20,
	},
	actions: {
		gap: 8,
	},
	submitBtn: {
		backgroundColor: colors.primary,
		paddingVertical: 14,
		borderRadius: 12,
		alignItems: "center",
	},
	submitBtnDisabled: {
		opacity: 0.6,
	},
	submitLabel: {
		fontSize: 16,
		fontWeight: "600",
		color: colors.slate800,
	},
	skipBtn: {
		alignItems: "center",
		paddingVertical: spacing.sm,
	},
	skipLabel: {
		fontSize: 14,
		color: colors.slate500,
	},
});
