import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../theme";

const PRIORITY_LEVELS: { value: "low" | "medium" | "high"; label: string }[] = [
	{ value: "low", label: "Low" },
	{ value: "medium", label: "Medium" },
	{ value: "high", label: "High" },
];

type Props = {
	priority: "low" | "medium" | "high";
	setPriority: (p: "low" | "medium" | "high") => void;
};

export function PrioritySelector({ priority, setPriority }: Props) {
	return (
		<View style={styles.wrap}>
			<Text style={styles.label}>Priority</Text>
			<View style={styles.segmented}>
				{PRIORITY_LEVELS.map((level) => (
					<Pressable
						key={level.value}
						style={[
							styles.segOption,
							priority === level.value && styles.segOptionSelected,
						]}
						onPress={() => setPriority(level.value)}
					>
						<Text
							style={[
								styles.segText,
								priority === level.value && styles.segTextSelected,
							]}
						>
							{level.label}
						</Text>
					</Pressable>
				))}
			</View>
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
	segmented: {
		flexDirection: "row",
		gap: spacing.sm,
	},
	segOption: {
		flex: 1,
		borderWidth: 1,
		borderColor: colors.slate200,
		borderRadius: 10,
		paddingVertical: spacing.sm,
		alignItems: "center",
		backgroundColor: colors.white,
	},
	segOptionSelected: {
		borderColor: colors.primary,
		backgroundColor: colors.background,
	},
	segText: {
		color: colors.slate600,
		fontWeight: "500",
		fontSize: 14,
	},
	segTextSelected: {
		color: colors.slate800,
		fontWeight: "600",
	},
});
