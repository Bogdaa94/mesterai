/**
 * LegalScreen — component reutilizabil pentru ecranele legale (Termeni / Confidențialitate).
 * Acceptă o listă de secțiuni tipizate și le randează uniform.
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useTheme } from '../context/ThemeContext';
import { brand } from '../theme/colors';

// ─── Section types ────────────────────────────────────────────────────────────

export type LegalSection =
  | { type: 'heading'; text: string }
  | { type: 'subheading'; text: string }
  | { type: 'body'; text: string }
  | { type: 'warning'; text: string }
  | { type: 'bullet'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'link'; text: string; url: string }
  | { type: 'spacer' };

interface Props {
  title: string;
  updatedAt: string;
  sections: LegalSection[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LegalScreen({ title, updatedAt, sections }: Props) {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const renderSection = (section: LegalSection, index: number) => {
    switch (section.type) {
      case 'heading':
        return (
          <Text key={index} style={[s.heading, { color: colors.textPrimary }]}>
            {section.text}
          </Text>
        );

      case 'subheading':
        return (
          <Text key={index} style={[s.subheading, { color: colors.textPrimary }]}>
            {section.text}
          </Text>
        );

      case 'body':
        return (
          <Text key={index} style={[s.body, { color: colors.textSecondary }]}>
            {section.text}
          </Text>
        );

      case 'warning':
        return (
          <View key={index} style={[s.warningBox, { backgroundColor: 'rgba(255,107,0,0.08)', borderColor: brand.orange }]}>
            <Text style={[s.warningText, { color: colors.textPrimary }]}>{section.text}</Text>
          </View>
        );

      case 'bullet':
        return (
          <View key={index} style={s.bulletList}>
            {section.items.map((item, i) => (
              <View key={i} style={s.bulletRow}>
                <Text style={[s.bulletDot, { color: brand.orange }]}>•</Text>
                <Text style={[s.bulletText, { color: colors.textSecondary }]}>{item}</Text>
              </View>
            ))}
          </View>
        );

      case 'table':
        return (
          <ScrollView key={index} horizontal showsHorizontalScrollIndicator={false} style={s.tableScroll}>
            <View style={[s.table, { borderColor: colors.border }]}>
              {/* Header row */}
              <View style={[s.tableRow, { backgroundColor: colors.bgCard2 }]}>
                {section.headers.map((h, i) => (
                  <View key={i} style={[s.tableCell, s.tableHeaderCell, i < section.headers.length - 1 && { borderRightWidth: 1, borderRightColor: colors.border }]}>
                    <Text style={[s.tableHeaderText, { color: colors.textPrimary }]}>{h}</Text>
                  </View>
                ))}
              </View>
              {/* Data rows */}
              {section.rows.map((row, ri) => (
                <View key={ri} style={[s.tableRow, ri < section.rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                  {row.map((cell, ci) => (
                    <View key={ci} style={[s.tableCell, ci < row.length - 1 && { borderRightWidth: 1, borderRightColor: colors.border }]}>
                      <Text style={[s.tableCellText, { color: colors.textSecondary }]}>{cell}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        );

      case 'link':
        return (
          <TouchableOpacity
            key={index}
            onPress={() => Linking.openURL(section.url).catch(() => {})}
            style={s.linkRow}
          >
            <Ionicons name="open-outline" size={14} color={brand.orange} style={{ marginRight: 4 }} />
            <Text style={[s.linkText, { color: brand.orange }]}>{section.text}</Text>
          </TouchableOpacity>
        );

      case 'spacer':
        return <View key={index} style={s.spacer} />;

      default:
        return null;
    }
  };

  return (
    <View style={[s.root, { backgroundColor: colors.bgPage }]}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={[s.header, { paddingTop: insets.top + 8, backgroundColor: colors.bgPage, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[s.headerSub, { color: colors.textSecondary }]}>Actualizat: {updatedAt}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section, i) => renderSection(section, i))}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontFamily: 'Syne_700Bold', fontSize: 17 },
  headerSub:   { fontFamily: 'DMSans_400Regular', fontSize: 11, marginTop: 2 },

  scroll: { paddingHorizontal: 20, paddingTop: 24 },

  heading: {
    fontFamily: 'Syne_700Bold',
    fontSize: 17,
    marginTop: 28,
    marginBottom: 8,
  },
  subheading: {
    fontFamily: 'Syne_700Bold',
    fontSize: 14,
    marginTop: 18,
    marginBottom: 6,
  },
  body: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },

  warningBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginVertical: 12,
  },
  warningText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 20,
  },

  bulletList: { marginBottom: 8 },
  bulletRow:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 5 },
  bulletDot:  { fontSize: 16, marginRight: 8, marginTop: -1 },
  bulletText: { fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 20, flex: 1 },

  tableScroll: { marginVertical: 12 },
  table: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  tableRow: { flexDirection: 'row' },
  tableCell: { padding: 10, minWidth: 120, maxWidth: 200 },
  tableHeaderCell: {},
  tableHeaderText: { fontFamily: 'DMSans_500Medium', fontSize: 12 },
  tableCellText:   { fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 17 },

  linkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 2 },
  linkText: { fontFamily: 'DMSans_500Medium', fontSize: 13 },

  spacer: { height: 12 },
});
