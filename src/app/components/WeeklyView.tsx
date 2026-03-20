import { useRef, useState } from "react";
import {
	Pressable,
	StyleSheet,
	Text,
	useWindowDimensions,
	View,
} from "react-native";
import {
	Gesture,
	GestureDetector,
	GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
	runOnJS,
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";
import { NowIndicator } from "../../features/timeline/components/NowIndicator";
import { colors } from "../theme";
import type { TimeBlockProps } from "./TimeBlock";

interface WeeklyViewProps {
	activities: TimeBlockProps[];
	startHour?: number;
	endHour?: number;
	onActivityPress?: (id: string) => void;
	onActivityDoublePress?: (id: string) => void;
	onDayPress?: (dayIndex: number) => void;
	onEmptyDoublePress?: (dayIndex: number, time: string) => void;
	weekStartDate?: Date;
	onUpdateActivity?: (id: string, day: string, newStartTime: string) => void;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOUR_HEIGHT = 80;
const TIME_COL_WIDTH = 50;
const MIN_COLUMN_WIDTH = 120;

interface DraggableWeeklyBlockProps extends Omit<TimeBlockProps, "onPress"> {
	startHour: number;
	endHour: number;
	columnWidth: SharedValue<number>;
	hourHeight: SharedValue<number>;
	onUpdate: (id: string, day: string, newStartTime: string) => void;
	onDragStateChange?: (isDragging: boolean) => void;
	onPress?: (id: string) => void;
	onDoublePress?: (id: string) => void;
}

function DraggableWeeklyBlock({
	columnWidth,
	hourHeight,
	startHour,
	endHour,
	onUpdate,
	onDragStateChange,
	onPress,
	onDoublePress,
	...props
}: DraggableWeeklyBlockProps) {
	const lastPressTime = useRef(0);
	const dragX = useSharedValue(0);
	const dragY = useSharedValue(0);
	const startDragX = useSharedValue(0);
	const startDragY = useSharedValue(0);

	const dayIndex = DAYS.indexOf(props.day || "Mon");
	const [hStr, mStr] = props.startTime.split(":") as [string, string];
	const originalMinFromStart =
		(parseInt(hStr || "0", 10) - startHour) * 60 + parseInt(mStr || "0", 10);

	const panGesture = Gesture.Pan()
		.onStart(() => {
			if (onDragStateChange) runOnJS(onDragStateChange)(true);
			startDragX.value = dragX.value;
			startDragY.value = dragY.value;
		})
		.onChange((e) => {
			dragX.value = startDragX.value + e.translationX;
			dragY.value = startDragY.value + e.translationY;
		})
		.onEnd(() => {
			const colShift = Math.round(dragX.value / columnWidth.value);
			let newDayIndex = dayIndex + colShift;
			newDayIndex = Math.max(0, Math.min(6, newDayIndex));
			const newDay = DAYS[newDayIndex] || "Mon";

			const pixelsPerMin = hourHeight.value / 60;
			const deltaMin = dragY.value / pixelsPerMin;
			let totalNewMin = originalMinFromStart + deltaMin;
			totalNewMin = Math.round(totalNewMin / 15) * 15;

			const maxMinutes = (endHour - startHour + 1) * 60 - props.durationMinutes;
			const clampedMinutes = Math.max(0, Math.min(maxMinutes, totalNewMin));

			const newH = Math.floor(clampedMinutes / 60) + startHour;
			const newM = clampedMinutes % 60;
			const newTime = `${newH.toString().padStart(2, "0")}:${newM.toString().padStart(2, "0")}`;

			const finalDeltaX = (newDayIndex - dayIndex) * columnWidth.value;
			const finalDeltaY =
				clampedMinutes * pixelsPerMin - originalMinFromStart * pixelsPerMin;

			dragX.value = withSpring(finalDeltaX);
			dragY.value = withSpring(finalDeltaY, {}, (isFinished) => {
				if (isFinished) {
					runOnJS(onUpdate)(props.id, newDay, newTime);
				}
			});

			if (onDragStateChange) runOnJS(onDragStateChange)(false);
		});

	const animatedStyle = useAnimatedStyle(() => {
		const top = (originalMinFromStart / 60) * hourHeight.value;
		const height = (props.durationMinutes / 60) * hourHeight.value;
		const left = dayIndex * columnWidth.value;

		return {
			position: "absolute",
			top: top + dragY.value,
			height: Math.max(height, 20),
			left: left + dragX.value,
			width: columnWidth.value - 4,
			zIndex: 20,
			opacity: 0.9,
			borderRadius: 4,
			backgroundColor:
				props.type === "predicted"
					? `${props.categoryColor || colors.primary}20`
					: props.categoryColor || colors.primary,
			borderWidth:
				props.type === "predicted" || props.type === "flexible" ? 2 : 0,
			borderStyle:
				props.type === "predicted"
					? "dotted"
					: props.type === "flexible"
						? "dashed"
						: "solid",
			borderColor:
				props.type === "predicted"
					? colors.slate600
					: props.type === "flexible"
						? "rgba(255,255,255,0.8)"
						: "transparent",
		};
	});

	const isPredicted = props.type === "predicted";

	return (
		<GestureDetector gesture={panGesture}>
			<Animated.View style={animatedStyle}>
				<Pressable
					onPress={() => {
						const now = Date.now();
						if (now - lastPressTime.current < 500) {
							onDoublePress?.(props.id);
						} else {
							onPress?.(props.id);
						}
						lastPressTime.current = now;
					}}
					style={{ flex: 1 }}
				>
					<Text
						style={{
							fontSize: 10,
							color: isPredicted ? colors.slate600 : "#fff",
							paddingHorizontal: 4,
							paddingVertical: 2,
						}}
						numberOfLines={1}
						adjustsFontSizeToFit
						minimumFontScale={0.6}
					>
						{props.title}
					</Text>
				</Pressable>
			</Animated.View>
		</GestureDetector>
	);
}

// Sub-components to satisfy React Rules of Hooks
function DayHeaderCell({
	index,
	day,
	weekStartDate,
	columnWidth,
	onDayPress,
}: {
	index: number;
	day: string;
	weekStartDate: Date;
	columnWidth: SharedValue<number>;
	onDayPress?: (index: number) => void;
}) {
	const date = new Date(weekStartDate);
	date.setDate(weekStartDate.getDate() + index);
	const dateString = date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});

	const animatedStyle = useAnimatedStyle(() => ({
		width: columnWidth.value,
	}));

	return (
		<Animated.View style={[styles.dayHeaderCell, animatedStyle]}>
			<Pressable
				onPress={() => onDayPress?.(index)}
				style={{
					alignItems: "center",
					justifyContent: "center",
					flex: 1,
				}}
			>
				<Text style={styles.dayHeader}>{day}</Text>
				<Text style={styles.dateHeader}>{dateString}</Text>
			</Pressable>
		</Animated.View>
	);
}

