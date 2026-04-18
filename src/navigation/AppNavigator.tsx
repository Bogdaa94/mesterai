import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { brand } from '../theme/colors';
import { useActivityTracker } from '../hooks/useActivityTracker';

import AuthScreen from '../screens/auth/AuthScreen';
import ConsentScreen from '../screens/auth/ConsentScreen';
import SplashScreen from '../screens/SplashScreen';
import HomeScreen from '../screens/HomeScreen';
import CategoryScreen from '../screens/CategoryScreen';
import DiagnosticScreen from '../screens/DiagnosticScreen';
import PaywallScreen from '../screens/PaywallScreen';
import ForumScreen from '../screens/ForumScreen';
import PostDetailScreen from '../screens/forum/PostDetailScreen';
import NewPostScreen from '../screens/forum/NewPostScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MesteriScreen from '../screens/MesteriScreen';
import FormularMesterScreen from '../screens/FormularMesterScreen';
import MesteriPoliticaScreen from '../screens/MesteriPoliticaScreen';
import SearchScreen from '../screens/SearchScreen';
import TermsScreen from '../screens/legal/TermsScreen';
import PrivacyScreen from '../screens/legal/PrivacyScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import {
  registerForPushNotifications,
  setupNotificationHandlers,
  NotificationNavigate,
} from '../services/notificationsService';

// ── Types ────────────────────────────────────────────────────────────────────

export type DiagnosticParams = {
  categoryId: string;
  // Opțional — trimis din HistoryScreen pentru a relua o conversație
  problemId?: string;
  description?: string;
  aiResponse?: string;
};

export type HomeStackParamList = {
  Home: undefined;
  Category: { categoryId: string };
  Diagnostic: DiagnosticParams;
  Search: undefined;
};

export type HistoryStackParamList = {
  HistoryMain: undefined;
  Diagnostic: DiagnosticParams;
};

export type ForumStackParamList = {
  ForumMain: undefined;
  PostDetail: { postId: string };
};

export type MesteriFormData = {
  name:        string;
  category:    string;
  location:    string;
  whatsapp:    string;
  description: string;
};

export type RootStackParamList = {
  MainTabs:        undefined;
  Paywall:         undefined;
  FiiMester:       undefined;
  MesteriPolitica: { formData: MesteriFormData };
  NewPost:         undefined;
  Terms:           undefined;
  Privacy:         undefined;
  Notifications:   undefined;
};

export type AuthStackParamList = {
  Auth: undefined;
  Consent: undefined;
  Main: undefined;
  Terms: undefined;
  Privacy: undefined;
};

export type TabParamList = {
  Acasă: undefined;
  Forum: undefined;
  Meșteri: undefined;
  Istoric: undefined;
  Profil: undefined;
};

type FlowState = 'loading' | 'auth' | 'consent' | 'splash' | 'main';

const CONSENT_KEY = (uid: string) => `consent_given_${uid}`;

// ── Navigators ───────────────────────────────────────────────────────────────

const HomeStack    = createStackNavigator<HomeStackParamList>();
const HistoryStack = createStackNavigator<HistoryStackParamList>();
const ForumStack   = createStackNavigator<ForumStackParamList>();
const MainStack    = createStackNavigator<RootStackParamList>();
const Tab          = createBottomTabNavigator<TabParamList>();
const AuthStack    = createStackNavigator<AuthStackParamList>();

function HomeStackNavigator() {
  const { colors } = useTheme();
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bgApp },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { color: colors.textPrimary },
        cardStyle: { backgroundColor: colors.bgPage },
      }}
    >
      <HomeStack.Screen name="Home"       component={HomeScreen}       options={{ headerShown: false }} />
      <HomeStack.Screen name="Category"   component={CategoryScreen}   options={{ title: 'Categorie' }} />
      <HomeStack.Screen name="Diagnostic" component={DiagnosticScreen} options={{ headerShown: false }} />
      <HomeStack.Screen name="Search"     component={SearchScreen}     options={{ headerShown: false }} />
    </HomeStack.Navigator>
  );
}

function HistoryStackNavigator() {
  const { colors } = useTheme();
  return (
    <HistoryStack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.bgPage },
      }}
    >
      <HistoryStack.Screen name="HistoryMain" component={HistoryScreen} />
      <HistoryStack.Screen name="Diagnostic"  component={DiagnosticScreen} />
    </HistoryStack.Navigator>
  );
}

function ForumStackNavigator() {
  return (
    <ForumStack.Navigator screenOptions={{ headerShown: false }}>
      <ForumStack.Screen name="ForumMain"  component={ForumScreen} />
      <ForumStack.Screen name="PostDetail" component={PostDetailScreen} />
    </ForumStack.Navigator>
  );
}

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: IoniconsName; inactive: IoniconsName }> = {
  'Acasă':   { active: 'home',        inactive: 'home-outline'        },
  'Forum':   { active: 'chatbubbles', inactive: 'chatbubbles-outline' },
  'Meșteri': { active: 'construct',   inactive: 'construct-outline'   },
  'Istoric': { active: 'list',        inactive: 'list-outline'        },
  'Profil':  { active: 'person',      inactive: 'person-outline'      },
};

