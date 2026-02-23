import { useEffect } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { colors } from "../../../app/theme";

type Props = {
	hourHeight: number;
	startHour: number;
	width?: ViewStyle["width"];
	left?: number;
};

export function NowIndicator({ hourHeight, startHour, width, left }: Props) {
	const top = useSharedValue(0);

	useEffect(() => {
		const updatePosition = () => {
			const now = new Date();
			const h = now.getHours();
			const m = now.getMinutes();
			const totalMinutes = (h - startHour) * 60 + m;
			top.value = withTiming((totalMinutes / 60) * hourHeight);
		};

		updatePosition();
		const interval = setInterval(updatePosition, 60000);
		return () => clearInterval(interval);
	}, [hourHeight, startHour, top]);

	const animatedStyle = useAnimatedStyle(() => ({
		top: top.value,
		opacity: top.value < 0 ? 0 : 1,
		left: left ?? 0,
		width: width ?? "100%",
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
