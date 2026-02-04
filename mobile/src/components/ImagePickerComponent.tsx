import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { pickImageFromCamera, pickImageFromLibrary } from '../utils/imageUtils';

interface ImagePickerComponentProps {
  onImageSelected: (uri: string) => void;
  currentImageUrl?: string;
}

export default function ImagePickerComponent({ onImageSelected, currentImageUrl }: ImagePickerComponentProps) {
  const handleImagePick = () => {
    Alert.alert(
      'Select Image',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            try {
              const uri = await pickImageFromCamera();
              if (uri) onImageSelected(uri);
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
              if (uri) onImageSelected(uri);
            } catch (error) {
              Alert.alert('Error', 'Failed to pick image');
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handleImagePick}>
      {currentImageUrl ? (
        <Image source={{ uri: currentImageUrl }} style={styles.image} />
      ) : (
        <View style={styles.placeholder}>
          <Ionicons name="camera" size={40} color="#9ca3af" />
          <Text style={styles.placeholderText}>Add Photo</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    marginVertical: 16,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 16,
    color: '#9ca3af',
  },
});
