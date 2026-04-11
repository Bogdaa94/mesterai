import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { ProblemData } from '../firebase/firestore';
import { brand, categories as catColors } from '../theme/colors';
import { timeAgo } from '../utils/timeAgo';
import { HistoryStackParamList } from '../navigation/AppNavigator';

// ─── Config categorii ─────────────────────────────────────────────────────────

type CategoryId = 'sanitare' | 'electric' | 'constructii' | 'gradina' | 'mobila';

const CATEGORY_META: { id: CategoryId; label: string; emoji: string }[] = [
  { id: 'sanitare',    label: 'Sanitare',    emoji: '🔧' },
  { id: 'electric',    label: 'Electric',    emoji: '⚡' },
  { id: 'constructii', label: 'Construcții', emoji: '🏗️' },
  { id: 'gradina',     label: 'Grădină',     emoji: '🪴' },
  { id: 'mobila',      label: 'Mobilă',      emoji: '🪵' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Problem extends ProblemData {
  id: string;
}

interface SectionData {
  meta: typeof CATEGORY_META[0];
  data: Problem[];
  totalCount: number; // numărul real, indiferent de collapsed
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar({ total, resolved, inProgress, colors }: {
  total: number; resolved: number; inProgress: number; colors: any;
}) {
  const items = [
    { label: 'Total',    value: total      },
    { label: 'Rezolvate', value: resolved  },
    { label: 'În curs',  value: inProgress },
  ];
  return (
    <View style={[sb.bar, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          {i > 0 && <View style={[sb.div, { backgroundColor: colors.border }]} />}
          <View style={sb.item}>
            <Text style={[sb.value, { color: colors.textPrimary }]}>{item.value}</Text>
            <Text style={[sb.label, { color: colors.textSecondary }]}>{item.label}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const sb = StyleSheet.create({
  bar:   { flexDirection: 'row', borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
  item:  { flex: 1, alignItems: 'center', paddingVertical: 12 },
  value: { fontFamily: 'Syne_700Bold', fontSize: 20 },
  label: { fontFamily: 'DMSans_400Regular', fontSize: 11, marginTop: 2 },
  div:   { width: 1 },
});

// ─── Section header (colapsabil) ──────────────────────────────────────────────

function SectionHeader({
  meta, count, expanded, onToggle, colors,
}: {
  meta: typeof CATEGORY_META[0];
  count: number;
  expanded: boolean;
  onToggle: () => void;
  colors: any;
}) {
  const cat = catColors[meta.id as CategoryId] ?? { primary: brand.orange, light: 'rgba(255,107,0,0.1)' };
  return (
    <TouchableOpacity
      style={[sh.row, { backgroundColor: colors.bgPage }]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={[sh.iconWrap, { backgroundColor: cat.light }]}>
        <Text style={sh.emoji}>{meta.emoji}</Text>
      </View>
      <Text style={[sh.title, { color: colors.textPrimary }]}>
        {meta.label}
      </Text>
      <Text style={[sh.count, { color: cat.primary }]}>{count}</Text>
      <Ionicons
        name={expanded ? 'chevron-up' : 'chevron-down'}
        size={16}
        color={colors.textSecondary}
        style={{ marginLeft: 4 }}
      />
    </TouchableOpacity>
  );
}

const sh = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, gap: 10 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  emoji:    { fontSize: 16 },
  title:    { flex: 1, fontFamily: 'Syne_700Bold', fontSize: 15 },
  count:    { fontFamily: 'DMSans_500Medium', fontSize: 13 },
});

// ─── Problem card ─────────────────────────────────────────────────────────────

function ProblemCard({
  problem, onContinue, colors,
}: {
  problem: Problem;
  onContinue: (p: Problem) => void;
  colors: any;
}) {
  const title = problem.description.length > 80
    ? problem.description.slice(0, 80).trimEnd() + '…'
    : problem.description;

  return (
    <View style={[pc.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <View style={pc.topRow}>
        <Text style={[pc.title, { color: colors.textPrimary }]} numberOfLines={2}>{title}</Text>
        <View style={[pc.statusBadge, problem.resolved
          ? { backgroundColor: 'rgba(46,125,50,0.12)' }
          : { backgroundColor: 'rgba(255,107,0,0.10)' }
        ]}>
          <Text style={[pc.statusText, { color: problem.resolved ? '#2E7D32' : brand.orange }]}>
            {problem.resolved ? '✅ Rezolvat' : '⏳ În curs'}
          </Text>
        </View>
      </View>

      <Text style={[pc.date, { color: colors.textSecondary }]}>
        {problem.createdAt ? timeAgo(problem.createdAt) : '—'}
      </Text>

      <TouchableOpacity
        style={pc.continueBtn}
        onPress={() => onContinue(problem)}
        activeOpacity={0.75}
      >
        <Ionicons name="play-circle-outline" size={15} color={brand.orange} style={{ marginRight: 5 }} />
        <Text style={pc.continueBtnText}>Continuă conversația</Text>
      </TouchableOpacity>
    </View>
  );
}

const pc = StyleSheet.create({
  card:     { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 8 },
  topRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  title:    { flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 20 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  statusText:  { fontFamily: 'DMSans_500Medium', fontSize: 11 },
  date:     { fontFamily: 'DMSans_400Regular', fontSize: 12, marginBottom: 12 },
  continueBtn: { flexDirection: 'row', alignItems: 'center' },
  continueBtnText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: brand.orange },
});

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ colors, onStart }: { colors: any; onStart: () => void }) {
  return (
    <View style={es.wrap}>
      <Text style={es.emoji}>📋</Text>
      <Text style={[es.title, { color: colors.textPrimary }]}>Nicio problemă înregistrată încă</Text>
      <Text style={[es.sub, { color: colors.textSecondary }]}>
        Conversațiile tale cu Mester AI apar aici după prima întrebare.
      </Text>
      <TouchableOpacity style={es.btn} onPress={onStart} activeOpacity={0.85}>
        <Text style={es.btnText}>Începe o conversație</Text>
      </TouchableOpacity>
    </View>
  );
}

const es = StyleSheet.create({
  wrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 80 },
  emoji:   { fontSize: 48, marginBottom: 16 },
  title:   { fontFamily: 'Syne_700Bold', fontSize: 18, textAlign: 'center', marginBottom: 8 },
  sub:     { fontFamily: 'DMSans_400Regular', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  btn:     { backgroundColor: brand.orange, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 13 },
  btnText: { fontFamily: 'Syne_700Bold', fontSize: 15, color: '#fff' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<StackNavigationProp<HistoryStackParamList>>();
  const insets = useSafeAreaInsets();

  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);

  // Expanded state per categorie (toate expanded implicit)
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CATEGORY_META.map(c => [c.id, true]))
  );

  // ── Firestore listener ────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    const ref = collection(db, 'users', user.uid, 'problems');
    const q   = query(ref, orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...(d.data() as ProblemData) }));
      setProblems(data);
      setLoading(false);
    }, () => setLoading(false));

    return unsub;
  }, [user]);

  // ── Stats ────────────────────────────────────────────────────────────────

  const { total, resolved, inProgress } = useMemo(() => ({
    total:      problems.length,
    resolved:   problems.filter(p => p.resolved).length,
    inProgress: problems.filter(p => !p.resolved).length,
  }), [problems]);

  // ── Groupare pe categorii ────────────────────────────────────────────────

  const sections: SectionData[] = useMemo(() => {
    const grouped: Record<string, Problem[]> = {};
    for (const p of problems) {
      const cat = p.category ?? 'alte';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    }
    return CATEGORY_META
      .filter(meta => (grouped[meta.id]?.length ?? 0) > 0)
      .map(meta => ({ meta, data: grouped[meta.id] ?? [], totalCount: grouped[meta.id]?.length ?? 0 }));
  }, [problems]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const toggleSection = (id: string) =>
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const handleContinue = (problem: Problem) => {
    navigation.navigate('Diagnostic', {
      categoryId:  problem.category,
      problemId:   problem.id,
      description: problem.description,
      aiResponse:  problem.aiResponse,
    });
  };

  const handleGoHome = () => {
    // Navighează la tab-ul Acasă
    navigation.getParent()?.navigate('Acasă' as any);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bgPage, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={brand.orange} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bgPage }]}>
      <SectionList
        sections={sections.map(s => ({
          ...s,
          data: expanded[s.meta.id] ? s.data : [], // gol = collapsat
        }))}
        keyExtractor={item => item.id}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 },
          problems.length === 0 && { flex: 1 },
        ]}
        ListHeaderComponent={
          <>
            {/* ── Header ─────────────────────────────────────────────────── */}
            <View style={styles.pageHeader}>
              <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>📋 Istoricul meu</Text>
              <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
                Toate problemele tale
              </Text>
            </View>

            {/* ── Stats bar ──────────────────────────────────────────────── */}
            {problems.length > 0 && (
              <StatsBar
                total={total}
                resolved={resolved}
                inProgress={inProgress}
                colors={colors}
              />
            )}
          </>
        }
        renderSectionHeader={({ section }) => {
          const s = section as unknown as SectionData;
          return (
            <SectionHeader
              meta={s.meta}
              count={s.totalCount}
              expanded={expanded[s.meta.id]}
              onToggle={() => toggleSection(s.meta.id)}
              colors={colors}
            />
          );
        }}
        renderItem={({ item }) => (
          <ProblemCard
            problem={item}
            onContinue={handleContinue}
            colors={colors}
          />
        )}
        ListEmptyComponent={
          problems.length === 0 ? (
            <EmptyState colors={colors} onStart={handleGoHome} />
          ) : null
        }
        SectionSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { paddingHorizontal: 16 },

  pageHeader:   { marginBottom: 20 },
  pageTitle:    { fontFamily: 'Syne_800ExtraBold', fontSize: 24, marginBottom: 4 },
  pageSubtitle: { fontFamily: 'DMSans_400Regular', fontSize: 14 },
});