function TabNavigator() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgNav,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: brand.orange,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          const name = focused ? icons.active : icons.inactive;
          return <Ionicons name={name} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Acasă"   component={HomeStackNavigator} />
      <Tab.Screen name="Forum"   component={ForumStackNavigator} />
      <Tab.Screen name="Meșteri" component={MesteriScreen} />
      <Tab.Screen name="Istoric" component={HistoryStackNavigator} />
      <Tab.Screen name="Profil"  component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ── Notification setup (inside NavigationContainer) ─────────────────────────

function NotificationSetup({ userId }: { userId: string }) {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    registerForPushNotifications(userId);

    const navigate: NotificationNavigate = (screen, params) => {
      if (screen === 'PostDetail') {
        // Navigate into Forum tab → PostDetail
        navigation.navigate('MainTabs');
        // Small delay so the tab renders before pushing
        setTimeout(() => {
          (navigation as any).navigate('Forum', {
            screen: 'PostDetail',
            params: { postId: params?.postId ?? '' },
          });
        }, 300);
      } else if (screen === 'Forum') {
        navigation.navigate('MainTabs');
      } else if (screen === 'Mesteri') {
        navigation.navigate('MainTabs');
      } else if (screen === 'Paywall') {
        navigation.navigate('Paywall');
      } else if (screen === 'Notifications') {
        navigation.navigate('Notifications');
      } else {
        navigation.navigate('MainTabs');
      }
    };

    return setupNotificationHandlers(navigate);
  }, [userId]);

  return null;
}

// MainTabsWithSetup renders the tab navigator AND the invisible notification
// setup component — both inside the MainStack context so useNavigation() works.
function MainTabsWithSetup({ userId }: { userId: string }) {
  return (
    <>
      <NotificationSetup userId={userId} />
      <TabNavigator />
    </>
  );
}

function MainApp({ userId }: { userId: string }) {
  const MainTabsComponent = React.useCallback(
    () => <MainTabsWithSetup userId={userId} />,
    [userId]
  );

  return (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      <MainStack.Screen name="MainTabs" component={MainTabsComponent} />
      <MainStack.Screen
        name="Paywall"
        component={PaywallScreen}
        options={{ presentation: 'modal' }}
      />
      <MainStack.Screen
        name="FiiMester"
        component={FormularMesterScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <MainStack.Screen
        name="MesteriPolitica"
        component={MesteriPoliticaScreen}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="NewPost"
        component={NewPostScreen}
        options={{ presentation: 'modal' }}
      />
      <MainStack.Screen name="Terms"         component={TermsScreen}         options={{ presentation: 'modal' }} />
      <MainStack.Screen name="Privacy"       component={PrivacyScreen}       options={{ presentation: 'modal' }} />
      <MainStack.Screen name="Notifications" component={NotificationsScreen} options={{ presentation: 'modal' }} />
    </MainStack.Navigator>
  );
}

// ── Root navigator ────────────────────────────────────────────────────────────

export default function AppNavigator() {
  const { colors } = useTheme();
  const { user, loading } = useAuth();
  const ping = useActivityTracker(user?.uid);

  const [flow, setFlow] = useState<FlowState>('loading');

  useEffect(() => {
    if (loading) {
      setFlow('loading');
      return;
    }
    if (!user) {
      setFlow('auth');
      return;
    }
    AsyncStorage.getItem(CONSENT_KEY(user.uid)).then((val) => {
      const hasConsent = val === 'true';
      setFlow(hasConsent ? 'main' : 'consent');
    });
  }, [user, loading]);

  if (flow === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgPage, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={brand.orange} />
      </View>
    );
  }

  if (flow === 'splash') {
    return <SplashScreen onFinish={() => setFlow('main')} />;
  }

  return (
    <NavigationContainer onStateChange={ping}>
      <AuthStack.Navigator screenOptions={{ headerShown: false }}>
        {flow === 'auth' ? (
          <AuthStack.Screen name="Auth" component={AuthScreen} />
        ) : flow === 'consent' ? (
          <>
            <AuthStack.Screen name="Consent">
              {() => (
                <ConsentScreenWrapper
                  userId={user!.uid}
                  onConsent={() => setFlow('splash')}
                />
              )}
            </AuthStack.Screen>
            <AuthStack.Screen name="Terms"   component={TermsScreen} />
            <AuthStack.Screen name="Privacy" component={PrivacyScreen} />
          </>
        ) : (
          <AuthStack.Screen name="Main">
            {() => <MainApp userId={user!.uid} />}
          </AuthStack.Screen>
        )}
      </AuthStack.Navigator>
    </NavigationContainer>
  );
}

// ── ConsentScreen cu salvare AsyncStorage ────────────────────────────────────

function ConsentScreenWrapper({ onConsent, userId }: { onConsent: () => void; userId: string }) {
  const wrappedSave = async () => {
    await AsyncStorage.setItem(CONSENT_KEY(userId), 'true');
    onConsent();
  };
  return <ConsentScreen onConsentSaved={wrappedSave} />;
}
