'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import PolygonAnnotation from '@/components/PolygonAnnotation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { callApi } from '@/lib/api';
import { uploadLabelingImage, getPublicUrl } from '@/lib/storage';
import {
  WebImageDocument,
  WebAnnotationDocument,
  WebCategoryDocument,
  WebAnnotationObject,
} from '@/types';

export default function LabelingPage() {
  return (
    <ProtectedRoute>
      <LabelingContent />
    </ProtectedRoute>
  );
}

function LabelingContent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [image, setImage] = useState<WebImageDocument | null>(null);
  const [annotations, setAnnotations] = useState<WebAnnotationDocument[]>([]);
  const [categories, setCategories] = useState<WebCategoryDocument[]>([]);
  const [currentObjects, setCurrentObjects] = useState<WebAnnotationObject[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (categories.length === 0) {
      loadCategories();
    }
  }, []);

  const loadCategories = async () => {
    try {
      // Load default categories if none exist
      const defaultCategories: WebCategoryDocument[] = [
        { id: 'jar', name: 'Jar', color: '#3b82f6' },
        { id: 'can', name: 'Can', color: '#ef4444' },
        { id: 'box_cereal', name: 'Cereal Box', color: '#10b981' },
        { id: 'bottle', name: 'Bottle', color: '#f59e0b' },
        { id: 'package', name: 'Package', color: '#8b5cf6' },
        { id: 'bag', name: 'Bag', color: '#ec4899' },
        { id: 'container', name: 'Container', color: '#6366f1' },
      ];
      setCategories(defaultCategories);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!user) return;

    setLoading(true);
    setError('');
    setImage(null);
    setAnnotations([]);
    setCurrentObjects([]);

    try {
      // Upload image to Supabase Storage
      const filePath = await uploadLabelingImage(file);
      const url = getPublicUrl('labeling-images', filePath);

      // Get image dimensions
      const img = new Image();
      img.src = url;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Create image document
      const result = await callApi('/labeling/upload', {
        imageUrl: url,
        width: img.width,
        height: img.height,
        source: 'photo',
        autoLabel: true, // Automatically trigger AI labeling
      });

      const data = result as { success: boolean; imageId: string; image: WebImageDocument };
      if (!data.success) {
        throw new Error('Failed to upload image');
      }

      setImage(data.image);
      setImageUrl(url);

      // Wait a bit for AI inference, then load annotations
      setTimeout(() => {
        loadImageAnnotations(data.imageId);
      }, 2000);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload image');
    } finally {
      setLoading(false);
    }
  };

  const loadImageAnnotations = async (imageId: string) => {
    if (!user) return;

    try {
      const result = await callApi('/labeling/annotations', { imageId });
      const data = result as {
        success: boolean;
        image: WebImageDocument;
        annotations: WebAnnotationDocument[];
        categories: WebCategoryDocument[];
      };

      if (data.success) {
        setImage(data.image);
        setAnnotations(data.annotations);
        setCategories(data.categories);

        // Set current objects from latest annotation
        if (data.annotations.length > 0) {
          const latest = data.annotations[0];
          setCurrentObjects(latest.objects);
          setImageUrl(data.image.storagePathOriginal);
        }
      }
    } catch (err: any) {
      console.error('Failed to load annotations:', err);
      setError(err.message || 'Failed to load annotations');
    }
  };

  const handleSaveAnnotations = async () => {
    if (!user || !image || currentObjects.length === 0) return;

    setSaving(true);
    setError('');

    try {
      const parentAnnotationId = annotations.length > 0 ? annotations[0].id : undefined;

      const result = await callApi('/labeling/save-annotation', {
        imageId: image.id,
        objects: currentObjects,
        parentAnnotationId,
        status: 'submitted',
      });

      const data = result as { success: boolean; annotationId: string };
      if (data.success) {
        // Reload annotations
        await loadImageAnnotations(image.id);
        alert('Annotations saved successfully!');
      }
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to save annotations');
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerInference = async () => {
    if (!user || !image) return;

    setLoading(true);
    setError('');

    try {
      const result = await callApi('/labeling/segment', { imageId: image.id });

      const data = result as { success: boolean; annotationId: string };
      if (data.success) {
        // Wait a bit, then reload annotations
        setTimeout(() => {
          loadImageAnnotations(image.id);
        }, 2000);
      }
    } catch (err: any) {
      console.error('Inference error:', err);
      setError(err.message || 'Failed to run inference');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !image) {
    return (
      <div className="min-h-screen" style={{ background: '#000000' }}>
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-6">Image Labeling</h1>

        {error && (
          <div className="mb-4 p-4 border-red-500/20 bg-red-500/10 border text-red-400 rounded">
            {error}
          </div>
        )}

        {!image ? (
          <div className="glass-card rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Upload Image</h2>
            <input
              type="file"
              accept="image/*"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
              }}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="glass-card rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Annotate Image</h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleTriggerInference}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  >
                    {loading ? 'Running AI...' : 'Run AI Labeling'}
                  </button>
                  <button
                    onClick={handleSaveAnnotations}
                    disabled={saving || currentObjects.length === 0}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Annotations'}
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-[#9ca3c2] mb-2">Select Category for New Polygons</label>
                <select
                  value={selectedCategoryId}
                  onChange={e => setSelectedCategoryId(e.target.value)}
                  className="px-4 py-2 border border-white/6 rounded w-full max-w-xs bg-white/5 text-white"
                >
                  <option value="">Select a category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {imageUrl && (
                <PolygonAnnotation
                  imageUrl={imageUrl}
                  imageWidth={image.width}
                  imageHeight={image.height}
                  annotations={currentObjects}
                  categories={categories}
                  selectedCategoryId={selectedCategoryId}
                  onAnnotationsChange={setCurrentObjects}
                  onCategorySelect={setSelectedCategoryId}
                />
              )}

              <div className="mt-4">
                <p className="text-sm text-[#9ca3c2]">
                  Status: <span className="font-semibold">{image.labelStatus}</span>
                </p>
                <p className="text-sm text-[#9ca3c2]">
                  Objects labeled: {currentObjects.length}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
