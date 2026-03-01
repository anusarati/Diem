import { useCallback, useEffect, useState } from "react";
import {
	Alert,
	FlatList,
	Pressable,
	SafeAreaView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { ActivitySource, EventStatus, Replaceability } from "types/domain";
import { AddScheduledActivityModal } from "../components/AddScheduledActivityModal";
import { ScheduledActivityRow } from "../components/ScheduledActivityRow";
import { colors, spacing } from "../theme";
import type { AppRoute, ScheduledActivity } from "../types";

type Props = {
	onNavigate: (route: AppRoute) => void;
};

export function ManageTasksScreen({ onNavigate: _onNavigate }: Props) {
	const [activities, setActivities] = useState<ScheduledActivity[]>([]);
	const [loading, setLoading] = useState(true);
	const [editModalVisible, setEditModalVisible] = useState(false);
	const [selectedActivity, setSelectedActivity] =
		useState<ScheduledActivity | null>(null);

	const loadActivities = useCallback(() => {
		setLoading(true);
		setActivities((prev) => {
			const sorted = [...prev].sort((a, b) => {
				const d = a.date.localeCompare(b.date);
				return d !== 0 ? d : a.startTime.localeCompare(b.startTime);
			});
			return sorted;
		});
		setLoading(false);
	}, []);

	const handleAddOrUpdate = useCallback(() => {
		loadActivities();
		setEditModalVisible(false);
		setSelectedActivity(null);
	}, [loadActivities]);

	const seedTasks = useCallback(() => {
		const dummyTasks: ScheduledActivity[] = [
			{
				id: Math.random().toString(36).substr(2, 9),
				title: "Morning Yoga",
				startTime: "08:00",
				durationMinutes: 30,
				category: "Fitness",
				priority: 1,
				flexible: true,
				date: "2026-02-27",
				deadline: "2026-02-27",
				completed: false,
				activityId: "",
				categoryId: "",
				endTime: "",
				duration: 0,
				status: EventStatus.PREDICTED,
				replaceabilityStatus: Replaceability.HARD,
				isRecurring: false,
				source: ActivitySource.USER_CREATED,
				isLocked: false,
				createdAt: "",
				updatedAt: "",
			},
			{
				id: Math.random().toString(36).substr(2, 9),
				title: "Team Sync",
				startTime: "10:00",
				durationMinutes: 45,
				category: "Work",
				priority: 2, // Changed from "High" to 2
				flexible: false,
				date: "2026-02-27",
				deadline: "2026-02-27",
				completed: false,
				activityId: "",
				categoryId: "",
				endTime: "",
				duration: 0,
				status: EventStatus.PREDICTED,
				replaceabilityStatus: Replaceability.HARD,
				isRecurring: false,
				source: ActivitySource.USER_CREATED,
				isLocked: false,
				createdAt: "",
				updatedAt: "",
			},
		];

		setActivities(dummyTasks);
	}, []);
	useEffect(() => {
		const timer = setTimeout(() => setLoading(false), 500);
		return () => clearTimeout(timer);
	}, []);

	const handleEdit = useCallback((activity: ScheduledActivity) => {
		setSelectedActivity(activity);
		setEditModalVisible(true);
	}, []);

	const handleDelete = useCallback((id: string) => {
		Alert.alert(
			"Delete Activity",
			"Are you sure you want to delete this activity?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: () => {
						setActivities((prev) => prev.filter((a) => a.id !== id));
					},
				},
			],
		);
	}, []);

	const renderItem = ({
		item,
		index,
	}: {
		item: ScheduledActivity;
		index: number;
	}) => (
		<View style={styles.activityContainer}>
			<ScheduledActivityRow
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
						<Pressable style={styles.seedBtn} onPress={seedTasks}>
							<Text style={styles.seedBtnText}>Seed Dummy Data</Text>
						</Pressable>
					</View>
				) : (
					<FlatList
						data={activities}
						keyExtractor={(item) => item.id}
						renderItem={renderItem}
						contentContainerStyle={styles.listContent}
					/>
				)}
			</View>

			<AddScheduledActivityModal
				visible={editModalVisible}
				onClose={() => {
					setEditModalVisible(false);
					setSelectedActivity(null);
				}}
				initialDate={new Date()}
				activityToEdit={selectedActivity}
				onAdded={() => {
					handleAddOrUpdate();
				}}
			/>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: {
		flex: 1,
		backgroundColor: colors.backgroundLight,
	},
	header: {
		paddingHorizontal: spacing.xl,
		paddingVertical: spacing.lg,
		backgroundColor: colors.white,
		borderBottomWidth: 1,
		borderBottomColor: colors.slate100,
	},
	title: {
		fontSize: 22,
		fontWeight: "600",
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
		alignItems: "center",
		backgroundColor: colors.white,
		marginBottom: spacing.sm,
		borderRadius: 12,
		overflow: "hidden",
		borderWidth: 1,
		borderColor: colors.slate100,
	},
	deleteBtn: {
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.lg,
		backgroundColor: colors.slate50,
		borderLeftWidth: 1,
		borderLeftColor: colors.slate100,
		justifyContent: "center",
	},
	deleteBtnText: {
		color: "#ef4444",
		fontSize: 12,
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
		color: colors.slate800,
		fontWeight: "600",
	},
	muted: {
		fontSize: 15,
		color: colors.slate400,
		textAlign: "center",
		marginTop: spacing.xl,
	},
});
