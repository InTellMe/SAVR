import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Recipe } from '../types';

interface RecipeCardProps {
  recipe: Recipe;
  onPress: () => void;
}

export default function RecipeCard({ recipe, onPress }: RecipeCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {recipe.imageUrl && (
        <Image source={{ uri: recipe.imageUrl }} style={styles.image} />
      )}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{recipe.title}</Text>
        <Text style={styles.description} numberOfLines={2}>{recipe.description}</Text>
        <View style={styles.footer}>
          <View style={styles.iconText}>
            <Ionicons name="time-outline" size={16} color="#6b7280" />
            <Text style={styles.footerText}>{recipe.cookTime} min</Text>
          </View>
          <View style={styles.iconText}>
            <Ionicons name="people-outline" size={16} color="#6b7280" />
            <Text style={styles.footerText}>{recipe.servings} servings</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  image: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconText: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#6b7280',
  },
});
