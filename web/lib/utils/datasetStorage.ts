import { getSupabaseAdmin } from '../supabase';
import { ImageDocument, AnnotationDocument, CategoryDocument } from '../types/functions';
 
/**
 * Storage utilities for dataset labeling pipeline
 * Handles image/video storage, thumbnails, and mask storage
 */

// Use lazy initialization for Supabase admin client
function getSupabase() {
  return getSupabaseAdmin();
}

const LABELING_BUCKET = 'labeling-images';
 
/**
 * Get storage path for original image
 */
export function getImageStoragePath(uid: string, imageId: string, extension: string = 'jpg'): string {
  return `images/${uid}/${imageId}.${extension}`;
}
 
/**
 * Get storage path for thumbnail
 */
export function getThumbnailStoragePath(imageId: string, extension: string = 'jpg'): string {
  return `thumbnails/${imageId}.${extension}`;
}
 
/**
 * Get storage path for video
 */
export function getVideoStoragePath(uid: string, videoId: string, extension: string = 'mp4'): string {
  return `videos/${uid}/${videoId}.${extension}`;
}
 
/**
 * Get storage path for mask (optional)
 */
export function getMaskStoragePath(imageId: string, annotationId: string, objectId: string): string {
  return `masks/${imageId}/${annotationId}/${objectId}.png`;
}
 
/**
 * Upload image file to Supabase Storage
 */
export async function uploadImageFile(
  fileBuffer: Buffer,
  uid: string,
  imageId: string,
  contentType: string = 'image/jpeg'
): Promise<string> {
  const path = getImageStoragePath(uid, imageId);
  
  const { error } = await getSupabase().storage
    .from(LABELING_BUCKET)
    .upload(path, fileBuffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  return `${LABELING_BUCKET}/${path}`;
}
 
/**
 * Generate and upload thumbnail
 */
export async function generateAndUploadThumbnail(
  imageBuffer: Buffer,
  imageId: string,
  _maxWidth: number = 512,
  _maxHeight: number = 512
): Promise<string> {
  // Note: For production, use sharp or similar library to resize
  // For now, we'll just upload the original as thumbnail (can be optimized later)
  const path = getThumbnailStoragePath(imageId);
  
  const { error } = await getSupabase().storage
    .from(LABELING_BUCKET)
    .upload(path, imageBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload thumbnail: ${error.message}`);
  }

  return `${LABELING_BUCKET}/${path}`;
}
 
/**
 * Create image document in Supabase
 */
export async function createImageDocument(
  uid: string,
  imageId: string,
  storagePath: string,
  width: number,
  height: number,
  source: 'photo' | 'video_frame' = 'photo',
  videoId?: string,
  frameIndex?: number,
  thumbnailPath?: string
): Promise<ImageDocument> {
  const { data, error } = await getSupabase()
    .from('images')
    .insert({
      id: imageId,
      user_id: uid,
      uploaded_by: uid,
      filename: storagePath.split('/').pop()?.trim() || imageId,
      storage_path: storagePath,
      width,
      height,
      source,
      video_id: videoId,
      frame_index: frameIndex,
      thumbnail_path: thumbnailPath,
      label_status: 'unlabeled',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create image document: ${error.message}`);
  }

  return {
    id: data.id,
    ownerUid: data.uploaded_by,
    source: data.source as 'photo' | 'video_frame',
    videoId: data.video_id,
    frameIndex: data.frame_index,
    storagePathOriginal: data.storage_path,
    thumbnailPath: data.thumbnail_path,
    width: data.width,
    height: data.height,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    labelStatus: data.label_status as ImageDocument['labelStatus'],
    currentAnnotationId: data.current_annotation_id,
  };
}
 
/**
 * Get image document from Supabase
 */
export async function getImageDocument(imageId: string): Promise<ImageDocument | null> {
  const { data, error } = await getSupabase()
    .from('images')
    .select('*')
    .eq('id', imageId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    ownerUid: data.uploaded_by,
    source: data.source as 'photo' | 'video_frame',
    videoId: data.video_id,
    frameIndex: data.frame_index,
    storagePathOriginal: data.storage_path,
    thumbnailPath: data.thumbnail_path,
    width: data.width,
    height: data.height,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    labelStatus: data.label_status as ImageDocument['labelStatus'],
    currentAnnotationId: data.current_annotation_id,
  };
}
 
/**
 * Update image document label status
 */
