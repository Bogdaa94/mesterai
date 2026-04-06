import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import { brand } from '../theme/colors';

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

// ── Navigators ───────────────────────────────────────────────────────────────

const HomeStack = createStackNavigator<HomeStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

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
  'Acasă':  { active: 'home',          inactive: 'home-outline'          },
  'Caută':  { active: 'search',        inactive: 'search-outline'        },
  'Istoric':{ active: 'list',          inactive: 'list-outline'          },
  'Profil': { active: 'person',        inactive: 'person-outline'        },
};

// ── Root navigator ────────────────────────────────────────────────────────────

export default function AppNavigator() {
  const { colors } = useTheme();

  return (
    <NavigationContainer>
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
    </NavigationContainer>
  );
}
