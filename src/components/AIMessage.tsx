import React, { useState } from 'react';
import { View, Image, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useTheme } from '../context/ThemeContext';
import { saveValidatedConversation, createReport } from '../firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { brand } from '../theme/colors';

interface Props {
  message: string;
  question?: string;   // întrebarea userului care a generat acest răspuns
  categoryId?: string; // pentru salvare în colecția corectă
}

export default function AIMessage({ message, question, categoryId }: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [voteState, setVoteState] = useState<'none' | 'up' | 'down'>('none');

  const showFeedback = !!question && !!categoryId;

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
    bullet_list_icon: { color: brand.orange },
    code_inline: {
      backgroundColor: colors.bgCard2,
      color: brand.orange,
      borderRadius: 4,
      padding: 2,
    },
  };

  const handleUp = async () => {
    if (voteState !== 'none') return;
    setVoteState('up');
    if (categoryId && question) {
      await saveValidatedConversation(categoryId, question, message).catch(() => {});
    }
  };

  const handleDown = async () => {
    if (voteState !== 'none') return;
    setVoteState('down');
    if (user) {
      await createReport({
        responseId: '',
        category: categoryId ?? '',
        reason: 'raspuns_nesatisfacator',
        details: message.slice(0, 200),
        reportedBy: user.uid,
      }).catch(() => {});
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* Bulă mesaj */}
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

      {/* Feedback */}
      {showFeedback && (
        <View style={styles.feedbackRow}>
          {voteState === 'none' ? (
            <>
              <TouchableOpacity style={styles.voteBtn} onPress={handleUp}>
                <Text style={[styles.voteBtnText, { color: colors.textSecondary }]}>👍 Util</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.voteBtn} onPress={handleDown}>
                <Text style={[styles.voteBtnText, { color: colors.textSecondary }]}>👎 Nu prea</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={[styles.thankText, { color: colors.textSecondary }]}>
              Mulțumim pentru feedback! 🙏
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  feedbackRow: {
    flexDirection: 'row',
    marginLeft: 38,
    marginTop: 4,
    gap: 8,
  },
  voteBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  voteBtnText: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
  },
  thankText: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    marginLeft: 4,
  },
});
