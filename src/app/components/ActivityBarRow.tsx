import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  label: string;
  value: string;
  color: string;
  percent: number;
};

export function ActivityBarRow({ label, value, color, percent }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={styles.label}>{label}</Text>
        </View>
        <Text style={styles.value}>{value}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 14, fontWeight: '700', color: '#475569' },
  value: { fontSize: 14, fontWeight: '700', color: '#475569' },
  track: {
    height: 16,
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 8 },
});
