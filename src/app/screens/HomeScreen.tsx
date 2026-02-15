import { useCallback, useEffect, useState } from "react";
import {
	Pressable,
	SafeAreaView,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { ActivityRow } from "../components/ActivityRow";
import { AddScheduledActivityModal } from "../components/AddScheduledActivityModal";
import { EditTaskModal } from "../components/EditTaskModal";
import { LogTimeModal } from "../components/LogTimeModal";
import { ProgressCircle } from "../components/ProgressCircle";
import { ScheduledActivityRow } from "../components/ScheduledActivityRow";
import { getCurrentUser } from "../data/auth";
import {
	getScheduledActivitiesForDate,
	getTasksForDate,
	toggleTaskCompleted,
	updateScheduledActivity,
	updateTask,
} from "../data/storage";
import { colors, spacing } from "../theme";
import type { ActivityItem, AppRoute, ScheduledActivity } from "../types";

const todayKey = () => new Date().toISOString().slice(0, 10);

type Props = {
	onNavigate: (route: AppRoute) => void;
};

const today = () => new Date();

export function HomeScreen({ onNavigate: _onNavigate }: Props) {
	const [userName, setUserName] = useState<string | null>(null);
	const [activities, setActivities] = useState<ActivityItem[]>([]);
	const [scheduled, setScheduled] = useState<ScheduledActivity[]>([]);
	const [loading, setLoading] = useState(true);
	const [addModalVisible, setAddModalVisible] = useState(false);
	const [editChecklistTask, setEditChecklistTask] =
		useState<ActivityItem | null>(null);
	const [editScheduledActivity, setEditScheduledActivity] =
		useState<ScheduledActivity | null>(null);
	const [completingChecklist, setCompletingChecklist] =
		useState<ActivityItem | null>(null);
	const [completingScheduled, setCompletingScheduled] =
		useState<ScheduledActivity | null>(null);

	useEffect(() => {
		getCurrentUser().then((u) => setUserName(u?.name ?? null));
	}, []);

	const load = useCallback(() => {
		setLoading(true);
		Promise.all([
			getTasksForDate(today()),
			getScheduledActivitiesForDate(today()),
		]).then(([list, scheduledList]) => {
			setActivities(list);
			// Sort by deadline (nearer first), then by start time
			setScheduled(
				[...scheduledList].sort((a, b) => {
					const d = a.deadline.localeCompare(b.deadline);
					return d !== 0 ? d : a.startTime.localeCompare(b.startTime);
				}),
			);
			setLoading(false);
		});
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const handleToggleTask = useCallback(
		(id: string) => {
			const item = activities.find((a) => a.id === id);
			if (!item) return;
			if (item.completed) {
				toggleTaskCompleted(today(), id).then(setActivities);
			} else {
				setCompletingChecklist(item);
			}
		},
		[activities],
	);

	const handleLogTimeChecklist = useCallback(
		(minutes: number | null) => {
			if (!completingChecklist) return;
			toggleTaskCompleted(
				today(),
				completingChecklist.id,
				minutes != null ? { completedMinutes: minutes } : undefined,
			).then(setActivities);
			setCompletingChecklist(null);
		},
		[completingChecklist],
	);

	const handleToggleScheduled = useCallback(
		(id: string) => {
			const item = scheduled.find((a) => a.id === id);
			if (!item) return;
			if (item.completed) {
				updateScheduledActivity(id, { completed: false }).then(load);
			} else {
				setCompletingScheduled(item);
			}
		},
		[load, scheduled],
	);

	const handleLogTimeScheduled = useCallback(
		(minutes: number | null) => {
			if (!completingScheduled) return;
			updateScheduledActivity(completingScheduled.id, {
				completed: true,
				actualMinutesSpent: minutes ?? completingScheduled.durationMinutes,
			}).then(load);
			setCompletingScheduled(null);
		},
		[completingScheduled, load],
	);

	const logTimeModalVisible =
		completingChecklist != null || completingScheduled != null;
	const logTimeTitle = completingChecklist
		? `How long did "${completingChecklist.title}" take?`
		: completingScheduled
			? `How long did "${completingScheduled.title}" take?`
			: "";
	const logTimeDefaultMinutes = completingScheduled?.durationMinutes;
	const handleLogTimeSelect = useCallback(
		(minutes: number | null) => {
			if (completingChecklist) handleLogTimeChecklist(minutes);
			else if (completingScheduled) handleLogTimeScheduled(minutes);
		},
		[
			completingChecklist,
			completingScheduled,
			handleLogTimeChecklist,
			handleLogTimeScheduled,
		],
	);
	const handleLogTimeClose = useCallback(() => {
		setCompletingChecklist(null);
		setCompletingScheduled(null);
	}, []);

	const openEditChecklist = useCallback((item: ActivityItem) => {
		setEditChecklistTask(item);
	}, []);

	const openEditScheduled = useCallback((item: ScheduledActivity) => {
		setEditScheduledActivity(item);
		setAddModalVisible(true);
	}, []);

	const handleCloseAddModal = useCallback(() => {
		setAddModalVisible(false);
		setEditScheduledActivity(null);
	}, []);

	const handleSaveChecklistEdit = useCallback(
		async (taskId: string, title: string, subtitle: string) => {
			const updated = await updateTask(today(), taskId, { title, subtitle });
			setActivities(updated);
			setEditChecklistTask(null);
		},
		[],
	);

	// Unified todo list: sort by deadline (nearer first), then start time. Checklist = today, 00:00.
	type TodoItem =
		| { type: "checklist"; data: ActivityItem }
		| { type: "scheduled"; data: ScheduledActivity };
	const combined: TodoItem[] = [
		...activities.map((d) => ({ type: "checklist" as const, data: d })),
		...scheduled.map((d) => ({ type: "scheduled" as const, data: d })),
	].sort((x, y) => {
		const deadlineA = x.type === "checklist" ? todayKey() : x.data.deadline;
		const deadlineB = y.type === "checklist" ? todayKey() : y.data.deadline;
		const d = deadlineA.localeCompare(deadlineB);
		if (d !== 0) return d;
		const timeA = x.type === "checklist" ? "00:00" : x.data.startTime;
		const timeB = y.type === "checklist" ? "00:00" : y.data.startTime;
		return timeA.localeCompare(timeB);
	});

	const completedCount =
		activities.filter((a) => a.completed).length +
		scheduled.filter((a) => a.completed).length;
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
						<Text style={styles.sectionLabel}>Your tasks</Text>
						{loading ? (
							<Text style={styles.muted}>Loading…</Text>
						) : combined.length === 0 ? (
							<Text style={styles.muted}>
								No tasks yet. Tap Add task to add one.
							</Text>
						) : (
							combined.map((item, i) =>
								item.type === "checklist" ? (
									<ActivityRow
										key={`task-${item.data.id}`}
										activity={item.data}
										onToggle={() => handleToggleTask(item.data.id)}
										onPress={() => openEditChecklist(item.data)}
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

					<Pressable
						style={({ pressed }) => [
							styles.addBtn,
							pressed && styles.addBtnPressed,
						]}
						onPress={() => {
							setEditScheduledActivity(null);
							setAddModalVisible(true);
						}}
					>
						<Text style={styles.addBtnLabel}>Add task</Text>
					</Pressable>
				</ScrollView>
			</View>

			<AddScheduledActivityModal
				visible={addModalVisible}
				onClose={handleCloseAddModal}
				initialDate={today()}
				activityToEdit={editScheduledActivity}
				onAdded={load}
			/>

			{editChecklistTask && (
				<EditTaskModal
					visible
					task={editChecklistTask}
					onClose={() => setEditChecklistTask(null)}
					onSave={handleSaveChecklistEdit}
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
	addBtn: {
		marginTop: spacing.lg,
		paddingVertical: spacing.md,
		paddingHorizontal: spacing.xl,
		backgroundColor: colors.primary,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	addBtnPressed: { opacity: 0.9 },
	addBtnLabel: { fontSize: 16, fontWeight: "600", color: colors.slate800 },
});