export async function updateImageLabelStatus(
  imageId: string,
  labelStatus: ImageDocument['labelStatus'],
  currentAnnotationId?: string
): Promise<void> {
  const updateData: Record<string, unknown> = {
    label_status: labelStatus,
  };
  if (currentAnnotationId) {
    updateData.current_annotation_id = currentAnnotationId;
  }

  const { error } = await getSupabase()
    .from('images')
    .update(updateData)
    .eq('id', imageId);

  if (error) {
    throw new Error(`Failed to update image label status: ${error.message}`);
  }
}
 
/**
 * Create annotation document in Supabase
 */
export async function createAnnotationDocument(
  imageId: string,
  createdByUid: string,
  objects: AnnotationDocument['objects'],
  source: 'ai' | 'user',
  parentAnnotationId?: string,
  status: AnnotationDocument['status'] = 'draft'
): Promise<AnnotationDocument> {
  // Get current max version for this image
  const { data: existingAnnotations } = await getSupabase()
    .from('annotations')
    .select('version')
    .eq('image_id', imageId)
    .order('version', { ascending: false })
    .limit(1);

  const nextVersion = existingAnnotations && existingAnnotations.length > 0 
    ? existingAnnotations[0].version + 1 
    : 1;

  const { data, error } = await getSupabase()
    .from('annotations')
    .insert({
      image_id: imageId,
      version: nextVersion,
      source,
      parent_annotation_id: parentAnnotationId,
      status,
      created_by_uid: createdByUid,
      objects,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create annotation: ${error.message}`);
  }

  return {
    id: data.id,
    imageId: data.image_id,
    version: data.version,
    source: data.source as 'ai' | 'user',
    parentAnnotationId: data.parent_annotation_id,
    status: data.status as AnnotationDocument['status'],
    createdByUid: data.created_by_uid,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    objects: data.objects,
  };
}
 
/**
 * Get annotations for an image
 */
export async function getImageAnnotations(imageId: string): Promise<AnnotationDocument[]> {
  const { data, error } = await getSupabase()
    .from('annotations')
    .select('*')
    .eq('image_id', imageId)
    .order('version', { ascending: false });

  if (error) {
    throw new Error(`Failed to get annotations: ${error.message}`);
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    imageId: item.image_id,
    version: item.version,
    source: item.source as 'ai' | 'user',
    parentAnnotationId: item.parent_annotation_id,
    status: item.status as AnnotationDocument['status'],
    createdByUid: item.created_by_uid,
    createdAt: new Date(item.created_at),
    updatedAt: new Date(item.updated_at),
    objects: item.objects,
  }));
}
 
/**
 * Get latest annotation for an image
 */
export async function getLatestAnnotation(imageId: string): Promise<AnnotationDocument | null> {
  const { data, error } = await getSupabase()
    .from('annotations')
    .select('*')
    .eq('image_id', imageId)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    imageId: data.image_id,
    version: data.version,
    source: data.source as 'ai' | 'user',
    parentAnnotationId: data.parent_annotation_id,
    status: data.status as AnnotationDocument['status'],
    createdByUid: data.created_by_uid,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    objects: data.objects,
  };
}
 
/**
 * Get or create category
 */
export async function getOrCreateCategory(
  categoryId: string,
  name: string,
  color?: string,
  metadata?: Record<string, unknown>
): Promise<CategoryDocument> {
  // Try to get existing category
  const { data: existing } = await getSupabase()
    .from('categories')
    .select('*')
    .eq('id', categoryId)
    .single();

  if (existing) {
    return {
      id: existing.id,
      name: existing.name,
      color: existing.color,
      metadata: existing.metadata,
    };
  }

  // Create new category
  const { data, error } = await getSupabase()
    .from('categories')
    .insert({
      id: categoryId,
      name,
      color,
      metadata: metadata || {},
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create category: ${error.message}`);
  }

  return {
    id: data.id,
    name: data.name,
    color: data.color,
    metadata: data.metadata,
  };
}
 
/**
 * Get all categories
 */
export async function getAllCategories(): Promise<CategoryDocument[]> {
  const { data, error } = await getSupabase()
    .from('categories')
    .select('*');

  if (error) {
    throw new Error(`Failed to get categories: ${error.message}`);
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    name: item.name,
    color: item.color,
    metadata: item.metadata,
  }));
}
 
/**
 * Get signed URL for image access from Supabase Storage
 */
export async function getImageSignedUrl(storagePath: string, expiresIn: number = 3600): Promise<string> {
  // Extract bucket and path from storage path
  // Format: bucket/path or just path
  const parts = storagePath.split('/');
  const bucket = parts[0] === LABELING_BUCKET ? parts.shift()! : LABELING_BUCKET;
  const path = parts.join('/');

  const { data, error } = await getSupabase().storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    throw new Error(`Failed to get signed URL: ${error.message}`);
  }

  return data.signedUrl;
}
 