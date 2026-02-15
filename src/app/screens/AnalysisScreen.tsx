import { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	SafeAreaView,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { ActivityBarRow } from "../components/ActivityBarRow";
import { CategoryHeatmap } from "../components/CategoryHeatmap";
import { CausalNetView } from "../components/CausalNetView";
import { GoalTimeRow } from "../components/GoalTimeRow";
import { ProgressCircle } from "../components/ProgressCircle";
import { SegmentedControl } from "../components/SegmentedControl";
import { loadAnalyticsData } from "../data/analyticsData";
import { colors } from "../theme";
import type {
	ActivityBreakdownItem,
	AppRoute,
	CategoryHeatmapOption,
	CausalNetEdge,
	CausalNetNode,
	GoalTimeData,
	HeatmapDataByCategory,
} from "../types";

type Props = {
	onNavigate: (route: AppRoute) => void;
};

type Timeframe = "Day" | "Week" | "Month";

export function AnalysisScreen({ onNavigate }: Props) {
	const [timeframe, setTimeframe] = useState<Timeframe>("Week");
	const [selectedHeatmapCategoryId, setSelectedHeatmapCategoryId] = useState("Work");
	const [loading, setLoading] = useState(true);
	const [activityBreakdown, setActivityBreakdown] = useState<ActivityBreakdownItem[]>([]);
	const [goalTimeData, setGoalTimeData] = useState<GoalTimeData[]>([]);
	const [causalNetNodes, setCausalNetNodes] = useState<CausalNetNode[]>([]);
	const [causalNetEdges, setCausalNetEdges] = useState<CausalNetEdge[]>([]);
	const [heatmapCategories, setHeatmapCategories] = useState<CategoryHeatmapOption[]>([]);
	const [heatmapByCategory, setHeatmapByCategory] = useState<HeatmapDataByCategory>({});
	const [magicHours, setMagicHours] = useState<number[]>([]);
	const [magicHoursDescription, setMagicHoursDescription] = useState("");
	const [score, setScore] = useState(0);
	const [scoreMessage, setScoreMessage] = useState("");
	const [scoreSub, setScoreSub] = useState("");
	const [focusPercent, setFocusPercent] = useState(0);
	const [flowMinutes, setFlowMinutes] = useState(0);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const data = await loadAnalyticsData(timeframe);
			setActivityBreakdown(data.activityBreakdown);
			setGoalTimeData(data.goalTimeData);
			setCausalNetNodes(data.causalNetNodes);
			setCausalNetEdges(data.causalNetEdges);
			setHeatmapCategories(data.heatmapCategories);
			setHeatmapByCategory(data.heatmapByCategory);
			setMagicHours(data.magicHours);
			setMagicHoursDescription(data.magicHoursDescription ?? "");
			setScore(data.score);
			setScoreMessage(data.scoreMessage);
			setScoreSub(data.scoreSub);
			setFocusPercent(data.focusPercent);
			setFlowMinutes(data.flowMinutes);
			if (data.heatmapCategories[0]) {
				setSelectedHeatmapCategoryId((prev) =>
					data.heatmapCategories.some((c) => c.id === prev) ? prev : data.heatmapCategories[0].id,
				);
			}
		} finally {
			setLoading(false);
		}
	}, [timeframe]);

	useEffect(() => {
		load();
	}, [load]);

	const flowLabel =
		flowMinutes < 60 ? `${flowMinutes}m` : `${Math.floor(flowMinutes / 60)}h ${flowMinutes % 60}m`;

	if (loading) {
		return (
			<SafeAreaView style={styles.safe}>
				<View style={styles.header}>
					<Text style={styles.headerLabel}>Analytics</Text>
					<Text style={styles.headerTitle}>Where your time goes</Text>
				</View>
				<View style={styles.loadingWrap}>
					<ActivityIndicator size="large" color={colors.primary} />
					<Text style={styles.loadingText}>Loading…</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.safe}>
			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
			>
				<View style={styles.header}>
					<Text style={styles.headerLabel}>Analytics</Text>
					<Text style={styles.headerTitle}>Where your time goes</Text>
				</View>

				{/* Day / Week / Month */}
				<View style={styles.segmentWrap}>
					<SegmentedControl
						options={["Day", "Week", "Month"]}
						selected={timeframe}
						onSelect={(v) => setTimeframe(v as Timeframe)}
					/>
				</View>

				{/* Score card */}
				<View style={styles.section}>
					<View style={styles.scoreCard}>
						<View style={styles.scoreCardGlow} />
						<View style={styles.scoreRow}>
							<View style={styles.scoreCircleWrap}>
								<ProgressCircle
									percentage={score}
									size={96}
									strokeWidth={10}
									color={colors.primary}
									trackColor="rgba(255,255,255,0.4)"
									showLabel={false}
								/>
								<View style={styles.scoreCircleLabel}>
									<Text style={styles.scoreCircleValue}>{score}</Text>
									<Text style={styles.scoreCircleSub}>
										{score >= 80 ? "Yay!" : score >= 60 ? "OK" : "—"}
									</Text>
								</View>
							</View>
							<View style={styles.scoreText}>
								<Text style={styles.scoreTitle}>{scoreMessage}</Text>
								<Text style={styles.scoreSubtitle}>{scoreSub}</Text>
							</View>
						</View>
					</View>
				</View>

				<View style={styles.statsRow}>
					<View style={[styles.statCard, styles.statPeach]}>
						<Text style={styles.statValue}>{focusPercent}%</Text>
						<Text style={styles.statLabel}>Focus</Text>
						<Text style={styles.statHint}>Tasks you completed</Text>
					</View>
					<View style={[styles.statCard, styles.statLavender]}>
						<Text style={styles.statValue}>{flowLabel}</Text>
						<Text style={styles.statLabel}>Flow time</Text>
						<Text style={styles.statHint}>Scheduled blocks</Text>
					</View>
				</View>

				{/* Activity Breakdown */}
				<View style={styles.section}>
					<View style={styles.breakdownHeader}>
						<Text style={styles.breakdownTitle}>Activity Breakdown</Text>
						{activityBreakdown.some((a) => a.label !== "No data") && (
							<View style={styles.breakdownBadge}>
								<Text style={styles.breakdownBadgeText}>From your schedule</Text>
							</View>
						)}
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
					<Text style={styles.goalHint}>
						Done = time you logged when marking tasks done. Target = planned time (scheduled duration). Projected = extrapolated to end of period.
					</Text>
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

				{/* Causal net – scheduling model (activities + causal links) */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Scheduling model (Causal net)</Text>
					<View style={styles.breakdownCard}>
						<CausalNetView
							nodes={causalNetNodes}
							edges={causalNetEdges}
							width={320}
							height={220}
						/>
					</View>
				</View>

				{/* Per-category likelihood: select category first */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Where you do an activity</Text>
					<View style={styles.breakdownCard}>
						<CategoryHeatmap
							categories={heatmapCategories}
							heatmapByCategory={heatmapByCategory}
							selectedCategoryId={selectedHeatmapCategoryId}
							onSelectCategory={setSelectedHeatmapCategoryId}
							columnCount={12}
						/>
					</View>
				</View>

				<View style={styles.section}>
					<Text style={styles.magicTitle}>Your magic hours</Text>
					<View style={styles.magicCard}>
						<View style={styles.magicGrid}>
							{/* biome-ignore-start lint/suspicious/noArrayIndexKey: fixed 12 time slots */}
							{magicHours.map((opacity, i) => (
								<View
									key={`magic-${i}`}
									style={[
										styles.magicBar,
										{
											backgroundColor: `rgba(139, 105, 20, ${0.15 + opacity * 0.5})`,
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
							<Text style={styles.tipText}>
								{magicHoursDescription || "Add scheduled activities to see when you're most active."}
							</Text>
						</View>
					</View>
				</View>

				{/* Bottom tip card */}
				<View style={styles.section}>
					<View style={styles.finalTipCard}>
						<Text style={styles.finalTipTitle}>A little tip for you</Text>
						<Text style={styles.finalTipBody}>
							{focusPercent >= 80 ? (
								<>You're completing most of your tasks. Keep it up!</>
							) : (
								<>
									You complete activities{" "}
									<Text style={styles.finalTipBold}>{focusPercent}%</Text> of
									the time. Try blocking time in your schedule for top priorities.
								</>
							)}
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
		paddingBottom: 16,
		backgroundColor: colors.white,
		borderBottomWidth: 1,
		borderBottomColor: colors.slate100,
	},
	headerLabel: {
		fontSize: 10,
		fontWeight: "700",
		color: colors.slate400,
		letterSpacing: 2,
		textTransform: "uppercase",
		marginBottom: 4,
	},
	headerTitle: { fontSize: 24, fontWeight: "700", color: colors.slate800 },
	loadingWrap: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		gap: 12,
	},
	loadingText: { fontSize: 14, color: colors.slate500 },
	section: { paddingHorizontal: 24, marginTop: 16 },
	scoreCard: {
		borderRadius: 24,
		padding: 24,
		overflow: "hidden",
		borderWidth: 1,
		borderColor: colors.white,
		backgroundColor: colors.mint,
		position: "relative",
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
	},
	statPeach: { backgroundColor: colors.peach },
	statLavender: { backgroundColor: colors.lavender },
	statValue: { fontSize: 18, fontWeight: "700", color: colors.slate800 },
	statLabel: {
		fontSize: 11,
		fontWeight: "700",
		color: colors.slate500,
		textTransform: "uppercase",
		letterSpacing: 1,
		marginTop: 4,
	},
	statHint: {
		fontSize: 10,
		color: colors.slate400,
		marginTop: 2,
		textAlign: "center",
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
		color: colors.primary,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "700",
		color: colors.slate800,
		marginBottom: 8,
		paddingHorizontal: 4,
	},
	goalHint: {
		fontSize: 12,
		color: colors.slate500,
		marginBottom: 12,
		paddingHorizontal: 4,
	},
	breakdownCard: {
		backgroundColor: colors.white,
		borderRadius: 32,
		padding: 24,
		borderWidth: 1,
		borderColor: colors.slate100,
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
	tipText: { flex: 1, fontSize: 12, color: colors.slate600, fontWeight: "500" },
	finalTipCard: {
		backgroundColor: colors.softPink,
		borderRadius: 40,
		padding: 28,
		borderWidth: 1,
		borderColor: colors.white,
		position: "relative",
	},
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
