import { useState } from "react";
import {
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { ACTIVITY_CATEGORIES } from "../data/categories";
import { colors, spacing } from "../theme";

export interface AddActivityFormData {
	name: string;
	categoryId: string;
	priority: number;
	defaultDuration: number;
}

const PRIORITY_OPTIONS = [
	{ label: "Low", value: 1 },
	{ label: "Medium", value: 2 },
	{ label: "High", value: 3 },
] as const;

type Props = {
	visible: boolean;
	onClose: () => void;
	onSave: (data: AddActivityFormData) => void | Promise<void>;
};

export function AddActivityModal({ visible, onClose, onSave }: Props) {
	const [name, setName] = useState("");
	const [categoryId, setCategoryId] = useState<string>("Other");
	const [priority, setPriority] = useState<number>(2);
	const [defaultDuration, setDefaultDuration] = useState<string>("30");
	const [saving, setSaving] = useState(false);

	const handleSave = async () => {
		const t = name.trim();
		if (!t) return;
		const duration = Math.max(1, Math.min(480, parseInt(defaultDuration, 10) || 30));
		setSaving(true);
		try {
			await onSave({
				name: t,
				categoryId: ACTIVITY_CATEGORIES.includes(categoryId as (typeof ACTIVITY_CATEGORIES)[number]) ? categoryId : "Other",
				priority,
				defaultDuration: duration,
			});
			setName("");
			setCategoryId("Other");
			setPriority(2);
			setDefaultDuration("30");
			onClose();
		} finally {
			setSaving(false);
		}
	};

	const handleClose = () => {
		setName("");
		setCategoryId("Other");
		setPriority(2);
		setDefaultDuration("30");
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
					<ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
						<TextInput
							style={styles.input}
							placeholder="Activity name"
							placeholderTextColor={colors.slate400}
							value={name}
							onChangeText={setName}
							autoFocus
						/>
						<Text style={styles.label}>Category</Text>
						<View style={styles.chipRow}>
							{ACTIVITY_CATEGORIES.map((cat) => (
								<Pressable
									key={cat}
									onPress={() => setCategoryId(cat)}
									style={[
										styles.chip,
										categoryId === cat && styles.chipSelected,
									]}
								>
									<Text
										style={[
											styles.chipText,
											categoryId === cat && styles.chipTextSelected,
										]}
									>
										{cat}
									</Text>
								</Pressable>
							))}
						</View>
						<Text style={styles.label}>Priority</Text>
						<View style={styles.chipRow}>
							{PRIORITY_OPTIONS.map((opt) => (
								<Pressable
									key={opt.value}
									onPress={() => setPriority(opt.value)}
									style={[
										styles.chip,
										priority === opt.value && styles.chipSelected,
									]}
								>
									<Text
										style={[
											styles.chipText,
											priority === opt.value && styles.chipTextSelected,
										]}
									>
										{opt.label}
									</Text>
								</Pressable>
							))}
						</View>
						<Text style={styles.label}>Expected duration (minutes)</Text>
						<TextInput
							style={styles.input}
							placeholder="e.g. 30"
							placeholderTextColor={colors.slate400}
							value={defaultDuration}
							onChangeText={setDefaultDuration}
							keyboardType="number-pad"
						/>
					</ScrollView>
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
	scroll: { maxHeight: 320, marginBottom: spacing.md },
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
	label: {
		fontSize: 13,
		fontWeight: "600",
		color: colors.slate600,
		marginBottom: spacing.sm,
	},
	chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
	chip: {
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.md,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: colors.slate200,
	},
	chipSelected: { borderColor: colors.primary, backgroundColor: `${colors.primary}14` },
	chipText: { fontSize: 14, color: colors.slate600 },
	chipTextSelected: { color: colors.primary, fontWeight: "600" },
	saveBtn: {
		backgroundColor: colors.primary,
		borderRadius: 12,
		paddingVertical: spacing.md,
		alignItems: "center",
	},
	saveBtnDisabled: { opacity: 0.5 },
	saveLabel: { fontSize: 16, fontWeight: "600", color: colors.slate800 },
});
