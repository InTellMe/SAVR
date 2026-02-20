import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image as RNImage,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { pickImageFromCamera, pickImageFromLibrary } from '../../utils/imageUtils';
import { uploadLabelingImage, getPublicUrl } from '../../utils/storage';
import PolygonAnnotation from '../../components/PolygonAnnotation';
import { callApi, callApiGet } from '../../utils/api';

interface AnnotationObject {
  id: string;
  categoryId: string;
  polygon: Array<{ x: number; y: number }>;
  attributes?: Record<string, any>;
}

interface Category {
  id: string;
  name: string;
  color?: string;
}

export default function LabelingScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string>('');
  const [imageId, setImageId] = useState<string>('');
  const [imageWidth, setImageWidth] = useState(1920);
  const [imageHeight, setImageHeight] = useState(1080);
  const [annotations, setAnnotations] = useState<AnnotationObject[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = () => {
    // Default categories
    const defaultCategories: Category[] = [
      { id: 'jar', name: 'Jar', color: '#3b82f6' },
      { id: 'can', name: 'Can', color: '#ef4444' },
      { id: 'box_cereal', name: 'Cereal Box', color: '#10b981' },
      { id: 'bottle', name: 'Bottle', color: '#f59e0b' },
      { id: 'package', name: 'Package', color: '#8b5cf6' },
      { id: 'bag', name: 'Bag', color: '#ec4899' },
      { id: 'container', name: 'Container', color: '#6366f1' },
    ];
    setCategories(defaultCategories);
  };

  const handleImagePick = async () => {
    if (!user) return;

    Alert.alert(
      'Select Image',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            try {
              const uri = await pickImageFromCamera();
              if (uri) await handleImageUpload(uri);
            } catch (error) {
              Alert.alert('Error', 'Failed to take photo');
            }
          },
        },
        {
          text: 'Choose from Library',
          onPress: async () => {
            try {
              const uri = await pickImageFromLibrary();
              if (uri) await handleImageUpload(uri);
            } catch (error) {
              Alert.alert('Error', 'Failed to pick image');
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleImageUpload = async (uri: string) => {
    if (!user) return;

    setLoading(true);
    try {
      // Upload to Supabase Storage
      const fileName = `${Date.now()}.jpg`;
      const filePath = await uploadLabelingImage(uri, fileName);
      const url = getPublicUrl('labeling-images', filePath);

      // Get image dimensions
      const { width, height } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        RNImage.getSize(
          url,
          (resolvedWidth, resolvedHeight) => resolve({ width: resolvedWidth, height: resolvedHeight }),
          reject
        );
      });

      // Create image document
      const result = await callApi('/labeling/upload', {
        imageUrl: url,
        width,
        height,
        source: 'photo',
        autoLabel: true,
      });

      const data = result as { success: boolean; imageId: string };
      if (data.success) {
        setImageUri(url);
        setImageId(data.imageId);
        setImageWidth(width);
        setImageHeight(height);

        // Wait for AI inference, then load annotations
        setTimeout(() => {
          loadImageAnnotations(data.imageId);
        }, 2000);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload image');
    } finally {
      setLoading(false);
    }
  };

  const loadImageAnnotations = async (id: string) => {
    if (!user) return;

    try {
      const data = await callApiGet(`/labeling/annotations?imageId=${encodeURIComponent(id)}`) as {
        success: boolean;
        image?: { storagePathOriginal?: string; width?: number; height?: number };
        annotations: Array<{ objects: AnnotationObject[] }>;
        categories?: Category[];
      };

      if (data.success && data.annotations.length > 0) {
        setAnnotations(data.annotations[0].objects);
      }
      if (Array.isArray(data.categories) && data.categories.length > 0) {
        setCategories(
          data.categories.map((category: any) => ({
            id: category.id,
            name: category.name,
            color: category.color,
          }))
        );
      }
      if (data.image?.storagePathOriginal) {
        setImageUri(data.image.storagePathOriginal);
      }
      if (data.image?.width && data.image?.height) {
        setImageWidth(data.image.width);
        setImageHeight(data.image.height);
      }
    } catch (error) {
      console.error('Failed to load annotations:', error);
    }
  };

  const handleSaveAnnotations = async () => {
    if (!user || !imageId || annotations.length === 0) return;

    setSaving(true);
    try {
      const result = await callApi('/labeling/save-annotation', {
        imageId,
        objects: annotations,
        status: 'submitted',
      });

      const data = result as { success: boolean };
      if (data.success) {
        Alert.alert('Success', 'Annotations saved successfully!');
        await loadImageAnnotations(imageId);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save annotations');
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerInference = async () => {
    if (!user || !imageId) return;

    setLoading(true);
    try {
      await callApi('/labeling/segment', { imageId });

      setTimeout(() => {
        loadImageAnnotations(imageId);
      }, 2000);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to run inference');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Image Labeling</Text>
      </View>

      {!imageUri ? (
        <View style={styles.uploadSection}>
          <TouchableOpacity style={styles.uploadButton} onPress={handleImagePick}>
            <Text style={styles.uploadButtonText}>Upload Image</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.annotationSection}>
          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.button}
              onPress={handleTriggerInference}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Running AI...' : 'Run AI Labeling'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSaveAnnotations}
              disabled={saving || annotations.length === 0}
            >
              <Text style={styles.buttonText}>
                {saving ? 'Saving...' : 'Save Annotations'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.categorySection}>
            <Text style={styles.sectionTitle}>Select Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    selectedCategoryId === cat.id && styles.categoryChipSelected,
                  ]}
                  onPress={() => setSelectedCategoryId(cat.id)}
                >
                  <View
                    style={[
                      styles.colorDot,
                      { backgroundColor: cat.color || '#3b82f6' },
                    ]}
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      selectedCategoryId === cat.id && styles.categoryTextSelected,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {imageUri && (
            <PolygonAnnotation
              imageUri={imageUri}
              imageWidth={imageWidth}
              imageHeight={imageHeight}
              annotations={annotations}
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onAnnotationsChange={setAnnotations}
              onCategorySelect={setSelectedCategoryId}
            />
          )}

          <View style={styles.infoSection}>
            <Text style={styles.infoText}>
              Objects labeled: {annotations.length}
            </Text>
          </View>
        </View>
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  uploadSection: {
    padding: 32,
    alignItems: 'center',
  },
  uploadButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  annotationSection: {
    padding: 16,
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#10b981',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  categorySection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  categoryChipSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 14,
  },
  categoryTextSelected: {
    fontWeight: '600',
    color: '#3b82f6',
  },
  infoSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
