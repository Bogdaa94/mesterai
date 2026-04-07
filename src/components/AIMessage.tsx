import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface Props {
  message: string;
}

export default function AIMessage({ message }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <Image
        source={require('../assets/logo.png')}
        style={styles.avatar}
        resizeMode="contain"
      />
      <View style={[styles.bubble, { backgroundColor: colors.bgCard }]}>
        <Text style={[styles.text, { color: colors.textPrimary }]}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 28,
    height: 28,
    marginRight: 10,
    marginTop: 2,
    flexShrink: 0,
  },
  bubble: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  text: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 21,
  },
});
