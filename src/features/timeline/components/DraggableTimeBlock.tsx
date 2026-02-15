import * as Haptics from "expo-haptics";
import React from "react";
import { StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
	runOnJS,
	useAnimatedStyle,
	useDerivedValue,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";
import { type Activity, TimeBlock } from "./TimeBlock";

type Props = {
	activity: Activity;
	hourHeight: number;
	startHour: number;
	onDragEnd?: (id: string, newStartTime: string) => void;
	onPress?: (id: string) => void;
};

export function DraggableTimeBlock({
	activity,
	hourHeight,
	startHour,
	onDragEnd,
	onPress,
}: Props) {
	const isFlexible = activity.type === "flexible";

	// Calculate initial position
	const getMinutes = (timeStr: string) => {
		const [h, m] = timeStr.split(":").map(Number);
		return h * 60 + m;
	};

	const startMinutes = getMinutes(activity.startTime);
	const durationMinutes = activity.durationMinutes;

	const initialTop = ((startMinutes - startHour * 60) / 60) * hourHeight;
	const height = (durationMinutes / 60) * hourHeight;

	// Shared values for animation
	const translationY = useSharedValue(0);
	const isDragging = useSharedValue(false);
	const savedTranslationY = useSharedValue(0);

	// Reset drag offset when activity updates (e.g. after successful drop)
	React.useEffect(() => {
		translationY.value = 0;
		savedTranslationY.value = 0;
	}, [translationY, savedTranslationY]);

	// Snap Guide Logic
	const pixelsPer15Min = hourHeight / 4;
	const snapY = useDerivedValue(() => {
		return Math.round(translationY.value / pixelsPer15Min) * pixelsPer15Min;
	});

	const snapGuideStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: snapY.value }],
		opacity: isDragging.value ? 1 : 0,
	}));

	const pan = Gesture.Pan()
		.enabled(isFlexible)
		.onStart(() => {
			isDragging.value = true;
			runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
		})
		.onUpdate((event) => {
			translationY.value = savedTranslationY.value + event.translationY;
		})
		.onEnd(() => {
			isDragging.value = false;

			const finalSnap = snapY.value; // Get current snapped value

			translationY.value = withSpring(finalSnap, { damping: 15 });
			savedTranslationY.value = finalSnap;

			if (onDragEnd) {
				// Calculate relative time shift in minutes
				const deltaPixels = finalSnap;
				const deltaMinutes = (deltaPixels / hourHeight) * 60;

				// Final minutes = Original Start + Drag Delta
				const newStartTotal = startMinutes + deltaMinutes;

				// Bounds check (0 to 24*60 - duration)
				const maxStart = 24 * 60 - durationMinutes;
				const boundedStart = Math.max(0, Math.min(maxStart, newStartTotal));

				// Format to HH:mm
				const h = Math.floor(boundedStart / 60);
				const m = Math.round(boundedStart % 60);
				const newTime = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;

				runOnJS(onDragEnd)(activity.id, newTime);
			}
		});

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: translationY.value }],
		zIndex: isDragging.value ? 100 : 10,
		shadowOpacity: isDragging.value ? 0.3 : 0,
		shadowRadius: 10,
		elevation: isDragging.value ? 5 : 0,
	}));

	return (
		<React.Fragment>
			{/* Snap Guide (Ghost) */}
			{isFlexible && (
				<Animated.View
					style={[
						styles.container,
						{
							top: initialTop,
							height,
							left: 60,
							right: 10,
							zIndex: 5,
							backgroundColor: "rgba(0,0,0,0.05)",
							borderRadius: 8,
							borderColor: "rgba(0,0,0,0.1)",
							borderWidth: 1,
							borderStyle: "dashed",
						},
						snapGuideStyle,
					]}
				/>
			)}

			<GestureDetector gesture={pan}>
				<Animated.View
					style={[
						styles.container,
						{ top: initialTop, height, left: 60, right: 10 },
						animatedStyle,
					]}
				>
					<TimeBlock
						activity={activity}
						top={0} // Relative inside container
						height={height}
						onPress={() => onPress?.(activity.id)}
						style={{ width: "100%" }}
					/>
				</Animated.View>
			</GestureDetector>
		</React.Fragment>
	);
}

const styles = StyleSheet.create({
	container: {
		position: "absolute",
	},
});
