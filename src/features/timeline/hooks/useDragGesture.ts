import { Gesture } from "react-native-gesture-handler";
import {
	runOnJS,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";

type DragOptions = {
	hourHeight: number;
	snapIntervalMinutes?: number;
	onDragEnd?: (newStartHour: number, newStartMinute: number) => void;
	onDragStart?: () => void;
	enabled?: boolean;
};

export function useDragGesture({
	hourHeight,
	snapIntervalMinutes = 15,
	onDragEnd,
	onDragStart,
	enabled = true,
}: DragOptions) {
	const translateY = useSharedValue(0);
	const isDragging = useSharedValue(false);
	const context = useSharedValue({ startY: 0 });

	const panGesture = Gesture.Pan()
		.enabled(enabled)
		.onStart(() => {
			context.value = { startY: translateY.value };
			isDragging.value = true;
			if (onDragStart) runOnJS(onDragStart)();
		})
		.onUpdate((e) => {
			translateY.value = context.value.startY + e.translationY;
		})
		.onEnd(() => {
			isDragging.value = false;
			const pixelsPerMinute = hourHeight / 60;
			const snapPixels = snapIntervalMinutes * pixelsPerMinute;
			const outputY = Math.round(translateY.value / snapPixels) * snapPixels;
			translateY.value = withSpring(outputY, { damping: 20, stiffness: 200 });

			if (onDragEnd) {
				const minuteDelta = outputY / pixelsPerMinute;
				runOnJS(onDragEnd)(minuteDelta / 60, minuteDelta % 60);
			}
		});

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: translateY.value }],
		zIndex: isDragging.value ? 100 : 1,
		shadowOpacity: isDragging.value ? 0.2 : 0,
		shadowRadius: 10,
		elevation: isDragging.value ? 5 : 0,
	}));

	return { panGesture, animatedStyle, isDragging };
}
