import {
	Pressable,
	StyleSheet,
	Text,
	useWindowDimensions,
	View,
} from "react-native";
import { colors } from "../theme";
import type { CategoryHeatmapOption, HeatmapDataByCategory } from "../types";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOUR_LABELS = ["6a", "12p", "6p", "10p"];

type Props = {
	/** List of categories to choose from (e.g. activity categories). */
	categories: CategoryHeatmapOption[];
	/** Heatmap grid per category id: 7 rows × N columns, value 0..1 = likelihood. */
	heatmapByCategory: HeatmapDataByCategory;
	/** Currently selected category id. */
	selectedCategoryId: string;
	onSelectCategory: (categoryId: string) => void;
	columnCount?: number;
};

function intensityToColor(intensity: number): string {
	if (intensity <= 0) return colors.slate50;
	// Brown theme: primary #8B6914 -> 139, 105, 20
	const r = 139;
	const g = 105;
	const b = 20;
	const a = 0.2 + intensity * 0.5;
	return `rgba(${r},${g},${b},${a})`;
}

export function CategoryHeatmap({
	categories,
	heatmapByCategory,
	selectedCategoryId,
	onSelectCategory,
	columnCount = 12,
}: Props) {
	const { width: winW } = useWindowDimensions();
	const cellSize = Math.min(20, (Math.min(winW - 48, 320) - 36) / columnCount);
	const totalW = 28 + columnCount * cellSize;
	const data = heatmapByCategory[selectedCategoryId];
	const selectedLabel =
		categories.find((c) => c.id === selectedCategoryId)?.label ??
		selectedCategoryId;

	if (!data || data.length === 0) {
		return (
			<View style={styles.wrap}>
				<Text style={styles.noData}>
					Select a category to see likelihood by day & time
				</Text>
			</View>
		);
	}

	const rowCount = data.length;

	return (
		<View style={[styles.wrap, { width: totalW }]}>
			<Text style={styles.title}>Where you do this activity</Text>
			<View style={styles.pills}>
				{categories.map((cat) => (
					<Pressable
						key={cat.id}
						onPress={() => onSelectCategory(cat.id)}
						style={[
							styles.pill,
							selectedCategoryId === cat.id && styles.pillSelected,
						]}
					>
						<Text
							style={[
								styles.pillText,
								selectedCategoryId === cat.id && styles.pillTextSelected,
							]}
						>
							{cat.label}
						</Text>
					</Pressable>
				))}
			</View>
			<View style={styles.gridWrap}>
				<View style={[styles.dayLabels, { height: rowCount * cellSize }]}>
					{DAYS.slice(0, rowCount).map((d) => (
						<Text key={d} style={styles.dayLabel}>
							{d}
						</Text>
					))}
				</View>
				<View style={styles.grid}>
					{/* biome-ignore-start lint/suspicious/noArrayIndexKey: fixed grid */}
					{data.map((row: number[], i: number) => (
						<View key={`row-${i}`} style={styles.row}>
							{row.map((val: number, j: number) => (
								<View
									key={`cell-${i}-${j}`}
									style={[
										styles.cell,
										{
											width: cellSize,
											height: cellSize,
											backgroundColor: intensityToColor(val),
										},
									]}
								/>
							))}
						</View>
					))}
					{/* biome-ignore-end lint/suspicious/noArrayIndexKey: end */}
				</View>
			</View>
			<View style={styles.hourLabels}>
				{HOUR_LABELS.map((h) => (
					<Text key={h} style={styles.hourLabel}>
						{h}
					</Text>
				))}
			</View>
			<Text style={styles.caption}>
				Likelihood of “{selectedLabel}” by day & time (behavior model)
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: { alignSelf: "center", marginVertical: 8 },
	title: {
		fontSize: 12,
		fontWeight: "700",
		color: colors.slate700,
		marginBottom: 8,
		textAlign: "center",
	},
	pills: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "center",
		gap: 8,
		marginBottom: 12,
	},
	pill: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 9999,
		backgroundColor: colors.slate100,
	},
	pillSelected: { backgroundColor: colors.primary },
	pillText: { fontSize: 12, fontWeight: "600", color: colors.slate500 },
	pillTextSelected: { color: colors.white },
	gridWrap: { flexDirection: "row", alignItems: "center" },
	dayLabels: { width: 28, justifyContent: "space-evenly" },
	dayLabel: { fontSize: 9, fontWeight: "700", color: colors.slate500 },
	grid: {},
	row: { flexDirection: "row" },
	cell: {
		borderWidth: 0.5,
		borderColor: "rgba(255,255,255,0.6)",
		borderRadius: 1,
	},
	hourLabels: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 6,
		paddingHorizontal: 28,
	},
	hourLabel: { fontSize: 9, fontWeight: "600", color: colors.slate500 },
	caption: {
		fontSize: 10,
		color: colors.slate400,
		marginTop: 8,
		textAlign: "center",
	},
	noData: {
		fontSize: 12,
		color: colors.slate400,
		textAlign: "center",
		paddingVertical: 16,
	},
});
