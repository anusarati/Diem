import React from "react";
import {
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	type ViewStyle,
} from "react-native";
import { colors, spacing } from "../../../app/theme";

export type BlockVariant = "fixed" | "flexible" | "predicted";
export type Activity = {
	id: string;
	title: string;
	subtitle?: string;
	startTime: string; // "HH:mm"
	durationMinutes: number;
	color?: string; // Hex color
	type: BlockVariant;
	day?: string;
	categoryColor?: string;
};

type Props = {
	activity: Activity;
	top: number;
	height: number;
	width?: number; // For overlapping events
	left?: number; // For overlapping events
	onPress?: () => void;
	style?: ViewStyle;
};

export const TimeBlock = React.memo(
	({ activity, top, height, width, left, onPress, style }: Props) => {
		const { title, subtitle, categoryColor, color, type } = activity;
		const displayColor = categoryColor || color || colors.primary;

		const getStyles = () => {
			switch (type) {
				case "fixed":
					return {
						backgroundColor: displayColor,
						borderColor: "transparent",
						borderWidth: 0,
						opacity: 1,
					};
				case "flexible":
					return {
						backgroundColor: `${displayColor}1A`, // 10% opacity
						borderColor: displayColor,
						borderWidth: 2,
						borderStyle: "dashed" as const,
						opacity: 1,
					};
				case "predicted":
					return {
						backgroundColor: `${displayColor}0D`, // 5% opacity
						borderColor: displayColor,
						borderWidth: 2,
						borderStyle: "dotted" as const, // React Native supports 'dotted' since 0.63+
						opacity: 0.8,
					};
				default:
					return {};
			}
		};

		const variantStyle = getStyles();
		const textColor = type === "fixed" ? colors.white : displayColor;

		return (
			<TouchableOpacity
				activeOpacity={0.8}
				onPress={onPress}
				disabled={!onPress}
				style={[
					styles.container,
					{
						top,
						height,
						left: left || 0,
						width: width || "100%",
						backgroundColor: variantStyle.backgroundColor,
						borderColor: variantStyle.borderColor,
						borderWidth: variantStyle.borderWidth,
						borderStyle: variantStyle.borderStyle,
						opacity: variantStyle.opacity,
					},
					style,
				]}
			>
				<Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
					{title}
				</Text>
				{subtitle && height > 40 && (
					<Text
						style={[styles.subtitle, { color: textColor }]}
						numberOfLines={1}
					>
						{subtitle}
					</Text>
				)}
			</TouchableOpacity>
		);
	},
);

const styles = StyleSheet.create({
	container: {
		position: "absolute",
		borderRadius: 8,
		padding: spacing.sm,
		overflow: "hidden",
		justifyContent: "center",
	},
	title: {
		fontWeight: "600",
		fontSize: 14,
	},
	subtitle: {
		fontWeight: "400",
		fontSize: 12,
		opacity: 0.8,
	},
});
