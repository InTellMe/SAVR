import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import Svg, { G, Polygon, Circle } from 'react-native-svg';

interface PolygonPoint {
  x: number;
  y: number;
}

interface AnnotationObject {
  id: string;
  categoryId: string;
  polygon: PolygonPoint[];
  attributes?: Record<string, any>;
}

interface PolygonAnnotationProps {
  imageUri: string;
  imageWidth: number;
  imageHeight: number;
  annotations: AnnotationObject[];
  categories: Array<{ id: string; name: string; color?: string }>;
  selectedCategoryId?: string;
  onAnnotationsChange: (annotations: AnnotationObject[]) => void;
  onCategorySelect?: (categoryId: string) => void;
  readOnly?: boolean;
}

export default function PolygonAnnotation({
  imageUri,
  imageWidth,
  imageHeight,
  annotations,
  categories,
  selectedCategoryId,
  onAnnotationsChange,
  readOnly = false,
}: PolygonAnnotationProps) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState<PolygonPoint[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  useEffect(() => {
    if (containerSize.width > 0 && containerSize.height > 0) {
      const scaleX = containerSize.width / imageWidth;
      const scaleY = containerSize.height / imageHeight;
      setScale(Math.min(scaleX, scaleY, 1));
    }
  }, [containerSize, imageWidth, imageHeight]);

  const handleImageLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize({ width, height });
  };

  const normalizePoint = (x: number, y: number): PolygonPoint => {
    return {
      x: Math.max(0, Math.min(1, x / imageWidth)),
      y: Math.max(0, Math.min(1, y / imageHeight)),
    };
  };

  const denormalizePoint = (point: PolygonPoint): { x: number; y: number } => {
    return {
      x: point.x * imageWidth * scale,
      y: point.y * imageHeight * scale,
    };
  };

  const handlePress = (event: any) => {
    if (readOnly) return;

    const { locationX, locationY } = event.nativeEvent;
    const point = normalizePoint(locationX / scale, locationY / scale);

    if (isDrawing) {
      setCurrentPolygon([...currentPolygon, point]);
    } else {
      // Check if tapping on existing polygon
      const tappedObject = annotations.find(obj => {
        // Simple point-in-polygon check
        const points = obj.polygon;
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const xi = points[i].x;
          const yi = points[i].y;
          const xj = points[j].x;
          const yj = points[j].y;
          const intersect =
            yi > point.y !== yj > point.y &&
            point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
          if (intersect) inside = !inside;
        }
        return inside;
      });

      if (tappedObject) {
        setSelectedObjectId(tappedObject.id);
        setShowCategoryModal(true);
        return;
      }

      // Start new polygon
      if (selectedCategoryId) {
        setIsDrawing(true);
        setCurrentPolygon([point]);
      } else {
        Alert.alert('Select Category', 'Please select a category first');
      }
    }
  };

  const handleLongPress = () => {
    if (readOnly || !isDrawing) return;

    // Close polygon on long press
    if (currentPolygon.length >= 3 && selectedCategoryId) {
      const newObject: AnnotationObject = {
        id: `obj_${Date.now()}`,
        categoryId: selectedCategoryId,
        polygon: [...currentPolygon],
      };

      onAnnotationsChange([...annotations, newObject]);
      setCurrentPolygon([]);
      setIsDrawing(false);
      setSelectedObjectId(newObject.id);
    }
  };

  const handleDelete = () => {
    if (selectedObjectId) {
      Alert.alert(
        'Delete Annotation',
        'Are you sure you want to delete this annotation?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              onAnnotationsChange(annotations.filter(obj => obj.id !== selectedObjectId));
              setSelectedObjectId(null);
            },
          },
        ]
      );
    }
  };

  const handleChangeCategory = (categoryId: string) => {
    if (selectedObjectId) {
      onAnnotationsChange(
        annotations.map(obj =>
          obj.id === selectedObjectId ? { ...obj, categoryId } : obj
        )
      );
      setShowCategoryModal(false);
      setSelectedObjectId(null);
    }
  };

  const displayWidth = imageWidth * scale;
  const displayHeight = imageHeight * scale;

  return (
    <View style={styles.container}>
      <View
        style={[styles.imageContainer, { width: displayWidth, height: displayHeight }]}
        onLayout={handleImageLayout}
      >
        <Image
          source={{ uri: imageUri }}
          style={{ width: displayWidth, height: displayHeight }}
          resizeMode="contain"
        />

        <Svg
          style={StyleSheet.absoluteFill}
          width={displayWidth}
          height={displayHeight}
        >
          {/* Draw existing polygons */}
          {annotations.map(obj => {
            const category = categories.find(c => c.id === obj.categoryId);
            const color = category?.color || '#3b82f6';
            const isSelected = obj.id === selectedObjectId;
            const points = obj.polygon
              .map(p => denormalizePoint(p))
              .map(p => `${p.x},${p.y}`)
              .join(' ');

            return (
              <G key={obj.id}>
                <Polygon
                  points={points}
                  fill={isSelected ? `${color}40` : `${color}20`}
                  stroke={color}
                  strokeWidth={isSelected ? 3 : 2}
                />
                {obj.polygon.map((vertex, index) => {
                  const v = denormalizePoint(vertex);
                  return (
                    <Circle
                      key={index}
                      cx={v.x}
                      cy={v.y}
                      r={4}
                      fill={color}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  );
                })}
              </G>
            );
          })}

          {/* Draw current polygon being drawn */}
          {currentPolygon.length > 0 && (
            <G>
              <Polygon
                points={currentPolygon
                  .map(p => denormalizePoint(p))
                  .map(p => `${p.x},${p.y}`)
                  .join(' ')}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={2}
              />
              {currentPolygon.map((vertex, index) => {
                const v = denormalizePoint(vertex);
                return (
                  <Circle
                    key={index}
                    cx={v.x}
                    cy={v.y}
                    r={4}
                    fill="#3b82f6"
                  />
                );
              })}
            </G>
          )}
        </Svg>

        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={handlePress}
          onLongPress={handleLongPress}
          activeOpacity={1}
        />
      </View>

      {!readOnly && (
        <View style={styles.controls}>
          {isDrawing ? (
            <View style={styles.drawingControls}>
              <Text style={styles.hint}>
                Tap to add points. Long press to finish ({currentPolygon.length} points)
              </Text>
              <TouchableOpacity
                style={styles.button}
                onPress={() => {
                  setIsDrawing(false);
                  setCurrentPolygon([]);
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.controls}>
              {selectedObjectId && (
                <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={handleDelete}>
                  <Text style={styles.buttonText}>Delete Selected</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      <Modal
        visible={showCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <ScrollView>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.categoryItem}
                  onPress={() => handleChangeCategory(cat.id)}
                >
                  <View
                    style={[
                      styles.colorIndicator,
                      { backgroundColor: cat.color || '#3b82f6' },
                    ]}
                  />
                  <Text style={styles.categoryName}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.button}
              onPress={() => setShowCategoryModal(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
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
  },
  imageContainer: {
    position: 'relative',
    backgroundColor: '#f0f0f0',
  },
  controls: {
    padding: 16,
    backgroundColor: '#fff',
  },
  drawingControls: {
    alignItems: 'center',
  },
  hint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  colorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
  },
  annotationOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 8,
    borderRadius: 4,
  },
  annotationCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
