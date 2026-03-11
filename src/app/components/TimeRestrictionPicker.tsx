import { useState } from "react";
import {
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { colors, spacing } from "../theme";

type TimeRestriction = {
	id: string;
	startTime: string;
	endTime: string;
	type: "ALLOW" | "DENY";
};

type Props = {
	restrictions: TimeRestriction[];
	onChange: (restrictions: TimeRestriction[]) => void;
};

export function TimeRestrictionPicker({ restrictions, onChange }: Props) {
	const [newStart, setNewStart] = useState("09:00");
	const [newEnd, setNewEnd] = useState("17:00");
	const [type, setType] = useState<"ALLOW" | "DENY">("ALLOW");

	const handleAdd = () => {
		const newItem: TimeRestriction = {
			id: Math.random().toString(36).substring(2, 9),
			startTime: newStart,
			endTime: newEnd,
			type,
		};
		onChange([...restrictions, newItem]);
		setNewStart("09:00");
		setNewEnd("17:00");
	};

	const removeRestriction = (id: string) => {
		onChange(restrictions.filter((res) => res.id !== id));
	};

	return (
		<View style={styles.container}>
			<Text style={styles.label}>Time Restrictions</Text>
			<Text style={styles.description}>
				Specify when this activity should or shouldn't be scheduled.
			</Text>

			<View style={styles.list}>
				{restrictions.map((res) => (
					<View key={res.id} style={styles.item}>
						<View style={styles.itemInfo}>
							<Text
								style={[
									styles.typeBadge,
									res.type === "DENY" && styles.denyBadge,
								]}
							>
								{res.type}
							</Text>
							<Text style={styles.timeText}>
								{res.startTime} - {res.endTime}
							</Text>
						</View>
						<TouchableOpacity onPress={() => removeRestriction(res.id)}>
							<Text style={styles.removeText}>Remove</Text>
						</TouchableOpacity>
					</View>
				))}
			</View>

			<View style={styles.addCard}>
				<View style={styles.row}>
					<View style={styles.field}>
						<Text style={styles.subLabel}>Start</Text>
						<TextInput
							style={styles.input}
							value={newStart}
							onChangeText={setNewStart}
							placeholder="09:00"
						/>
					</View>
					<View style={styles.field}>
						<Text style={styles.subLabel}>End</Text>
						<TextInput
							style={styles.input}
							value={newEnd}
							onChangeText={setNewEnd}
							placeholder="17:00"
						/>
					</View>
				</View>

				<View style={styles.typeRow}>
					<TouchableOpacity
						style={[styles.typeBtn, type === "ALLOW" && styles.activeTypeBtn]}
						onPress={() => setType("ALLOW")}
					>
						<Text
							style={[
								styles.typeBtnText,
								type === "ALLOW" && styles.activeTypeText,
							]}
						>
							Allow
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.typeBtn, type === "DENY" && styles.activeTypeBtn]}
						onPress={() => setType("DENY")}
					>
						<Text
							style={[
								styles.typeBtnText,
								type === "DENY" && styles.activeTypeText,
							]}
						>
							Deny
						</Text>
					</TouchableOpacity>
				</View>

				<TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
					<Text style={styles.addBtnText}>Add Restriction</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { marginVertical: spacing.md },
	label: {
		fontSize: 14,
		fontWeight: "700",
		color: colors.slate700,
		marginBottom: 4,
	},
	description: { fontSize: 12, color: colors.slate500, marginBottom: 12 },
	list: { marginBottom: 16 },
	item: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: colors.slate100,
	},
	itemInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
	typeBadge: {
		fontSize: 10,
		fontWeight: "800",
		backgroundColor: "#DBEDDB",
		color: "#1C3829",
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
		overflow: "hidden",
	},
	denyBadge: { backgroundColor: "#FFE2E2", color: "#640000" },
	timeText: { fontSize: 14, fontWeight: "600", color: colors.slate800 },
	removeText: { fontSize: 12, color: colors.red400, fontWeight: "600" },
	addCard: {
		padding: 12,
		backgroundColor: colors.slate50,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.slate200,
	},
	row: { flexDirection: "row", gap: 12, marginBottom: 12 },
	field: { flex: 1 },
	subLabel: {
		fontSize: 11,
		fontWeight: "700",
		color: colors.slate500,
		marginBottom: 4,
	},
	input: {
		height: 36,
		backgroundColor: colors.white,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.slate200,
		paddingHorizontal: 8,
		fontSize: 13,
	},
	typeRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
	typeBtn: {
		flex: 1,
		height: 32,
		borderRadius: 6,
		backgroundColor: colors.white,
		borderWidth: 1,
		borderColor: colors.slate200,
		alignItems: "center",
		justifyContent: "center",
	},
	activeTypeBtn: {
		backgroundColor: colors.slate600,
		borderColor: colors.slate600,
	},
	typeBtnText: { fontSize: 12, fontWeight: "600", color: colors.slate600 },
	activeTypeText: { color: colors.white },
	addBtn: {
		height: 36,
		backgroundColor: colors.primary,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
	},
	addBtnText: { color: colors.white, fontSize: 13, fontWeight: "700" },
});
