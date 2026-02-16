import { useCallback } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../../app/theme";
import { DraggableTimeBlock } from "./components/DraggableTimeBlock";
import { NowIndicator } from "./components/NowIndicator";
import type { Activity } from "./components/TimeBlock";

const HOUR_HEIGHT = 60;
const START_HOUR = 0;
const END_HOUR = 24;

type Props = {
	activities: Activity[];
	onUpdateActivity?: (id: string, newStartTime: string) => void;
	onActivityPress?: (id: string) => void;
};

export function TimelineCanvas({
	activities,
	onUpdateActivity,
	onActivityPress,
}: Props) {
	const hours = Array.from(
		{ length: END_HOUR - START_HOUR },
		(_, i) => i + START_HOUR,
	);

	const handleUpdate = useCallback(
		(id: string, newTime: string) => {
			if (onUpdateActivity) onUpdateActivity(id, newTime);
		},
		[onUpdateActivity],
	);

	return (
		<View style={styles.container}>
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={[
					styles.content,
					{ height: (END_HOUR - START_HOUR) * HOUR_HEIGHT },
				]}
				scrollEventThrottle={16}
				showsVerticalScrollIndicator={false}
			>
				{/* Background Grid */}
				{hours.map((hour) => (
					<View
						key={hour}
						style={[
							styles.hourRow,
							{ height: HOUR_HEIGHT, top: (hour - START_HOUR) * HOUR_HEIGHT },
						]}
					>
						<Text style={styles.timeLabel}>
							{hour === 0
								? "12 AM"
								: hour < 12
									? `${hour} AM`
									: hour === 12
										? "12 PM"
										: `${hour - 12} PM`}
						</Text>
						<View style={styles.gridLine} />
					</View>
				))}

				{/* Now Indicator */}
				<NowIndicator hourHeight={HOUR_HEIGHT} startHour={START_HOUR} />

				{/* Activities Layer */}
				{activities.map((activity) => (
					<DraggableTimeBlock
						key={activity.id}
						activity={activity}
						hourHeight={HOUR_HEIGHT}
						startHour={START_HOUR}
						onDragEnd={handleUpdate}
						onPress={onActivityPress}
					/>
				))}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.backgroundLight,
	},
	scrollView: {
		flex: 1,
	},
	content: {
		position: "relative",
	},
	hourRow: {
		position: "absolute",
		left: 0,
		right: 0,
		flexDirection: "row",
		alignItems: "flex-start",
		paddingLeft: spacing.md,
	},
	timeLabel: {
		width: 50,
		fontSize: 12,
		color: colors.slate400,
		marginTop: -6,
		textAlign: "right",
		paddingRight: 8,
	},
	gridLine: {
		flex: 1,
		height: 1,
		backgroundColor: colors.slate200,
	},
});
