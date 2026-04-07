import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../context/ThemeContext';
import { brand } from '../theme/colors';
import { HomeStackParamList } from '../navigation/AppNavigator';

type CatRoute = RouteProp<HomeStackParamList, 'Category'>;
type CatNav   = StackNavigationProp<HomeStackParamList, 'Category'>;

export default function CategoryScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<CatNav>();
  const route = useRoute<CatRoute>();
  const { categoryId } = route.params;

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPage }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Categorie: {categoryId}</Text>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => navigation.navigate('Diagnostic', { categoryId })}
      >
        <Text style={styles.btnText}>Începe diagnosticul →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontFamily: 'Syne_700Bold', fontSize: 20, marginBottom: 24 },
  btn: {
    backgroundColor: brand.orange,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  btnText: { color: '#fff', fontFamily: 'Syne_700Bold', fontSize: 15 },
});
