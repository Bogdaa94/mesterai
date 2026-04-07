import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useTheme } from '../context/ThemeContext';

interface Props {
  message: string;
}

export default function AIMessage({ message }: Props) {
  const { colors } = useTheme();

  const markdownStyles = {
    body: {
      color: colors.textPrimary,
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      lineHeight: 22,
    },
    strong: {
      fontFamily: 'DMSans_500Medium',
      color: colors.textPrimary,
    },
    bullet_list: { color: colors.textPrimary },
    ordered_list: { color: colors.textPrimary },
    bullet_list_icon: { color: '#FF6B00' },
    code_inline: {
      backgroundColor: colors.bgCard2,
      color: '#FF6B00',
      borderRadius: 4,
      padding: 2,
    },
  };

  return (
    <View style={styles.row}>
      <Image
        source={require('../assets/logo.png')}
        style={styles.avatar}
        resizeMode="contain"
      />
      <View style={[styles.bubble, { backgroundColor: colors.bgCard }]}>
        <Markdown style={markdownStyles}>{message}</Markdown>
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
});
