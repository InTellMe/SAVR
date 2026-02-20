import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Alert, TouchableOpacity, Text, RefreshControl } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Recipe } from '../../types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainNavigator';
import LoadingSpinner from '../../components/LoadingSpinner';
import RecipeCard from '../../components/RecipeCard';
import { Ionicons } from '@expo/vector-icons';
import { getRecipes, getInventory } from '../../lib/db';
import { generateRecipes } from '../../utils/api';

type RecipesScreenNavigationProp = NativeStackNavigationProp<MainStackParamList, 'MainTabs'>;

interface RecipesScreenProps {
  navigation: RecipesScreenNavigationProp;
}

function mapDbRecipeToMobile(recipe: any): Recipe {
  const normalizedInstructions = Array.isArray(recipe.instructions)
    ? recipe.instructions.map((instruction: any) =>
        typeof instruction === 'string'
          ? instruction
          : instruction?.text || String(instruction ?? '')
      )
    : [];

  return {
    id: recipe.id,
    title: recipe.title || 'Untitled Recipe',
    description: recipe.description || '',
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    instructions: normalizedInstructions,
    prepTime: recipe.prep_time_minutes ?? recipe.prep_time,
    cookTime: recipe.cook_time_minutes ?? recipe.cook_time ?? 0,
    servings: recipe.servings ?? 1,
    difficulty: recipe.difficulty,
    cuisine: recipe.cuisine,
    dietaryTags: recipe.dietary_tags,
    imageUrl: recipe.image_url,
    createdAt: recipe.created_at,
    recipeType: 'human',
  };
}

export default function RecipesScreen({ navigation }: RecipesScreenProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  useEffect(() => {
    loadRecipes();
  }, [user]);

  const loadRecipes = async () => {
    if (!user) return;

    try {
      const recipeList = await getRecipes(user.id);
      setRecipes(recipeList.map(mapDbRecipeToMobile));
    } catch (error) {
      Alert.alert('Error', 'Failed to load recipes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRecipes();
  };

  const handleGenerateRecipes = async () => {
    if (!user) return;

    try {
      setGenerating(true);
      const inventoryItems = await getInventory(user.id);
      const ingredients = inventoryItems.map((item) => item.name).filter(Boolean);
      if (ingredients.length === 0) {
        Alert.alert('No ingredients', 'Add items to your pantry first.');
        setGenerating(false);
        return;
      }
      await generateRecipes({
        ingredients,
        preferences: { difficulty: 'medium' }
      });
      Alert.alert('Success', 'Recipe generated!');
      loadRecipes();
    } catch (error: any) {
      const msg = error?.message || 'Failed to generate recipe';
      Alert.alert('Error', msg.includes('limit') ? 'Monthly limit reached. Upgrade for more.' : msg);
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
        data={recipes}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ea580c']} />
        }
        renderItem={({ item }) => (
          <RecipeCard
            recipe={item}
            onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>No recipes yet</Text>
            <Text style={styles.emptySubtext}>Generate recipes from your pantry</Text>
          </View>
        }
        contentContainerStyle={recipes.length === 0 ? styles.emptyContainer : styles.listContent}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={handleGenerateRecipes}
        disabled={generating}
      >
        {generating ? (
          <LoadingSpinner size="small" color="#fff" />
        ) : (
          <Ionicons name="sparkles" size={32} color="#fff" />
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
