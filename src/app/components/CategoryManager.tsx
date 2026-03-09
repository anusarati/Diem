import { useState } from "react";
import {
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { colors, spacing } from "../theme";

type Props = {
	categories: { name: string; color: string }[];
	onAddCategory: (category: { name: string; color: string }) => void;
	onDeleteCategory: (name: string) => void;
};

export function CategoryManager({
	categories,
	onAddCategory,
	onDeleteCategory,
}: Props) {
	const [name, setName] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("Work");

	const handleAdd = () => {
		if (name.trim()) {
			onAddCategory({ name: name.trim(), color: colors.primary });
			setName("");
		}
	};

	return (
		<View style={styles.wrap}>
			<Text style={styles.label}>Category</Text>
			<View style={styles.chips}>
				{categories.map((cat) => (
					<Pressable
						key={cat.name}
						onPress={() => setSelectedCategory(cat.name)}
						onLongPress={() => onDeleteCategory(cat.name)}
						style={[
							styles.chip,
							selectedCategory === cat.name && styles.chipSelected,
						]}
					>
						<Text
							style={[
								styles.chipText,
								selectedCategory === cat.name && styles.chipTextSelected,
							]}
						>
							{cat.name}
						</Text>
					</Pressable>
				))}
			</View>

			<View style={styles.addArea}>
				<TextInput
					style={styles.input}
					placeholder="New tag..."
					placeholderTextColor={colors.slate400}
					value={name}
					onChangeText={setName}
				/>
				<TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
					<Text style={styles.addBtnText}>+</Text>
				</TouchableOpacity>
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
	chips: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: spacing.sm,
		marginBottom: spacing.md,
	},
	chip: {
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.md,
		borderWidth: 1,
		borderColor: colors.slate200,
		borderRadius: 999,
		backgroundColor: colors.white,
	},
	chipSelected: {
		borderColor: colors.primary,
		backgroundColor: colors.background,
	},
	chipText: {
		color: colors.slate600,
		fontWeight: "500",
		fontSize: 14,
	},
	chipTextSelected: {
		color: colors.slate800,
		fontWeight: "600",
	},
	addArea: {
		flexDirection: "row",
		gap: 8,
		alignItems: "center",
	},
	input: {
		flex: 1,
		height: 36,
		paddingHorizontal: 12,
		backgroundColor: colors.white,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.slate200,
		fontSize: 13,
		color: colors.slate800,
	},
	addBtn: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: colors.slate100,
		alignItems: "center",
		justifyContent: "center",
	},
	addBtnText: {
		fontSize: 20,
		color: colors.slate600,
		fontWeight: "300",
	},
});
