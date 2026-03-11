import {
	Modal,
	Pressable,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { colors, spacing } from "../theme";

export type AddChoice =
	| "quick_add"
	| "import_google_calendar"
	| "import_ics_file";

interface AddChoiceModalProps {
	visible: boolean;
	onClose: () => void;
	onQuickAdd: () => void;
	onImportGoogleCalendar: () => void;
	onImportIcsFile: () => void;
}

export function AddChoiceModal({
	visible,
	onClose,
	onQuickAdd,
	onImportGoogleCalendar,
	onImportIcsFile,
}: AddChoiceModalProps) {
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
						<Text style={styles.header}>Add to schedule</Text>

						<View style={styles.divider} />

						<TouchableOpacity
							style={styles.actionRow}
							onPress={() => {
								onClose();
								onQuickAdd();
							}}
						>
							<Text style={styles.actionText}>Quick add</Text>
							<Text style={styles.icon}>➕</Text>
						</TouchableOpacity>

						<View style={styles.divider} />

						<TouchableOpacity
							style={styles.actionRow}
							onPress={() => {
								onClose();
								onImportGoogleCalendar();
							}}
						>
							<Text style={styles.actionText}>Import from Google Calendar</Text>
							<Text style={styles.icon}>📅</Text>
						</TouchableOpacity>

						<View style={styles.divider} />

						<TouchableOpacity
							style={styles.actionRow}
							onPress={() => {
								onClose();
								onImportIcsFile();
							}}
						>
							<Text style={styles.actionText}>Import from .ics file</Text>
							<Text style={styles.icon}>📁</Text>
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
	cancelText: {
		fontSize: 16,
		fontWeight: "500",
		color: colors.slate500,
	},
	icon: {
		fontSize: 16,
	},
});
