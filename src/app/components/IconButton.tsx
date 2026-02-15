import { Pressable, StyleSheet, Text, type ViewStyle } from "react-native";
import { colors } from "../theme";

type Props = {
	icon: string;
	onPress?: () => void;
	style?: ViewStyle;
	iconStyle?: object;
	filled?: boolean;
	variant?: "default" | "soft";
};

const ICONS: Record<string, string> = {
	settings: "⚙",
	home: "🏠",
	calendar: "📅",
	bar_chart: "📊",
	person: "👤",
	add: "+",
	self_improvement: "🧘",
	edit_note: "📝",
	local_florist: "🌱",
	book_2: "📖",
	cloud: "☁",
	favorite: "❤",
	schedule: "🕐",
	lightbulb: "💡",
	celebration: "🎉",
	auto_awesome: "✨",
};

export function IconButton({
	icon,
	onPress,
	style,
	iconStyle,
	filled: _filled,
	variant = "default",
}: Props) {
	const char = ICONS[icon] ?? icon;
	const isSoft = variant === "soft";
	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.btn,
				isSoft && styles.btnSoft,
				style,
				pressed && styles.pressed,
			]}
		>
			<Text style={[styles.icon, iconStyle]}>{char}</Text>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	btn: {
		width: 40,
		height: 40,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: colors.white,
		borderWidth: 1,
		borderColor: colors.slate200,
	},
	btnSoft: {
		backgroundColor: colors.slate50,
		borderColor: colors.slate200,
	},
	pressed: { opacity: 0.8 },
	icon: { fontSize: 20 },
});
