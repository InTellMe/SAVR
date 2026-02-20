import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainNavigator';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getInventory, getRecipes, getMealPlans } from '../../lib/db';

type HomeScreenNavigationProp = NativeStackNavigationProp<MainStackParamList, 'MainTabs'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { user, userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    inventoryCount: 0,
    recipesCount: 0,
    mealPlansCount: 0,
  });

  const loadStats = async () => {
    if (!user) return;

    try {
      const [inventory, recipes, mealPlans] = await Promise.all([
        getInventory(user.id),
        getRecipes(user.id),
        getMealPlans(user.id),
      ]);

      setStats({
        inventoryCount: inventory.length,
        recipesCount: recipes.length,
        mealPlansCount: mealPlans.length,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ea580c']} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {userData?.displayName || 'Chef'}! 👋</Text>
        <Text style={styles.subgreeting}>What would you like to cook today?</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="file-tray-full" size={32} color="#ea580c" />
          <Text style={styles.statNumber}>{stats.inventoryCount}</Text>
          <Text style={styles.statLabel}>Items in Pantry</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="restaurant" size={32} color="#ea580c" />
          <Text style={styles.statNumber}>{stats.recipesCount}</Text>
          <Text style={styles.statLabel}>Saved Recipes</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="calendar" size={32} color="#ea580c" />
          <Text style={styles.statNumber}>{stats.mealPlansCount}</Text>
          <Text style={styles.statLabel}>Meal Plans</Text>
        </View>
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('MainTabs' as any, { screen: 'Inventory' })}
        >
          <View style={styles.actionIconContainer}>
            <Ionicons name="camera" size={24} color="#fff" />
          </View>
          <View style={styles.actionText}>
            <Text style={styles.actionTitle}>Scan Pantry</Text>
            <Text style={styles.actionDescription}>Add items with your camera</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('MainTabs' as any, { screen: 'Recipes' })}
        >
          <View style={styles.actionIconContainer}>
            <Ionicons name="search" size={24} color="#fff" />
          </View>
          <View style={styles.actionText}>
            <Text style={styles.actionTitle}>Find Recipes</Text>
            <Text style={styles.actionDescription}>Discover recipes from your pantry</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('GroceryList')}
        >
          <View style={styles.actionIconContainer}>
            <Ionicons name="cart" size={24} color="#fff" />
          </View>
          <View style={styles.actionText}>
            <Text style={styles.actionTitle}>Grocery List</Text>
            <Text style={styles.actionDescription}>View your shopping list</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
        </TouchableOpacity>

        {userData?.subscriptionTier === 'pro' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Chat')}
          >
            <View style={[styles.actionIconContainer, styles.proIconContainer]}>
              <Ionicons name="chatbubbles" size={24} color="#fff" />
            </View>
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>AI Chef Chat</Text>
              <Text style={styles.actionDescription}>Ask our AI chef anything</Text>
            </View>
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 24,
    backgroundColor: '#fff',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subgreeting: {
    fontSize: 16,
    color: '#6b7280',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  quickActions: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ea580c',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  proIconContainer: {
    backgroundColor: '#7c3aed',
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  proBadge: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  proBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
