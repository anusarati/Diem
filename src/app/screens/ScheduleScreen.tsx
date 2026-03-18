import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Alert,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TimelineCanvas } from "../../features/timeline/TimelineCanvas";
import { useNotificationListener } from "../../services/notification/notification_listener";
import { requestNotificationPermission } from "../../services/notification/notification_permissions";
import { scheduleActivityNotifications } from "../../services/notification/notification_scheduler";
import type { ScheduledEventEntity } from "../../types/domain";
import {
	ActivitySource,
	EventStatus,
	type Replaceability,
} from "../../types/domain";
import { ActivityActionMenu } from "../components/ActivityActionMenu";
import type { ExistingActivityOption } from "../components/ActivityForm";
import { AddChoiceModal } from "../components/AddChoiceModal";
import { MonthlyView } from "../components/MonthlyView";
import { QuickAddSheet } from "../components/QuickAddSheet";
import { SegmentedControl } from "../components/SegmentedControl";
import type { TimeBlockProps } from "../components/TimeBlock";
import { WeeklyView } from "../components/WeeklyView";
import {
	GOOGLE_CALENDAR_REDIRECTING,
	getGoogleCalendarAccessToken,
	getGoogleCalendarRedirectUri,
} from "../data/googleCalendarAuth";
import { importFromIcs, parseIcsContent } from "../data/icsImport";
import {
	addScheduledActivity,
	clearAllCalendarEvents,
	getScheduledActivitiesForDate,
	getScheduledActivitiesForMonth,
	getScheduledActivitiesForWeek,
	importGoogleCalendar,
	removeScheduledActivity,
	updateScheduledActivity,
} from "../data/services";
// import { initNotificationService } from "../../services/notification/notification_service"; // Moved to App.tsx
import { getAllScheduledActivities } from "../data/services/scheduleService";
import type { ActivityFormData } from "../hooks/useActivityValidation";
import { colors, spacing } from "../theme";
import type { AppRoute } from "../types";

const CATEGORY_COLORS: Record<string, string> = {
	Work: colors.primary,
	Study: colors.lavenderDark,
	Fitness: colors.mintDark,
	Personal: colors.peachDark,
	Other: colors.slate400,
};

function getColorForCategory(categoryId: string): string {
	return CATEGORY_COLORS[categoryId] || colors.primary;
}

function entityToTimeBlock(e: ScheduledEventEntity): TimeBlockProps {
	const start = new Date(e.startTime);
	const dayIndex = (start.getDay() + 6) % 7;
	const day = DAYS[dayIndex];
	const startTime = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;

	let type: TimeBlockProps["type"] = "fixed";
	if (e.status === "PREDICTED") {
		type = "predicted";
	} else if (e.replaceabilityStatus === "SOFT" || e.flexible) {
		type = "flexible";
	}

	return {
		id: e.id,
		title: e.title,
		startTime,
		durationMinutes: e.duration ?? e.durationMinutes ?? 60,
		type,
		day,
		categoryColor: getColorForCategory(e.categoryId),
		fullDate: e.startTime,
	};
}

type Props = {
	onNavigate: (route: AppRoute) => void;
};

