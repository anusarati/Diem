import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { colors } from "../../../app/theme";

type Props = {
	hourHeight: SharedValue<number> | number;
	startHour: number;
	width?: SharedValue<number> | number;
	left?: SharedValue<number> | number;
};

export function NowIndicator({ hourHeight, startHour, width, left }: Props) {
	const minutesFromStart = useSharedValue(0);

	useEffect(() => {
		const updatePosition = () => {
			const now = new Date();
			const h = now.getHours();
			const m = now.getMinutes();
			const totalMinutes = (h - startHour) * 60 + m;
			minutesFromStart.value = totalMinutes;
		};

		updatePosition();
		const interval = setInterval(updatePosition, 60000);
		return () => clearInterval(interval);
	}, [startHour, minutesFromStart]);

	const animatedStyle = useAnimatedStyle(() => {
		const hHeight =
			typeof hourHeight === "object" && "value" in hourHeight
				? hourHeight.value
				: (hourHeight as number);
		const top = (minutesFromStart.value / 60) * hHeight;
		const l =
			typeof left === "object" && "value" in left ? left.value : (left ?? 0);
		const w =
			typeof width === "object" && "value" in width
				? width.value
				: (width ?? "100%");

		return {
			top: top,
			opacity: top < 0 ? 0 : 1,
			left: l,
			width: w,
		};
	});

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
