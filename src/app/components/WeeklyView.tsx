import { useRef, useState } from "react";
import {
	Animated,
	type LayoutChangeEvent,
	PanResponder,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { colors, spacing } from "../theme";
import type { TimeBlockProps } from "./TimeBlock";

interface WeeklyViewProps {
	activities: TimeBlockProps[];
	startHour?: number;
	endHour?: number;
	onActivityPress?: (id: string) => void;
	onDayPress?: (dayIndex: number) => void;
	weekStartDate?: Date;
	onUpdateActivity?: (id: string, day: string, newStartTime: string) => void;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOUR_HEIGHT = 40;
const TIME_COL_WIDTH = 30;

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
	...props
}: DraggableWeeklyBlockProps) {
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
					x: (pan.x as any)._value,
					y: (pan.y as any)._value,
				});
				pan.setValue({ x: 0, y: 0 });
			},
			onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
				useNativeDriver: false,
			}),
			onPanResponderRelease: (_, _gestureState) => {
				pan.flattenOffset();

				const deltaX = (pan.x as any)._value; // approximate
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
				height: Math.max(height - 2, 16),
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
			{/* Simple content render if height allows */}
			{height > 20 && (
				<Text
					style={{
						fontSize: 10,
						color: isPredicted ? colors.slate600 : "#fff",
						padding: 2,
					}}
					numberOfLines={1}
				>
					{props.title}
				</Text>
			)}
		</Animated.View>
	);
}

export function WeeklyView({
	activities,
	startHour = 6,
	endHour = 23,
	onActivityPress,
	onDayPress,
	weekStartDate = new Date(),
	onUpdateActivity,
}: WeeklyViewProps) {
	const hours = Array.from(
		{ length: endHour - startHour + 1 },
		(_, i) => startHour + i,
	);
	const [scrollingEnabled, setScrollingEnabled] = useState(true);
	const [columnWidth, setColumnWidth] = useState(0);

	const handleLayout = (event: LayoutChangeEvent) => {
		const { width } = event.nativeEvent.layout;
		// Divide total width by 7 days
		setColumnWidth(width / 7);
	};

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
		top + 40; // Add margin for header? No, 'dayGrid' starts below header?
		// Wait, the activities are absolutely positioned. We need to respect the header offset.
		// The structure below puts headers inside the day column flow.
		// We will render activities relative to the DayGrid container (excluding headers).

		const height = (durationMinutes / 60) * HOUR_HEIGHT;
		const left = dayIndex * columnWidth;

		return { top, height, left };
	};

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={styles.contentContainer}
			scrollEnabled={scrollingEnabled}
		>
			<View style={styles.row}>
				{/* Time Labels Column */}
				<View style={[styles.timeColumn, { width: TIME_COL_WIDTH }]}>
					{hours.map((hour) => (
						<Text
							key={hour}
							style={[
								styles.timeLabel,
								{ top: (hour - startHour) * HOUR_HEIGHT + 35 },
							]}
						>
							{/* +35 accounts for header height roughly */}
							{hour}
						</Text>
					))}
				</View>

				{/* Main Grid Container */}
				<View style={{ flex: 1 }}>
					{/* Header Row */}
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
									style={styles.dayHeaderCell}
									onPress={() => onDayPress?.(index)}
								>
									<Text style={styles.dayHeader}>{day}</Text>
									<Text style={styles.dateHeader}>{dateString}</Text>
								</Pressable>
							);
						})}
					</View>

					{/* Grid Lines Area */}
					<View style={{ position: "relative" }} onLayout={handleLayout}>
						{/* Background Grid */}
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
								<View key={day} style={styles.dayColumnLine}>
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
										onUpdate={(id, d, t) => onUpdateActivity?.(id, d, t)}
										onDragStateChange={(isDragging) =>
											setScrollingEnabled(!isDragging)
										}
									/>
								);
							})}
					</View>
				</View>
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.backgroundLight },
	contentContainer: { paddingBottom: 100, paddingTop: spacing.md },
	row: { flexDirection: "row" },
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
		flex: 1,
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
		flex: 1,
		borderLeftWidth: 1,
		borderLeftColor: colors.slate100,
	},
	gridCell: {
		width: "100%",
		borderBottomWidth: 1,
		borderBottomColor: "rgba(241, 245, 249, 0.5)",
	},
});