const _INITIAL_ACTIVITIES: TimeBlockProps[] = [
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

const EXISTING_ACTIVITIES: ExistingActivityOption[] = [
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
	const [activities, setActivities] = useState<TimeBlockProps[]>([]);
	const [activitiesLoading, setActivitiesLoading] = useState(true);
	const [isAddChoiceOpen, setIsAddChoiceOpen] = useState(false);
	const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
	const [viewMode, setViewMode] = useState("Day"); // 'Day' | 'Week' | 'Month'
	const [initialTime, setInitialTime] = useState("");

	// Dynamic Date State
	const [currentDate, setCurrentDate] = useState(new Date());
	const mondayDate = useMemo(() => getMonday(currentDate), [currentDate]);
	const [selectedDay, setSelectedDay] = useState(() => {
		// Default to today's day label (e.g. 'Tue')
		const todayIndex = (new Date().getDay() + 6) % 7; // Shift 0=Sun to 6=Sun, 1=Mon to 0=Mon
		return DAYS[todayIndex];
	});

	const getSelectedDate = useCallback(() => {
		const dayIndex = DAYS.indexOf(selectedDay);
		const d = new Date(mondayDate);
		d.setDate(mondayDate.getDate() + dayIndex);
		return d;
	}, [mondayDate, selectedDay]);

	const loadActivitiesFromDb = useCallback(async () => {
		setActivitiesLoading(true);
		try {
			if (viewMode === "Week") {
				const list = await getScheduledActivitiesForWeek(mondayDate);
				setActivities(list.map(entityToTimeBlock));
			} else if (viewMode === "Month") {
				const list = await getScheduledActivitiesForMonth(currentDate);
				setActivities(list.map(entityToTimeBlock));
			} else {
				const selectedDate = getSelectedDate();
				const list = await getScheduledActivitiesForDate(selectedDate);
				setActivities(list.map(entityToTimeBlock));
			}
		} catch (error) {
			console.error("Error loading activities:", error);
		} finally {
			setActivitiesLoading(false);
			// After loading activities into UI, sync the OS notifications
			getAllScheduledActivities().then((allEvents) => {
				scheduleActivityNotifications(allEvents).catch((err) =>
					console.error("Failed to sync notifications:", err),
				);
			});
		}
	}, [viewMode, mondayDate, getSelectedDate, currentDate]);

	useEffect(() => {
		loadActivitiesFromDb();
	}, [loadActivitiesFromDb]);

	useEffect(() => {
		// Permissions are still requested here if needed, but service init is in App.tsx
		requestNotificationPermission().catch((err) =>
			console.error("Permission request failed:", err),
		);
	}, []);

	// Use notification listener for deep linking
	useNotificationListener({
		navigate: (screen: string, params?: unknown) => {
			// Basic wrapper to match navigation interface used in listener
			// You might need to bridge this to your actual navigation system
			console.log(`Deep linking to ${screen}`, params);
		},
	});

	// Calculate the displayed date string based on selectedDay
	const getDisplayedDate = () => {
		if (viewMode === "Month") {
			return currentDate.toLocaleDateString("en-US", {
				month: "long",
				year: "numeric",
			});
		}
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
	const [isClearingEvents, setIsClearingEvents] = useState(false);
	const icsFileInputRef = useRef<HTMLInputElement | null>(null);
	const runIcsImportRef = useRef<(content: string) => Promise<void>>(
		async () => {},
	);

	// On web: create hidden file input for .ics import
	useEffect(() => {
		if (Platform.OS !== "web" || typeof document === "undefined") return;
		const el = document.createElement("input");
		el.type = "file";
		el.accept = ".ics,text/calendar";
		el.style.display = "none";
		el.addEventListener("change", () => {
			const file = el.files?.[0];
			if (!file) return;
			file.text().then((content: string) => {
				runIcsImportRef.current?.(content);
				el.value = "";
			});
		});
		document.body.appendChild(el);
		(
			icsFileInputRef as React.MutableRefObject<HTMLInputElement | null>
		).current = el;
		return () => {
			el.remove();
			(
				icsFileInputRef as React.MutableRefObject<HTMLInputElement | null>
			).current = null;
		};
	}, []);

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
	const _getColorForPriority = (
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

	const handleAddOrEditActivity = async (activityData: ActivityFormData) => {
		const selectedDate = getSelectedDate();
		const [hours, minutes] = (activityData.startTime || initialTime || "09:00")
			.split(":")
			.map(Number);

		const start = new Date(selectedDate);
		start.setHours(hours, minutes, 0, 0);

		const end = new Date(start);
		end.setMinutes(end.getMinutes() + (activityData.duration || 60));

		try {
			if (editingActivity) {
				await updateScheduledActivity(editingActivity.id, {
					title: activityData.title,
					startTime: start.toISOString(),
					endTime: end.toISOString(),
					duration: activityData.duration,
					replaceabilityStatus:
						activityData.replaceabilityStatus as Replaceability,
					priority:
						activityData.priority === "high"
							? 3
							: activityData.priority === "medium"
								? 2
								: 1,
					updatedAt: new Date().toISOString(),
				});
				setEditingActivity(null);
			} else {
				await addScheduledActivity({
					activityId: `act_${Date.now()}`,
					categoryId: activityData.category || "Other",
					title: activityData.title,
					startTime: start.toISOString(),
					endTime: end.toISOString(),
					duration: activityData.duration || 60,
					status: EventStatus.CONFIRMED,
					replaceabilityStatus:
						activityData.replaceabilityStatus as Replaceability,
					priority:
						activityData.priority === "high"
							? 3
							: activityData.priority === "medium"
								? 2
								: 1,
					isRecurring: activityData.isRecurring,
					source: ActivitySource.USER_CREATED,
					isLocked: false,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					date: start.toISOString().split("T")[0],
				});
			}
			await loadActivitiesFromDb();
		} catch (error) {
			console.error("Failed to save activity:", error);
			Alert.alert("Error", "Failed to save activity to database.");
		}
	};

	const deleteActivity = async () => {
		if (selectedActivityId) {
			try {
				await removeScheduledActivity(selectedActivityId);
				setMenuVisible(false);
				setSelectedActivityId(null);
				await loadActivitiesFromDb();
			} catch (error) {
				console.error("Failed to delete activity:", error);
				Alert.alert("Error", "Failed to delete activity.");
			}
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
				priority: activity.priority,
			});
			setMenuVisible(false);
			setInitialTime(activity.startTime);
			setIsQuickAddOpen(true);
		}
	};

	const handleDoublePress = (time: string) => {
		setInitialTime(time);
		setEditingActivity(null);
		setIsQuickAddOpen(true);
	};

	const handleActivityDoublePress = (id: string) => {
		setSelectedActivityId(id);
		const activity = activities.find((a) => a.id === id);
		if (activity) {
			setEditingActivity({
				id: activity.id,
				title: activity.title,
				startTime: activity.startTime,
				duration: activity.durationMinutes,
				type: activity.type,
				priority: activity.priority,
			});
			setMenuVisible(false);
			setInitialTime(activity.startTime);
			setIsQuickAddOpen(true);
		}
	};

	const handleActivityPress = (id: string) => {
		setSelectedActivityId(id);
		setMenuVisible(true);
	};

	const handleUpdateTime = async (id: string, newStartTime: string) => {
		const activity = activities.find((a) => a.id === id);
		if (!activity) return;

		const selectedDate = getSelectedDate();
		const [hours, minutes] = newStartTime.split(":").map(Number);
		const start = new Date(selectedDate);
		start.setHours(hours, minutes, 0, 0);

		const end = new Date(start);
		end.setMinutes(end.getMinutes() + activity.durationMinutes);

		try {
			await updateScheduledActivity(id, {
				startTime: start.toISOString(),
				endTime: end.toISOString(),
			});
			await loadActivitiesFromDb();
		} catch (error) {
			console.error("Failed to update activity time:", error);
		}
	};

	const handleWeeklyUpdate = async (
		id: string,
		day: string,
		newStartTime: string,
	) => {
		const activity = activities.find((a) => a.id === id);
		if (!activity) return;

		const dayIndex = DAYS.indexOf(day);
		const targetDate = new Date(mondayDate);
		targetDate.setDate(mondayDate.getDate() + dayIndex);

		const [hours, minutes] = newStartTime.split(":").map(Number);
		targetDate.setHours(hours, minutes, 0, 0);

		const end = new Date(targetDate);
		end.setMinutes(end.getMinutes() + activity.durationMinutes);

		try {
			await updateScheduledActivity(id, {
				startTime: targetDate.toISOString(),
				endTime: end.toISOString(),
			});
			await loadActivitiesFromDb();
		} catch (error) {
			console.error("Failed to update weekly activity:", error);
		}
	};

	const handleSheetClose = () => {
		setIsQuickAddOpen(false);
		setEditingActivity(null);
	};

	const handleImportGoogleCalendar = async () => {
		setIsAddChoiceOpen(false);
		const token = await getGoogleCalendarAccessToken();
		if (token === GOOGLE_CALENDAR_REDIRECTING) return;
		if (!token) {
			const redirectUri = await getGoogleCalendarRedirectUri();
			Alert.alert(
				"Google Sign-In",
				`請設定 EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID，並在 Google Console 的 OAuth 用戶端加入此 Redirect URI：\n\n${redirectUri}`,
			);
			return;
		}
		const timeMin = new Date();
		timeMin.setDate(timeMin.getDate() - 30);
		const timeMax = new Date();
		timeMax.setDate(timeMax.getDate() + 90);
		try {
			const result = await importGoogleCalendar(token, { timeMin, timeMax });
			setViewMode("Week");
			Alert.alert(
				"Import complete",
				result.imported > 0
					? `Imported ${result.imported} events. Switched to Week view.${result.skipped ? ` Skipped ${result.skipped} (already added).` : ""}${result.cancelled ? ` ${result.cancelled} cancelled.` : ""}`
					: `No new events in range.${result.skipped ? ` ${result.skipped} already in calendar.` : ""}${result.cancelled ? ` ${result.cancelled} cancelled.` : ""} Try Week view to see existing events.`,
			);
		} catch (e) {
			Alert.alert("Import failed", e instanceof Error ? e.message : String(e));
		}
	};

	runIcsImportRef.current = async (content: string) => {
		try {
			const parsed = parseIcsContent(content);
			const result = await importFromIcs(parsed);
			setViewMode("Week");
			await loadActivitiesFromDb();
			Alert.alert(
				"Import complete",
				result.imported > 0
					? `Imported ${result.imported} events from .ics.${result.skipped ? ` Skipped ${result.skipped} (already added).` : ""}${result.cancelled ? ` ${result.cancelled} cancelled.` : ""}`
					: `No new events.${result.skipped ? ` ${result.skipped} already in calendar.` : ""}${result.cancelled ? ` ${result.cancelled} cancelled.` : ""}`,
			);
		} catch (e) {
			Alert.alert("Import failed", e instanceof Error ? e.message : String(e));
		}
	};

	const handleImportIcsFile = useCallback(() => {
		setIsAddChoiceOpen(false);
		if (Platform.OS === "web") {
			(
				icsFileInputRef as React.MutableRefObject<HTMLInputElement | null>
			).current?.click();
			return;
		}
		// Native: use expo-document-picker + expo-file-system
		(async () => {
			try {
				const DocumentPicker = (await import("expo-document-picker")).default;
				const FileSystem = await import("expo-file-system/legacy");
				const result = await DocumentPicker.getDocumentAsync({
					type: ["text/calendar", "application/octet-stream"],
					copyToCacheDirectory: true,
				});
				if (result.canceled || !result.assets?.[0]?.uri) return;
				const content = await FileSystem.readAsStringAsync(
					result.assets[0].uri,
					{ encoding: FileSystem.EncodingType.UTF8 },
				);
				await runIcsImportRef.current?.(content);
			} catch (e) {
				Alert.alert(
					"Import failed",
					e instanceof Error ? e.message : String(e),
				);
			}
		})();
	}, []);

	const currentDayActivities = activities.filter(
		(a) => (a.day || "Mon") === selectedDay,
	);

	const selectedActivityTitle =
		activities.find((a) => a.id === selectedActivityId)?.title || "Activity";

	return (
		<SafeAreaView style={styles.safe}>
			<View style={styles.mainContainer}>
				<View style={styles.header}>
					<View style={styles.headerTop}>
						<View>
							<Text style={styles.headerTitle}>Schedule</Text>
							<Text style={styles.date}>{getDisplayedDate()}</Text>
						</View>
						<View style={{ flexDirection: "row", alignItems: "center" }}>
							<Pressable
								onPress={async () => {
									console.log("[Notification] Manual test button pressed");
									const { scheduleNotification } = await import(
										"../../services/notification/notification_service"
									);
									await scheduleNotification(
										"Diem Test",
										"This is an interactive test. Long-press me!",
										new Date(Date.now() + 5000), // 5 seconds from now
										{
											type: "ACTIVITY_START_INQUIRY",
											activityId: "test_id",
											category: "ACTIVITY_INQUIRY",
										},
									);
									Alert.alert(
										"Scheduled",
										"Test notification will appear in 5 seconds. Please close the app or go home to see the banner!",
									);
								}}
								style={({ pressed }) => [
									{
										backgroundColor: colors.slate100,
										padding: 8,
										borderRadius: 8,
										marginRight: spacing.sm,
									},
									pressed && { opacity: 0.7 },
								]}
							>
								<Text style={{ fontSize: 12, color: colors.slate600 }}>
									Test Push
								</Text>
							</Pressable>
							{viewMode === "Month" && (
								<View style={{ flexDirection: "row", marginRight: spacing.md }}>
									<Pressable
										onPress={() => {
											const prev = new Date(currentDate);
											prev.setMonth(prev.getMonth() - 1);
											setCurrentDate(prev);
										}}
										style={{ padding: 8 }}
									>
										<Text style={{ fontSize: 20, color: colors.slate400 }}>
											{"<"}
										</Text>
									</Pressable>
									<Pressable
										onPress={() => {
											const next = new Date(currentDate);
											next.setMonth(next.getMonth() + 1);
											setCurrentDate(next);
										}}
										style={{ padding: 8 }}
									>
										<Text style={{ fontSize: 20, color: colors.slate400 }}>
											{">"}
										</Text>
									</Pressable>
								</View>
							)}
							<View style={{ width: 210 }}>
								<SegmentedControl
									options={["Day", "Week", "Month"]}
									selected={viewMode}
									onSelect={(val) => {
										setViewMode(val);
										// Reset to today when switching? Or keep current?
										// Let's keep current.
									}}
								/>
							</View>
						</View>
					</View>
					<Pressable
						style={({ pressed }) => [
							styles.clearAllBtn,
							isClearingEvents && styles.clearAllBtnDisabled,
							pressed && !isClearingEvents && styles.clearAllBtnPressed,
						]}
						onPress={() => {
							if (isClearingEvents) return;
							console.log("[ClearAll] Button pressed, showing confirm");
							const doClear = async () => {
								console.log("[ClearAll] User confirmed, starting clear");
								setIsClearingEvents(true);
								try {
									console.log("[ClearAll] Calling clearAllCalendarEvents()");
									const count = await clearAllCalendarEvents();
									console.log("[ClearAll] Deleted count:", count);
									await loadActivitiesFromDb();
									console.log("[ClearAll] Reloaded calendar");
									Alert.alert(
										"Done",
										`Removed ${count} event(s). The calendar is now empty.`,
									);
								} catch (e) {
									console.error("[ClearAll] Error:", e);
									Alert.alert(
										"Error",
										e instanceof Error ? e.message : String(e),
									);
								} finally {
									setIsClearingEvents(false);
								}
							};
							if (typeof window !== "undefined" && window.confirm) {
								const ok = window.confirm(
									"Remove ALL events from the calendar? This cannot be undone. (For testing.)",
								);
								if (ok) void doClear();
								else console.log("[ClearAll] User cancelled (confirm)");
							} else {
								Alert.alert(
									"Clear all events",
									"Remove ALL events from the calendar? This cannot be undone. (For testing.)",
									[
										{
											text: "Cancel",
											style: "cancel",
											onPress: () =>
												console.log("[ClearAll] User cancelled (alert)"),
										},
										{
											text: "Clear all",
											style: "destructive",
											onPress: () => void doClear(),
										},
									],
								);
							}
						}}
						disabled={isClearingEvents}
					>
						<Text style={styles.clearAllBtnLabel}>
							{isClearingEvents ? "Clearing…" : "Clear all events (test)"}
						</Text>
					</Pressable>
				</View>

				{activitiesLoading ? (
					<View style={styles.loadingWrap}>
						<Text style={styles.loadingText}>Loading schedule…</Text>
					</View>
				) : viewMode === "Day" ? (
					<TimelineCanvas
						activities={currentDayActivities}
						onActivityPress={handleActivityPress}
						onActivityDoublePress={handleActivityDoublePress}
						onUpdateActivity={handleUpdateTime}
						onEmptyDoublePress={handleDoublePress}
						showNowIndicator={
							selectedDay === DAYS[(new Date().getDay() + 6) % 7]
						}
					/>
				) : viewMode === "Week" ? (
					<WeeklyView
						activities={activities}
						onActivityPress={handleActivityPress}
						onActivityDoublePress={handleActivityDoublePress}
						weekStartDate={mondayDate}
						onUpdateActivity={handleWeeklyUpdate}
						onEmptyDoublePress={handleDoublePress}
						onDayPress={(dayIndex) => {
							const dayLabel = DAYS[dayIndex];
							setSelectedDay(dayLabel);
							setViewMode("Day");
						}}
					/>
				) : (
					<MonthlyView
						activities={activities}
						currentMonth={currentDate}
						onDayPress={(date) => {
							const dayIndex = (date.getDay() + 6) % 7;
							setSelectedDay(DAYS[dayIndex]);
							setCurrentDate(date);
							setViewMode("Day");
						}}
					/>
				)}

				<View style={styles.fabWrap}>
					<Pressable
						style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
						onPress={() => {
							setEditingActivity(null);
							setInitialTime("09:00");
							setIsAddChoiceOpen(true);
						}}
					>
						<Text style={styles.fabIcon}>+</Text>
					</Pressable>
				</View>

				<AddChoiceModal
					visible={isAddChoiceOpen}
					onClose={() => setIsAddChoiceOpen(false)}
					onQuickAdd={() => setIsQuickAddOpen(true)}
					onImportGoogleCalendar={handleImportGoogleCalendar}
					onImportIcsFile={handleImportIcsFile}
				/>

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
	clearAllBtn: {
		marginTop: spacing.md,
		alignSelf: "flex-start",
		paddingVertical: spacing.md,
		paddingHorizontal: spacing.lg,
		minHeight: 44,
		justifyContent: "center",
		backgroundColor: colors.white,
		borderWidth: 1.5,
		borderColor: colors.slate300,
		borderRadius: 12,
	},
	clearAllBtnPressed: { opacity: 0.85, backgroundColor: colors.slate100 },
	clearAllBtnDisabled: { opacity: 0.6 },
	clearAllBtnLabel: {
		fontSize: 15,
		fontWeight: "600",
		color: colors.slate700,
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
	loadingWrap: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: spacing.xl,
	},
	loadingText: { fontSize: 14, color: colors.slate500 },
});
