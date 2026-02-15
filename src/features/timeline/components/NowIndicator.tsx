import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { colors } from "../../../app/theme";

const _HOUR_HEIGHT = 60; // Assuming 60px/hour for now
const _START_HOUR = 6;

type Props = {
	hourHeight: number;
	startHour: number;
};

export function NowIndicator({ hourHeight, startHour }: Props) {
	const top = useSharedValue(0);

	useEffect(() => {
		const updatePosition = () => {
			const now = new Date();
			const h = now.getHours();
			const m = now.getMinutes();
			const totalMinutes = (h - startHour) * 60 + m;
			// If before startHour, don't show or clamp to 0? Just hide if negative?
			top.value = withTiming((totalMinutes / 60) * hourHeight);
		};

		updatePosition();
		const interval = setInterval(updatePosition, 60000);
		return () => clearInterval(interval);
	}, [
		hourHeight,
		startHour, // If before startHour, don't show or clamp to 0? Just hide if negative?
		top,
	]);

	const animatedStyle = useAnimatedStyle(() => ({
		top: top.value,
		opacity: top.value < 0 ? 0 : 1, // Hide if before start time
	}));

	return (
		<Animated.View style={[styles.container, animatedStyle]}>
			<View style={styles.dot} />
			<View style={styles.line} />
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	container: {
		position: "absolute",
		left: 0,
		right: 0,
		flexDirection: "row",
		alignItems: "center",
		zIndex: 50,
	},
	dot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: colors.red400 || "#EF4444",
		marginLeft: -4,
	},
	line: {
		flex: 1,
		height: 2,
		backgroundColor: colors.red400 || "#EF4444",
	},
});
