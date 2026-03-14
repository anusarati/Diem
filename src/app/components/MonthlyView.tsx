import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../theme";
import type { TimeBlockProps } from "./TimeBlock";

interface MonthlyViewProps {
	activities: TimeBlockProps[];
	currentMonth: Date; // A date within the month to show
	onDayPress?: (date: Date) => void;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthlyView({
	activities,
	currentMonth,
	onDayPress,
}: MonthlyViewProps) {
	const calendarDays = useMemo(() => {
		const year = currentMonth.getFullYear();
		const month = currentMonth.getMonth();

		// First day of target month
		const firstDay = new Date(year, month, 1);
		// Last day of target month
		const lastDay = new Date(year, month + 1, 0);

		// Number of days in target month
		const totalDays = lastDay.getDate();

		// Day of week of the first day (0=Sun, 1=Mon, ..., 6=Sat)
		// We want 0=Mon, ..., 6=Sun
		const firstDayOfWeek = (firstDay.getDay() + 6) % 7;

		const days = [];

		// Leading days from previous month
		const prevMonthLastDay = new Date(year, month, 0).getDate();
		for (let i = firstDayOfWeek - 1; i >= 0; i--) {
			days.push({
				date: new Date(year, month - 1, prevMonthLastDay - i),
				isCurrentMonth: false,
			});
		}

		// Days of the current month
		for (let i = 1; i <= totalDays; i++) {
			days.push({
				date: new Date(year, month, i),
				isCurrentMonth: true,
			});
		}

		// Trailing days for the next month to fill the grid (7 columns)
		const remaining = 42 - days.length; // 6 rows * 7 days
		for (let i = 1; i <= remaining; i++) {
			days.push({
				date: new Date(year, month + 1, i),
				isCurrentMonth: false,
			});
		}

		return days;
	}, [currentMonth]);

	// Group activities by date string (YYYY-MM-DD) for easier lookup
	const activitiesByDate = useMemo(() => {
		const map: Record<string, TimeBlockProps[]> = {};
		for (const activity of activities) {
			if (activity.fullDate) {
				const dateKey = activity.fullDate.split("T")[0];
				if (!map[dateKey]) map[dateKey] = [];
				map[dateKey].push(activity);
			}
		}
		return map;
	}, [activities]);

	return (
		<View style={styles.container}>
			<View style={styles.headerRow}>
				{DAYS.map((day) => (
					<View key={day} style={styles.dayHeaderCell}>
						<Text style={styles.dayHeaderText}>{day}</Text>
					</View>
				))}
			</View>
			<ScrollView contentContainerStyle={styles.grid}>
				{calendarDays.map((day, index) => {
					const dateKey = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, "0")}-${String(day.date.getDate()).padStart(2, "0")}`;
					const isToday = new Date().toDateString() === day.date.toDateString();
					const dayActivities = activitiesByDate[dateKey] || [];

					return (
						<Pressable
							key={dateKey}
							style={[
								styles.dayCell,
								!day.isCurrentMonth && styles.otherMonthDayCell,
							]}
							onPress={() => onDayPress?.(day.date)}
						>
							<View
								style={[
									styles.dayNumberContainer,
									isToday && styles.todayContainer,
								]}
							>
								<Text
									style={[
										styles.dayNumberText,
										!day.isCurrentMonth && styles.otherMonthDayText,
										isToday && styles.todayText,
									]}
								>
									{day.date.getDate()}
								</Text>
							</View>
							<View style={styles.eventsContainer}>
								{dayActivities.slice(0, 4).map((a, i) => (
									<View
										// biome-ignore lint/suspicious/noArrayIndexKey: index is used for unique key with id
										key={`${a.id}-${i}`}
										style={[
											styles.eventDot,
											{ backgroundColor: a.categoryColor || colors.primary },
										]}
									/>
								))}
								{dayActivities.length > 4 && (
									<Text style={styles.moreText}>
										+{dayActivities.length - 4}
									</Text>
								)}
							</View>
						</Pressable>
					);
				})}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.backgroundLight,
	},
	headerRow: {
		flexDirection: "row",
		borderBottomWidth: 1,
		borderBottomColor: colors.slate100,
		backgroundColor: colors.white,
	},
	dayHeaderCell: {
		flex: 1,
		alignItems: "center",
		paddingVertical: spacing.sm,
	},
	dayHeaderText: {
		fontSize: 12,
		fontWeight: "600",
		color: colors.slate500,
	},
	grid: {
		flexDirection: "row",
		flexWrap: "wrap",
		paddingBottom: spacing.xxl,
	},
	dayCell: {
		width: "14.28%", // 1/7th
		aspectRatio: 0.8,
		borderRightWidth: 0.5,
		borderBottomWidth: 0.5,
		borderRightColor: colors.slate100,
		borderBottomColor: colors.slate100,
		padding: 4,
		backgroundColor: colors.white,
	},
	otherMonthDayCell: {
		backgroundColor: "rgba(241, 245, 249, 0.3)",
	},
	dayNumberContainer: {
		width: 20,
		height: 20,
		alignItems: "center",
		justifyContent: "center",
		alignSelf: "flex-end",
	},
	todayContainer: {
		backgroundColor: colors.primary,
		borderRadius: 10,
	},
	dayNumberText: {
		fontSize: 11,
		fontWeight: "600",
		color: colors.slate700,
	},
	otherMonthDayText: {
		color: colors.slate300,
	},
	todayText: {
		color: colors.white,
	},
	eventsContainer: {
		flex: 1,
		flexDirection: "row",
		flexWrap: "wrap",
		alignItems: "flex-end",
		justifyContent: "flex-start",
		gap: 2,
		marginTop: 2,
	},
	eventDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
	},
	moreText: {
		fontSize: 8,
		color: colors.slate400,
		fontWeight: "600",
	},
});
