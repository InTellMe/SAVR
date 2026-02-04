import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

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
  const callable = httpsCallable(functions, 'generateRecipes');
  return await callable(params || {});
};

export const generateMealPlan = async (params: GenerateMealPlanParams) => {
  const callable = httpsCallable(functions, 'generateMealPlan');
  return await callable(params);
};

export const chatWithAI = async (params: ChatWithAIParams) => {
  const callable = httpsCallable(functions, 'chatWithAI');
  return await callable(params);
};

export const analyzeImage = async (imageUrl: string) => {
  const callable = httpsCallable(functions, 'analyzeImage');
  return await callable({ imageUrl });
};
