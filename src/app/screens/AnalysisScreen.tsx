import { useState } from "react";
import {
	Pressable,
	SafeAreaView,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { ActivityBarRow } from "../components/ActivityBarRow";
import { BehaviorHeatmap } from "../components/BehaviorHeatmap";
import { GoalTimeRow } from "../components/GoalTimeRow";
import { IconButton } from "../components/IconButton";
import { PetriNetView } from "../components/PetriNetView";
import { ProgressCircle } from "../components/ProgressCircle";
import { SegmentedControl } from "../components/SegmentedControl";
import { ROUTES } from "../constants/routes";
import {
	sampleActivityBreakdown,
	sampleGoalTimeData,
	sampleHeatmapData,
	sampleMagicHours,
	samplePetriArcs,
	samplePetriPlaces,
	samplePetriTransitions,
} from "../data/sampleData";
import { colors } from "../theme";
import type {
	ActivityBreakdownItem,
	AppRoute,
	GoalTimeData,
	PetriNetArc,
	PetriNetPlace,
	PetriNetTransition,
} from "../types";

type Props = {
	onNavigate: (route: AppRoute) => void;
	/** Override activity breakdown (e.g. from DB). Omit to use sample data. */
	activityBreakdown?: ActivityBreakdownItem[];
	/** Override goal time data. Omit to use sample data. */
	goalTimeData?: GoalTimeData[];
	/** Override Petri net. Omit to use sample data. */
	petriPlaces?: PetriNetPlace[];
	petriTransitions?: PetriNetTransition[];
	petriArcs?: PetriNetArc[];
	/** Override heatmap (7×12). Omit to use sample data. */
	heatmapData?: number[][];
};

export function AnalysisScreen({
	onNavigate,
	activityBreakdown = sampleActivityBreakdown,
	goalTimeData = sampleGoalTimeData,
	petriPlaces = samplePetriPlaces,
	petriTransitions = samplePetriTransitions,
	petriArcs = samplePetriArcs,
	heatmapData = sampleHeatmapData,
}: Props) {
	const [timeframe, setTimeframe] = useState("Week");
	const magicHours = sampleMagicHours;

	return (
		<SafeAreaView style={styles.safe}>
			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
			>
				{/* Sticky header */}
				<View style={styles.header}>
					<View style={styles.headerRow}>
						<View style={styles.avatar} />
						<View style={styles.navPills}>
							<Pressable
								onPress={() => onNavigate(ROUTES.HOME)}
								style={styles.pill}
							>
								<Text style={styles.pillIcon}>🏠</Text>
							</Pressable>
							<View style={[styles.pill, styles.pillActive]}>
								<Text style={[styles.pillIcon, styles.pillIconActive]}>📊</Text>
								<Text style={styles.pillLabel}>Analytics</Text>
							</View>
							<Pressable style={styles.pill}>
								<Text style={styles.pillIcon}>📅</Text>
							</Pressable>
						</View>
						<IconButton icon="celebration" style={styles.celebBtn} />
					</View>
					<Text style={styles.headerLabel}>Insights Dashboard</Text>
					<Text style={styles.headerTitle}>Where your time goes</Text>
				</View>

				{/* Score card */}
				<View style={styles.section}>
					<View style={styles.scoreCard}>
						<View style={styles.scoreCardGlow} />
						<View style={styles.scoreRow}>
							<View style={styles.scoreCircleWrap}>
								<ProgressCircle
									percentage={85}
									size={96}
									strokeWidth={10}
									color={colors.mintDark}
									trackColor="rgba(255,255,255,0.4)"
									showLabel={false}
								/>
								<View style={styles.scoreCircleLabel}>
									<Text style={styles.scoreCircleValue}>85</Text>
									<Text style={styles.scoreCircleSub}>Yay!</Text>
								</View>
							</View>
							<View style={styles.scoreText}>
								<Text style={styles.scoreTitle}>You're doing amazing!</Text>
								<Text style={styles.scoreSubtitle}>
									Your productivity score is higher than 80% of your typical
									Mondays. Keep that spark! 🌟
								</Text>
							</View>
						</View>
					</View>
				</View>

				{/* Two stat cards */}
				<View style={styles.statsRow}>
					<View style={[styles.statCard, styles.statPeach]}>
						<Text style={styles.statIcon}>❤</Text>
						<Text style={styles.statValue}>92%</Text>
						<Text style={styles.statLabel}>Focus</Text>
					</View>
					<View style={[styles.statCard, styles.statLavender]}>
						<Text style={styles.statIconLavender}>🕐</Text>
						<Text style={styles.statValue}>6h 20m</Text>
						<Text style={styles.statLabel}>Flow Time</Text>
					</View>
				</View>

				{/* Day / Week / Month */}
				<View style={styles.segmentWrap}>
					<SegmentedControl
						options={["Day", "Week", "Month"]}
						selected={timeframe}
						onSelect={setTimeframe}
					/>
				</View>

				{/* Activity Breakdown */}
				<View style={styles.section}>
					<View style={styles.breakdownHeader}>
						<Text style={styles.breakdownTitle}>Activity Breakdown</Text>
						<View style={styles.breakdownBadge}>
							<Text style={styles.breakdownBadgeText}>+12% productivity</Text>
						</View>
					</View>
					<View style={styles.breakdownCard}>
						{activityBreakdown.map((a) => (
							<ActivityBarRow
								key={a.label}
								label={a.label}
								value={a.value}
								color={a.color}
								percent={a.percent}
							/>
						))}
					</View>
				</View>

				{/* Time per goal + projected time */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Time per goal & projected</Text>
					<View style={styles.breakdownCard}>
						{goalTimeData.map((g, i) => (
							<GoalTimeRow
								key={g.id}
								goal={g}
								last={i === goalTimeData.length - 1}
							/>
						))}
					</View>
				</View>

				{/* Petri Net – behavior model */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Behavior model (Petri Net)</Text>
					<View style={styles.breakdownCard}>
						<PetriNetView
							places={petriPlaces}
							transitions={petriTransitions}
							arcs={petriArcs}
							width={320}
							height={200}
						/>
					</View>
				</View>

				{/* Behavior heatmap */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Behavior heatmap</Text>
					<View style={styles.breakdownCard}>
						<BehaviorHeatmap data={heatmapData} columnCount={12} />
					</View>
				</View>

				{/* Magic Hours */}
				<View style={styles.section}>
					<Text style={styles.magicTitle}>Your "Magic Hours" 🪄</Text>
					<View style={styles.magicCard}>
						<View style={styles.magicGrid}>
							{/* biome-ignore-start lint/suspicious/noArrayIndexKey: fixed 12 time slots */}
							{magicHours.map((opacity, i) => (
								<View
									key={`magic-${i}`}
									style={[
										styles.magicBar,
										{
											backgroundColor: `rgba(93, 186, 149, ${opacity})`,
											borderColor: "#fff",
										},
									]}
								/>
							))}
							{/* biome-ignore-end lint/suspicious/noArrayIndexKey: end */}
						</View>
						<View style={styles.magicLabels}>
							<Text style={styles.magicLabelText}>Morning</Text>
							<Text style={styles.magicLabelText}>Afternoon</Text>
							<Text style={styles.magicLabelText}>Night</Text>
						</View>
						<View style={styles.tipRow}>
							<Text style={styles.tipIcon}>💡</Text>
							<Text style={styles.tipText}>
								You're a morning lark! Most of your tasks get finished before
								lunch. 🥐
							</Text>
						</View>
					</View>
				</View>

				{/* Bottom tip card */}
				<View style={styles.section}>
					<View style={styles.finalTipCard}>
						<View style={styles.finalTipBadge}>
							<Text style={styles.finalTipBadgeIcon}>✨</Text>
						</View>
						<Text style={styles.finalTipTitle}>A little tip for you...</Text>
						<Text style={styles.finalTipBody}>
							You complete tasks{" "}
							<Text style={styles.finalTipBold}>20% more consistently</Text> in
							the late morning. Try scheduling your biggest goals before 11:30
							AM tomorrow for that extra feeling of success! ✨
						</Text>
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: colors.background },
	scroll: { flex: 1 },
	scrollContent: { paddingBottom: 48 },
	header: {
		paddingHorizontal: 24,
		paddingTop: 16,
		paddingBottom: 8,
		backgroundColor: "rgba(253, 255, 255, 0.8)",
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 16,
	},
	avatar: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: colors.mint,
		borderWidth: 4,
		borderColor: colors.mint,
	},
	navPills: {
		flexDirection: "row",
		alignItems: "center",
		gap: 24,
		backgroundColor: "rgba(241, 245, 249, 0.5)",
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 9999,
	},
	pill: { flexDirection: "row", alignItems: "center", gap: 4 },
	pillActive: {},
	pillIcon: { fontSize: 20, color: colors.slate400 },
	pillIconActive: { color: colors.mintDark },
	pillLabel: {
		fontSize: 10,
		fontWeight: "700",
		textTransform: "uppercase",
		color: colors.mintDark,
	},
	celebBtn: { backgroundColor: colors.lavender },
	headerLabel: {
		fontSize: 10,
		fontWeight: "700",
		color: colors.slate400,
		letterSpacing: 2,
		textTransform: "uppercase",
		marginBottom: 4,
	},
	headerTitle: { fontSize: 24, fontWeight: "700", color: colors.slate800 },
	section: { paddingHorizontal: 24, marginTop: 16 },
	scoreCard: {
		borderRadius: 24,
		padding: 24,
		overflow: "hidden",
		borderWidth: 1,
		borderColor: colors.white,
		backgroundColor: colors.mint,
		position: "relative",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.04,
		shadowRadius: 30,
		elevation: 4,
	},
	scoreCardGlow: {
		position: "absolute",
		right: -24,
		top: -24,
		width: 128,
		height: 128,
		borderRadius: 64,
		backgroundColor: "rgba(255,255,255,0.3)",
	},
	scoreRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 16,
		zIndex: 1,
	},
	scoreCircleWrap: { position: "relative", width: 96, height: 96 },
	scoreCircleLabel: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		alignItems: "center",
		justifyContent: "center",
	},
	scoreCircleValue: { fontSize: 24, fontWeight: "700", color: colors.slate800 },
	scoreCircleSub: {
		fontSize: 10,
		fontWeight: "700",
		color: colors.slate500,
		textTransform: "uppercase",
		marginTop: 2,
	},
	scoreText: { flex: 1 },
	scoreTitle: { fontSize: 18, fontWeight: "700", color: colors.slate800 },
	scoreSubtitle: { fontSize: 14, color: colors.slate600, marginTop: 4 },
	statsRow: {
		flexDirection: "row",
		gap: 16,
		paddingHorizontal: 24,
		marginTop: 16,
	},
	statCard: {
		flex: 1,
		alignItems: "center",
		padding: 16,
		borderRadius: 24,
		borderWidth: 1,
		borderColor: colors.white,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.04,
		shadowRadius: 30,
		elevation: 4,
	},
	statPeach: { backgroundColor: colors.peach },
	statLavender: { backgroundColor: colors.lavender },
	statIcon: { marginBottom: 4, fontSize: 24 },
	statIconLavender: { marginBottom: 4, fontSize: 24 },
	statValue: { fontSize: 18, fontWeight: "700", color: colors.slate800 },
	statLabel: {
		fontSize: 11,
		fontWeight: "700",
		color: colors.slate500,
		textTransform: "uppercase",
		letterSpacing: 1,
		marginTop: 4,
	},
	segmentWrap: { paddingHorizontal: 24, paddingVertical: 8, marginTop: 8 },
	breakdownHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 16,
		paddingHorizontal: 4,
	},
	breakdownTitle: { fontSize: 18, fontWeight: "700", color: colors.slate800 },
	breakdownBadge: {
		backgroundColor: colors.mint,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 9999,
	},
	breakdownBadgeText: {
		fontSize: 12,
		fontWeight: "700",
		color: colors.mintDark,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "700",
		color: colors.slate800,
		marginBottom: 16,
		paddingHorizontal: 4,
	},
	breakdownCard: {
		backgroundColor: colors.white,
		borderRadius: 32,
		padding: 24,
		borderWidth: 1,
		borderColor: colors.slate100,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.04,
		shadowRadius: 30,
		elevation: 4,
	},
	magicTitle: {
		fontSize: 18,
		fontWeight: "700",
		color: colors.slate800,
		marginBottom: 16,
		paddingHorizontal: 4,
	},
	magicCard: {
		backgroundColor: colors.slate50,
		borderRadius: 32,
		padding: 24,
		borderWidth: 1,
		borderColor: "rgba(226, 232, 240, 0.6)",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.04,
		shadowRadius: 30,
		elevation: 4,
	},
	magicGrid: {
		flexDirection: "row",
		gap: 8,
	},
	magicBar: {
		flex: 1,
		height: 32,
		borderRadius: 8,
		borderWidth: 1,
	},
	magicLabels: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 8,
		paddingHorizontal: 0,
	},
	magicLabelText: {
		fontSize: 11,
		fontWeight: "700",
		color: colors.slate500,
		letterSpacing: 1,
	},
	tipRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 12,
		marginTop: 20,
		padding: 12,
		backgroundColor: colors.white,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: colors.slate100,
	},
	tipIcon: { fontSize: 18 },
	tipText: { flex: 1, fontSize: 12, color: colors.slate600, fontWeight: "500" },
	finalTipCard: {
		backgroundColor: colors.softPink,
		borderRadius: 40,
		padding: 28,
		borderWidth: 1,
		borderColor: colors.white,
		position: "relative",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.04,
		shadowRadius: 30,
		elevation: 4,
	},
	finalTipBadge: {
		position: "absolute",
		left: -8,
		top: -8,
		transform: [{ rotate: "12deg" }],
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: colors.white,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		borderColor: colors.softPink,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 2,
	},
	finalTipBadgeIcon: { fontSize: 20 },
	finalTipTitle: {
		fontSize: 16,
		fontWeight: "700",
		color: colors.softPinkDark,
		marginBottom: 8,
	},
	finalTipBody: {
		fontSize: 14,
		color: colors.slate700,
		fontWeight: "500",
		lineHeight: 22,
	},
	finalTipBold: { fontWeight: "700", color: colors.softPinkDark },
});
