import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { brand } from '../theme/colors';

import AuthScreen from '../screens/auth/AuthScreen';
import ConsentScreen from '../screens/auth/ConsentScreen';
import HomeScreen from '../screens/HomeScreen';
import CategoryScreen from '../screens/CategoryScreen';
import DiagnosticScreen from '../screens/DiagnosticScreen';
import PaywallScreen from '../screens/PaywallScreen';
import SearchScreen from '../screens/SearchScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';

// ── Types ────────────────────────────────────────────────────────────────────

export type HomeStackParamList = {
  Home: undefined;
  Category: { categoryId: string };
  Diagnostic: { categoryId: string };
  Paywall: undefined;
};

export type TabParamList = {
  Acasă: undefined;
  Caută: undefined;
  Istoric: undefined;
  Profil: undefined;
};

const CONSENT_KEY = (uid: string) => `consent_given_${uid}`;

// ── Navigators ───────────────────────────────────────────────────────────────

const HomeStack = createStackNavigator<HomeStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();
const RootStack = createStackNavigator();

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
      <HomeStack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <HomeStack.Screen name="Category" component={CategoryScreen} options={{ title: 'Categorie' }} />
      <HomeStack.Screen name="Diagnostic" component={DiagnosticScreen} options={{ title: 'Diagnostic' }} />
      <HomeStack.Screen name="Paywall" component={PaywallScreen} options={{ title: '' }} />
    </HomeStack.Navigator>
  );
}

// ── Icon helper ───────────────────────────────────────────────────────────────

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: IoniconsName; inactive: IoniconsName }> = {
  'Acasă':  { active: 'home',   inactive: 'home-outline'   },
  'Caută':  { active: 'search', inactive: 'search-outline' },
  'Istoric':{ active: 'list',   inactive: 'list-outline'   },
  'Profil': { active: 'person', inactive: 'person-outline' },
};

function MainApp() {
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
      <Tab.Screen name="Caută"   component={SearchScreen} />
      <Tab.Screen name="Istoric" component={HistoryScreen} />
      <Tab.Screen name="Profil"  component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ── Root navigator ────────────────────────────────────────────────────────────

export default function AppNavigator() {
  const { colors } = useTheme();
  const { user, loading } = useAuth();
  const [consentGiven, setConsentGiven] = useState<boolean | null>(null);

  // Verifica consent din AsyncStorage (UX rapid)
  useEffect(() => {
    if (!user) {
      setConsentGiven(null);
      return;
    }
    AsyncStorage.getItem(CONSENT_KEY(user.uid)).then((val) => {
      setConsentGiven(val === 'true');
    });
  }, [user]);

  // Cand ConsentScreen salveaza cu succes, marcam in AsyncStorage
  useEffect(() => {
    if (!user) return;
    const checkFirestore = async () => {
      const { getUserProfile } = await import('../firebase/firestore');
      // Polling simplu: dupa login fara cache, verifica Firestore
      if (consentGiven === false) {
        // Va fi actualizat de ConsentScreen prin AsyncStorage
      }
    };
    checkFirestore();
  }, [user, consentGiven]);

  if (loading || (user && consentGiven === null)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgPage, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={brand.orange} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <RootStack.Screen name="Auth" component={AuthScreen} />
        ) : !consentGiven ? (
          <RootStack.Screen name="Consent">
            {() => <ConsentScreenWrapper onConsent={() => setConsentGiven(true)} userId={user.uid} />}
          </RootStack.Screen>
        ) : (
          <RootStack.Screen name="Main" component={MainApp} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

// ── ConsentScreen cu callback AsyncStorage ───────────────────────────────────

function ConsentScreenWrapper({ onConsent, userId }: { onConsent: () => void; userId: string }) {
  // Suprascriem saveConsent pentru a marca si in AsyncStorage
  const wrappedSave = async () => {
    await AsyncStorage.setItem(CONSENT_KEY(userId), 'true');
    onConsent();
  };

  return <ConsentScreen onConsentSaved={wrappedSave} />;
}
