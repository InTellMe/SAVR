'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import LoadingSpinner from '@/components/LoadingSpinner';

interface GroceryItem {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  checked: boolean;
}

interface GroceryList {
  id: string;
  name: string;
  items: GroceryItem[];
  createdAt: string;
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

  useEffect(() => {
    loadGroceryLists();
  }, [user]);

  async function loadGroceryLists() {
    if (!user) return;

    try {
      const q = query(collection(db, 'groceryLists'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const groceryLists = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as GroceryList));
      setLists(groceryLists);
    } catch (error) {
      console.error('Error loading grocery lists:', error);
      setError('Failed to load grocery lists');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateList() {
    if (!user) return;

    setGenerating(true);
    setError('');

    try {
      const inventoryQuery = query(collection(db, 'inventory'), where('userId', '==', user.uid));
      const inventorySnap = await getDocs(inventoryQuery);
      const currentInventory = inventorySnap.docs.map(doc => ({
        name: doc.data().name,
        quantity: doc.data().quantity,
      }));

      const mealPlanQuery = query(collection(db, 'mealPlans'), where('userId', '==', user.uid));
      const mealPlanSnap = await getDocs(mealPlanQuery);
      const mealPlans = mealPlanSnap.docs.map(doc => doc.data());

      const createGroceryList = httpsCallable(functions, 'createGroceryList');
      const result = await createGroceryList({
        currentInventory,
        mealPlans,
      });

      const groceryListData = result.data as Omit<GroceryList, 'id'>;

      await addDoc(collection(db, 'groceryLists'), {
        ...groceryListData,
        userId: user.uid,
        createdAt: new Date().toISOString(),
      });

      await loadGroceryLists();
    } catch (error) {
      console.error('Error generating grocery list:', error);
      setError('Failed to generate grocery list. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleDeleteList(listId: string) {
    try {
      await deleteDoc(doc(db, 'groceryLists', listId));
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

      await updateDoc(doc(db, 'groceryLists', listId), {
        items: updatedItems,
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
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Grocery Lists</h1>
          <button
            onClick={handleGenerateList}
            disabled={generating}
            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
          >
            {generating ? 'Generating...' : '🛒 Generate List'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {lists.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No grocery lists yet</h2>
            <p className="text-gray-600 mb-6">
              Generate a smart grocery list based on your meal plans and current inventory!
            </p>
            <button
              onClick={handleGenerateList}
              disabled={generating}
              className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
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
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{list.name}</h3>
      <p className="text-sm text-gray-600 mb-4">
        Created {new Date(list.createdAt).toLocaleDateString()}
      </p>
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">Progress</span>
          <span className="text-gray-900 font-medium">{checkedCount}/{totalCount}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-orange-600 h-2 rounded-full transition-all"
            style={{ width: `${(checkedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>
      
      <div className="flex space-x-2">
        <button
          onClick={() => onView(list)}
          className="flex-1 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition"
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
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-3xl font-bold text-gray-900">{list.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
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
              <h3 className="text-lg font-semibold text-gray-900 mb-3 capitalize">{category}</h3>
              <div className="space-y-2">
                {categoryItems.map((item) => (
                  <label
                    key={item.originalIndex}
                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => onToggleItem(list.id, item.originalIndex)}
                      className="w-5 h-5 text-orange-600 rounded mr-3"
                    />
                    <span className={`flex-1 ${item.checked ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {item.name}
                    </span>
                    <span className="text-gray-600 text-sm">
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
          className="w-full mt-6 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
        >
          Close
        </button>
      </div>
    </div>
  );
}
