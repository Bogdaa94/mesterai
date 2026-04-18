import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { usePro } from '../context/ProContext';
import { brand } from '../theme/colors';
import { askMester, ChatMessage } from '../services/gemini';
import { saveProblem } from '../firebase/firestore';
import { HomeStackParamList, HistoryStackParamList, RootStackParamList, DiagnosticParams } from '../navigation/AppNavigator';
import AIMessage from '../components/AIMessage';
import { useActivityTracker } from '../hooks/useActivityTracker';

// ── Category metadata ──────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  sanitare:    'Sanitare',
  electric:    'Electric',
  constructii: 'Construcții',
  gradina:     'Grădină',
  mobila:      'Mobilă',
};

const FREE_PHOTO_LIMIT = 1;

// ── Types ──────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  imageUri?: string;
  questionText?: string;
}

// DiagnosticScreen e folosit atât din HomeStack cât și din HistoryStack —
// ambele au același tip de params (DiagnosticParams)
type DiagRoute = RouteProp<{ Diagnostic: DiagnosticParams }, 'Diagnostic'>;
type DiagNav   = StackNavigationProp<RootStackParamList>;

// ── Sub-components ─────────────────────────────────────────────────────────────

function UserBubble({ text, imageUri }: { text: string; imageUri?: string; colors: any }) {
  return (
    <View style={bubbleStyles.userWrapper}>
      {imageUri && (
        <Image source={{ uri: imageUri }} style={bubbleStyles.userImage} resizeMode="cover" />
      )}
      {text ? (
        <View style={bubbleStyles.userBubble}>
          <Text style={bubbleStyles.userText}>{text}</Text>
        </View>
      ) : null}
    </View>
  );
}

const bubbleStyles = StyleSheet.create({
  userWrapper: { alignItems: 'flex-end', marginBottom: 12, paddingHorizontal: 16 },
  userBubble: {
    backgroundColor: brand.orange,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '80%',
  },
  userText: { color: '#fff', fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 20 },
  userImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 2,
    borderColor: brand.orange,
  },

  aiWrapper: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, paddingHorizontal: 16 },
  avatar: { width: 28, height: 28, marginRight: 10, marginTop: 2, flexShrink: 0 },
  aiBubble: {
    flex: 1,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});

// ── Main screen ────────────────────────────────────────────────────────────────

