import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteDoc, doc } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();

  const handleResetConsent = async () => {
    if (!user) return;
    Alert.alert(
      'Reset Consent',
      'Șterge consimțământul din AsyncStorage și Firestore?',
      [
        { text: 'Anulează', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              // AsyncStorage
              await AsyncStorage.removeItem(`consent_given_${user.uid}`);
              // Firestore
              await deleteDoc(doc(db, 'users', user.uid, 'compliance', 'consent'));
              Alert.alert('Done', 'Consent resetat. Repornește app-ul.');
            } catch (e) {
              Alert.alert('Eroare', String(e));
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPage }]}>
      <Text style={{ color: colors.textPrimary }}>Profil</Text>

      {/* DEV ONLY */}
      <TouchableOpacity
        style={[styles.devBtn, { borderColor: colors.border }]}
        onPress={handleResetConsent}
      >
        <Text style={styles.devBtnText}>🛠 Reset Consent (dev)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  devBtn: {
    marginTop: 24,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  devBtnText: { color: '#FF6B00', fontSize: 13, fontFamily: 'DMSans_400Regular' },
});
