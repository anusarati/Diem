import { useRef, useState } from "react";
import {
	Animated,
	PanResponder,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	useWindowDimensions,
	View,
} from "react-native";
import { NowIndicator } from "../../features/timeline/components/NowIndicator";
import { colors, spacing } from "../theme";
import type { TimeBlockProps } from "./TimeBlock";

interface WeeklyViewProps {
	activities: TimeBlockProps[];
	startHour?: number;
	endHour?: number;
	onActivityPress?: (id: string) => void;
	onActivityDoublePress?: (id: string) => void;
	onDayPress?: (dayIndex: number) => void;
	onEmptyDoublePress?: (time: string) => void;
	weekStartDate?: Date;
	onUpdateActivity?: (id: string, day: string, newStartTime: string) => void;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOUR_HEIGHT = 80;
const TIME_COL_WIDTH = 50;
const MIN_COLUMN_WIDTH = 120;

interface DraggableWeeklyBlockProps extends Omit<TimeBlockProps, "onPress"> {
	top: number;
	height: number;
	left: number;
	width: number;
	startHour: number;
	endHour: number;
	columnWidth: number;
	onUpdate: (id: string, day: string, newStartTime: string) => void;
	onDragStateChange?: (isDragging: boolean) => void;
	onPress?: (id: string) => void;
	onDoublePress?: (id: string) => void;
}

function DraggableWeeklyBlock({
	top,
	height,
	left,
	width,
	startHour,
	endHour,
	columnWidth,
	onUpdate,
	onDragStateChange,
	onPress,
	onDoublePress,
	...props
}: DraggableWeeklyBlockProps) {
	const lastPressTime = useRef(0);
	const pan = useRef(new Animated.ValueXY()).current;

	const panResponder = useRef(
		PanResponder.create({
			onMoveShouldSetPanResponder: (_, gestureState) => {
				const isDrag =
					Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
				if (isDrag) onDragStateChange?.(true);
				return isDrag;
			},
			onPanResponderGrant: () => {
				pan.setOffset({
					// biome-ignore lint/suspicious/noExplicitAny: Internal Animated.Value access
					x: (pan.x as any)._value,
					// biome-ignore lint/suspicious/noExplicitAny: Internal Animated.Value access
					y: (pan.y as any)._value,
				});
				pan.setValue({ x: 0, y: 0 });
			},
			onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
				useNativeDriver: false,
			}),
			onPanResponderRelease: (_, _gestureState) => {
				pan.flattenOffset();

				// biome-ignore lint/suspicious/noExplicitAny: Internal Animated.Value access
				const deltaX = (pan.x as any)._value; // approximate
				// biome-ignore lint/suspicious/noExplicitAny: Internal Animated.Value access
				const deltaY = (pan.y as any)._value; // approximate

				const colShift = Math.round(deltaX / columnWidth);
				const currentDayIndex = DAYS.indexOf(props.day || "Mon");
				let newDayIndex = currentDayIndex + colShift;
				newDayIndex = Math.max(0, Math.min(6, newDayIndex)); // Clamp 0-6
				const newDay = DAYS[newDayIndex] || "Mon";

				const pixelsPerMin = HOUR_HEIGHT / 60;
				// Parse time carefully
				const [hStr, mStr] = props.startTime.split(":") as [string, string];
				const originalMinFromStart =
					(parseInt(hStr || "0", 10) - startHour) * 60 +
					parseInt(mStr || "0", 10);

				const rowShiftPixels = deltaY;
				const deltaMin = rowShiftPixels / pixelsPerMin;
				let totalNewMin = originalMinFromStart + deltaMin;
				totalNewMin = Math.round(totalNewMin / 15) * 15; // Snap to 15m

				const maxMinutes =
					(endHour - startHour + 1) * 60 - props.durationMinutes;
				const clampedMinutes = Math.max(0, Math.min(maxMinutes, totalNewMin));

				const newH = Math.floor(clampedMinutes / 60) + startHour;
				const newM = clampedMinutes % 60;
				const newTime = `${newH.toString().padStart(2, "0")}:${newM.toString().padStart(2, "0")}`;

				const finalDeltaX = (newDayIndex - currentDayIndex) * columnWidth;
				const finalDeltaY =
					clampedMinutes * pixelsPerMin - originalMinFromStart * pixelsPerMin;

				Animated.spring(pan, {
					toValue: { x: finalDeltaX, y: finalDeltaY },
					useNativeDriver: false,
					speed: 100, // fast snap
				}).start();

				if (newDay !== props.day || newTime !== props.startTime) {
					onUpdate(props.id, newDay, newTime);
				}

				onDragStateChange?.(false);
			},
			onPanResponderTerminate: () => {
				Animated.spring(pan, {
					toValue: { x: 0, y: 0 },
					useNativeDriver: false,
				}).start();
				onDragStateChange?.(false);
			},
		}),
	).current;

	const isPredicted = props.type === "predicted";
	const isFlexible = props.type === "flexible";

	return (
		<Animated.View
			style={{
				position: "absolute",
				left: left,
				top: top,
				width: width - 4, // padding
				height: Math.max(height, 20),
				backgroundColor: isPredicted
					? `${props.categoryColor || colors.primary}20`
					: props.categoryColor || colors.primary,
				opacity: 0.9,
				borderRadius: 4,
				transform: [{ translateX: pan.x }, { translateY: pan.y }],
				zIndex: 20,
				// Add border styles
				borderWidth: isPredicted || isFlexible ? 2 : 0,
				borderStyle: isPredicted ? "dotted" : isFlexible ? "dashed" : "solid",
				borderColor: isPredicted
					? colors.slate600
					: isFlexible
						? "rgba(255,255,255,0.8)"
						: "transparent",
			}}
			{...panResponder.panHandlers}
		>
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
				{/* Simple content render */}
				<Text
					style={{
						fontSize: height <= 20 ? 8 : 10,
						color: isPredicted ? colors.slate600 : "#fff",
						paddingHorizontal: 2,
						paddingVertical: height <= 20 ? 0 : 2,
						lineHeight: height <= 20 ? 10 : 12,
					}}
					numberOfLines={1}
					adjustsFontSizeToFit
					minimumFontScale={0.6}
				>
					{props.title}
				</Text>
			</Pressable>
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
	const columnWidth = Math.max(weekViewWidth / 7, MIN_COLUMN_WIDTH);
	const contentWidth = columnWidth * 7;

	const [scrollingEnabled, setScrollingEnabled] = useState(true);

	const getPosition = (
		day: string,
		timeString: string,
		durationMinutes: number,
	) => {
		const dayIndex = DAYS.indexOf(day || "Mon");
		if (dayIndex === -1) return null;

		const [h, m] = timeString?.split(":").map(Number) || [startHour, 0];
		const hVal = h ?? startHour;
		const mVal = m ?? 0;
		const totalMinutesFromStart = (hVal - startHour) * 60 + mVal;

		const top = (totalMinutesFromStart / 60) * HOUR_HEIGHT;
		// We will render activities relative to the DayGrid container (excluding headers).

		const height = (durationMinutes / 60) * HOUR_HEIGHT;
		const left = dayIndex * columnWidth;

		return { top, height, left };
	};

	const headerScrollRef = useRef<ScrollView | null>(null);
	const bodyScrollRef = useRef<ScrollView | null>(null);
	const isSyncingScroll = useRef(false);

	const syncHorizontalScroll = (x: number, source: "header" | "body") => {
		if (isSyncingScroll.current) return;
		isSyncingScroll.current = true;

		const target =
			source === "header" ? bodyScrollRef.current : headerScrollRef.current;
		target?.scrollTo({ x, animated: false });

		requestAnimationFrame(() => {
			isSyncingScroll.current = false;
		});
	};

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={styles.contentContainer}
			scrollEnabled={scrollingEnabled}
			stickyHeaderIndices={[0]}
		>
			{/* Header Row (sticks to top while vertical scrolling) */}
			<View style={styles.stickyHeaderRow}>
				<View
					style={{
						width: TIME_COL_WIDTH,
						backgroundColor: colors.backgroundLight,
					}}
				/>
				<ScrollView
					ref={headerScrollRef}
					horizontal
					showsHorizontalScrollIndicator
					scrollEventThrottle={16}
					onScroll={(e) =>
						syncHorizontalScroll(e.nativeEvent.contentOffset.x, "header")
					}
					contentContainerStyle={{ width: contentWidth }}
					style={{ flex: 1 }}
				>
					<View style={{ flexDirection: "row", height: 40 }}>
						{DAYS.map((day, index) => {
							const date = new Date(weekStartDate);
							date.setDate(weekStartDate.getDate() + index);
							const dateString = date.toLocaleDateString("en-US", {
								month: "short",
								day: "numeric",
							});
							return (
								<Pressable
									key={day}
									style={[styles.dayHeaderCell, { width: columnWidth }]}
									onPress={() => onDayPress?.(index)}
								>
									<Text style={styles.dayHeader}>{day}</Text>
									<Text style={styles.dateHeader}>{dateString}</Text>
								</Pressable>
							);
						})}
					</View>
				</ScrollView>
			</View>

			{/* Grid Area */}
			<View style={styles.row}>
				{/* Time Labels Column */}
				<View style={[styles.timeColumn, { width: TIME_COL_WIDTH }]}>
					{hours.map((hour) => (
						<Text
							key={hour}
							style={[
								styles.timeLabel,
								{ top: (hour - startHour) * HOUR_HEIGHT + 40 },
							]}
						>
							{/* +40 matches header height exactly */}
							{hour === 0
								? "12 AM"
								: hour < 12
									? `${hour} AM`
									: hour === 12
										? "12 PM"
										: `${hour - 12} PM`}
						</Text>
					))}
				</View>

				{/* Main Grid Container */}
				<ScrollView
					ref={bodyScrollRef}
					horizontal
					nestedScrollEnabled
					showsHorizontalScrollIndicator
					style={{ flex: 1 }}
					scrollEventThrottle={16}
					onScroll={(e) =>
						syncHorizontalScroll(e.nativeEvent.contentOffset.x, "body")
					}
					contentContainerStyle={{ width: contentWidth }}
				>
					<View style={{ width: contentWidth }}>
						{/* Grid Lines Area */}
						<View style={{ position: "relative" }}>
							<Pressable
								style={StyleSheet.absoluteFill}
								onPress={(event) => {
									const { locationY } = event.nativeEvent;
									const hour = Math.floor(locationY / HOUR_HEIGHT) + startHour;
									const minutes = Math.floor(
										((locationY % HOUR_HEIGHT) / HOUR_HEIGHT) * 60,
									);
									const timeString = `${hour.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

									// Simple double press detection for web/native
									const now = Date.now();
									if (
										// @ts-expect-error - using ref-like behavior via local-scoped var for brevity in replacement
										global._lastWeeklyPress &&
										// @ts-expect-error
										now - global._lastWeeklyPress < 500
									) {
										onEmptyDoublePress?.(timeString);
									}
									// @ts-expect-error
									global._lastWeeklyPress = now;
								}}
							/>
							{/* Background Grid */}
							<View
								style={{
									flexDirection: "row",
									position: "absolute",
									top: 0,
									left: 0,
									width: contentWidth,
									bottom: 0,
								}}
							>
								{DAYS.map((day) => (
									<View
										key={day}
										style={[styles.dayColumnLine, { width: columnWidth }]}
									>
										{hours.map((h) => (
											<View
												key={h}
												style={[styles.gridCell, { height: HOUR_HEIGHT }]}
											/>
										))}
									</View>
								))}
							</View>

							{/* Ghost logic to ensure height matches content */}
							<View style={{ opacity: 0 }}>
								{hours.map((h) => (
									<View key={h} style={{ height: HOUR_HEIGHT }} />
								))}
							</View>

							{/* Activities Layer */}
							{columnWidth > 0 &&
								activities.map((activity) => {
									const pos = getPosition(
										activity.day || "Mon",
										activity.startTime,
										activity.durationMinutes,
									);
									if (!pos) return null;

									return (
										<DraggableWeeklyBlock
											key={activity.id + activity.startTime + activity.day}
											{...activity}
											top={pos.top}
											height={pos.height}
											left={pos.left}
											width={columnWidth}
											columnWidth={columnWidth}
											startHour={startHour}
											endHour={endHour}
											onPress={() => onActivityPress?.(activity.id)}
											onDoublePress={() => onActivityDoublePress?.(activity.id)}
											onUpdate={(id, d, t) => onUpdateActivity?.(id, d, t)}
											onDragStateChange={(isDragging) =>
												setScrollingEnabled(!isDragging)
											}
										/>
									);
								})}

							{/* Now Indicator */}
							{(() => {
								const now = new Date();
								// Find if 'now' is within the week range [weekStartDate, weekStartDate + 7]
								const start = new Date(weekStartDate);
								start.setHours(0, 0, 0, 0);
								const end = new Date(start);
								end.setDate(start.getDate() + 7);

								if (now >= start && now < end) {
									const dayIndex = (now.getDay() + 6) % 7; // 0=Mon, 6=Sun
									const left = dayIndex * columnWidth;
									return (
										<NowIndicator
											hourHeight={HOUR_HEIGHT}
											startHour={startHour}
											width={columnWidth}
											left={left}
										/>
									);
								}
								return null;
							})()}
						</View>
					</View>
				</ScrollView>
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.backgroundLight },
	contentContainer: { paddingBottom: 100, paddingTop: spacing.md },
	row: { flexDirection: "row" },
	stickyHeaderRow: {
		flexDirection: "row",
		height: 40,
		backgroundColor: colors.backgroundLight,
		borderBottomWidth: 1,
		borderBottomColor: colors.slate200,
		zIndex: 10,
	},
	timeColumn: {
		width: 30,
		marginTop: 0, // Reset margin since we handle spacing manually
		alignItems: "center",
	},
	timeLabel: {
		position: "absolute",
		fontSize: 10,
		color: colors.slate400,
		transform: [{ translateY: -6 }],
	},
	dayHeaderCell: {
		alignItems: "center",
		justifyContent: "center",
		borderBottomWidth: 1,
		borderBottomColor: colors.slate200,
		backgroundColor: colors.backgroundLight, // ensure opaque
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
	},
	gridCell: {
		width: "100%",
		borderBottomWidth: 1,
		borderBottomColor: "rgba(241, 245, 249, 0.5)",
	},
});
