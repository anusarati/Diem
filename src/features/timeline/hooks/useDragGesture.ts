import { Gesture } from "react-native-gesture-handler";
import {
	runOnJS,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";

type DragOptions = {
	hourHeight: number;
	snapIntervalMinutes?: number; // e.g., 15
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

			// Snap logic
			const pixelsPerMinute = hourHeight / 60;
			const snapPixels = snapIntervalMinutes * pixelsPerMinute;
			const outputY = Math.round(translateY.value / snapPixels) * snapPixels;

			translateY.value = withSpring(outputY, { damping: 20, stiffness: 200 });

			if (onDragEnd) {
				// Calculate time delta in minutes
				const minuteDelta = outputY / pixelsPerMinute;
				// This is RELATIVE change. The caller needs to add this to original time.
				// Wait, cleaner to return absolute or relative? Relative is safer given 'translateY'.
				// But let's clarify: translateY assumes starting at 0 offset.
				// Correct usage: caller passes initial time, we return *new* time?
				// Or caller passes callback with delta.
				// Let's return just the quantized pixel delta converted to hours/minutes.

				// Actually, let's keep it simple: return the snapped Y translation.
				// The calling component can derive time.
				runOnJS(onDragEnd)(minuteDelta / 60, minuteDelta % 60); // hours, minutes delta
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
