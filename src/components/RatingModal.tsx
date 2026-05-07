import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { brand } from '../theme/colors';
import { submitRating, checkAlreadyRated } from '../firebase/firestore';
import { useTheme } from '../context/ThemeContext';

// ── Props ─────────────────────────────────────────────────────────────────────

interface RatingModalProps {
  visible:      boolean;
  mesterId:     string;
  mesterUserId: string;
  mesterName:   string;
  userId:       string;
  onClose:      () => void;
  onSuccess:    () => void;
}

// ── Star labels ───────────────────────────────────────────────────────────────

const STAR_LABELS = ['', 'Slab', 'Acceptabil', 'Bun', 'Foarte bun', 'Excelent!'];

// ── Component ─────────────────────────────────────────────────────────────────

export default function RatingModal({
  visible,
  mesterId,
  mesterUserId,
  mesterName,
  userId,
  onClose,
  onSuccess,
}: RatingModalProps) {
  const { colors }                      = useTheme();
  const [selectedStar, setSelectedStar] = useState(0);
  const [comment, setComment]           = useState('');
  const [submitting, setSubmitting]     = useState(false);

  const handleSubmit = async () => {
    if (selectedStar === 0) return;
    setSubmitting(true);
    try {
      const alreadyRated = await checkAlreadyRated(mesterId, userId);
      if (alreadyRated) {
        Alert.alert('Deja evaluat', 'Ai lăsat deja un rating pentru acest meșter.');
        handleClose();
        return;
      }
      await submitRating({
        mesterId,
        mesterUserId,
        userId,
        rating:  selectedStar,
        comment: comment.trim() || undefined,
      });
      onSuccess();
      setSelectedStar(0);
      setComment('');
    } catch {
      Alert.alert('Eroare', 'Nu am putut trimite ratingul. Încearcă din nou.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedStar(0);
    setComment('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.bgCard }]}>
          <View style={styles.handle} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>Evaluează meșterul</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{mesterName}</Text>

          {/* 5 stele interactive */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setSelectedStar(star)} activeOpacity={0.7}>
                <Ionicons
                  name={star <= selectedStar ? 'star' : 'star-outline'}
                  size={38}
                  color="#F9A825"
                />
              </TouchableOpacity>
            ))}
          </View>

          {selectedStar > 0 && (
            <Text style={[styles.starLabel, { color: colors.textSecondary }]}>
              {STAR_LABELS[selectedStar]}
            </Text>
          )}

          {/* Comentariu opțional */}
          <TextInput
            style={[
              styles.commentInput,
              {
                backgroundColor: colors.bgPage,
                color:            colors.textPrimary,
                borderColor:      colors.border,
              },
            ]}
            placeholder="Comentariu opțional (max 150 caractere)"
            placeholderTextColor={colors.textSecondary}
            value={comment}
            onChangeText={(t) => setComment(t.slice(0, 150))}
            multiline
            numberOfLines={3}
            maxLength={150}
            textAlignVertical="top"
          />
          <Text style={[styles.charCount, { color: colors.textSecondary }]}>
            {comment.length}/150
          </Text>

          <TouchableOpacity
            style={[styles.submitBtn, { opacity: selectedStar > 0 && !submitting ? 1 : 0.4 }]}
            onPress={handleSubmit}
            disabled={selectedStar === 0 || submitting}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitText}>Trimite rating</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={handleClose} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Anulează</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    padding:              24,
    paddingBottom:        36,
    gap:                  8,
  },
  handle: {
    width:       36,
    height:      4,
    borderRadius: 2,
    backgroundColor: '#ccc',
    alignSelf:   'center',
    marginBottom: 12,
  },
  title:    { fontFamily: 'Syne_700Bold',      fontSize: 18, textAlign: 'center', marginBottom: 2 },
  subtitle: { fontFamily: 'DMSans_400Regular', fontSize: 13, textAlign: 'center', marginBottom: 12 },
  starsRow: {
    flexDirection:  'row',
    justifyContent: 'center',
    gap:            10,
    marginBottom:   6,
  },
  starLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize:   14,
    textAlign:  'center',
    marginBottom: 8,
  },
  commentInput: {
    borderWidth:  1,
    borderRadius: 10,
    padding:      12,
    fontFamily:   'DMSans_400Regular',
    fontSize:     14,
    minHeight:    80,
    marginTop:    4,
  },
  charCount: {
    fontFamily: 'DMSans_400Regular',
    fontSize:   11,
    textAlign:  'right',
  },
  submitBtn: {
    backgroundColor: brand.orange,
    borderRadius:    12,
    paddingVertical: 14,
    alignItems:      'center',
    marginTop:       4,
  },
  submitText: { fontFamily: 'Syne_700Bold', fontSize: 15, color: '#fff' },
  cancelBtn:  { alignItems: 'center', paddingTop: 12 },
  cancelText: { fontFamily: 'DMSans_400Regular', fontSize: 14 },
});
