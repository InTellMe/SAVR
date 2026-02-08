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
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <Navbar />

      <div className="container mx-auto px-4 pt-24 pb-8">
        <h1 className="text-3xl font-bold text-white mb-4">Upload Pantry Photo</h1>
        <p className="text-[#9ca3c2] mb-4">
          Upload a photo of your pantry or fridge. Our AI will analyze it and extract ingredients that you
          can add to your inventory with one click.
        </p>
        <div className="rounded-xl px-5 py-4 mb-8 text-sm" style={{ background: 'rgba(0, 212, 255, 0.06)', border: '1px solid rgba(0, 212, 255, 0.15)' }}>
          <p className="font-semibold text-[#00d4ff] mb-1">Tips for best results</p>
          <ul className="text-[#9ca3c2] space-y-1 list-disc list-inside">
            <li>Use good lighting and avoid blurry photos.</li>
            <li>Lay items out so labels are visible when possible.</li>
            <li>After analysis, review detected items — you can remove any that are wrong before saving.</li>
            <li>If something is missed, head to <span className="text-[#00d4ff]">Inventory</span> to add it manually or scan a barcode.</li>
          </ul>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-400">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 rounded border border-[#00bfa6]/20 bg-[#00bfa6]/10 px-4 py-3 text-[#00bfa6]">
            {successMessage}
          </div>
        )}

        <div className="glass-card rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Step 1: Upload an Image</h2>
          <ImageUpload onUpload={handleImageUpload} loading={uploading} />
        </div>

        {ingredients.length > 0 && (
          <div className="glass-card rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">
                Step 2: Review Detected Ingredients ({ingredients.length})
              </h2>
              <button
                onClick={handleSaveToInventory}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-black text-sm font-semibold hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Add All to Inventory'}
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ingredients.map((ingredient, index) => (
                <div
                  key={`${ingredient.name}-${index}`}
                  className="rounded-lg border border-white/6 p-4 hover:border-[#00d4ff]/30 transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-white">{ingredient.name}</h3>
                    <span className="rounded bg-[#00d4ff]/10 px-2 py-0.5 text-xs text-[#00d4ff]">
                      {(ingredient.confidence * 100).toFixed(0)}% confident
                    </span>
                  </div>
                  <p className="text-sm text-[#9ca3c2]">
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

