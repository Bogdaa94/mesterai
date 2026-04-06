import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { saveConsent } from '../../firebase/firestore';
import { brand } from '../../theme/colors';

// ─── Checkbox ─────────────────────────────────────────────────────────────────

function Checkbox({
  checked,
  onToggle,
  label,
  required,
  colors,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  required: boolean;
  colors: any;
}) {
  return (
    <TouchableOpacity style={cbStyles.row} onPress={onToggle} activeOpacity={0.7}>
      <View
        style={[
          cbStyles.box,
          { borderColor: checked ? brand.orange : colors.border },
          checked && { backgroundColor: brand.orange },
        ]}
      >
        {checked && <Text style={cbStyles.check}>✓</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[cbStyles.label, { color: colors.textPrimary, fontFamily: 'DMSans_400Regular' }]}>
          {label}
          {required && <Text style={{ color: brand.orange }}> *</Text>}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const cbStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, gap: 12 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  check: { color: '#fff', fontSize: 13, fontWeight: '700' },
  label: { fontSize: 14, lineHeight: 20 },
});

// ─── ConsentScreen ────────────────────────────────────────────────────────────

interface Props {
  onConsentSaved?: () => void;
}

export default function ConsentScreen({ onConsentSaved }: Props) {
  const { colors } = useTheme();
  const { user, signOut } = useAuth();

  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [busy, setBusy] = useState(false);

  const canProceed = terms && privacy && aiProcessing && ageConfirmed;

  const s = styles(colors);

  const handleAccept = async () => {
    if (!canProceed) {
      Alert.alert('Consimțământ necesar', 'Te rugăm să accepți toate condițiile obligatorii.');
      return;
    }
    if (!user) return;

    setBusy(true);
    try {
      await saveConsent(user.uid, {
        terms,
        privacy,
        ai_processing: aiProcessing,
        age_confirmed: ageConfirmed,
        marketing,
        version: '1.0',
      });
      onConsentSaved?.();
    } catch {
      Alert.alert('Eroare', 'Nu am putut salva consimțământul. Încearcă din nou.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[s.container]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.logoRow}>
          <Text style={s.logoText}>Mester</Text>
          <View style={s.dot} />
          <Text style={s.logoText}>AI</Text>
        </View>

        <Text style={s.title}>Înainte să începem</Text>
        <Text style={s.subtitle}>
          Pentru a utiliza Mester AI avem nevoie de acordul tău. Câmpurile marcate cu{' '}
          <Text style={{ color: brand.orange }}>*</Text> sunt obligatorii.
        </Text>

        {/* Consimțăminte */}
        <View style={s.card}>
          <Checkbox
            checked={terms}
            onToggle={() => setTerms(!terms)}
            label="Am citit și accept Termenii și Condițiile de utilizare ale Mester AI."
            required
            colors={colors}
          />
          <Checkbox
            checked={privacy}
            onToggle={() => setPrivacy(!privacy)}
            label="Am citit și accept Politica de Confidențialitate și prelucrarea datelor personale."
            required
            colors={colors}
          />
          <Checkbox
            checked={aiProcessing}
            onToggle={() => setAiProcessing(!aiProcessing)}
            label="Înțeleg că descrierile problemelor mele sunt procesate de un model AI pentru a genera soluții, și că răspunsurile sunt orientative, nu sfaturi profesionale."
            required
            colors={colors}
          />
          <Checkbox
            checked={ageConfirmed}
            onToggle={() => setAgeConfirmed(!ageConfirmed)}
            label="Confirm că am cel puțin 16 ani și că datele mele pot fi prelucrate conform GDPR."
            required
            colors={colors}
          />
          <Checkbox
            checked={marketing}
            onToggle={() => setMarketing(!marketing)}
            label="Accept să primesc comunicări de marketing și oferte personalizate (opțional)."
            required={false}
            colors={colors}
          />
        </View>

        <Text style={s.note}>
          Poți retrage consimțământul oricând din Profil → Setări cont. Datele obligatorii sunt necesare pentru funcționarea aplicației.
        </Text>
      </ScrollView>

      {/* Footer */}
      <View style={[s.footer, { backgroundColor: colors.bgPage }]}>
        <TouchableOpacity
          style={[s.btnAccept, !canProceed && { opacity: 0.45 }]}
          onPress={handleAccept}
          disabled={busy || !canProceed}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.btnAcceptText}>Acceptă și continuă</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={s.btnDecline} onPress={signOut}>
          <Text style={s.btnDeclineText}>Nu sunt de acord — Ieși</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function styles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPage },
    scroll: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 24 },
    logoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    logoText: {
      fontFamily: 'Syne_800ExtraBold',
      fontSize: 26,
      color: colors.textPrimary,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: brand.orange,
      marginHorizontal: 3,
      marginBottom: 3,
    },
    title: {
      fontFamily: 'Syne_800ExtraBold',
      fontSize: 24,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 10,
    },
    subtitle: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 21,
    },
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    note: {
      fontFamily: 'DMSans_300Light',
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 18,
      textAlign: 'center',
      marginBottom: 8,
    },
    footer: {
      paddingHorizontal: 24,
      paddingBottom: 36,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    btnAccept: {
      backgroundColor: brand.orange,
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: 'center',
      marginBottom: 10,
    },
    btnAcceptText: {
      fontFamily: 'Syne_700Bold',
      fontSize: 16,
      color: '#fff',
    },
    btnDecline: {
      alignItems: 'center',
      paddingVertical: 10,
    },
    btnDeclineText: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      color: colors.textSecondary,
    },
  });
}
