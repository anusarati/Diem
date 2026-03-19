import { useCallback, useEffect, useState } from "react";
import {
	Alert,
	FlatList,
	Modal,
	Pressable,
	SafeAreaView,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { ActivityForm } from "../components/ActivityForm";
import { ActivityRow } from "../components/ActivityRow";
import {
	createActivityGlobal,
	getActivityConstraints,
	getAllActivities,
	observeAllActivities,
	removeActivity,
	updateActivityGlobal,
} from "../data/services";
import type { ActivityFormData } from "../hooks/useActivityValidation";
import { colors, spacing } from "../theme";
import type { ActivityItem, AppRoute } from "../types";

type Props = {
	onNavigate: (route: AppRoute) => void;
};

export function ManageActivitiesScreen({ onNavigate: _onNavigate }: Props) {
	const [activities, setActivities] = useState<ActivityItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [editModalVisible, setEditModalVisible] = useState(false);
	const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(
		null,
	);
	const [selectedConstraints, setSelectedConstraints] = useState<
		Partial<ActivityFormData>
	>({});

	useEffect(() => {
		let disposed = false;
		let stopObserving: (() => void) | null = null;
		setLoading(true);

		observeAllActivities((data) => {
			if (disposed) return;
			setActivities(data);
			setLoading(false);
		})
			.then((stop) => {
				if (disposed) {
					stop();
					return;
				}
				stopObserving = stop;
			})
			.catch((e) => {
				console.error("[ManageActivities] error observing docs", e);
				if (!disposed) setLoading(false);
			});

		return () => {
			disposed = true;
			stopObserving?.();
		};
	}, []);

	const handleEdit = useCallback(async (activity: ActivityItem) => {
		setSelectedActivity(activity);
		try {
			const constraints = await getActivityConstraints(activity.id);
			setSelectedConstraints(constraints);
		} catch (e) {
			console.error("[ManageActivities] load constraints failed", e);
		}
		setEditModalVisible(true);
	}, []);

	const handleDelete = useCallback(async (id: string) => {
		try {
			await removeActivity(new Date(), id);
		} catch (e) {
			console.error("[ManageActivities] delete failed", e);
			Alert.alert("Error", "Could not delete activity");
		}
	}, []);

	const handleSaveActivity = async (data: ActivityFormData) => {
		const priorityValue =
			data.priority === "high" ? 3 : data.priority === "medium" ? 2 : 1;
		const durationValue = parseInt(String(data.duration), 10) || 30;
		const isReplaceableValue = data.replaceabilityStatus === "SOFT";
		const categoryIdValue = data.category || "Other";

		try {
			if (selectedActivity) {
				await updateActivityGlobal(selectedActivity.id, {
					name: data.title,
					categoryId: categoryIdValue,
					priority: priorityValue,
					defaultDuration: durationValue,
					isReplaceable: isReplaceableValue,
					isRecurring: data.isRecurring,
					recurrencePattern: data.recurrencePattern,
					minFrequency: data.minFrequency,
					maxFrequency: data.maxFrequency,
					minDuration: data.minDuration,
					maxDuration: data.maxDuration,
					timeRestrictions: data.timeRestrictions,
				});
			} else {
				await createActivityGlobal(
					data.title,
					categoryIdValue,
					priorityValue,
					durationValue,
					isReplaceableValue,
					data.isRecurring,
					data.recurrencePattern,
					data, // constraints payload
				);
			}
			setEditModalVisible(false);
			setSelectedActivity(null);
			const updated = await getAllActivities();
			setActivities(updated);
		} catch (e) {
			console.error("[ManageActivities] save failed", e);
			Alert.alert("Error", "Could not save activity");
		}
	};

	const renderItem = ({
		item,
		index,
	}: {
		item: ActivityItem;
		index: number;
	}) => (
		<View style={styles.activityContainer}>
			<View style={{ flex: 1, paddingLeft: spacing.lg }}>
				<ActivityRow
					activity={item}
					onPress={() => handleEdit(item)}
					last={index === activities.length - 1}
				/>
			</View>
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
												isRecurring: selectedActivity.isRecurring,
												recurrencePattern: selectedActivity.recurrencePattern,
												...selectedConstraints,
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
