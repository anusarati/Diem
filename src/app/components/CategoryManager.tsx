import { useState } from "react";
import {
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

type Category = { name: string; color: string };

type Props = {
	categories: Category[];
	onAddCategory: (category: Category) => void;
	onDeleteCategory: (name: string) => void;
};

export function CategoryManager({
	categories,
	onAddCategory,
	onDeleteCategory,
}: Props) {
	const [name, setName] = useState("");
	const [color] = useState("#3B82F6");

	const handleAdd = () => {
		if (name.trim()) {
			onAddCategory({ name, color });
			setName("");
		}
	};

	return (
		<View style={styles.wrap}>
			<Text style={styles.title}>Categories</Text>
			<View style={styles.inputRow}>
				<TextInput
					style={styles.input}
					placeholder="Category Name"
					value={name}
					onChangeText={setName}
				/>
				<TouchableOpacity style={styles.addButton} onPress={handleAdd}>
					<Text style={styles.addText}>Add</Text>
				</TouchableOpacity>
			</View>
			<View style={styles.list}>
				{categories.map((cat, _idx) => (
					<View key={cat.name} style={styles.categoryBadge}>
						<View style={[styles.dot, { backgroundColor: cat.color }]} />
						<Text style={styles.categoryName}>{cat.name}</Text>
						<TouchableOpacity
							onPress={() => onDeleteCategory(cat.name)}
							style={styles.deleteCircle}
						>
							<Text style={styles.deleteText}>×</Text>
						</TouchableOpacity>
					</View>
				))}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: { marginBottom: 16 },
	title: { fontSize: 14, fontWeight: "700", color: "#475569", marginBottom: 8 },
	inputRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
	input: {
		flex: 1,
		height: 40,
		backgroundColor: "#F8FAFC",
		borderRadius: 8,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: "#E2E8F0",
	},
	addButton: {
		justifyContent: "center",
		paddingHorizontal: 16,
		backgroundColor: "#475569",
		borderRadius: 8,
	},
	addText: { color: "#FFFFFF", fontWeight: "600" },
	list: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
	categoryBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		backgroundColor: "#F1F5F9",
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 16,
	},
	dot: { width: 8, height: 8, borderRadius: 4 },
	categoryName: { fontSize: 12, fontWeight: "600", color: "#475569" },
	deleteCircle: {
		width: 16,
		height: 16,
		borderRadius: 8,
		backgroundColor: "#E2E8F0",
		alignItems: "center",
		justifyContent: "center",
		marginLeft: 4,
	},
	deleteText: { fontSize: 12, color: "#64748B", fontWeight: "700", top: -1 },
});
