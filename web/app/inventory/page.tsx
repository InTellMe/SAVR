'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import ImageUpload from '@/components/ImageUpload';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { db, storage, functions } from '@/lib/firebase';
import LoadingSpinner from '@/components/LoadingSpinner';

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  expiryDate?: string;
  imageUrl?: string;
  createdAt: string;
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
  const [uploading, setUploading] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInventory();
  }, [user]);

  async function loadInventory() {
    if (!user) return;

    try {
      const q = query(collection(db, 'inventory'), where('userId', '==', user.uid));
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

  async function handleImageUpload(file: File) {
    if (!user) return;
    
    setUploading(true);
    setError('');

    try {
      // Upload image to Storage
      const storageRef = ref(storage, `inventory/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const imageUrl = await getDownloadURL(storageRef);

      // Call Cloud Function to analyze image
      const analyzeImage = httpsCallable(functions, 'analyzeImage');
      const result = await analyzeImage({ imageUrl });
      const data = result.data as { items: Array<{ name: string; quantity: number; unit: string; category: string }> };

      // Add items to Firestore
      const batch = data.items.map(item => 
        addDoc(collection(db, 'inventory'), {
          ...item,
          userId: user.uid,
          imageUrl,
          createdAt: new Date().toISOString(),
        })
      );

      await Promise.all(batch);
      await loadInventory();
    } catch (error) {
      console.error('Error analyzing image:', error);
      setError('Failed to analyze image. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteItem(itemId: string) {
    try {
      await deleteDoc(doc(db, 'inventory', itemId));
      setItems(items.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Error deleting item:', error);
      setError('Failed to delete item');
    }
  }

  async function handleUpdateItem(item: InventoryItem) {
    try {
      const { id, ...updateData } = item;
      await updateDoc(doc(db, 'inventory', id), updateData);
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

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Add Items from Photo
          </h2>
          <ImageUpload onUpload={handleImageUpload} loading={uploading} />
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
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
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
