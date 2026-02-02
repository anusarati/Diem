import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

type Props = {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
};

export function SegmentedControl({ options, selected, onSelect }: Props) {
  return (
    <View style={styles.wrap}>
      {options.map((opt) => (
        <Pressable
          key={opt}
          onPress={() => onSelect(opt)}
          style={[styles.option, selected === opt && styles.optionSelected]}
        >
          <Text style={[styles.text, selected === opt && styles.textSelected]}>{opt}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 48,
    flexDirection: 'row',
    backgroundColor: 'rgba(241, 245, 249, 0.6)',
    borderRadius: 16,
    padding: 6,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  optionSelected: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  text: { fontSize: 14, fontWeight: '700', color: '#94A3B8' },
  textSelected: { color: '#5DBA95' },
});
