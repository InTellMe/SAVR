/**
 * Storage utility functions for Supabase Storage (Mobile)
 * Handles image uploads, deletions, and URL generation
 */

import { supabase } from '../config/supabase';

export type BucketName = 'recipe-images' | 'inventory-images' | 'labeling-images';

/**
 * Upload an image file to a Supabase storage bucket
 * @param bucket - The storage bucket to upload to
 * @param userId - The user ID (used for folder organization)
 * @param uri - The local file URI
 * @param fileName - The file name
 * @returns The file path in the bucket
 */
export async function uploadImageToStorage(
  bucket: BucketName,
  userId: string,
  uri: string,
  fileName: string
): Promise<string> {
  // Convert URI to blob for upload
  const response = await fetch(uri);
  const blob = await response.blob();
  
  const timestampedFileName = `${Date.now()}_${fileName}`;
  const filePath = `${userId}/${timestampedFileName}`;
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, blob, {
      contentType: blob.type || 'image/jpeg',
      cacheControl: '3600',
      upsert: false,
    });
  
  if (error) throw error;
  return filePath;
}

/**
 * Upload an image for labeling (uses different path structure)
 * @param uri - The local file URI
 * @param fileName - The file name
 * @param imageId - Optional image ID for consistent naming
 * @returns The file path in the bucket
 */
export async function uploadLabelingImage(
  uri: string,
  fileName: string,
  imageId?: string
): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  
  const finalFileName = imageId 
    ? `${imageId}_${fileName}`
    : `${Date.now()}_${fileName}`;
  
  const { data, error } = await supabase.storage
    .from('labeling-images')
    .upload(finalFileName, blob, {
      contentType: blob.type || 'image/jpeg',
      cacheControl: '3600',
      upsert: false,
    });
  
  if (error) throw error;
  return finalFileName;
}

/**
 * Delete an image from a storage bucket
 * @param bucket - The storage bucket
 * @param filePath - The path to the file to delete
 */
export async function deleteImage(
  bucket: BucketName,
  filePath: string
): Promise<void> {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([filePath]);
  
  if (error) throw error;
}

/**
 * Get a public URL for an image (only works for public buckets)
 * @param bucket - The storage bucket
 * @param filePath - The path to the file
 * @returns The public URL
 */
export function getPublicUrl(bucket: BucketName, filePath: string): string {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}

/**
 * Get a signed URL for an image (works for private buckets)
 * @param bucket - The storage bucket
 * @param filePath - The path to the file
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns The signed URL
 */
export async function getSignedUrl(
  bucket: BucketName,
  filePath: string,
  expiresIn: number = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, expiresIn);
  
  if (error) throw error;
  return data.signedUrl;
}

/**
 * List all images for a user in a bucket
 * @param bucket - The storage bucket
 * @param userId - The user ID
 * @returns Array of file paths
 */
export async function listUserImages(
  bucket: BucketName,
  userId: string
): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(userId);
  
  if (error) throw error;
  return data.map(file => `${userId}/${file.name}`);
}

/**
 * Helper to determine if a URL is from Firebase Storage
 * (for backward compatibility during migration)
 */
export function isFirebaseStorageUrl(url: string): boolean {
  return url.includes('firebasestorage.googleapis.com');
}

/**
 * Helper to get image URL - handles both Firebase (legacy) and Supabase URLs
 * @param bucket - The Supabase storage bucket (only used if not Firebase URL)
 * @param pathOrUrl - Either a Supabase path or a full Firebase URL
 * @returns The display URL
 */
export function getImageUrl(bucket: BucketName, pathOrUrl: string): string {
  // If it's already a Firebase URL, return as-is for backward compatibility
  if (isFirebaseStorageUrl(pathOrUrl)) {
    return pathOrUrl;
  }
  
  // Otherwise, it's a Supabase path - generate the public URL
  return getPublicUrl(bucket, pathOrUrl);
}
