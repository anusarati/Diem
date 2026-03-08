import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
	status: "HARD" | "SOFT";
	onChange: (status: "HARD" | "SOFT") => void;
};

export function ConstraintToggle({ status, onChange }: Props) {
	return (
		<View style={styles.wrap}>
			<Text style={styles.label}>Replaceability Constraint</Text>
			<View style={styles.row}>
				<TouchableOpacity
					style={[styles.button, status === "HARD" && styles.activeButton]}
					onPress={() => onChange("HARD")}
				>
					<Text
						style={[styles.buttonText, status === "HARD" && styles.activeText]}
					>
						Hard (Fixed)
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[styles.button, status === "SOFT" && styles.activeButton]}
					onPress={() => onChange("SOFT")}
				>
					<Text
						style={[styles.buttonText, status === "SOFT" && styles.activeText]}
					>
						Soft (Flexible)
					</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: { marginBottom: 16 },
	label: { fontSize: 14, fontWeight: "700", color: "#475569", marginBottom: 8 },
	row: { flexDirection: "row", gap: 8 },
	button: {
		flex: 1,
		paddingVertical: 10,
		backgroundColor: "#F8FAFC",
		borderRadius: 8,
		alignItems: "center",
		borderWidth: 1,
		borderColor: "#E2E8F0",
	},
	activeButton: { backgroundColor: "#475569", borderColor: "#475569" },
	buttonText: { fontSize: 14, fontWeight: "600", color: "#64748B" },
	activeText: { color: "#FFFFFF" },
});
