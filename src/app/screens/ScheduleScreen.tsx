import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TimelineCanvas } from "../../features/timeline/TimelineCanvas";
import { ActivityActionMenu } from "../components/ActivityActionMenu";
import { QuickAddSheet } from "../components/QuickAddSheet";
import { SegmentedControl } from "../components/SegmentedControl";
import type { TimeBlockProps } from "../components/TimeBlock";
import { WeeklyView } from "../components/WeeklyView";
import type { ActivityFormData } from "../hooks/useActivityValidation";
import { colors, spacing } from "../theme";
import type { AppRoute } from "../types";

type Props = {
	onNavigate: (route: AppRoute) => void;
};

const INITIAL_ACTIVITIES: TimeBlockProps[] = [
	{
		id: "1",
		title: "Morning Routine",
		subtitle: "Wake up, Coffee",
		startTime: "07:00",
		durationMinutes: 45,
		type: "fixed",
		day: "Mon",
		categoryColor: colors.marshmallow,
	},
	{
		id: "2",
		title: "CS 125 Lecture",
		subtitle: "DBH 1200",
		startTime: "10:00",
		durationMinutes: 90,
		type: "fixed",
		day: "Mon",
		categoryColor: colors.primary,
	},
	{
		id: "3",
		title: "Lunch",
		startTime: "12:00",
		durationMinutes: 60,
		type: "flexible",
		day: "Mon",
		categoryColor: colors.peach,
	},
	{
		id: "4",
		title: "Study: Algorithms",
		subtitle: "Library 4th Floor",
		startTime: "13:30",
		durationMinutes: 120,
		type: "predicted",
		day: "Mon",
		categoryColor: colors.lavender,
	},
	// TUESDAY
	{
		id: "21",
		title: "Gym",
		startTime: "08:00",
		durationMinutes: 60,
		type: "fixed",
		day: "Tue",
		categoryColor: colors.mint,
	},
	{
		id: "22",
		title: "Work Block",
		startTime: "10:00",
		durationMinutes: 180,
		type: "flexible",
		day: "Tue",
		categoryColor: colors.primary,
	},

	// WEDNESDAY
	{
		id: "31",
		title: "Team Meeting",
		startTime: "09:00",
		durationMinutes: 60,
		type: "fixed",
		day: "Wed",
		categoryColor: colors.red300,
	},
	{
		id: "32",
		title: "Design Review",
		startTime: "14:00",
		durationMinutes: 90,
		type: "fixed",
		day: "Wed",
		categoryColor: colors.lavender,
	},

	// THURSDAY
	{
		id: "41",
		title: "Lunch with Mom",
		startTime: "12:30",
		durationMinutes: 90,
		type: "fixed",
		day: "Thu",
		categoryColor: colors.peach,
	},

	// FRIDAY
	{
		id: "51",
		title: "Project Demo",
		startTime: "15:00",
		durationMinutes: 60,
		type: "fixed",
		day: "Fri",
		categoryColor: colors.primary,
	},

	// SATURDAY
	{
		id: "61",
		title: "Hiking",
		startTime: "09:00",
		durationMinutes: 240,
		type: "flexible",
		day: "Sat",
		categoryColor: colors.mint,
	},

	// OTHER
	{
		id: "5",
		title: "Gym (Legacy)",
		startTime: "17:00",
		durationMinutes: 60,
		type: "fixed",
		day: "Mon",
		categoryColor: colors.mint,
	}, // Keeping on Mon for demo density
	{
		id: "6",
		title: "Dinner",
		startTime: "19:00",
		durationMinutes: 45,
		type: "flexible",
		day: "Mon",
		categoryColor: colors.peach,
	},
];

