import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import LoadingSpinner from '../../components/LoadingSpinner';
import ImagePickerComponent from '../../components/ImagePickerComponent';
import { uploadImage } from '../../utils/imageUtils';
import { getInventory, addInventoryItem, deleteInventoryItem } from '../../lib/db';
import { analyzeImage } from '../../utils/api';

interface LocalInventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  image_url?: string;
}

export default function InventoryScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [items, setItems] = useState<LocalInventoryItem[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [imageUri, setImageUri] = useState<string>('');
  const [newItem, setNewItem] = useState({
    name: '',
    quantity: '',
    unit: '',
    category: '',
  });

  useEffect(() => {
    loadInventory();
  }, [user]);

  const loadInventory = async () => {
    if (!user) return;

    try {
      const inventoryItems = await getInventory(user.id);
      setItems(inventoryItems);
    } catch (error) {
      Alert.alert('Error', 'Failed to load inventory');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadInventory();
  };

  const handleAIScan = async () => {
    if (!user) return;

    try {
      setScanning(true);
      // Use the image picker to get a photo
      const ImagePicker = require('expo-image-picker');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is needed to scan pantry items.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled) {
        setScanning(false);
        return;
      }

      const uri = result.assets[0].uri;

      // Upload the image first
      const imageUrl = await uploadImage(uri, user.id, `scan_${Date.now()}`);

      // Call the AI analysis API route
      const data = await analyzeImage(imageUrl);

      if (data.success && data.ingredients && data.ingredients.length > 0) {
        // Add each detected ingredient to inventory
        const addPromises = data.ingredients.map((ingredient: any) =>
          addInventoryItem(user.id, {
            name: ingredient.name,
            quantity: ingredient.quantity || 1,
            unit: ingredient.unit || 'units',
            category: 'scanned',
            image_url: imageUrl,
          })
        );
        await Promise.all(addPromises);
        Alert.alert(
          'Scan Complete',
          `Found ${data.ingredients.length} item${data.ingredients.length !== 1 ? 's' : ''}. They have been added to your pantry.`
        );
        loadInventory();
      } else {
        Alert.alert('No Items Found', 'Could not detect any food items in the photo. Try taking a clearer picture.');
      }
    } catch (error: any) {
      const msg = error?.message || 'Failed to scan image';
      Alert.alert('Scan Error', msg);
    } finally {
      setScanning(false);
    }
  };

  const handleAddItem = async () => {
    if (!user || !newItem.name || !newItem.quantity) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    try {
      setLoading(true);
      let imageUrl = '';

      if (imageUri) {
        const itemId = Date.now().toString();
        imageUrl = await uploadImage(imageUri, user.id, itemId);
      }

      await addInventoryItem(user.id, {
        name: newItem.name,
        quantity: parseFloat(newItem.quantity),
        unit: newItem.unit || 'units',
        category: newItem.category || 'other',
        image_url: imageUrl,
      });

      setModalVisible(false);
      setNewItem({ name: '', quantity: '', unit: '', category: '' });
      setImageUri('');
      loadInventory();
    } catch (error) {
      Alert.alert('Error', 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteInventoryItem(itemId);
              loadInventory();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  if (loading && items.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ea580c']} />
        }
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemDetails}>
                {item.quantity} {item.unit} • {item.category}
              </Text>
            </View>
            <TouchableOpacity onPress={() => handleDeleteItem(item.id)}>
              <Ionicons name="trash-outline" size={24} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="file-tray-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>No items in your pantry</Text>
            <Text style={styles.emptySubtext}>Scan your pantry or add items manually</Text>
          </View>
        }
        contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.listContent}
      />

      {/* AI Scan FAB */}
      <TouchableOpacity
        style={styles.scanFab}
        onPress={handleAIScan}
        disabled={scanning}
      >
        {scanning ? (
          <LoadingSpinner size="small" color="#fff" />
        ) : (
          <Ionicons name="camera" size={28} color="#fff" />
        )}
      </TouchableOpacity>

      {/* Manual Add FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Item</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ImagePickerComponent
              onImageSelected={setImageUri}
              currentImageUrl={imageUri}
            />

            <TextInput
              style={styles.input}
              placeholder="Item name *"
              value={newItem.name}
              onChangeText={(text) => setNewItem({ ...newItem, name: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Quantity *"
              value={newItem.quantity}
              onChangeText={(text) => setNewItem({ ...newItem, quantity: text })}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Unit (e.g., cups, lbs)"
              value={newItem.unit}
              onChangeText={(text) => setNewItem({ ...newItem, unit: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Category (e.g., dairy, produce)"
              value={newItem.category}
              onChangeText={(text) => setNewItem({ ...newItem, category: text })}
            />

            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddItem}
            >
              <Text style={styles.addButtonText}>Add Item</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  scanFab: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ea580c',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  addButton: {
    backgroundColor: '#ea580c',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
