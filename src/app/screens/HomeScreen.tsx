import { useCallback, useEffect, useState } from "react";
import {
	Pressable,
	SafeAreaView,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { EventStatus } from "../../types/domain";
import { ActivityRow } from "../components/ActivityRow";
import { AddActivityModal } from "../components/AddActivityModal";
import { AddScheduledActivityModal } from "../components/AddScheduledActivityModal";
import { EditActivityModal } from "../components/EditActivityModal";
import { LogTimeModal } from "../components/LogTimeModal";
import { ProgressCircle } from "../components/ProgressCircle";
import { ScheduledActivityRow } from "../components/ScheduledActivityRow";
import {
	createActivity,
	observeCurrentUserProfileData,
	observeHomeData,
	renameActivity,
	toggleActivityCompletion,
	toggleScheduledCompletion,
} from "../data/services";
import { colors, spacing } from "../theme";
import type { ActivityItem, AppRoute, ScheduledActivity } from "../types";

type Props = {
	onNavigate: (route: AppRoute) => void;
};

const today = () => new Date();

export function HomeScreen({ onNavigate: _onNavigate }: Props) {
	const [userName, setUserName] = useState<string | null>(null);
	const [activities, setActivities] = useState<ActivityItem[]>([]);
	const [scheduled, setScheduled] = useState<ScheduledActivity[]>([]);
	const [loading, setLoading] = useState(true);
	const [addActivityModalVisible, setAddActivityModalVisible] = useState(false);
	const [addScheduledModalVisible, setAddScheduledModalVisible] =
		useState(false);
	const [editActivity, setEditActivity] = useState<ActivityItem | null>(null);
	const [editScheduledActivity, setEditScheduledActivity] =
		useState<ScheduledActivity | null>(null);
	const [completingActivity, setCompletingActivity] =
		useState<ActivityItem | null>(null);

	useEffect(() => {
		let disposed = false;
		let stopObserving: (() => void) | null = null;

		observeCurrentUserProfileData((profile) => {
			if (disposed) {
				return;
			}
			setUserName(profile.name || null);
		})
			.then((stop) => {
				if (disposed) {
					stop();
					return;
				}
				stopObserving = stop;
			})
			.catch(() => {
				if (!disposed) {
					setUserName(null);
				}
			});

		return () => {
			disposed = true;
			stopObserving?.();
		};
	}, []);

	useEffect(() => {
		let disposed = false;
		let stopObserving: (() => void) | null = null;

		setLoading(true);
		observeHomeData(today(), ({ activities: list, scheduled: events }) => {
			if (disposed) {
				return;
			}
			setActivities(list);
			setScheduled(events);
			setLoading(false);
		})
			.then((stop) => {
				if (disposed) {
					stop();
					return;
				}
				stopObserving = stop;
			})
			.catch(() => {
				if (!disposed) {
					setLoading(false);
				}
			});

		return () => {
			disposed = true;
			stopObserving?.();
		};
	}, []);

	const handleToggleActivity = useCallback(
		(id: string) => {
			const item = activities.find((a) => a.id === id);
			if (!item) return;
			if (item.completed) {
				void toggleActivityCompletion(today(), id);
			} else {
				setCompletingActivity(item);
			}
		},
		[activities],
	);

	const handleLogTimeActivity = useCallback(
		(minutes: number | null) => {
			if (!completingActivity) return;
			void toggleActivityCompletion(
				today(),
				completingActivity.id,
				minutes != null ? { completedDuration: minutes } : undefined,
			);
			setCompletingActivity(null);
		},
		[completingActivity],
	);

	const handleToggleScheduled = useCallback(
		(id: string) => {
			const item = scheduled.find((a) => a.id === id);
			if (!item) return;
			void toggleScheduledCompletion(id, item.status);
		},
		[scheduled],
	);
	const logTimeModalVisible = completingActivity != null;
	const logTimeTitle = completingActivity
		? `How long did "${completingActivity.name}" take?`
		: "";
	const logTimeDefaultMinutes = completingActivity?.defaultDuration;
	const handleLogTimeSelect = useCallback(
		(minutes: number | null) => {
			if (completingActivity) {
				handleLogTimeActivity(minutes);
			}
		},
		[completingActivity, handleLogTimeActivity],
	);
	const handleLogTimeClose = useCallback(() => {
		setCompletingActivity(null);
	}, []);

	const openEditActivity = useCallback((item: ActivityItem) => {
		setEditActivity(item);
	}, []);

	const openEditScheduled = useCallback((item: ScheduledActivity) => {
		setEditScheduledActivity(item);
		setAddScheduledModalVisible(true);
	}, []);

	const handleCloseScheduledModal = useCallback(() => {
		setAddScheduledModalVisible(false);
		setEditScheduledActivity(null);
	}, []);

	const handleSaveActivityEdit = useCallback(
		async (activityId: string, name: string) => {
			await renameActivity(today(), activityId, name);
			setEditActivity(null);
		},
		[],
	);

	const handleAddActivity = useCallback(async (name: string) => {
		await createActivity(today(), name);
	}, []);

	const handleOpenAddScheduled = useCallback(() => {
		setEditScheduledActivity(null);
		setAddScheduledModalVisible(true);
	}, []);

	// Unified todo list ordered by start/creation time.
	type TodoItem =
		| { type: "activity"; data: ActivityItem }
		| { type: "scheduled"; data: ScheduledActivity };
	const combined: TodoItem[] = [
		...activities.map((d) => ({ type: "activity" as const, data: d })),
		...scheduled.map((d) => ({ type: "scheduled" as const, data: d })),
	].sort((x, y) => {
		const atA =
			x.type === "activity"
				? new Date(x.data.createdAt).getTime()
				: new Date(x.data.startTime).getTime();
		const atB =
			y.type === "activity"
				? new Date(y.data.createdAt).getTime()
				: new Date(y.data.startTime).getTime();
		return atA - atB;
	});

	const completedCount =
		activities.filter((a) => a.completed).length +
		scheduled.filter((a) => a.status === EventStatus.COMPLETED).length;
	const totalCount = activities.length + scheduled.length;
	const focusPercent = totalCount
		? Math.round((completedCount / totalCount) * 100)
		: 0;

	const todayLabel = today().toLocaleDateString(undefined, {
		weekday: "long",
		month: "long",
		day: "numeric",
	});

	return (
		<SafeAreaView style={styles.safe}>
			<View style={styles.container}>
				<View style={styles.header}>
					<View>
						<Text style={styles.date}>{todayLabel}</Text>
						<Text style={styles.greeting}>
							{userName ? `Welcome, ${userName}` : "Today"}
						</Text>
					</View>
				</View>

				<View style={styles.section}>
					<View style={styles.focusCard}>
						<ProgressCircle percentage={focusPercent} />
						<View style={styles.focusText}>
							<Text style={styles.focusTitle}>Today's focus</Text>
							<Text style={styles.focusSubtitle}>
								{loading
									? "Loading…"
									: `${completedCount} of ${totalCount} completed`}
							</Text>
						</View>
					</View>
				</View>

				<ScrollView
					style={styles.scroll}
					contentContainerStyle={styles.scrollContent}
				>
					<View style={styles.activitiesSection}>
						<Text style={styles.sectionLabel}>Your activities</Text>
						{loading ? (
							<Text style={styles.muted}>Loading…</Text>
						) : combined.length === 0 ? (
							<Text style={styles.muted}>
								No activities yet. Add one to get started.
							</Text>
						) : (
							combined.map((item, i) =>
								item.type === "activity" ? (
									<ActivityRow
										key={`activity-${item.data.id}`}
										activity={item.data}
										onToggle={() => handleToggleActivity(item.data.id)}
										onPress={() => openEditActivity(item.data)}
										last={i === combined.length - 1}
									/>
								) : (
									<ScheduledActivityRow
										key={`sched-${item.data.id}`}
										activity={item.data}
										onToggle={() => handleToggleScheduled(item.data.id)}
										onPress={() => openEditScheduled(item.data)}
										last={i === combined.length - 1}
									/>
								),
							)
						)}
					</View>

					<View style={styles.addActionsRow}>
						<Pressable
							style={({ pressed }) => [
								styles.addBtn,
								styles.addBtnPrimary,
								pressed && styles.addBtnPressed,
							]}
							onPress={() => setAddActivityModalVisible(true)}
						>
							<Text style={styles.addBtnLabel}>Add activity</Text>
						</Pressable>
						<Pressable
							style={({ pressed }) => [
								styles.addBtn,
								styles.addBtnSecondary,
								pressed && styles.addBtnPressed,
							]}
							onPress={handleOpenAddScheduled}
						>
							<Text style={styles.addBtnLabel}>Add schedule</Text>
						</Pressable>
					</View>
				</ScrollView>
			</View>

			<AddActivityModal
				visible={addActivityModalVisible}
				onClose={() => setAddActivityModalVisible(false)}
				onSave={handleAddActivity}
			/>

			<AddScheduledActivityModal
				visible={addScheduledModalVisible}
				onClose={handleCloseScheduledModal}
				initialDate={today()}
				activityToEdit={editScheduledActivity}
			/>

			{editActivity && (
				<EditActivityModal
					visible
					activity={editActivity}
					onClose={() => setEditActivity(null)}
					onSave={handleSaveActivityEdit}
				/>
			)}

			<LogTimeModal
				visible={logTimeModalVisible}
				title={logTimeTitle}
				defaultMinutes={logTimeDefaultMinutes}
				onSelect={handleLogTimeSelect}
				onClose={handleLogTimeClose}
			/>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: colors.backgroundLight },
	container: { flex: 1, maxWidth: 480, alignSelf: "center", width: "100%" },
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: spacing.xl,
		paddingVertical: spacing.lg,
		backgroundColor: colors.white,
		borderBottomWidth: 1,
		borderBottomColor: colors.slate100,
	},
	date: {
		fontSize: 12,
		letterSpacing: 0.5,
		color: colors.slate500,
		marginBottom: 2,
	},
	greeting: { fontSize: 22, fontWeight: "600", color: colors.slate800 },
	section: { paddingHorizontal: spacing.xl, marginTop: spacing.lg },
	focusCard: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.lg,
		padding: spacing.xl,
		borderRadius: 16,
		backgroundColor: colors.white,
		borderWidth: 1,
		borderColor: colors.slate100,
	},
	focusText: { flex: 1 },
	focusTitle: { fontSize: 15, fontWeight: "600", color: colors.slate700 },
	focusSubtitle: {
		fontSize: 13,
		color: colors.slate500,
		marginTop: 4,
	},
	scroll: { flex: 1 },
	scrollContent: {
		paddingHorizontal: spacing.xl,
		paddingVertical: spacing.lg,
		paddingBottom: 48,
	},
	activitiesSection: { marginBottom: spacing.lg },
	sectionLabel: {
		fontSize: 13,
		fontWeight: "600",
		color: colors.slate600,
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginBottom: spacing.md,
	},
	muted: { fontSize: 14, color: colors.slate400, marginTop: spacing.sm },
	addActionsRow: {
		marginTop: spacing.lg,
		flexDirection: "row",
		gap: spacing.md,
	},
	addBtn: {
		paddingVertical: spacing.md,
		paddingHorizontal: spacing.xl,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		flex: 1,
	},
	addBtnPrimary: { backgroundColor: colors.primary },
	addBtnSecondary: {
		backgroundColor: colors.white,
		borderWidth: 1,
		borderColor: colors.slate200,
	},
	addBtnPressed: { opacity: 0.9 },
	addBtnLabel: { fontSize: 16, fontWeight: "600", color: colors.slate800 },
});