function TimeLabelItem({
	hour,
	startHour,
	hourHeight,
}: {
	hour: number;
	startHour: number;
	hourHeight: SharedValue<number>;
}) {
	const animatedStyle = useAnimatedStyle(() => ({
		top: (hour - startHour) * hourHeight.value,
	}));

	return (
		<Animated.Text style={[styles.timeLabel, animatedStyle]}>
			{hour === 0
				? "12 AM"
				: hour < 12
					? `${hour} AM`
					: hour === 12
						? "12 PM"
						: `${hour - 12} PM`}
		</Animated.Text>
	);
}

function GridCellItem({ hourHeight }: { hourHeight: SharedValue<number> }) {
	const animatedStyle = useAnimatedStyle(() => ({
		height: hourHeight.value,
	}));
	return <Animated.View style={[styles.gridCell, animatedStyle]} />;
}

function GridColumnItem({
	columnWidth,
	hours,
	hourHeight,
}: {
	columnWidth: SharedValue<number>;
	hours: number[];
	hourHeight: SharedValue<number>;
}) {
	const animatedStyle = useAnimatedStyle(() => ({
		width: columnWidth.value,
	}));

	return (
		<Animated.View style={[styles.dayColumnLine, animatedStyle]}>
			{hours.map((h) => (
				<GridCellItem key={h} hourHeight={hourHeight} />
			))}
		</Animated.View>
	);
}

