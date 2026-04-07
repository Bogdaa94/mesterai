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
  StyleSheet,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { brand } from '../theme/colors';
import { askMester, ChatMessage } from '../services/gemini';
import { saveProblem } from '../firebase/firestore';
import { HomeStackParamList } from '../navigation/AppNavigator';

// ── Category metadata ──────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  sanitare:    'Sanitare',
  electric:    'Electric',
  constructii: 'Construcții',
  gradina:     'Grădină',
  mobila:      'Mobilă',
};

// ── Types ──────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

type DiagRoute = RouteProp<HomeStackParamList, 'Diagnostic'>;
type DiagNav   = StackNavigationProp<HomeStackParamList, 'Diagnostic'>;

// ── Sub-components ─────────────────────────────────────────────────────────────

function UserBubble({ text, colors }: { text: string; colors: any }) {
  return (
    <View style={[bubbleStyles.userWrapper]}>
      <View style={bubbleStyles.userBubble}>
        <Text style={bubbleStyles.userText}>{text}</Text>
      </View>
    </View>
  );
}

function AIBubble({ text, colors }: { text: string; colors: any }) {
  return (
    <View style={bubbleStyles.aiWrapper}>
      <Image
        source={require('../assets/logo.png')}
        style={bubbleStyles.avatar}
        resizeMode="contain"
      />
      <View style={[bubbleStyles.aiBubble, { backgroundColor: colors.bgCard }]}>
        <Text style={[bubbleStyles.aiText, { color: colors.textPrimary }]}>{text}</Text>
      </View>
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

  aiWrapper: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, paddingHorizontal: 16 },
  avatar: { width: 28, height: 28, marginRight: 10, marginTop: 2, flexShrink: 0 },
  aiBubble: {
    flex: 1,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  aiText: { fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 21 },
});

// ── Main screen ────────────────────────────────────────────────────────────────

export default function DiagnosticScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<DiagNav>();
  const route = useRoute<DiagRoute>();
  const insets = useSafeAreaInsets();

  const { categoryId } = route.params;
  const categoryLabel = CATEGORY_LABELS[categoryId] ?? categoryId;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
  const [saved, setSaved] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  // Primul mesaj automat de la AI
  useEffect(() => {
    const greeting = `Bună! Sunt aici să te ajut cu ${categoryLabel}. Descrie-mi problema și rezolvăm împreună! 👇`;
    setMessages([{ id: '0', role: 'ai', text: greeting }]);
  }, [categoryLabel]);

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    scrollToBottom();

    try {
      const aiText = await askMester(text, categoryLabel, conversationHistory);

      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', text: aiText };
      setMessages(prev => [...prev, aiMsg]);

      const updatedHistory: ChatMessage[] = [
        ...conversationHistory,
        { role: 'user', text },
        { role: 'model', text: aiText },
      ];
      setConversationHistory(updatedHistory);
      scrollToBottom();

      // Salvare Firestore la primul schimb complet
      if (!saved && user) {
        setSaved(true);
        saveProblem(user.uid, {
          category: categoryId,
          description: text,
          aiResponse: aiText,
          resolved: false,
        }).catch(() => {});
      }
    } catch (error: unknown) {
      const errText = error instanceof Error ? error.message : String(error);
      console.error('DiagnosticScreen error:', errText);
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'ai', text: `Eroare: ${errText}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bgPage }]}>
      {/* Header — in afara KeyboardAvoidingView ca sa nu se miste */}
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
              ? <UserBubble key={msg.id} text={msg.text} colors={colors} />
              : <AIBubble key={msg.id} text={msg.text} colors={colors} />
          )}

          {loading && (
            <View style={bubbleStyles.aiWrapper}>
              <Image source={require('../assets/logo.png')} style={bubbleStyles.avatar} resizeMode="contain" />
              <View style={[bubbleStyles.aiBubble, { backgroundColor: colors.bgCard }]}>
                <ActivityIndicator size="small" color={brand.orange} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={[styles.inputBar, { backgroundColor: colors.bgApp, borderTopColor: colors.border, paddingBottom: insets.bottom || 12 }]}>
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
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && { opacity: 0.4 }]}
            onPress={handleSend}
            disabled={!input.trim() || loading}
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

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 8,
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
