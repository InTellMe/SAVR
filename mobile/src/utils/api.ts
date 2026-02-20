import { supabase } from '../config/supabase';

const API_BASE = process.env.EXPO_PUBLIC_APP_URL || 'http://localhost:3000';

export async function callApi(endpoint: string, data: any) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }
  
  const response = await fetch(`${API_BASE}/api${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }
  
  return response.json();
}

export interface GenerateRecipesParams {
  maxRecipes?: number;
}

export interface GenerateMealPlanParams {
  days: number;
}

export interface ChatWithAIParams {
  message: string;
}

export const generateRecipes = async (params?: GenerateRecipesParams) => {
  return await callApi('/ai/create-recipe', params || {});
};

export const generateMealPlan = async (params: GenerateMealPlanParams) => {
  return await callApi('/ai/create-meal-plan', params);
};

export const chatWithAI = async (params: ChatWithAIParams) => {
  return await callApi('/ai/chat', params);
};

export const analyzeImage = async (imageUrl: string) => {
  return await callApi('/ai/analyze-image', { imageUrl });
};
