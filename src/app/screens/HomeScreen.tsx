import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconButton } from "../components/IconButton";
import { ProgressCircle } from "../components/ProgressCircle";
import { TaskRow } from "../components/TaskRow";
import { ROUTES } from "../constants/routes";
import { colors, spacing } from "../theme";

type Task = {
	id: string;
	title: string;
	subtitle: string;
	icon: string;
	iconBg: "marshmallow" | "primary" | "neutral";
	completed: boolean;
};

const initialTasks: Task[] = [
	{
		id: "1",
		title: "Morning Meditation",
		subtitle: "10 mins • Self-care",
		icon: "self_improvement",
		iconBg: "marshmallow",
		completed: true,
	},
	{
		id: "2",
		title: "Draft Project Proposal",
		subtitle: "2 hours • Work",
		icon: "edit_note",
		iconBg: "primary",
		completed: false,
	},
	{
		id: "3",
		title: "Water the plants",
		subtitle: "5 mins • Home",
		icon: "local_florist",
		iconBg: "neutral",
		completed: false,
	},
	{
		id: "4",
		title: "Evening Reflection",
		subtitle: "15 mins • Journaling",
		icon: "book_2",
		iconBg: "marshmallow",
		completed: false,
	},
];

type Props = {
	onNavigate: (route: string) => void;
};

export function HomeScreen({ onNavigate }: Props) {
	const [tasks, setTasks] = useState(initialTasks);

	const completedCount = tasks.filter((t) => t.completed).length;
	const totalCount = tasks.length;
	const focusPercent = totalCount
		? Math.round((completedCount / totalCount) * 100)
		: 0;

	const toggleTask = (id: string) => {
		setTasks((prev) =>
			prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
		);
	};

	return (
		<SafeAreaView style={styles.safe}>
			<View style={styles.container}>
				{/* Top App Bar */}
				<View style={styles.header}>
					<View>
						<Text style={styles.date}>Monday, October 24</Text>
						<Text style={styles.greeting}>
							Good morning, <Text style={styles.name}>Sophie</Text>
						</Text>
					</View>
					<IconButton
						icon="settings"
						onPress={() => onNavigate(ROUTES.SETTINGS)}
					/>
				</View>

				{/* Daily Focus */}
				<View style={styles.section}>
					<View style={styles.focusCard}>
						<ProgressCircle percentage={focusPercent} />
						<View style={styles.focusText}>
							<Text style={styles.focusTitle}>Today's Focus</Text>
							<Text style={styles.focusSubtitle}>
								You've completed {completedCount} of {totalCount} tasks. Almost
								there!
							</Text>
						</View>
					</View>
				</View>

				{/* Tasks */}
				<ScrollView
					style={styles.scroll}
					contentContainerStyle={styles.scrollContent}
				>
					<View style={styles.tasksSection}>
						<View style={styles.tasksHeader}>
							<Text style={styles.sectionLabel}>Your Intentions</Text>
							<View style={styles.badge}>
								<Text style={styles.badgeText}>3 Priorities</Text>
							</View>
						</View>
						{tasks.map((task, i) => (
							<TaskRow
								key={task.id}
								task={task}
								onToggle={() => toggleTask(task.id)}
								last={i === tasks.length - 1}
							/>
						))}
					</View>

					<View style={styles.cloudDeco}>
						<Text style={styles.cloudIcon}>☁</Text>
					</View>
				</ScrollView>

				{/* FAB */}
				<View style={styles.fabWrap}>
					<Pressable
						style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
					>
						<Text style={styles.fabIcon}>+</Text>
					</Pressable>
				</View>

				{/* Bottom Nav */}
				<View style={styles.nav}>
					<Pressable onPress={() => {}} style={styles.navBtn}>
						<Text style={[styles.navIcon, styles.navIconActive]}>🏠</Text>
					</Pressable>
					<Pressable
						onPress={() => onNavigate(ROUTES.SCHEDULE)}
						style={styles.navBtn}
					>
						<Text style={styles.navIcon}>📅</Text>
					</Pressable>
					<Pressable
						onPress={() => onNavigate(ROUTES.ANALYSIS)}
						style={styles.navBtn}
					>
						<Text style={styles.navIcon}>📊</Text>
					</Pressable>
					<Pressable onPress={() => {}} style={styles.navBtn}>
						<Text style={styles.navIcon}>👤</Text>
					</Pressable>
				</View>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: colors.backgroundLight },
	container: { flex: 1, maxWidth: 430, alignSelf: "center", width: "100%" },
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: spacing.xl,
		paddingVertical: spacing.xl,
	},
	date: {
		fontSize: 10,
		letterSpacing: 2,
		fontWeight: "300",
		color: colors.slate400,
		marginBottom: 4,
		textTransform: "uppercase",
	},
	greeting: { fontSize: 24, fontWeight: "200", color: colors.slate800 },
	name: { fontWeight: "400" },
	section: { paddingHorizontal: spacing.xl, marginBottom: spacing.section },
	focusCard: {
		flexDirection: "row",
		alignItems: "center",
		gap: 24,
		padding: spacing.xl,
		borderRadius: 24,
		backgroundColor: colors.white,
		borderWidth: 1,
		borderColor: colors.slate100,
	},
	focusText: { flex: 1 },
	focusTitle: { fontSize: 14, fontWeight: "500", color: colors.slate600 },
	focusSubtitle: {
		fontSize: 12,
		fontWeight: "300",
		color: colors.slate400,
		marginTop: 4,
	},
	scroll: { flex: 1 },
	scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: 100 },
	tasksSection: { marginBottom: spacing.lg },
	tasksHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: spacing.lg,
	},
	sectionLabel: {
		fontSize: 14,
		fontWeight: "300",
		letterSpacing: 4,
		color: colors.slate400,
		textTransform: "uppercase",
	},
	badge: {
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 9999,
		backgroundColor: "rgba(254, 226, 226, 0.5)",
	},
	badgeText: { fontSize: 10, fontWeight: "500", color: colors.red400 },
	cloudDeco: {
		alignItems: "center",
		paddingVertical: spacing.section,
		opacity: 0.2,
	},
	cloudIcon: { fontSize: 48, color: colors.slate400 },
	fabWrap: {
		position: "absolute",
		bottom: 96,
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
	nav: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: spacing.xxl,
		paddingVertical: spacing.xl,
		backgroundColor: "rgba(255,255,255,0.9)",
		borderTopWidth: 1,
		borderTopColor: colors.slate100,
	},
	navBtn: { padding: spacing.sm },
	navIcon: { fontSize: 24, color: colors.slate300 },
	navIconActive: { color: colors.primary },
});
