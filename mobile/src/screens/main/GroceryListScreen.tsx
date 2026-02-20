import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { GroceryList, GroceryItem } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getGroceryLists, updateGroceryList } from '../../lib/db';

interface DbGroceryItem {
  id?: string;
  name: string;
  quantity: number;
  unit: string;
  checked?: boolean;
  category?: string;
}

interface DbGroceryList {
  id: string;
  title: string;
  items: DbGroceryItem[];
}

export default function GroceryListScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [groceryList, setGroceryList] = useState<GroceryList | null>(null);

  useEffect(() => {
    loadGroceryList();
  }, [user]);

  const loadGroceryList = async () => {
    if (!user) return;

    try {
      const lists = await getGroceryLists(user.id);
      if (lists.length > 0) {
        const list = lists[0] as DbGroceryList;
        setGroceryList({
          id: list.id,
          name: list.title || 'Grocery List',
          items: (list.items || []).map((item, index) => ({
            id: item.id || `${list.id}-${index}`,
            name: item.name,
            quantity: item.quantity || 1,
            unit: item.unit || 'item',
            checked: Boolean(item.checked),
            category: item.category || 'other',
          })),
          createdAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load grocery list');
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = async (itemId: string) => {
    if (!groceryList) return;

    const updatedItems = groceryList.items.map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );

    try {
      await updateGroceryList(groceryList.id, {
        items: updatedItems.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
          checked: item.checked,
        })),
      } as any);
      setGroceryList({ ...groceryList, items: updatedItems });
    } catch (error) {
      Alert.alert('Error', 'Failed to update item');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!groceryList || groceryList.items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cart-outline" size={64} color="#9ca3af" />
        <Text style={styles.emptyText}>Your grocery list is empty</Text>
        <Text style={styles.emptySubtext}>
          Generate recipes to add items to your list
        </Text>
      </View>
    );
  }

  const groupedItems = groceryList.items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, GroceryItem[]>);

  return (
    <FlatList
      data={Object.keys(groupedItems)}
      keyExtractor={(category) => category}
      renderItem={({ item: category }) => (
        <View style={styles.categorySection}>
          <Text style={styles.categoryTitle}>{category}</Text>
          {groupedItems[category].map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.itemRow}
              onPress={() => toggleItem(item.id)}
            >
              <View style={styles.checkbox}>
                {item.checked && <Ionicons name="checkmark" size={20} color="#fff" />}
              </View>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, item.checked && styles.checkedText]}>
                  {item.name}
                </Text>
                <Text style={styles.itemQuantity}>
                  {item.quantity} {item.unit}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 24,
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
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#ea580c',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  checkedText: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#6b7280',
  },
});
