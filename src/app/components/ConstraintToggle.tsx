import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../theme";

type Props = {
	status: "HARD" | "SOFT";
	onChange: (status: "HARD" | "SOFT") => void;
};

export function ConstraintToggle({ status, onChange }: Props) {
	const isSoft = status === "SOFT";

	return (
		<View style={styles.row}>
			<Text style={styles.fieldLabel}>Replaceable?</Text>
			<Pressable
				onPress={() => onChange(isSoft ? "HARD" : "SOFT")}
				style={[styles.checkbox, isSoft && styles.checkboxChecked]}
			>
				{isSoft ? <Text style={styles.checkmark}>✓</Text> : null}
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: spacing.lg,
	},
	fieldLabel: {
		fontSize: 14,
		fontWeight: "600",
		color: colors.slate700,
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
	checkmark: {
		color: colors.primary,
		fontSize: 14,
		fontWeight: "600",
	},
});