export function WeeklyView({
	activities,
	startHour = 0,
	endHour = 23,
	onActivityPress,
	onActivityDoublePress,
	onDayPress,
	onEmptyDoublePress,
	weekStartDate = new Date(),
	onUpdateActivity,
}: WeeklyViewProps) {
	const hours = Array.from(
		{ length: endHour - startHour + 1 },
		(_, i) => startHour + i,
	);

	const { width: windowWidth } = useWindowDimensions();
	const weekViewWidth = Math.max(windowWidth - TIME_COL_WIDTH, 0);
	const initialColumnWidth = Math.max(weekViewWidth / 7, MIN_COLUMN_WIDTH);

	const hourHeight = useSharedValue(HOUR_HEIGHT);
	const columnWidth = useSharedValue(initialColumnWidth);

	const scrollX = useSharedValue(0);
	const scrollY = useSharedValue(0);
	const viewportWidth = useSharedValue(windowWidth);
	const viewportHeight = useSharedValue(600); // placeholder, updated onLayout

	const [_scrollingEnabled, setScrollingEnabled] = useState(true);

	// Pinch Gesture for Zooming
	const startHourHeight = useSharedValue(HOUR_HEIGHT);
	const startColumnWidth = useSharedValue(initialColumnWidth);

	const pinchGesture = Gesture.Pinch()
		.onStart(() => {
			startHourHeight.value = hourHeight.value;
			startColumnWidth.value = columnWidth.value;
		})
		.onChange((e) => {
			const prevWidth = columnWidth.value;
			const prevHeight = hourHeight.value;

			hourHeight.value = Math.max(
				40,
				Math.min(200, startHourHeight.value * e.scale),
			);
			const minAllowedColWidth = weekViewWidth / 7;
			columnWidth.value = Math.max(
				minAllowedColWidth,
				Math.min(300, startColumnWidth.value * e.scale),
			);

			// Calculate Focal Center Zoom Shifting
			const focalX = e.focalX - TIME_COL_WIDTH; // Focal relative to grid mesh
			const focalY = e.focalY - 40; // Focal relative to grid mesh

			const scaleRatioX = columnWidth.value / prevWidth;
			const scaleRatioY = hourHeight.value / prevHeight;

			// Shift scrolls so focal point remains steady onscreen
			scrollX.value += (focalX + scrollX.value) * (scaleRatioX - 1);
			scrollY.value += (focalY + scrollY.value) * (scaleRatioY - 1);

			// Clamp scroll offsets inwards if zoomed out and viewable becomes smaller than canvas
			const contentWidth = columnWidth.value * 7;
			const maxScrollX = Math.max(
				0,
				contentWidth - viewportWidth.value + TIME_COL_WIDTH,
			);
			const maxScrollY = Math.max(
				0,
				hourHeight.value * hours.length - viewportHeight.value + 40,
			);

			if (scrollX.value > maxScrollX) scrollX.value = maxScrollX;
			if (scrollX.value < 0) scrollX.value = 0;
			if (scrollY.value > maxScrollY) scrollY.value = maxScrollY;
			if (scrollY.value < 0) scrollY.value = 0;
		});

	// Pan Gesture for Scrolling
	const panGesture = Gesture.Pan().onChange((e) => {
		const nextX = scrollX.value - e.changeX;
		const nextY = scrollY.value - e.changeY;

		const contentWidth = columnWidth.value * 7;
		const maxScrollX = Math.max(
			0,
			contentWidth - viewportWidth.value + TIME_COL_WIDTH,
		);
		const maxScrollY = Math.max(
			0,
			hourHeight.value * hours.length - viewportHeight.value + 40,
		);

		scrollX.value = Math.max(0, Math.min(maxScrollX, nextX));
		scrollY.value = Math.max(0, Math.min(maxScrollY, nextY));
	});

	const combinedGestures = Gesture.Simultaneous(panGesture, pinchGesture);

	// Double Tap Gesture for Empty Grid Press
	const tapGrid = Gesture.Tap()
		.numberOfTaps(2)
		.onEnd((e) => {
			const gridX = e.x - TIME_COL_WIDTH + scrollX.value;
			const gridY = e.y - 40 + scrollY.value;

			const dayIdx = Math.floor(gridX / columnWidth.value);
			const h = Math.floor(gridY / hourHeight.value) + startHour;
			const m = Math.floor(
				((gridY % hourHeight.value) / hourHeight.value) * 60,
			);

			if (dayIdx >= 0 && dayIdx < 7 && h >= startHour && h <= endHour) {
				const timeString = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
				if (onEmptyDoublePress) runOnJS(onEmptyDoublePress)(dayIdx, timeString);
			}
		});

	const headerStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: -scrollX.value }],
		width: columnWidth.value * 7,
		height: "100%",
	}));

	const timeColumnStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: -scrollY.value }],
	}));

	const gridStyle = useAnimatedStyle(() => ({
		width: columnWidth.value * 7,
		height: hourHeight.value * hours.length,
		transform: [{ translateX: -scrollX.value }, { translateY: -scrollY.value }],
	}));

	return (
		<GestureHandlerRootView style={styles.container}>
			<GestureDetector gesture={combinedGestures}>
				<View
					style={{ flex: 1 }}
					onLayout={(e) => {
						viewportWidth.value = e.nativeEvent.layout.width;
						viewportHeight.value = e.nativeEvent.layout.height;
					}}
				>
					{/* Sticky Header Row */}
					<View style={styles.stickyHeaderRow}>
						<View
							style={{
								width: TIME_COL_WIDTH,
								backgroundColor: colors.backgroundLight,
							}}
						/>
						<View style={{ flex: 1, overflow: "hidden" }}>
							<Animated.View
								style={[{ flexDirection: "row", height: "100%" }, headerStyle]}
							>
								{DAYS.map((day, index) => (
									<DayHeaderCell
										key={day}
										index={index}
										day={day}
										weekStartDate={weekStartDate}
										columnWidth={columnWidth}
										onDayPress={onDayPress}
									/>
								))}
							</Animated.View>
						</View>
					</View>

					{/* Body Content */}
					<View style={styles.row}>
						{/* Time Labels Column */}
						<View style={{ width: TIME_COL_WIDTH, overflow: "hidden" }}>
							<Animated.View style={[styles.timeColumn, timeColumnStyle]}>
								{hours.map((hour) => (
									<TimeLabelItem
										key={hour}
										hour={hour}
										startHour={startHour}
										hourHeight={hourHeight}
									/>
								))}
							</Animated.View>
						</View>

						{/* Main Grid Container */}
						<View style={{ flex: 1, overflow: "hidden" }}>
							<GestureDetector gesture={tapGrid}>
								<Animated.View style={[gridStyle, { position: "relative" }]}>
									{/* Background Grid Lines */}
									<View
										style={{
											flexDirection: "row",
											position: "absolute",
											top: 0,
											left: 0,
											right: 0,
											bottom: 0,
										}}
									>
										{DAYS.map((day) => (
											<GridColumnItem
												key={day}
												columnWidth={columnWidth}
												hours={hours}
												hourHeight={hourHeight}
											/>
										))}
									</View>

									{/* Activities Layer */}
									{activities.map((activity) => (
										<DraggableWeeklyBlock
											key={
												activity.id +
												activity.startTime +
												(activity.day || "Mon")
											}
											{...activity}
											columnWidth={columnWidth}
											hourHeight={hourHeight}
											startHour={startHour}
											endHour={endHour}
											onPress={() => onActivityPress?.(activity.id)}
											onDoublePress={() => onActivityDoublePress?.(activity.id)}
											onUpdate={(id, d, t) => onUpdateActivity?.(id, d, t)}
											onDragStateChange={(isDragging) =>
												setScrollingEnabled(!isDragging)
											}
										/>
									))}

									{/* Now Indicator */}
									{(() => {
										const now = new Date();
										const start = new Date(weekStartDate);
										start.setHours(0, 0, 0, 0);
										const end = new Date(start);
										end.setDate(start.getDate() + 7);

										if (now >= start && now < end) {
											const dayIdx = (now.getDay() + 6) % 7;
											return (
												<NowIndicator
													key="now-indicator"
													hourHeight={hourHeight}
													startHour={startHour}
													width={columnWidth}
													dayIdx={dayIdx}
												/>
											);
										}
										return null;
									})()}
								</Animated.View>
							</GestureDetector>
						</View>
					</View>
				</View>
			</GestureDetector>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.backgroundLight },
	row: { flexDirection: "row", flex: 1 },
	stickyHeaderRow: {
		flexDirection: "row",
		height: 40,
		backgroundColor: colors.backgroundLight,
		borderBottomWidth: 1,
		borderBottomColor: colors.slate200,
		zIndex: 10,
	},
	timeColumn: {
		width: TIME_COL_WIDTH,
		alignItems: "center",
		position: "relative",
	},
	timeLabel: {
		position: "absolute",
		fontSize: 10,
		color: colors.slate400,
		transform: [{ translateY: -6 }],
		width: "100%",
		textAlign: "center",
	},
	dayHeaderCell: {
		height: "100%",
		borderBottomWidth: 1,
		borderBottomColor: colors.slate200,
		backgroundColor: colors.backgroundLight,
		zIndex: 10,
	},
	dayHeader: {
		fontSize: 12,
		fontWeight: "600",
		color: colors.slate600,
		textTransform: "uppercase",
	},
	dateHeader: {
		fontSize: 10,
		color: colors.slate400,
		marginTop: 2,
	},
	dayColumnLine: {
		borderLeftWidth: 1,
		borderLeftColor: colors.slate100,
		height: "100%",
	},
	gridCell: {
		width: "100%",
		borderBottomWidth: 1,
		borderBottomColor: "rgba(241, 245, 249, 0.5)",
	},
});
