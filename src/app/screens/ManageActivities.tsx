import { useCallback, useEffect, useState } from "react";
import {
	Alert,
	FlatList,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ActivityEntity } from "types/domain";
import { ActivityForm } from "../components/ActivityForm";
import { ActivityRow } from "../components/ActivityRow";
import type { ActivityFormData } from "../hooks/useActivityValidation";
import { colors, spacing } from "../theme";
import type { AppRoute } from "../types";

type Props = {
	onNavigate: (route: AppRoute) => void;
};

export function ManageActivitiesScreen({ onNavigate: _onNavigate }: Props) {
	const [activities, setActivities] = useState<ActivityEntity[]>([]);
	const [loading, setLoading] = useState(true);
	const [editModalVisible, setEditModalVisible] = useState(false);
	const [selectedActivity, setSelectedActivity] =
		useState<ActivityEntity | null>(null);

	const seedActivities = useCallback(() => {
		const dummyActivities: ActivityEntity[] = [
			{
				id: Math.random().toString(36).substr(2, 9),
				name: "Morning Yoga",
				categoryId: "Fitness",
				priority: 1,
				defaultDuration: 30,
				isReplaceable: true,
				color: colors.mint,
				createdAt: new Date().toISOString(),
			},
			{
				id: Math.random().toString(36).substr(2, 9),
				name: "Team Sync",
				categoryId: "Work",
				priority: 2,
				defaultDuration: 45,
				isReplaceable: false,
				color: colors.primary,
				createdAt: new Date().toISOString(),
			},
		];

		setActivities(dummyActivities);
	}, []);
	useEffect(() => {
		const timer = setTimeout(() => setLoading(false), 500);
		return () => clearTimeout(timer);
	}, []);

	const handleEdit = useCallback((activity: ActivityEntity) => {
		setSelectedActivity(activity);
		setEditModalVisible(true);
	}, []);

	const handleDelete = useCallback((id: string) => {
		console.log("Delete triggered for ID:", id);
		Alert.alert("Delete Activity", "Are you sure?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: () => {
					setActivities((prev) => {
						console.log("ID we want to delete:", id);
						console.log(
							"IDs currently in state:",
							prev.map((a) => a.id),
						);
						const newState = prev.filter((a) => a.id !== id);
						console.log("Items remaining:", newState.length);
						return newState;
					});
				},
			},
		]);
	}, []);

	const handleSaveActivity = (data: ActivityFormData) => {
		if (selectedActivity) {
			setActivities((prev) =>
				prev.map((a) =>
					a.id === selectedActivity.id
						? {
								...a,
								name: data.title,
								categoryId: data.category || "Other",
								priority:
									data.priority === "high"
										? 3
										: data.priority === "medium"
											? 2
											: 1,
								defaultDuration: data.duration || 30,
								isReplaceable: data.replaceabilityStatus === "SOFT",
							}
						: a,
				),
			);
		} else {
			const newActivity: ActivityEntity = {
				id: Math.random().toString(36).substr(2, 9),
				name: data.title,
				categoryId: data.category || "Other",
				priority:
					data.priority === "high" ? 3 : data.priority === "medium" ? 2 : 1,
				defaultDuration: data.duration || 30,
				isReplaceable: data.replaceabilityStatus === "SOFT",
				color: colors.primary,
				createdAt: new Date().toISOString(),
			};
			setActivities((prev) => [...prev, newActivity]);
		}
		setEditModalVisible(false);
		setSelectedActivity(null);
	};

	const renderItem = ({
		item,
		index,
	}: {
		item: ActivityEntity;
		index: number;
	}) => (
		<View style={styles.activityContainer}>
			<ActivityRow
				activity={item}
				onToggle={() => {}}
				onPress={() => handleEdit(item)}
				last={index === activities.length - 1}
			/>
			<Pressable style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
				<Text style={styles.deleteBtnText}>Delete</Text>
			</Pressable>
		</View>
	);

	return (
		<SafeAreaView style={styles.safe}>
			<View style={styles.header}>
				<Text style={styles.title}>Manage Activities</Text>
			</View>

			<View style={styles.content}>
				{loading ? (
					<Text style={styles.muted}>Loading activities...</Text>
				) : activities.length === 0 ? (
					<View style={styles.emptyState}>
						<Text style={styles.muted}>No activities found.</Text>
						<Pressable style={styles.seedBtn} onPress={seedActivities}>
							<Text style={styles.seedBtnText}>Seed Dummy Data</Text>
						</Pressable>
					</View>
				) : (
					<FlatList
						data={activities}
						keyExtractor={(item) => item.id}
						renderItem={renderItem}
						extraData={activities}
						contentContainerStyle={styles.listContent}
					/>
				)}
			</View>

			<Modal
				visible={editModalVisible}
				animationType="slide"
				transparent={true}
				onRequestClose={() => setEditModalVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>
								{selectedActivity ? "Edit Activity" : "New Activity"}
							</Text>
							<TouchableOpacity onPress={() => setEditModalVisible(false)}>
								<Text style={styles.closeText}>Cancel</Text>
							</TouchableOpacity>
						</View>
						<ScrollView showsVerticalScrollIndicator={false}>
							<ActivityForm
								showTimeFields={false}
								initialData={
									selectedActivity
										? {
												title: selectedActivity.name,
												category: selectedActivity.categoryId,
												priority:
													selectedActivity.priority === 3
														? "high"
														: selectedActivity.priority === 2
															? "medium"
															: "low",
												duration: selectedActivity.defaultDuration,
												replaceabilityStatus: selectedActivity.isReplaceable
													? "SOFT"
													: "HARD",
											}
										: undefined
								}
								onSubmit={handleSaveActivity}
							/>
						</ScrollView>
					</View>
				</View>
			</Modal>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: {
		flex: 1,
		backgroundColor: colors.background,
	},
	header: {
		paddingHorizontal: spacing.xl,
		paddingVertical: spacing.lg,
		backgroundColor: colors.white,
		borderBottomWidth: 1,
		borderBottomColor: colors.slate100,
	},
	title: {
		fontSize: 24,
		fontWeight: "700",
		color: colors.slate800,
	},
	content: {
		flex: 1,
	},
	listContent: {
		paddingHorizontal: spacing.xl,
		paddingVertical: spacing.lg,
	},
	activityContainer: {
		flexDirection: "row",
		alignItems: "stretch",
		backgroundColor: colors.white,
		marginBottom: spacing.md,
		borderRadius: 12,
		overflow: "hidden",
		borderWidth: 1,
		borderColor: colors.slate100,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	deleteBtn: {
		paddingHorizontal: spacing.lg,
		justifyContent: "center",
		backgroundColor: colors.slate50,
		borderLeftWidth: 1,
		borderLeftColor: colors.slate100,
	},
	deleteBtnText: {
		color: colors.red400,
		fontSize: 13,
		fontWeight: "600",
	},
	emptyState: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		padding: spacing.xl,
	},
	seedBtn: {
		marginTop: spacing.lg,
		paddingVertical: spacing.md,
		paddingHorizontal: spacing.xl,
		backgroundColor: colors.primary,
		borderRadius: 12,
	},
	seedBtnText: {
		color: colors.white,
		fontWeight: "700",
	},
	muted: {
		fontSize: 16,
		color: colors.slate400,
		textAlign: "center",
		marginTop: spacing.xl,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.4)",
		justifyContent: "flex-end",
	},
	modalContent: {
		backgroundColor: colors.white,
		borderTopLeftRadius: 28,
		borderTopRightRadius: 28,
		padding: spacing.xl,
		maxHeight: "90%",
	},
	modalHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: spacing.xl,
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: "700",
		color: colors.slate800,
	},
	closeText: {
		fontSize: 16,
		color: colors.slate500,
		fontWeight: "600",
	},
});
