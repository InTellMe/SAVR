import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/main/HomeScreen';
import InventoryScreen from '../screens/main/InventoryScreen';
import RecipesScreen from '../screens/main/RecipesScreen';
import RecipeDetailScreen from '../screens/main/RecipeDetailScreen';
import MealPlansScreen from '../screens/main/MealPlansScreen';
import GroceryListScreen from '../screens/main/GroceryListScreen';
import ChatScreen from '../screens/main/ChatScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

export type MainTabParamList = {
  Home: undefined;
  Inventory: undefined;
  Recipes: undefined;
  MealPlans: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
  RecipeDetail: { recipeId: string };
  GroceryList: undefined;
  Chat: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<MainStackParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Inventory') {
            iconName = focused ? 'file-tray-full' : 'file-tray-full-outline';
          } else if (route.name === 'Recipes') {
            iconName = focused ? 'restaurant' : 'restaurant-outline';
          } else if (route.name === 'MealPlans') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#ea580c',
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: '#ea580c',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="Inventory" component={InventoryScreen} />
      <Tab.Screen name="Recipes" component={RecipesScreen} />
      <Tab.Screen name="MealPlans" component={MealPlansScreen} options={{ title: 'Meal Plans' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="MainTabs" 
        component={MainTabs} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="RecipeDetail" 
        component={RecipeDetailScreen}
        options={{ 
          title: 'Recipe Details',
          headerStyle: { backgroundColor: '#ea580c' },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen 
        name="GroceryList" 
        component={GroceryListScreen}
        options={{ 
          title: 'Grocery List',
          headerStyle: { backgroundColor: '#ea580c' },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen 
        name="Chat" 
        component={ChatScreen}
        options={{ 
          title: 'AI Chef',
          headerStyle: { backgroundColor: '#ea580c' },
          headerTintColor: '#fff',
        }}
      />
    </Stack.Navigator>
  );
}
