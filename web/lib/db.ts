import { supabase } from './supabase';

// ============================================================================
// Type Definitions
// ============================================================================

export interface InventoryItem {
  id: string;
  user_id: string;
  name: string;
  quantity: number;
  unit: string;
  category: 'pantry' | 'fridge' | 'freezer' | string;
  location?: string;
  expiry_date?: string;
  image_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Recipe {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  ingredients: Array<{ name: string; quantity?: string; unit?: string }>;
  instructions: Array<{ step: number; text: string }>;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  servings?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  cuisine?: string;
  dietary_tags?: string[];
  nutritional_info?: Record<string, any>;
  image_url?: string;
  source_url?: string;
  is_ai_generated?: boolean;
  is_favorite?: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MealPlan {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  meals: Array<{
    date: string;
    meal_type: string;
    recipe_id?: string;
    recipe_title?: string;
  }>;
  dietary_preferences?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface GroceryList {
  id: string;
  user_id: string;
  title: string;
  items: Array<{
    name: string;
    quantity?: number;
    unit?: string;
    category?: string;
    checked?: boolean;
    notes?: string;
  }>;
  meal_plan_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface SharedRecipe {
  id: string;
  share_id: string;
  recipe_id: string;
  user_id: string;
  expires_at?: string;
  created_at: string;
}

export interface DataConsent {
  id: string;
  user_id: string;
  marketing_emails: boolean;
  data_usage_for_training: boolean;
  analytics_tracking: boolean;
  consent_version: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email?: string;
  display_name?: string;
  subscription_tier: string;
  subscription_status: string;
  dietary_preferences?: string[];
  allergens?: string[];
  preferences?: {
    cuisines?: string[];
    diets?: string[];
    restrictions?: string[];
    additionalNotes?: string;
  };
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Inventory Operations
// ============================================================================

export async function getInventory(userId: string): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function addInventoryItem(
  userId: string,
  item: Omit<InventoryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from('inventory')
    .insert({
      user_id: userId,
      ...item,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateInventoryItem(
  itemId: string,
  updates: Partial<Omit<InventoryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from('inventory')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteInventoryItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('inventory')
    .delete()
    .eq('id', itemId);
  
  if (error) throw error;
}

// ============================================================================
// Recipe Operations
// ============================================================================

export async function getRecipes(
  userId: string,
  filters?: { is_favorite?: boolean; search?: string }
): Promise<Recipe[]> {
  let query = supabase
    .from('recipes')
    .select('*')
    .eq('user_id', userId);
  
  if (filters?.is_favorite !== undefined) {
    query = query.eq('is_favorite', filters.is_favorite);
  }
  
  if (filters?.search) {
    query = query.ilike('title', `%${filters.search}%`);
  }
  
  query = query.order('created_at', { ascending: false });
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
}

export async function getRecipe(recipeId: string): Promise<Recipe | null> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', recipeId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

export async function addRecipe(
  userId: string,
  recipe: Omit<Recipe, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<Recipe> {
  const { data, error } = await supabase
    .from('recipes')
    .insert({
      user_id: userId,
      ...recipe,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateRecipe(
  recipeId: string,
  updates: Partial<Omit<Recipe, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<Recipe> {
  const { data, error } = await supabase
    .from('recipes')
    .update(updates)
    .eq('id', recipeId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteRecipe(recipeId: string): Promise<void> {
  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', recipeId);
  
  if (error) throw error;
}

export async function toggleRecipeFavorite(
  recipeId: string,
  isFavorite: boolean
): Promise<Recipe> {
  return updateRecipe(recipeId, { is_favorite: isFavorite });
}

// ============================================================================
// Meal Plan Operations
// ============================================================================

export async function getMealPlans(userId: string): Promise<MealPlan[]> {
  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function getMealPlan(planId: string): Promise<MealPlan | null> {
  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('id', planId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function addMealPlan(
  userId: string,
  plan: Omit<MealPlan, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<MealPlan> {
  const { data, error } = await supabase
    .from('meal_plans')
    .insert({
      user_id: userId,
      ...plan,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateMealPlan(
  planId: string,
  updates: Partial<Omit<MealPlan, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<MealPlan> {
  const { data, error } = await supabase
    .from('meal_plans')
    .update(updates)
    .eq('id', planId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteMealPlan(planId: string): Promise<void> {
  const { error } = await supabase
    .from('meal_plans')
    .delete()
    .eq('id', planId);
  
  if (error) throw error;
}

// ============================================================================
// Grocery List Operations
// ============================================================================

export async function getGroceryLists(userId: string): Promise<GroceryList[]> {
  const { data, error } = await supabase
    .from('grocery_lists')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function getGroceryList(listId: string): Promise<GroceryList | null> {
  const { data, error } = await supabase
    .from('grocery_lists')
    .select('*')
    .eq('id', listId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function addGroceryList(
  userId: string,
  list: Omit<GroceryList, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<GroceryList> {
  const { data, error } = await supabase
    .from('grocery_lists')
    .insert({
      user_id: userId,
      ...list,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateGroceryList(
  listId: string,
  updates: Partial<Omit<GroceryList, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<GroceryList> {
  const { data, error } = await supabase
    .from('grocery_lists')
    .update(updates)
    .eq('id', listId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteGroceryList(listId: string): Promise<void> {
  const { error } = await supabase
    .from('grocery_lists')
    .delete()
    .eq('id', listId);
  
  if (error) throw error;
}

// ============================================================================
// Chat History Operations
// ============================================================================

export async function getChatHistory(
  userId: string,
  limit: number = 50
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(limit);
  
  if (error) throw error;
  return data || [];
}

export async function addChatMessage(
  userId: string,
  message: Omit<ChatMessage, 'id' | 'user_id' | 'created_at'>
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('chat_history')
    .insert({
      user_id: userId,
      ...message,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteChatHistory(userId: string): Promise<void> {
  const { error } = await supabase
    .from('chat_history')
    .delete()
    .eq('user_id', userId);
  
  if (error) throw error;
}

// ============================================================================
// Shared Recipe Operations
// ============================================================================

export async function createSharedRecipe(
  userId: string,
  recipeId: string,
  shareId: string,
  expiresAt?: string
): Promise<SharedRecipe> {
  const { data, error } = await supabase
    .from('shared_recipes')
    .insert({
      user_id: userId,
      recipe_id: recipeId,
      share_id: shareId,
      expires_at: expiresAt,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getSharedRecipe(shareId: string): Promise<SharedRecipe | null> {
  const { data, error } = await supabase
    .from('shared_recipes')
    .select('*')
    .eq('share_id', shareId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

// ============================================================================
// Data Consent Operations
// ============================================================================

export async function getDataConsent(userId: string): Promise<DataConsent | null> {
  const { data, error } = await supabase
    .from('data_consent')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function upsertDataConsent(
  userId: string,
  consent: Omit<DataConsent, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<DataConsent> {
  const { data, error } = await supabase
    .from('data_consent')
    .upsert({
      user_id: userId,
      ...consent,
    }, { onConflict: 'user_id' })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============================================================================
// User Profile Operations
// ============================================================================

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'display_name' | 'dietary_preferences' | 'allergens' | 'preferences'>>
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============================================================================
// Realtime Subscriptions
// ============================================================================

export interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, any>;
  old: Record<string, any>;
  errors: any;
}

export function subscribeToInventory(
  userId: string,
  callback: (payload: RealtimePayload) => void
) {
  const channel = supabase
    .channel('inventory_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'inventory',
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}

export function subscribeToRecipes(
  userId: string,
  callback: (payload: RealtimePayload) => void
) {
  const channel = supabase
    .channel('recipes_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'recipes',
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}

export function subscribeToMealPlans(
  userId: string,
  callback: (payload: RealtimePayload) => void
) {
  const channel = supabase
    .channel('meal_plans_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'meal_plans',
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}

export function subscribeToGroceryLists(
  userId: string,
  callback: (payload: RealtimePayload) => void
) {
  const channel = supabase
    .channel('grocery_lists_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'grocery_lists',
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}

// ============================================================================
// Transfer Session Operations
// ============================================================================

export interface TransferSession {
  id: string;
  token: string;
  user_id: string;
  from_user_id?: string;
  to_user_id?: string;
  status: 'pending' | 'active' | 'completed' | 'expired' | 'cancelled';
  image_urls: string[];
  data_snapshot?: any;
  expires_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export async function getTransferSession(token: string): Promise<TransferSession | null> {
  const { data, error } = await supabase
    .from('transfer_sessions')
    .select('*')
    .eq('token', token)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

export async function updateTransferSession(
  token: string,
  updates: Partial<Pick<TransferSession, 'status' | 'image_urls' | 'completed_at'>>
): Promise<TransferSession> {
  const { data, error} = await supabase
    .from('transfer_sessions')
    .update(updates)
    .eq('token', token)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function addImageToTransferSession(
  token: string,
  imageUrl: string
): Promise<TransferSession> {
  // First get current image_urls
  const session = await getTransferSession(token);
  if (!session) throw new Error('Transfer session not found');
  
  const updatedUrls = [...(session.image_urls || []), imageUrl];
  
  return updateTransferSession(token, { image_urls: updatedUrls });
}
