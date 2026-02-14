import React from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, PanResponder } from 'react-native';
import { colors, spacing } from '../theme';
import { TimeBlock, TimeBlockProps } from './TimeBlock';

interface TimelineCanvasProps {
    activities: TimeBlockProps[];
    startHour?: number; // e.g. 6 for 6 AM
    endHour?: number;   // e.g. 23 for 11 PM
    onActivityPress?: (id: string) => void;
    onUpdateActivity?: (id: string, newStartTime: string) => void;
}

const HOUR_HEIGHT = 80;
const SNAP_INTERVAL_MINUTES = 15;
const PIXELS_PER_MINUTE = HOUR_HEIGHT / 60;
const SNAP_PIXELS = SNAP_INTERVAL_MINUTES * PIXELS_PER_MINUTE;

interface DraggableBlockProps extends TimeBlockProps {
    top: number;
    height: number;
    startHour: number;
    onUpdate: (id: string, newStartTime: string) => void;
    onDragStateChange?: (isDragging: boolean) => void;
}

function DraggableTimeBlock({ top, height, startHour, onUpdate, onDragStateChange, ...props }: DraggableBlockProps) {
    const pan = React.useRef(new Animated.ValueXY()).current;

    // We strictly track the vertical delta
    const panResponder = React.useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Only capture if moved vertically significantly
                const isVerticalDrag = Math.abs(gestureState.dy) > 5;
                if (isVerticalDrag) {
                    onDragStateChange?.(true);
                }
                return isVerticalDrag;
            },
            onPanResponderGrant: () => {
                pan.setOffset({
                    x: 0,
                    y: (pan.y as any)._value
                });
            },
            onPanResponderMove: Animated.event(
                [null, { dy: pan.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: (_, gestureState) => {
                pan.flattenOffset();

                // Calculate the visual delta applied
                const deltaY = gestureState.dy;
                const originalTop = top;
                const currentTop = originalTop + deltaY;

                // Snap logic
                const snappedTop = Math.round(currentTop / SNAP_PIXELS) * SNAP_PIXELS;

                // Convert back to time
                // totalPixels = snappedTop
                // minutesFromStart = totalPixels / PIXELS_PER_MINUTE
                const minutesFromStart = snappedTop / PIXELS_PER_MINUTE;
                const totalMinutes = (startHour * 60) + minutesFromStart;

                // Clamp to reasonable bounds (e.g. 0 to 24 hours)
                const clampedMinutes = Math.max(0, Math.min(23 * 60 + 45, totalMinutes));

                const newH = Math.floor(clampedMinutes / 60);
                const newM = Math.round(clampedMinutes % 60);
                const newTime = `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;

                // Animate snap visually
                Animated.spring(pan, {
                    toValue: { x: 0, y: snappedTop - originalTop },
                    useNativeDriver: false,
                    speed: 100 // Fast snap
                }).start();

                // Trigger update
                if (newTime !== props.startTime) {
                    onUpdate(props.id, newTime);
                }
                onDragStateChange?.(false);
            },
            onPanResponderTerminate: () => {
                // Return to original on cancel
                Animated.spring(pan, {
                    toValue: { x: 0, y: 0 },
                    useNativeDriver: false
                }).start();
                onDragStateChange?.(false);
            }
        })
    ).current;

    return (
        <Animated.View
            style={{
                position: 'absolute',
                left: 60,
                right: spacing.md,
                transform: [{ translateY: Animated.add(top, pan.y) }],
                height: Math.max(height - 4, 24),
                zIndex: 10, // Ensure drag is above grid
            }}
            {...panResponder.panHandlers}
        >
            <TimeBlock
                {...props}
                style={{ height: '100%' }} // Fill container
                onPress={() => props.onPress?.(props.id)}
            />
        </Animated.View>
    );
}

export function TimelineCanvas({
    activities,
    startHour = 6,
    endHour = 23,
    onActivityPress,
    onUpdateActivity
}: TimelineCanvasProps & { onUpdateActivity?: (id: string, newStartTime: string) => void }) {
    const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
    const [scrollingEnabled, setScrollingEnabled] = React.useState(true);

    // Helper to calculate position
    const getPosition = (timeString: string, durationMinutes: number) => {
        const [h, m] = timeString.split(':').map(Number);
        const totalMinutesFromStart = (h - startHour) * 60 + m;
        const top = (totalMinutesFromStart / 60) * HOUR_HEIGHT;
        const height = (durationMinutes / 60) * HOUR_HEIGHT;
        return { top, height };
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            scrollEnabled={scrollingEnabled}
        >
            <View style={styles.gridContainer}>
                {/* Render Grid Lines & Time Labels */}
                {hours.map((hour) => (
                    <View key={hour} style={[styles.hourRow, { height: HOUR_HEIGHT }]}>
                        <Text style={styles.timeLabel}>
                            {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                        </Text>
                        <View style={styles.gridLine} />
                    </View>
                ))}

                {/* Render Activities */}
                {activities.map((activity) => {
                    const { top, height } = getPosition(activity.startTime, activity.durationMinutes);
                    return (
                        <DraggableTimeBlock
                            key={activity.id + activity.startTime} // Key changes to reset position on update
                            {...activity}
                            top={top}
                            height={height}
                            startHour={startHour}
                            onPress={() => onActivityPress?.(activity.id)}
                            onUpdate={(id, time) => onUpdateActivity?.(id, time)}
                            onDragStateChange={(isDragging) => setScrollingEnabled(!isDragging)}
                        />
                    );
                })}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundLight,
    },
    contentContainer: {
        paddingBottom: 100, // Space for FAB/Bottom Nav
    },
    gridContainer: {
        position: 'relative',
        paddingTop: spacing.md,
    },
    hourRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: spacing.md,
    },
    timeLabel: {
        width: 45,
        fontSize: 12,
        color: colors.slate400,
        transform: [{ translateY: -8 }], // Center vertically with line
        textAlign: 'right',
        paddingRight: 8,
    },
    gridLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.slate200,
    },
    nowIndicator: {
        position: 'absolute',
        left: 50,
        right: 0,
        height: 2,
        backgroundColor: colors.red400,
        zIndex: 10,
    },
});
