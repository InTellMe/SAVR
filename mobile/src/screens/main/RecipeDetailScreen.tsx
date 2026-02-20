import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, StyleSheet } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { Recipe } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { MainStackParamList } from '../../navigation/MainNavigator';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Ionicons } from '@expo/vector-icons';
import { getRecipe } from '../../lib/db';

type RecipeDetailScreenRouteProp = RouteProp<MainStackParamList, 'RecipeDetail'>;

interface RecipeDetailScreenProps {
  route: RecipeDetailScreenRouteProp;
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

export default function RecipeDetailScreen({ route }: RecipeDetailScreenProps) {
  const { recipeId } = route.params;
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recipe, setRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    loadRecipe();
  }, [recipeId, user?.id]);

  const loadRecipe = async () => {
    if (!user) return;
    try {
      const dbRecipe = await getRecipe(recipeId);
      if (dbRecipe) {
        setRecipe(mapDbRecipeToMobile(dbRecipe));
      }
    } catch (error) {
      console.error('Error loading recipe:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!recipe) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Recipe not found</Text>
      </View>
    );
  }

  const totalTime = (recipe.prepTime ?? 0) + recipe.cookTime;
  const ingredientsList = Array.isArray(recipe.ingredients)
    ? recipe.ingredients.map((ing) =>
        typeof ing === 'string' ? ing : `${ing.quantity} ${ing.unit} ${ing.name}`
      )
    : [];

  return (
    <ScrollView style={styles.container}>
      {recipe.imageUrl && (
        <Image source={{ uri: recipe.imageUrl }} style={styles.image} />
      )}

      <View style={styles.content}>
        <Text style={styles.title}>{recipe.title}</Text>
        {recipe.recipeType === 'pet' && (
          <View style={styles.petBanner}>
            <Text style={styles.petBannerText}>
              Safe for {recipe.species === 'cat' ? 'cats' : 'dogs'}. Always consult your vet. These are occasional supplements, not a complete diet.
            </Text>
          </View>
        )}
        <Text style={styles.description}>{recipe.description}</Text>

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Ionicons name="time" size={20} color="#ea580c" />
            <Text style={styles.metaText}>{totalTime} min</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="people" size={20} color="#ea580c" />
            <Text style={styles.metaText}>{recipe.servings} servings</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          {ingredientsList.map((line, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listItemText}>{line}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          {recipe.instructions.map((instruction, index) => (
            <View key={index} style={styles.instructionItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.instructionText}>{instruction}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  image: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 24,
  },
  meta: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  metaText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  bullet: {
    fontSize: 20,
    color: '#ea580c',
    marginRight: 12,
  },
  listItemText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ea580c',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  instructionText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#6b7280',
  },
  petBanner: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  petBannerText: {
    fontSize: 14,
    color: '#92400e',
  },
});
