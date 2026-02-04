 'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import ImageUpload from '@/components/ImageUpload';
import { useAuth } from '@/contexts/AuthContext';
import { storage, functions, db } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { addDoc, collection } from 'firebase/firestore';

interface ExtractedIngredient {
  name: string;
  quantity: number;
  unit: string;
  confidence: number;
}

export default function UploadPage() {
  return (
    <ProtectedRoute>
      <UploadContent />
    </ProtectedRoute>
  );
}

function UploadContent() {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<ExtractedIngredient[]>([]);

  async function handleImageUpload(file: File) {
    if (!user) return;

    setUploading(true);
    setError('');
    setSuccessMessage('');
    setIngredients([]);
    setImageUrl(null);

    try {
      const path = `users/${user.uid}/uploads/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setImageUrl(url);

      const analyzeImage = httpsCallable(functions, 'analyzeImage');
      const result = await analyzeImage({ imageUrl: url });
      const data = result.data as { success: boolean; ingredients: ExtractedIngredient[] };

      if (!data.success || !data.ingredients) {
        throw new Error('Image analysis failed');
      }

      setIngredients(data.ingredients);
    } catch (err: unknown) {
      console.error('Upload/analyze error:', err);
      setError('Failed to analyze image. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveToInventory() {
    if (!user || ingredients.length === 0) return;

    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const itemsCollection = collection(db, 'inventory', user.uid, 'items');

      await Promise.all(
        ingredients.map((ingredient) =>
          addDoc(itemsCollection, {
            userId: user.uid,
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            category: 'pantry',
            addedDate: new Date(),
            imageUrl: imageUrl || null,
          })
        )
      );

      setSuccessMessage('Ingredients saved to your inventory.');
    } catch (err: unknown) {
      console.error('Save to inventory error:', err);
      setError('Failed to save ingredients to inventory.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Upload Pantry Photo</h1>
        <p className="text-gray-600 mb-8">
          Upload a photo of your pantry or fridge. We&apos;ll analyze it and extract ingredients that you
          can add to your inventory with one click.
        </p>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-green-700">
            {successMessage}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 1: Upload an Image</h2>
          <ImageUpload onUpload={handleImageUpload} loading={uploading} />
        </div>

        {ingredients.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Step 2: Review Detected Ingredients ({ingredients.length})
              </h2>
              <button
                onClick={handleSaveToInventory}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Add All to Inventory'}
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ingredients.map((ingredient, index) => (
                <div
                  key={`${ingredient.name}-${index}`}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{ingredient.name}</h3>
                    <span className="rounded bg-orange-50 px-2 py-0.5 text-xs text-orange-700">
                      {(ingredient.confidence * 100).toFixed(0)}% confident
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {ingredient.quantity} {ingredient.unit}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