const EXISTING_ACTIVITIES: any[] = [
	{
		id: "a1",
		name: "Gym",
		priority: 3,
		defaultDuration: 60,
		isReplaceable: false,
		categoryId: "Fitness",
	},
	{
		id: "a2",
		name: "Study",
		priority: 2,
		defaultDuration: 120,
		isReplaceable: true,
		categoryId: "Education",
	},
	{
		id: "a3",
		name: "Coding",
		priority: 3,
		defaultDuration: 90,
		isReplaceable: false,
		categoryId: "Work",
	},
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Helper to get the actual date of the current week's Monday
const getMonday = (d: Date) => {
	d = new Date(d);
	const day = d.getDay();
	const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
	return new Date(d.setDate(diff));
};

export function ScheduleScreen({ onNavigate: _onNavigate }: Props) {
	const [activities, setActivities] =
		useState<TimeBlockProps[]>(INITIAL_ACTIVITIES);
	const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
	const [viewMode, setViewMode] = useState("Day"); // 'Day' | 'Week'
	const [initialTime, setInitialTime] = useState("");

	// Dynamic Date State
	const [currentDate] = useState(new Date()); // Today
	const mondayDate = getMonday(currentDate);
	const [selectedDay, setSelectedDay] = useState(() => {
		// Default to today's day label (e.g. 'Tue')
		const todayIndex = (new Date().getDay() + 6) % 7; // Shift 0=Sun to 6=Sun, 1=Mon to 0=Mon
		return DAYS[todayIndex];
	});

	// Calculate the displayed date string based on selectedDay
	const getDisplayedDate = () => {
		const dayIndex = DAYS.indexOf(selectedDay);
		const targetDate = new Date(mondayDate);
		targetDate.setDate(mondayDate.getDate() + dayIndex);

		const options: Intl.DateTimeFormatOptions = {
			month: "short",
			day: "numeric",
		};
		return `${selectedDay}, ${targetDate.toLocaleDateString("en-US", options)}`;
	};

	const [menuVisible, setMenuVisible] = useState(false);
	const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
		null,
	);

	// State for editing
	interface EditingActivity {
		id: string;
		title: string;
		startTime: string;
		duration: number;
		type: "fixed" | "flexible" | "predicted";
		priority?: "high" | "medium" | "low";
	}
	const [editingActivity, setEditingActivity] =
		useState<EditingActivity | null>(null);

	// Helper to get color from priority
	const getColorForPriority = (
		priority: "high" | "medium" | "low" | undefined,
	) => {
		switch (priority) {
			case "high":
				return colors.red400; // Red for High
			case "medium":
				return colors.peachDark; // Orange/Peach for Medium
			case "low":
				return colors.mintDark; // Green for Low
			default:
				return colors.primary;
		}
	};

	const handleAddOrEditActivity = (activityData: ActivityFormData) => {
		const categoryColor = activityData.priority
			? getColorForPriority(activityData.priority)
			: colors.primary;

		const type =
			activityData.replaceabilityStatus === "SOFT" ? "flexible" : "fixed";

		if (editingActivity) {
			// UPDATE existing
			setActivities((prev) =>
				prev.map((a) => {
					if (a.id === editingActivity.id) {
						return {
							...a,
							title: activityData.title,
							startTime: activityData.startTime || a.startTime,
							durationMinutes: activityData.duration || a.durationMinutes,
							type: type,
							priority: activityData.priority,
							categoryColor: categoryColor,
							day: a.day,
						};
					}
					return a;
				}),
			);
			setEditingActivity(null);
		} else {
			// ADD new
			const activity: TimeBlockProps = {
				id: Date.now().toString(),
				title: activityData.title,
				startTime: activityData.startTime || initialTime || "09:00",
				durationMinutes: activityData.duration || 60,
				type: type,
				day: selectedDay,
				priority: activityData.priority,
				categoryColor: categoryColor,
			};
			setActivities([...activities, activity]);
		}
	};

	const deleteActivity = () => {
		if (selectedActivityId) {
			setActivities((prev) => prev.filter((a) => a.id !== selectedActivityId));
			setMenuVisible(false);
			setSelectedActivityId(null);
		}
	};

	const startEditing = () => {
		const activity = activities.find((a) => a.id === selectedActivityId);
		if (activity) {
			setEditingActivity({
				id: activity.id,
				title: activity.title,
				startTime: activity.startTime,
				duration: activity.durationMinutes,
				type: activity.type,
				priority: activity.priority, // Pass existing priority
			});
			setMenuVisible(false);
			setIsQuickAddOpen(true);
		}
	};

	const handleActivityPress = (id: string) => {
		setSelectedActivityId(id);
		setMenuVisible(true);
	};

	const handleUpdateTime = (id: string, newStartTime: string) => {
		setActivities((prev) =>
			prev.map((a) => {
				if (a.id === id) {
					return { ...a, startTime: newStartTime };
				}
				return a;
			}),
		);
	};

	const handleWeeklyUpdate = (
		id: string,
		day: string,
		newStartTime: string,
	) => {
		setActivities((prev) =>
			prev.map((a) => {
				if (a.id === id) {
					return { ...a, day, startTime: newStartTime };
				}
				return a;
			}),
		);
	};

	const handleSheetClose = () => {
		setIsQuickAddOpen(false);
		setEditingActivity(null); // Clear edit state on close
	};

	// Filter activities for the "Day" view
	const currentDayActivities = activities.filter(
		(a) => (a.day || "Mon") === selectedDay,
	);

	const selectedActivityTitle =
		activities.find((a) => a.id === selectedActivityId)?.title || "Activity";

	return (
		<SafeAreaView style={styles.safe}>
			<View style={styles.mainContainer}>
				{/* Header */}
				<View style={styles.header}>
					<View style={styles.headerTop}>
						<View>
							<Text style={styles.headerTitle}>Schedule</Text>
							<Text style={styles.date}>{getDisplayedDate()}</Text>
						</View>
						<View style={{ width: 140 }}>
							<SegmentedControl
								options={["Day", "Week"]}
								selected={viewMode}
								onSelect={setViewMode}
							/>
						</View>
					</View>
				</View>

				{/* View Switcher */}
				{viewMode === "Day" ? (
					<TimelineCanvas
						// biome-ignore lint/suspicious/noExplicitAny: Type mapping between app and feature
						activities={currentDayActivities as any[]}
						onActivityPress={handleActivityPress}
						onUpdateActivity={handleUpdateTime}
						showNowIndicator={
							selectedDay === DAYS[(new Date().getDay() + 6) % 7]
						}
					/>
				) : (
					<WeeklyView
						activities={activities}
						onActivityPress={handleActivityPress}
						weekStartDate={mondayDate}
						onUpdateActivity={handleWeeklyUpdate}
						onDayPress={(dayIndex) => {
							const dayLabel = DAYS[dayIndex];
							setSelectedDay(dayLabel);
							setViewMode("Day");
						}}
					/>
				)}

				{/* FAB */}
				<View style={styles.fabWrap}>
					<Pressable
						style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
						onPress={() => {
							setEditingActivity(null); // Ensure clean state
							setIsQuickAddOpen(true);
						}}
					>
						<Text style={styles.fabIcon}>+</Text>
					</Pressable>
				</View>

				{/* Add/Edit Modal */}
				<QuickAddSheet
					isOpen={isQuickAddOpen}
					onClose={handleSheetClose}
					onSave={handleAddOrEditActivity}
					existingActivities={EXISTING_ACTIVITIES}
					initialTime={initialTime}
					initialData={
						editingActivity
							? {
									title: editingActivity.title,
									startTime: editingActivity.startTime,
									duration: editingActivity.duration,
									replaceabilityStatus:
										editingActivity.type === "flexible" ? "SOFT" : "HARD",
									priority: editingActivity.priority,
								}
							: undefined
					}
				/>

				{/* Custom Activity Menu */}
				<ActivityActionMenu
					visible={menuVisible}
					activityTitle={selectedActivityTitle}
					onClose={() => setMenuVisible(false)}
					onEdit={startEditing}
					onDelete={deleteActivity}
				/>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: colors.backgroundLight },
	mainContainer: { flex: 1, maxWidth: 430, alignSelf: "center", width: "100%" },
	header: {
		paddingHorizontal: spacing.xl,
		paddingVertical: spacing.lg,
		backgroundColor: "rgba(255,255,255,0.8)",
		borderBottomWidth: 1,
		borderBottomColor: colors.slate100,
	},
	headerTop: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	headerTitle: {
		fontSize: 24,
		fontWeight: "700",
		color: colors.slate800,
	},
	date: {
		fontSize: 14,
		color: colors.slate400,
		marginTop: 4,
		textTransform: "uppercase",
		letterSpacing: 1,
	},
	fabWrap: {
		position: "absolute",
		bottom: spacing.xxl,
		right: spacing.xl,
		alignSelf: "flex-end",
	},
	fab: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: colors.primary,
		alignItems: "center",
		justifyContent: "center",
		shadowColor: colors.primary,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.2,
		shadowRadius: 8,
		elevation: 4,
	},
	fabPressed: { opacity: 0.9, transform: [{ scale: 0.95 }] },
	fabIcon: { fontSize: 28, color: colors.white, fontWeight: "300" },
});