export default function DiagnosticScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { isPro, dailyCount, freeLimit, hasReachedLimit, increment } = usePro();
  const { t, i18n } = useTranslation();
  const ping = useActivityTracker(user?.uid);
  const navigation = useNavigation<DiagNav>();
  const route = useRoute<DiagRoute>();
  const insets = useSafeAreaInsets();

  const { categoryId, description: historyDesc, aiResponse: historyAI } = route.params;
  const categoryLabel = CATEGORY_LABELS[categoryId] ?? categoryId;
  const isFromHistory = !!(historyDesc && historyAI);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
  const [saved, setSaved] = useState(isFromHistory); // deja salvată

  // Foto state
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const [pendingImageBase64, setPendingImageBase64] = useState<string | null>(null);
  const [photoCount, setPhotoCount] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup interval la unmount
  useEffect(() => {
    return () => {
      if (typewriterRef.current) clearInterval(typewriterRef.current);
    };
  }, []);

  // Inițializare mesaje — greeting nou sau conversație reluată din Istoric
  useEffect(() => {
    if (isFromHistory && historyDesc && historyAI) {
      setMessages([
        { id: '0', role: 'user', text: historyDesc },
        { id: '1', role: 'ai',   text: historyAI   },
      ]);
      setConversationHistory([
        { role: 'user',  text: historyDesc },
        { role: 'model', text: historyAI  },
      ]);
    } else {
      const greeting = t('diagnostic.greeting', { category: categoryLabel });
      setMessages([{ id: '0', role: 'ai', text: greeting }]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToBottom = () => {
    scrollRef.current?.scrollToEnd({ animated: false });
  };

  // ── Typewriter ────────────────────────────────────────────────────────────────

  const updateLastAiMessage = (text: string) => {
    setMessages(prev => {
      const copy = [...prev];
      const lastIdx = copy.length - 1;
      if (lastIdx >= 0 && copy[lastIdx].role === 'ai') {
        copy[lastIdx] = { ...copy[lastIdx], text };
      }
      return copy;
    });
  };

  const typeMessage = (fullText: string, onDone: () => void) => {
    // Anulează orice interval anterior
    if (typewriterRef.current) clearInterval(typewriterRef.current);

    let index = 0;
    typewriterRef.current = setInterval(() => {
      index += 3;
      updateLastAiMessage(fullText.substring(0, index));
      scrollToBottom();
      if (index >= fullText.length) {
        clearInterval(typewriterRef.current!);
        typewriterRef.current = null;
        updateLastAiMessage(fullText); // text complet la final
        scrollToBottom();
        onDone();
      }
    }, 16); // ~60fps
  };

  // ── Photo picker ─────────────────────────────────────────────────────────────

  const handlePickPhoto = async () => {
    if (!isPro && photoCount >= FREE_PHOTO_LIMIT) {
      Alert.alert(
        t('diagnostic.photoLimit'),
        t('diagnostic.photoLimitMsg', { limit: FREE_PHOTO_LIMIT }),
        [{ text: t('common.ok') }]
      );
      return;
    }

    Alert.alert(
      t('diagnostic.addPhoto'),
      '',
      [
        { text: t('diagnostic.camera'),  onPress: () => openPicker('camera') },
        { text: t('diagnostic.gallery'), onPress: () => openPicker('gallery') },
        { text: t('diagnostic.cancel'),  style: 'cancel' },
      ]
    );
  };

  const openPicker = async (source: 'camera' | 'gallery') => {
    let result: ImagePicker.ImagePickerResult;

    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisiune necesară', 'Activează accesul la cameră din setări.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: true,
      });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisiune necesară', 'Activează accesul la galerie din setări.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: true,
      });
    }

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPendingImageUri(asset.uri);
      setPendingImageBase64(asset.base64 ?? null);
    }
  };

  const removePendingImage = () => {
    setPendingImageUri(null);
    setPendingImageBase64(null);
  };

  // ── Validare input ────────────────────────────────────────────────────────────

  const sanitizeAndValidate = (
    raw: string
  ): { safe: boolean; sanitized: string } => {
    const manipulationPatterns = [
      /ignor[aă].*(instruc|prompt|regul)/i,
      /system\s*prompt/i,
      /jailbreak/i,
      /pretinde\s*că\s*ești/i,
      /fără\s*restricții/i,
      /\bDAN\b|\bAIM\b|\bSTAN\b|\bDUDE\b/,
      /act\s*as\s*if/i,
      /ignore\s*previous/i,
    ];

    if (manipulationPatterns.some(p => p.test(raw))) {
      return { safe: false, sanitized: raw };
    }

    const sanitized = raw
      .replace(/\b\d{13}\b/g, '[date eliminate]')
      .replace(/(\+40|0)[0-9]{9}/g, '[telefon eliminat]')
      .replace(/[\w.-]+@[\w.-]+\.\w+/g, '[email eliminat]');

    return { safe: true, sanitized };
  };

  // ── Mic ──────────────────────────────────────────────────────────────────────

  const handleMic = () => {
    if (!isPro) {
      navigation.navigate('Paywall');
      return;
    }
    Alert.alert('🎤', t('diagnostic.comingSoon'));
  };

  // ── Send ─────────────────────────────────────────────────────────────────────

  const handleSend = async () => {
    const text = input.trim();
    if ((!text && !pendingImageUri) || loading) return;
    ping();

    // Verifică limita zilnică
    if (hasReachedLimit) {
      navigation.navigate('Paywall');
      return;
    }

    // Verifică lungimea maximă a mesajului
    if (text.length > 500) {
      Alert.alert(
        t('common.error'),
        t('diagnostic.messageTooLong', { max: 500 }),
      );
      return;
    }

    // Validare și sanitizare input
    if (text) {
      const { safe, sanitized: _ } = sanitizeAndValidate(text);
      if (!safe) {
        const safetyMsgId = Date.now().toString();
        setMessages(prev => [
          ...prev,
          { id: safetyMsgId, role: 'user', text },
          {
            id: (Date.now() + 1).toString(),
            role: 'ai',
            text: 'Pot ajuta doar cu probleme legate de locuință. Cu ce problemă din casă te pot ajuta? 🔧',
          },
        ]);
        setInput('');
        scrollToBottom();
        return;
      }
    }

    const { sanitized: sanitizedText } = sanitizeAndValidate(text);

    const imageUri = pendingImageUri;
    const imageBase64 = pendingImageBase64;
    const questionSnap = sanitizedText || 'Analiză foto';
    const aiMsgId = (Date.now() + 1).toString();

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: sanitizedText,
      imageUri: imageUri ?? undefined,
    };

    // Adaugă mesaj user + mesaj AI gol (placeholder)
    setMessages(prev => [
      ...prev,
      userMsg,
      { id: aiMsgId, role: 'ai', text: '', questionText: questionSnap },
    ]);
    setInput('');
    setPendingImageUri(null);
    setPendingImageBase64(null);
    setLoading(true);
    scrollToBottom();

    if (imageBase64) setPhotoCount(prev => prev + 1);

    try {
      const aiText = await askMester(
        sanitizedText || t('diagnostic.analyzePhoto'),
        categoryLabel,
        conversationHistory,
        imageBase64 ?? undefined,
        i18n.language
      );

      // Pornește efectul de typewriter; dezactivează loading când termină
      typeMessage(aiText, () => {
        setLoading(false);
      });

      // Incrementează contorul zilnic după răspuns reușit
      await increment();

      const updatedHistory: ChatMessage[] = [
        ...conversationHistory,
        { role: 'user', text: text || '[imagine trimisă]' },
        { role: 'model', text: aiText },
      ];
      setConversationHistory(updatedHistory);

      if (!saved && user) {
        setSaved(true);
        saveProblem(user.uid, {
          category: categoryId,
          description: text || '[diagnostic foto]',
          aiResponse: aiText,
          resolved: false,
        }).catch(() => {});
      }
    } catch (error: unknown) {
      const errText = error instanceof Error ? error.message : String(error);
      console.error('DiagnosticScreen error:', errText);
      updateLastAiMessage(`Eroare: ${errText}`);
      setLoading(false);
    }
  };

  const canSend = (!!input.trim() || !!pendingImageUri) && !loading;

  return (
    <View style={[styles.root, { backgroundColor: colors.bgPage }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.bgApp, borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Image source={require('../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{categoryLabel}</Text>
        <View style={{ flex: 1 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messageList}
          contentContainerStyle={[styles.messageContent, { paddingBottom: insets.bottom + 8 }]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
        >
          {messages.map(msg =>
            msg.role === 'user'
              ? <UserBubble key={msg.id} text={msg.text} imageUri={msg.imageUri} colors={colors} />
              : <AIMessage
                  key={msg.id}
                  message={msg.text}
                  question={msg.questionText}
                  categoryId={categoryId}
                />
          )}

          {/* Spinner cât timp răspunsul nu a sosit încă */}
          {loading && messages[messages.length - 1]?.text === '' && (
            <View style={bubbleStyles.aiWrapper}>
              <Image source={require('../assets/logo.png')} style={bubbleStyles.avatar} resizeMode="contain" />
              <View style={[bubbleStyles.aiBubble, { backgroundColor: colors.bgCard }]}>
                <ActivityIndicator size="small" color={brand.orange} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Banner limită zilnică — vizibil pentru Free users */}
        {!isPro && dailyCount > 0 && (
          <TouchableOpacity
            style={[
              styles.limitBanner,
              { backgroundColor: hasReachedLimit ? 'rgba(255,59,48,0.10)' : 'rgba(255,107,0,0.08)',
                borderColor: hasReachedLimit ? 'rgba(255,59,48,0.25)' : 'rgba(255,107,0,0.20)' },
            ]}
            onPress={() => navigation.navigate('Paywall')}
            activeOpacity={0.75}
          >
            <Text style={[styles.limitBannerText, { color: hasReachedLimit ? '#FF3B30' : brand.orange }]}>
              {hasReachedLimit
                ? t('diagnostic.limitReached', { limit: freeLimit })
                : t('diagnostic.dailyLimit', { count: dailyCount, limit: freeLimit })}
            </Text>
          </TouchableOpacity>
        )}

        {/* Image preview strip */}
        {pendingImageUri && (
          <View style={[styles.previewStrip, { backgroundColor: colors.bgApp, borderTopColor: colors.border }]}>
            <View style={styles.previewWrapper}>
              <Image source={{ uri: pendingImageUri }} style={styles.previewThumb} resizeMode="cover" />
              <TouchableOpacity style={styles.previewRemove} onPress={removePendingImage}>
                <Ionicons name="close-circle" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { backgroundColor: colors.bgApp, borderTopColor: colors.border, paddingBottom: insets.bottom || 12 }]}>
          {/* Mic */}
          <TouchableOpacity style={styles.iconBtn} onPress={handleMic}>
            <Ionicons
              name={isPro ? 'mic' : 'mic-outline'}
              size={22}
              color={isPro ? brand.orange : colors.textSecondary}
            />
          </TouchableOpacity>

          <TextInput
            style={[styles.input, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }]}
            placeholder="Descrie problema..."
            placeholderTextColor={colors.textSecondary}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            onSubmitEditing={handleSend}
          />

          {/* Camera */}
          <TouchableOpacity style={styles.iconBtn} onPress={handlePickPhoto}>
            <Ionicons
              name="camera-outline"
              size={22}
              color={photoCount >= FREE_PHOTO_LIMIT ? colors.textSecondary : brand.orange}
            />
          </TouchableOpacity>

          {/* Send */}
          <TouchableOpacity
            style={[styles.sendBtn, !canSend && { opacity: 0.4 }]}
            onPress={handleSend}
            disabled={!canSend}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  backBtn: { padding: 4 },
  headerLogo: { width: 36, height: 36 },
  headerTitle: { fontFamily: 'Syne_700Bold', fontSize: 17 },

  messageList: { flex: 1 },
  messageContent: { paddingTop: 16 },

  limitBanner: {
    marginHorizontal: 12,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  limitBannerText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    textAlign: 'center',
  },

  previewStrip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  previewWrapper: { position: 'relative', alignSelf: 'flex-start' },
  previewThumb: { width: 72, height: 72, borderRadius: 10 },
  previewRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
  },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 6,
  },
  iconBtn: {
    width: 36,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: brand.orange,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
