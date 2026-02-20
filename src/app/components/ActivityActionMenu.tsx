import {
	Modal,
	Pressable,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { colors, spacing } from "../theme";

interface ActivityActionMenuProps {
	visible: boolean;
	activityTitle: string;
	onClose: () => void;
	onEdit: () => void;
	onDelete: () => void;
}

export function ActivityActionMenu({
	visible,
	activityTitle,
	onClose,
	onEdit,
	onDelete,
}: ActivityActionMenuProps) {
	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={onClose}
		>
			<Pressable style={styles.overlay} onPress={onClose}>
				<View style={styles.sheetContainer}>
					<View style={styles.content}>
						<Text style={styles.header}>Manage Activity</Text>
						<Text style={styles.title}>{activityTitle}</Text>

						<View style={styles.divider} />

						<TouchableOpacity style={styles.actionRow} onPress={onEdit}>
							<Text style={styles.actionText}>Edit Activity</Text>
							<Text style={styles.icon}>✏️</Text>
						</TouchableOpacity>

						<View style={styles.divider} />

						<TouchableOpacity style={styles.actionRow} onPress={onDelete}>
							<Text style={styles.deleteText}>Delete Activity</Text>
							<Text style={styles.icon}>🗑️</Text>
						</TouchableOpacity>

						<View style={styles.divider} />

						<TouchableOpacity style={styles.actionRow} onPress={onClose}>
							<Text style={styles.cancelText}>Cancel</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Pressable>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.4)",
		justifyContent: "center",
		alignItems: "center",
		padding: spacing.xl,
	},
	sheetContainer: {
		backgroundColor: colors.white,
		borderRadius: 24,
		width: "100%",
		maxWidth: 320,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.1,
		shadowRadius: 20,
		elevation: 10,
	},
	content: {
		padding: spacing.lg,
		alignItems: "center",
	},
	header: {
		fontSize: 12,
		fontWeight: "600",
		color: colors.slate400,
		textTransform: "uppercase",
		marginBottom: 4,
	},
	title: {
		fontSize: 18,
		fontWeight: "700",
		color: colors.slate800,
		marginBottom: spacing.md,
		textAlign: "center",
	},
	divider: {
		height: 1,
		width: "100%",
		backgroundColor: colors.slate100,
		marginVertical: spacing.sm,
	},
	actionRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		width: "100%",
		paddingVertical: 12,
	},
	actionText: {
		fontSize: 16,
		fontWeight: "600",
		color: colors.slate800,
		marginRight: 8,
	},
	deleteText: {
		fontSize: 16,
		fontWeight: "600",
		color: colors.red400,
		marginRight: 8,
	},
	cancelText: {
		fontSize: 16,
		fontWeight: "500",
		color: colors.slate500,
	},
	icon: {
		fontSize: 16,
	},
});
