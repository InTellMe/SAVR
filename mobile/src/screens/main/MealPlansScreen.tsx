import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getMealPlans } from '../../lib/db';
import { generateMealPlan } from '../../utils/api';

interface MealPlanMeal {
  date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | string;
  recipe_title?: string;
}

interface LocalMealPlan {
  id: string;
  start_date: string;
  meals: MealPlanMeal[];
}

export default function MealPlansScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [mealPlans, setMealPlans] = useState<LocalMealPlan[]>([]);

  useEffect(() => {
    loadMealPlans();
  }, [user]);

  const loadMealPlans = async () => {
    if (!user) return;

    try {
      const plans = await getMealPlans(user.id);
      setMealPlans(plans as LocalMealPlan[]);
    } catch (error) {
      Alert.alert('Error', 'Failed to load meal plans');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMealPlan = async () => {
    if (!user) return;

    try {
      setGenerating(true);
      await generateMealPlan({ days: 7 });
      Alert.alert('Success', 'Meal plan generated successfully!');
      loadMealPlans();
    } catch (error) {
      Alert.alert('Error', 'Failed to generate meal plan');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={mealPlans}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.mealPlanCard}>
            <View style={styles.dateContainer}>
              <Ionicons name="calendar" size={20} color="#ea580c" />
              <Text style={styles.date}>
                {new Date(item.start_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>
            <View style={styles.meals}>
              {item.meals?.find((meal) => meal.meal_type === 'breakfast') && (
                <View style={styles.mealItem}>
                  <Text style={styles.mealType}>🌅 Breakfast</Text>
                  <Text style={styles.mealTitle}>
                    {item.meals.find((meal) => meal.meal_type === 'breakfast')?.recipe_title || 'Planned meal'}
                  </Text>
                </View>
              )}
              {item.meals?.find((meal) => meal.meal_type === 'lunch') && (
                <View style={styles.mealItem}>
                  <Text style={styles.mealType}>☀️ Lunch</Text>
                  <Text style={styles.mealTitle}>
                    {item.meals.find((meal) => meal.meal_type === 'lunch')?.recipe_title || 'Planned meal'}
                  </Text>
                </View>
              )}
              {item.meals?.find((meal) => meal.meal_type === 'dinner') && (
                <View style={styles.mealItem}>
                  <Text style={styles.mealType}>🌙 Dinner</Text>
                  <Text style={styles.mealTitle}>
                    {item.meals.find((meal) => meal.meal_type === 'dinner')?.recipe_title || 'Planned meal'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>No meal plans yet</Text>
            <Text style={styles.emptySubtext}>Generate a meal plan to get started</Text>
          </View>
        }
        contentContainerStyle={mealPlans.length === 0 ? styles.emptyContainer : styles.listContent}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={handleGenerateMealPlan}
        disabled={generating}
      >
        {generating ? (
          <LoadingSpinner size="small" color="#fff" />
        ) : (
          <Ionicons name="add" size={32} color="#fff" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
  },
  mealPlanCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  date: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  meals: {
    gap: 12,
  },
  mealItem: {
    marginBottom: 8,
  },
  mealType: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ea580c',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
