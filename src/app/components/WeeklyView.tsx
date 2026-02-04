
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { colors, spacing } from '../theme';
import { TimeBlockProps } from './TimeBlock';

interface WeeklyViewProps {
    activities: TimeBlockProps[];
    startHour?: number;
    endHour?: number;
    onActivityPress?: (id: string) => void;
    onDayPress?: (dayIndex: number) => void;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOUR_HEIGHT = 40; // Smaller height for condensed view

export function WeeklyView({
    activities,
    startHour = 6,
    endHour = 23,
    onActivityPress,
    onDayPress,
}: WeeklyViewProps) {
    const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

    // Helper: Filter activities by day
    const getActivitiesForDay = (dayIndex: number) => {
        const dayLabel = DAYS[dayIndex];
        return activities.filter((a) => (a.day || 'Mon') === dayLabel); // Default to Mon if missing
    };

    const getPosition = (timeString: string, durationMinutes: number) => {
        const [h, m] = timeString.split(':').map(Number);
        const totalMinutesFromStart = (h - startHour) * 60 + m;
        const top = (totalMinutesFromStart / 60) * HOUR_HEIGHT;
        const height = (durationMinutes / 60) * HOUR_HEIGHT;
        return { top, height };
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <View style={styles.row}>
                {/* Time Labels Column */}
                <View style={styles.timeColumn}>
                    {hours.map((hour) => (
                        <Text key={hour} style={[styles.timeLabel, { top: (hour - startHour) * HOUR_HEIGHT }]}>
                            {hour}
                        </Text>
                    ))}
                </View>

                {/* Days Columns */}
                {DAYS.map((day, index) => (
                    <Pressable
                        key={day}
                        style={styles.dayColumn}
                        onPress={() => onDayPress?.(index)}
                    >
                        <Text style={styles.dayHeader}>{day}</Text>
                        <View style={styles.dayGrid}>
                            {hours.map((h) => (
                                <View key={h} style={[styles.gridCell, { height: HOUR_HEIGHT }]} />
                            ))}

                            {/* Render Activities for this day */}
                            {getActivitiesForDay(index).map((activity) => {
                                const { top, height } = getPosition(activity.startTime, activity.durationMinutes);
                                const isPredicted = activity.type === 'predicted';

                                return (
                                    <TouchableOpacity
                                        key={activity.id}
                                        onPress={() => onActivityPress?.(activity.id)}
                                        style={[
                                            styles.miniBlock,
                                            {
                                                top,
                                                height: Math.max(height - 2, 16),
                                                backgroundColor: activity.categoryColor || colors.primary,
                                                opacity: isPredicted ? 0.5 : 0.9,
                                            }
                                        ]}
                                    />
                                );
                            })}
                        </View>
                    </Pressable>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundLight },
    contentContainer: { paddingBottom: 100, paddingTop: spacing.md },
    row: { flexDirection: 'row' },
    timeColumn: {
        width: 30,
        marginTop: 24, // Offset for day header
        alignItems: 'center',
    },
    timeLabel: {
        position: 'absolute',
        fontSize: 10,
        color: colors.slate400,
        transform: [{ translateY: -6 }],
    },
    dayColumn: {
        flex: 1,
        alignItems: 'center',
        borderLeftWidth: 1,
        borderLeftColor: colors.slate100,
    },
    dayHeader: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.slate600,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    dayGrid: {
        width: '100%',
        position: 'relative',
    },
    gridCell: {
        width: '100%',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(241, 245, 249, 0.5)', // Very light divider
    },
    miniBlock: {
        position: 'absolute',
        left: 2,
        right: 2,
        borderRadius: 4,
        minHeight: 10,
    },
});

