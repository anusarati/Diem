import {
	KeyboardAvoidingView,
	Modal,
	Platform,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import type { ActivityFormData } from "../hooks/useActivityValidation";
import { ActivityForm } from "./ActivityForm";

type Props = {
	isOpen: boolean;
	onClose: () => void;
	onSave: (data: ActivityFormData) => void;
	existingActivities?: any[];
	initialTime?: string;
	initialData?: Partial<ActivityFormData>;
};

export function QuickAddSheet({
	isOpen,
	onClose,
	onSave,
	existingActivities,
	initialTime,
	initialData,
}: Props) {
	return (
		<Modal
			visible={isOpen}
			transparent
			animationType="slide"
			onRequestClose={onClose}
		>
			<View style={styles.overlay}>
				<TouchableOpacity
					style={styles.backdrop}
					onPress={onClose}
					activeOpacity={1}
				/>

				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "padding" : "height"}
					style={styles.sheet}
				>
					{/* Drag Handle */}
					<View style={styles.handleContainer}>
						<View style={styles.handle} />
					</View>

					<View style={styles.headerRow}>
						<Text style={styles.title}>Quick Add</Text>
						<TouchableOpacity onPress={onClose}>
							<Text style={styles.cancelText}>Cancel</Text>
						</TouchableOpacity>
					</View>

					<ActivityForm
						existingActivities={existingActivities}
						initialData={
							initialData ||
							(initialTime ? { startTime: initialTime } : undefined)
						}
						onSubmit={(data: ActivityFormData) => {
							onSave(data);
							onClose();
						}}
					/>
				</KeyboardAvoidingView>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		justifyContent: "flex-end",
	},
	backdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(15, 23, 42, 0.5)",
	},
	sheet: {
		backgroundColor: "#FFFFFF",
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		paddingHorizontal: 24,
		paddingBottom: Platform.OS === "ios" ? 40 : 24,
		paddingTop: 12,
		maxHeight: "90%",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: -2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 10,
	},
	handleContainer: {
		alignItems: "center",
		paddingBottom: 16,
	},
	handle: {
		width: 48,
		height: 5,
		backgroundColor: "#E2E8F0",
		borderRadius: 3,
	},
	headerRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 20,
	},
	title: {
		fontSize: 20,
		fontWeight: "800",
		color: "#0F172A",
	},
	cancelText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#64748B",
	},
});
