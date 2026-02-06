'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import LoadingSpinner from '@/components/LoadingSpinner';

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: 'pantry' | 'fridge' | 'freezer';
  expiryDate?: string;
  imageUrl?: string | null;
  addedDate?: string;
}

export default function InventoryPage() {
  return (
    <ProtectedRoute>
      <InventoryContent />
    </ProtectedRoute>
  );
}

function InventoryContent() {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [newItem, setNewItem] = useState<Omit<InventoryItem, 'id'>>({
    name: '',
    quantity: 1,
    unit: '',
    category: 'pantry',
  });
  const [error, setError] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeError, setBarcodeError] = useState('');

  useEffect(() => {
    loadInventory();
  }, [user]);

  async function loadInventory() {
    if (!user) return;

    try {
      const itemsCollection = collection(db, 'inventory', user.uid, 'items');
      const q = query(itemsCollection, where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const inventoryItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as InventoryItem));
      setItems(inventoryItems);
    } catch (error) {
      console.error('Error loading inventory:', error);
      setError('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddItem() {
    if (!user || !newItem.name.trim()) return;

    try {
      const itemsCollection = collection(db, 'inventory', user.uid, 'items');
      const docRef = await addDoc(itemsCollection, {
        userId: user.uid,
        name: newItem.name.trim(),
        quantity: newItem.quantity,
        unit: newItem.unit.trim(),
        category: newItem.category,
        addedDate: new Date().toISOString(),
        imageUrl: newItem.imageUrl || null,
      });

      setItems([
        ...items,
        {
          id: docRef.id,
          ...newItem,
        },
      ]);

      setNewItem({
        name: '',
        quantity: 1,
        unit: '',
        category: 'pantry',
      });
    } catch (err) {
      console.error('Error adding item:', err);
      setError('Failed to add item');
    }
  }

  async function handleDeleteItem(itemId: string) {
    try {
      await deleteDoc(doc(db, 'inventory', user!.uid, 'items', itemId));
      setItems(items.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Error deleting item:', error);
      setError('Failed to delete item');
    }
  }

  async function handleBarcodeLookup() {
    const code = barcodeInput.trim().replace(/\D/g, '');
    if (!code || !user) return;
    setBarcodeLoading(true);
    setBarcodeError('');
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${code}.json`
      );
      const data = await res.json();
      if (data.status !== 1 || !data.product) {
        setBarcodeError('Product not found. Try another barcode.');
        setBarcodeLoading(false);
        return;
      }
      const p = data.product;
      const name =
        p.product_name_en || p.product_name || p.product_name_imported || 'Unknown product';
      const qtyStr = String(p.quantity || '1');
      const qtyMatch = qtyStr.match(/^([\d.]+)\s*(\w+)?$/);
      const quantity = qtyMatch ? parseFloat(qtyMatch[1]) || 1 : 1;
      const unit = (qtyMatch?.[2] || 'unit').toLowerCase();
      const itemsCollection = collection(db, 'inventory', user.uid, 'items');
      const docRef = await addDoc(itemsCollection, {
        userId: user.uid,
        name,
        quantity,
        unit,
        category: 'pantry',
        addedDate: new Date().toISOString(),
      });
      setItems([
        ...items,
        { id: docRef.id, name, quantity, unit, category: 'pantry' },
      ]);
      setBarcodeInput('');
    } catch (err) {
      console.error('Barcode lookup error:', err);
      setBarcodeError('Lookup failed. Check the barcode or try again.');
    } finally {
      setBarcodeLoading(false);
    }
  }

  async function handleUpdateItem(item: InventoryItem) {
    try {
      const { id, ...updateData } = item;
      await updateDoc(doc(db, 'inventory', user!.uid, 'items', id), updateData);
      setItems(items.map(i => i.id === id ? item : i));
      setEditingItem(null);
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Inventory Management</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Add by barcode */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Add by barcode
          </h2>
          <p className="text-sm text-gray-600 mb-3">
            Enter a product barcode to add it from the Open Food Facts database.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="e.g. 3017620422003"
              className="rounded-md border border-gray-300 px-3 py-2 w-48"
            />
            <button
              type="button"
              onClick={handleBarcodeLookup}
              disabled={barcodeLoading || !barcodeInput.trim()}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {barcodeLoading ? 'Looking up...' : 'Look up & add'}
            </button>
          </div>
          {barcodeError && (
            <p className="mt-2 text-sm text-red-600">{barcodeError}</p>
          )}
        </div>

        {/* Manual Add Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Add Item Manually
          </h2>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="e.g., Chicken breast"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Quantity</label>
              <input
                type="number"
                min={0}
                value={newItem.quantity}
                onChange={(e) =>
                  setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Unit</label>
              <input
                type="text"
                value={newItem.unit}
                onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="e.g., pcs, kg"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end">
            <div className="md:w-48">
              <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
              <select
                value={newItem.category}
                onChange={(e) =>
                  setNewItem({
                    ...newItem,
                    category: e.target.value as InventoryItem['category'],
                  })
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="pantry">Pantry</option>
                <option value="fridge">Fridge</option>
                <option value="freezer">Freezer</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="mt-2 inline-flex items-center rounded-lg bg-orange-600 px-6 py-2 text-sm font-medium text-white hover:bg-orange-700 md:mt-0"
            >
              Add Item
            </button>
          </div>
        </div>

        {/* Inventory List */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Current Inventory ({items.length} items)
          </h2>
          
          {items.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg mb-2">No items in inventory yet</p>
              <p className="text-sm">Upload a photo to get started!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map(item => (
                <InventoryCard
                  key={item.id}
                  item={item}
                  onDelete={handleDeleteItem}
                  onEdit={setEditingItem}
                />
              ))}
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {editingItem && (
          <EditModal
            item={editingItem}
            onSave={handleUpdateItem}
            onClose={() => setEditingItem(null)}
          />
        )}
      </div>
    </div>
  );
}

function InventoryCard({ 
  item, 
  onDelete, 
  onEdit 
}: { 
  item: InventoryItem; 
  onDelete: (id: string) => void;
  onEdit: (item: InventoryItem) => void;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-900">{item.name}</h3>
        <span className="text-xs px-2 py-1 bg-orange-100 text-orange-800 rounded">
          {item.category}
        </span>
      </div>
      <p className="text-gray-600 mb-3">
        {item.quantity} {item.unit}
      </p>
      {item.expiryDate && (
        <p className="text-sm text-gray-500 mb-3">
          Expires: {new Date(item.expiryDate).toLocaleDateString()}
        </p>
      )}
      <div className="flex space-x-2">
        <button
          onClick={() => onEdit(item)}
          className="flex-1 px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 transition"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="flex-1 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function EditModal({ 
  item, 
  onSave, 
  onClose 
}: { 
  item: InventoryItem; 
  onSave: (item: InventoryItem) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState(item);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Edit Item</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as 'pantry' | 'fridge' | 'freezer' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="pantry">Pantry</option>
              <option value="fridge">Fridge</option>
              <option value="freezer">Freezer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date (optional)</label>
            <input
              type="date"
              value={formData.expiryDate || ''}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={() => onSave(formData)}
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
