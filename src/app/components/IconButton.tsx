import { Pressable, StyleSheet, Text, type ViewStyle } from "react-native";

type Props = {
	icon: string;
	onPress?: () => void;
	style?: ViewStyle;
	iconStyle?: object;
	filled?: boolean;
};

// Simple text-based icons (replace with @expo/vector-icons or react-native-vector-icons)
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
}: Props) {
	const char = ICONS[icon] ?? icon;
	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [styles.btn, style, pressed && styles.pressed]}
		>
			<Text style={[styles.icon, iconStyle]}>{char}</Text>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	btn: {
		width: 40,
		height: 40,
		borderRadius: 9999,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#fff",
		borderWidth: 1,
		borderColor: "#F1F5F9",
	},
	pressed: { opacity: 0.8 },
	icon: { fontSize: 20 },
});
