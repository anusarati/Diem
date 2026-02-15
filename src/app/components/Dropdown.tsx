import { useState } from "react";
import {
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { colors, spacing } from "../theme";

type Props<T extends string> = {
	label: string;
	placeholder?: string;
	value: T | "";
	options: readonly T[];
	onSelect: (value: T) => void;
	style?: object;
};

export function Dropdown<T extends string>({
	label,
	placeholder = "Select…",
	value,
	options,
	onSelect,
	style,
}: Props<T>) {
	const [open, setOpen] = useState(false);

	const handleSelect = (opt: T) => {
		onSelect(opt);
		setOpen(false);
	};

	return (
		<View style={[styles.wrap, style]}>
			{label ? <Text style={styles.label}>{label}</Text> : null}
			<Pressable
				onPress={() => setOpen(true)}
				style={styles.trigger}
			>
				<Text
					style={[styles.triggerText, !value && styles.placeholder]}
					numberOfLines={1}
				>
					{value || placeholder}
				</Text>
				<Text style={styles.chevron}>▼</Text>
			</Pressable>

			<Modal
				visible={open}
				transparent
				animationType="fade"
				onRequestClose={() => setOpen(false)}
			>
				<View style={styles.overlay}>
					<Pressable style={styles.overlayTouch} onPress={() => setOpen(false)} />
					<View style={styles.panel}>
						<ScrollView
							style={styles.list}
							keyboardShouldPersistTaps="handled"
							showsVerticalScrollIndicator
						>
							{options.map((opt) => (
								<Pressable
									key={opt}
									onPress={() => handleSelect(opt)}
									style={[
										styles.option,
										value === opt && styles.optionSelected,
									]}
								>
									<Text
										style={[
											styles.optionText,
											value === opt && styles.optionTextSelected,
										]}
									>
										{opt}
									</Text>
								</Pressable>
							))}
						</ScrollView>
					</View>
				</View>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: { marginBottom: spacing.lg },
	label: {
		fontSize: 14,
		fontWeight: "600",
		color: colors.slate700,
		marginBottom: spacing.sm,
	},
	trigger: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		borderWidth: 1,
		borderColor: colors.slate200,
		borderRadius: 12,
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.md,
		backgroundColor: colors.white,
	},
	triggerText: { fontSize: 16, color: colors.slate800, flex: 1 },
	placeholder: { color: colors.slate400 },
	chevron: { fontSize: 10, color: colors.slate500, marginLeft: spacing.sm },
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.4)",
		justifyContent: "flex-end",
	},
	overlayTouch: { flex: 1 },
	panel: {
		backgroundColor: colors.white,
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
		maxHeight: "60%",
	},
	list: { maxHeight: 320 },
	option: {
		paddingVertical: spacing.lg,
		paddingHorizontal: spacing.xl,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.slate200,
	},
	optionSelected: {
		backgroundColor: "rgba(19, 236, 164, 0.12)",
	},
	optionText: { fontSize: 16, color: colors.slate800 },
	optionTextSelected: { color: colors.primary, fontWeight: "600" },
});
