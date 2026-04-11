import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useTheme } from '../../context/ThemeContext';
import { ForumStackParamList } from '../../navigation/AppNavigator';

export default function PostDetailScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<StackNavigationProp<ForumStackParamList>>();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: colors.bgPage, paddingTop: insets.top }]}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
      </TouchableOpacity>
      <View style={styles.center}>
        <Ionicons name="chatbubble-outline" size={44} color={colors.textSecondary} style={{ marginBottom: 14 }} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>Detalii post</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>În curând</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:     { flex: 1 },
  back:     { padding: 16 },
  center:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  title:    { fontFamily: 'Syne_700Bold', fontSize: 20, marginBottom: 6 },
  subtitle: { fontFamily: 'DMSans_400Regular', fontSize: 14 },
});
