import * as ImagePicker from 'expo-image-picker';
import { uploadImageToStorage, getPublicUrl } from './storage';

export async function requestCameraPermissions() {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
}

export async function requestMediaLibraryPermissions() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

export async function pickImageFromCamera(): Promise<string | null> {
  const hasPermission = await requestCameraPermissions();
  if (!hasPermission) {
    throw new Error('Camera permission denied');
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (!result.canceled && result.assets[0]) {
    return result.assets[0].uri;
  }

  return null;
}

export async function pickImageFromLibrary(): Promise<string | null> {
  const hasPermission = await requestMediaLibraryPermissions();
  if (!hasPermission) {
    throw new Error('Media library permission denied');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (!result.canceled && result.assets[0]) {
    return result.assets[0].uri;
  }

  return null;
}

export async function uploadImage(uri: string, userId: string, itemId: string): Promise<string> {
  const fileName = `${itemId}.jpg`;
  const filePath = await uploadImageToStorage('inventory-images', userId, uri, fileName);
  const url = getPublicUrl('inventory-images', filePath);
  return url;
}
