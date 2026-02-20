'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { getGroceryLists, getRecipes, deleteGroceryList, updateGroceryList } from '@/lib/db';
import { callApi } from '@/lib/api';

interface GroceryItem {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  checked: boolean;
  notes?: string;
}

interface GroceryList {
  id: string;
  name: string;
  items: GroceryItem[];
  createdAt: string;
}

interface SimpleRecipe {
  id: string;
  title: string;
}

export default function GroceryListsPage() {
  return (
    <ProtectedRoute>
      <GroceryListsContent />
    </ProtectedRoute>
  );
}

function GroceryListsContent() {
  const { user } = useAuth();
  const [lists, setLists] = useState<GroceryList[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedList, setSelectedList] = useState<GroceryList | null>(null);
  const [error, setError] = useState('');
  const [recipes, setRecipes] = useState<SimpleRecipe[]>([]);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);

  useEffect(() => {
    loadGroceryLists();
    loadRecipes();
  }, [user]);

  async function loadGroceryLists() {
    if (!user) return;

    try {
      const groceryLists = await getGroceryLists(user.id);
      const mappedLists = groceryLists.map(list => ({
        id: list.id,
        name: list.title,
        items: (list.items || []).map((item: any) => ({
          name: item.name || '',
          quantity: item.quantity || 0,
          unit: item.unit || '',
          category: item.category || '',
          checked: item.checked || false,
        })),
        createdAt: list.created_at,
      } as GroceryList));
      setLists(mappedLists);
    } catch (error) {
      console.error('Error loading grocery lists:', error);
      setError('Failed to load grocery lists');
    } finally {
      setLoading(false);
    }
  }

  async function loadRecipes() {
    if (!user) return;

    try {
      const recipeList = await getRecipes(user.id);
      const simpleRecipes = recipeList.map(recipe => ({
        id: recipe.id,
        title: recipe.title,
      } as SimpleRecipe));
      setRecipes(simpleRecipes);
    } catch (err) {
      console.error('Error loading recipes for grocery lists:', err);
    }
  }

  async function handleGenerateList() {
    if (!user) return;

    if (selectedRecipeIds.length === 0) {
      setError('Select at least one recipe to generate a grocery list.');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const result = await callApi('/ai/create-grocery-list', {
        recipeIds: selectedRecipeIds,
      });

      const data = result as {
        success: boolean;
        listId: string;
        items: GroceryItem[];
      };

      if (!data.success) {
        throw new Error('Grocery list generation failed');
      }

      await loadGroceryLists();
    } catch (error: any) {
      console.error('Error generating grocery list:', error);
      const code = error?.code as string | undefined;
      if (code && code.includes('unauthenticated')) {
        setError('You must be signed in to generate grocery lists.');
      } else {
        setError('Failed to generate grocery list. Please try again.');
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleDeleteList(listId: string) {
    try {
      await deleteGroceryList(listId);
      setLists(lists.filter(list => list.id !== listId));
    } catch (error) {
      console.error('Error deleting grocery list:', error);
      setError('Failed to delete grocery list');
    }
  }

  async function handleToggleItem(listId: string, itemIndex: number) {
    try {
      const list = lists.find(l => l.id === listId);
      if (!list) return;

      const updatedItems = [...list.items];
      updatedItems[itemIndex].checked = !updatedItems[itemIndex].checked;

      await updateGroceryList(listId, { 
        items: updatedItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
          checked: item.checked,
          notes: item.notes,
        }))
      });

      setLists(lists.map(l => l.id === listId ? { ...l, items: updatedItems } : l));
      if (selectedList?.id === listId) {
        setSelectedList({ ...selectedList, items: updatedItems });
      }
    } catch (error) {
      console.error('Error updating item:', error);
      setError('Failed to update item');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: '#000000' }}>
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-8 flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-8">
        <div className="flex flex-col gap-6 mb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Grocery Lists</h1>
            <p className="mt-2 text-sm text-[#9ca3c2]">
              Select recipes to generate a smart grocery list from your saved meals.
            </p>
          </div>
          <button
            onClick={handleGenerateList}
            disabled={generating || selectedRecipeIds.length === 0}
            className="w-full md:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-black font-semibold rounded-lg hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] transition disabled:opacity-50 text-sm sm:text-base"
          >
            {generating ? 'Generating...' : 'Generate List'}
          </button>
        </div>

        {/* Recipe selection */}
        <div className="mb-8 rounded-lg glass-card p-6 shadow">
          <h2 className="mb-3 text-lg font-semibold text-white">Select recipes</h2>
          {recipes.length === 0 ? (
            <p className="text-sm text-[#9ca3c2]">
              You don&apos;t have any saved recipes yet. Generate recipes first to build grocery lists.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {recipes.map((recipe) => {
                const selected = selectedRecipeIds.includes(recipe.id);
                return (
                  <button
                    key={recipe.id}
                    type="button"
                    onClick={() =>
                      setSelectedRecipeIds((prev) =>
                        selected ? prev.filter((id) => id !== recipe.id) : [...prev, recipe.id]
                      )
                    }
                    className={`flex w-full items-start rounded-lg border p-3 text-left transition ${
                      selected
                        ? 'border-[#00d4ff] bg-[#00d4ff]/20'
                        : 'border-white/6 hover:border-[#00d4ff]/30 hover:bg-[#00d4ff]/10'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() =>
                        setSelectedRecipeIds((prev) =>
                          selected ? prev.filter((id) => id !== recipe.id) : [...prev, recipe.id]
                        )
                      }
                      className="mt-1 mr-3 h-4 w-4 accent-[#00d4ff]"
                    />
                    <span className="text-sm font-medium text-white">{recipe.title}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <div className="border-red-500/20 bg-red-500/10 border text-red-400 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {lists.length === 0 ? (
          <div className="glass-card rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-semibold text-white mb-2">No grocery lists yet</h2>
            <p className="text-[#9ca3c2] mb-6">
              Generate a smart grocery list based on your meal plans and current inventory!
            </p>
            <button
              onClick={handleGenerateList}
              disabled={generating}
              className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-black font-semibold rounded-lg hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] transition text-sm sm:text-base"
            >
              Generate Grocery List
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lists.map(list => (
              <GroceryListCard
                key={list.id}
                list={list}
                onView={setSelectedList}
                onDelete={handleDeleteList}
              />
            ))}
          </div>
        )}

        {/* Grocery List Details Modal */}
        {selectedList && (
          <GroceryListDetailsModal
            list={selectedList}
            onToggleItem={handleToggleItem}
            onClose={() => setSelectedList(null)}
          />
        )}
      </div>
    </div>
  );
}

function GroceryListCard({ 
  list, 
  onView, 
  onDelete 
}: { 
  list: GroceryList; 
  onView: (list: GroceryList) => void;
  onDelete: (id: string) => void;
}) {
  const checkedCount = list.items.filter(item => item.checked).length;
  const totalCount = list.items.length;

  return (
    <div className="glass-card rounded-lg shadow hover:shadow-lg transition p-6">
      <h3 className="text-xl font-semibold text-white mb-2">{list.name}</h3>
      <p className="text-sm text-[#9ca3c2] mb-4">
        Created {new Date(list.createdAt).toLocaleDateString()}
      </p>
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-[#9ca3c2]">Progress</span>
          <span className="text-white font-medium">{checkedCount}/{totalCount}</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-[#00d4ff] to-[#0099cc] h-2 rounded-full transition-all"
            style={{ width: `${(checkedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>
      
      <div className="flex space-x-2">
        <button
          onClick={() => onView(list)}
          className="flex-1 px-4 py-2 bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-black font-semibold rounded hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] transition"
        >
          View List
        </button>
        <button
          onClick={() => onDelete(list.id)}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function GroceryListDetailsModal({ 
  list, 
  onToggleItem,
  onClose 
}: { 
  list: GroceryList; 
  onToggleItem: (listId: string, itemIndex: number) => void;
  onClose: () => void;
}) {
  const categories = Array.from(new Set(list.items.map(item => item.category)));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="glass-card rounded-lg p-6 max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-3xl font-bold text-white">{list.name}</h2>
          <button
            onClick={onClose}
            className="text-[#9ca3c2] hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {categories.map(category => {
          const categoryItems = list.items
            .map((item, index) => ({ ...item, originalIndex: index }))
            .filter(item => item.category === category);

          return (
            <div key={category} className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3 capitalize">{category}</h3>
              <div className="space-y-2">
                {categoryItems.map((item) => (
                  <label
                    key={item.originalIndex}
                    className="flex items-center p-3 border border-white/6 rounded-lg hover:bg-white/5 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => onToggleItem(list.id, item.originalIndex)}
                      className="w-5 h-5 rounded mr-3 accent-[#00d4ff]"
                    />
                    <span className={`flex-1 ${item.checked ? 'line-through text-[#9ca3c2]' : 'text-white'}`}>
                      {item.name}
                    </span>
                    <span className="text-[#9ca3c2] text-sm">
                      {item.quantity} {item.unit}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}

        <button
          onClick={onClose}
          className="w-full mt-6 px-4 py-2 bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-black font-semibold rounded-md hover:shadow-[0_0_30px_rgba(0,212,255,0.4)]"
        >
          Close
        </button>
      </div>
    </div>
  );
}
