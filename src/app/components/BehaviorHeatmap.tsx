import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { colors } from '../theme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOUR_LABELS = ['6a', '12p', '6p', '10p'];

/** Grid: rows = days (0=Mon), cols = time slots. value 0..1 = intensity. */
type Props = {
  data: number[][]; // data[dayIndex][hourSlotIndex], 0..1
  columnCount?: number;
};

function intensityToColor(intensity: number): string {
  if (intensity <= 0) return colors.slate50;
  const r = 93;
  const g = 186;
  const b = 149;
  const a = 0.2 + intensity * 0.8;
  return `rgba(${r},${g},${b},${a})`;
}

export function BehaviorHeatmap({ data, columnCount = 12 }: Props) {
  const { width: winW } = useWindowDimensions();
  const cellSize = Math.min(20, (Math.min(winW - 48, 320) - 36) / columnCount);
  const totalW = 28 + columnCount * cellSize;
  const rowCount = data.length;
  const totalH = 20 + rowCount * cellSize;

  return (
    <View style={[styles.wrap, { width: totalW }]}>
      <View style={styles.gridWrap}>
        {/* Day labels */}
        <View style={[styles.dayLabels, { height: rowCount * cellSize }]}>
          {DAYS.slice(0, rowCount).map((d) => (
            <Text key={d} style={styles.dayLabel}>
              {d}
            </Text>
          ))}
        </View>
        <View style={styles.grid}>
          {data.map((row, i) => (
            <View key={i} style={styles.row}>
              {row.map((val, j) => (
                <View
                  key={j}
                  style={[
                    styles.cell,
                    {
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: intensityToColor(val),
                    },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
      <View style={styles.hourLabels}>
        {HOUR_LABELS.map((h) => (
          <Text key={h} style={styles.hourLabel}>
            {h}
          </Text>
        ))}
      </View>
      <Text style={styles.caption}>Activity intensity by day & time (behavior model)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center', marginVertical: 8 },
  gridWrap: { flexDirection: 'row', alignItems: 'center' },
  dayLabels: { width: 28, justifyContent: 'space-evenly' },
  dayLabel: { fontSize: 9, fontWeight: '700', color: colors.slate500 },
  grid: {},
  row: { flexDirection: 'row' },
  cell: { borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.6)', borderRadius: 1 },
  hourLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 28,
  },
  hourLabel: { fontSize: 9, fontWeight: '600', color: colors.slate500 },
  caption: {
    fontSize: 10,
    color: colors.slate400,
    marginTop: 8,
    textAlign: 'center',
  },
});
