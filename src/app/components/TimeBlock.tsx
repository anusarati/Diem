import {
	type StyleProp,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	type ViewStyle,
} from "react-native";
import { colors, spacing } from "../theme";

export type ActivityType = "fixed" | "flexible" | "predicted";
export type PriorityLevel = "high" | "medium" | "low";

export interface TimeBlockProps {
	id: string;
	title: string;
	subtitle?: string;
	startTime: string; // "10:00"
	day?: string; // "Mon", "Tue", etc.
	durationMinutes: number;
	type: ActivityType;
	priority?: PriorityLevel; // NEW
	categoryColor?: string;
	onPress?: () => void;
	// Positioning props would be calculated by parent, passing style here
	style?: StyleProp<ViewStyle>;
}

export function TimeBlock({
	title,
	subtitle,
	type,
	categoryColor = colors.primary,
	onPress,
	style,
}: TimeBlockProps) {
	const isPredicted = type === "predicted";
	const isFlexible = type === "flexible";

	// Dynamic styles based on type
	const containerStyle = [
		styles.container,
		{ backgroundColor: isPredicted ? `${categoryColor}20` : categoryColor }, // 20 hex = ~12% opacity
		isFlexible && styles.flexibleContainer,
		isPredicted && styles.predictedContainer,
		style,
	];

	const textStyle = isPredicted
		? { color: colors.slate600 }
		: { color: colors.white };
	const subTextStyle = isPredicted
		? { color: colors.slate500 }
		: { color: "rgba(255,255,255,0.8)" };

	return (
		<TouchableOpacity
			activeOpacity={0.8}
			onPress={onPress}
			style={containerStyle}
		>
			<View style={styles.content}>
				<Text numberOfLines={1} style={[styles.title, textStyle]}>
					{title}
				</Text>
				{subtitle && (
					<Text numberOfLines={1} style={[styles.subtitle, subTextStyle]}>
						{subtitle}
					</Text>
				)}
			</View>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	container: {
		borderRadius: 12,
		padding: spacing.sm,
		overflow: "hidden",
		justifyContent: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2,
		borderLeftWidth: 4,
		borderLeftColor: "rgba(0,0,0,0.1)",
	},
	flexibleContainer: {
		borderStyle: "dashed",
		borderWidth: 2,
		borderColor: "rgba(255,255,255,0.5)",
		shadowOpacity: 0,
		elevation: 0,
	},
	predictedContainer: {
		borderStyle: "dotted",
		borderWidth: 2,
		borderColor: colors.slate300,
		shadowOpacity: 0,
		elevation: 0,
	},
	content: {
		flex: 1,
		justifyContent: "center",
	},
	title: {
		fontSize: 14,
		fontWeight: "600",
		marginBottom: 2,
	},
	subtitle: {
		fontSize: 11,
		fontWeight: "400",
	},
});
