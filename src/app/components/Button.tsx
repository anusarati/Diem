import React from "react";
import {
	ActivityIndicator,
	Pressable,
	StyleSheet,
	Text,
	type TextStyle,
	type ViewStyle,
} from "react-native";
import { colors } from "../theme";

type Props = {
	label: string;
	onPress?: () => void;
	variant?: "primary" | "secondary" | "danger" | "ghost";
	size?: "sm" | "md" | "lg";
	loading?: boolean;
	disabled?: boolean;
	style?: ViewStyle;
	textStyle?: TextStyle;
	icon?: string; // Optional icon prefix (emoji or char)
};

export function Button({
	label,
	onPress,
	variant = "primary",
	size = "md",
	loading = false,
	disabled = false,
	style,
	textStyle,
	icon,
}: Props) {
	const getBackgroundColor = () => {
		if (disabled) return colors.slate200;
		switch (variant) {
			case "primary":
				return colors.primary;
			case "danger":
				return colors.red300; // or red400
			case "secondary":
				return colors.slate100;
			case "ghost":
				return "transparent";
			default:
				return colors.primary;
		}
	};

	const getTextColor = () => {
		if (disabled) return colors.slate400;
		switch (variant) {
			case "primary":
				return colors.white;
			case "danger":
				return colors.white;
			case "secondary":
				return colors.slate800;
			case "ghost":
				return colors.primary;
			default:
				return colors.white;
		}
	};

	const getPadding = () => {
		switch (size) {
			case "sm":
				return { paddingVertical: 6, paddingHorizontal: 12 };
			case "md":
				return { paddingVertical: 10, paddingHorizontal: 20 };
			case "lg":
				return { paddingVertical: 14, paddingHorizontal: 24 };
			default:
				return { paddingVertical: 10, paddingHorizontal: 20 };
		}
	};

	return (
		<Pressable
			onPress={!disabled && !loading ? onPress : undefined}
			style={({ pressed }) => [
				styles.base,
				{ backgroundColor: getBackgroundColor() },
				getPadding(),
				style,
				pressed && !disabled && styles.pressed,
			]}
		>
			{loading ? (
				<ActivityIndicator size="small" color={getTextColor()} />
			) : (
				<React.Fragment>
					{icon && (
						<Text style={[styles.icon, { color: getTextColor() }]}>{icon}</Text>
					)}
					<Text
						style={[
							styles.text,
							{ color: getTextColor(), fontSize: size === "sm" ? 12 : 14 },
							textStyle,
						]}
					>
						{label}
					</Text>
				</React.Fragment>
			)}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	base: {
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		gap: 8,
	},
	pressed: {
		opacity: 0.8,
	},
	text: {
		fontWeight: "600",
	},
	icon: {
		fontSize: 16,
	},
});
