import { storage, db } from './firebase';
import { ImageDocument, AnnotationDocument, CategoryDocument } from '../types';
import * as admin from 'firebase-admin';

/**
 * Storage utilities for dataset labeling pipeline
 * Handles image/video storage, thumbnails, and mask storage
 */

const BUCKET = storage.bucket();

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
 * Upload image file to Firebase Storage
 */
export async function uploadImageFile(
  fileBuffer: Buffer,
  uid: string,
  imageId: string,
  contentType: string = 'image/jpeg'
): Promise<string> {
  const path = getImageStoragePath(uid, imageId);
  const file = BUCKET.file(path);
  
  await file.save(fileBuffer, {
    metadata: {
      contentType,
      metadata: {
        uploadedBy: uid,
        uploadedAt: new Date().toISOString(),
      },
    },
  });

  // Make file publicly readable (or use signed URL if needed)
  await file.makePublic();
  
  return `gs://${BUCKET.name}/${path}`;
}

/**
 * Generate and upload thumbnail
 */
export async function generateAndUploadThumbnail(
  imageBuffer: Buffer,
  imageId: string,
  maxWidth: number = 512,
  maxHeight: number = 512
): Promise<string> {
  // Note: For production, use sharp or similar library to resize
  // For now, we'll just upload the original as thumbnail (can be optimized later)
  const path = getThumbnailStoragePath(imageId);
  const file = BUCKET.file(path);
  
  await file.save(imageBuffer, {
    metadata: {
      contentType: 'image/jpeg',
    },
  });

  await file.makePublic();
  return `gs://${BUCKET.name}/${path}`;
}

/**
 * Create image document in Firestore
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
  const imageDoc: Omit<ImageDocument, 'id'> = {
    ownerUid: uid,
    source,
    videoId,
    frameIndex,
    storagePathOriginal: storagePath,
    thumbnailPath,
    width,
    height,
    createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
    updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
    labelStatus: 'unlabeled',
  };

  await db.collection('images').doc(imageId).set(imageDoc);

  return {
    id: imageId,
    ...imageDoc,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as ImageDocument;
}

/**
 * Get image document from Firestore
 */
export async function getImageDocument(imageId: string): Promise<ImageDocument | null> {
  const doc = await db.collection('images').doc(imageId).get();
  if (!doc.exists) {
    return null;
  }
  return { id: doc.id, ...doc.data() } as ImageDocument;
}

/**
 * Update image document label status
 */
export async function updateImageLabelStatus(
  imageId: string,
  labelStatus: ImageDocument['labelStatus'],
  currentAnnotationId?: string
): Promise<void> {
  const updateData: any = {
    labelStatus,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (currentAnnotationId) {
    updateData.currentAnnotationId = currentAnnotationId;
  }
  await db.collection('images').doc(imageId).update(updateData);
}

/**
 * Create annotation document in Firestore
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
  const existingAnnotations = await db
    .collection('annotations')
    .where('imageId', '==', imageId)
    .orderBy('version', 'desc')
    .limit(1)
    .get();

  const nextVersion = existingAnnotations.empty ? 1 : existingAnnotations.docs[0].data().version + 1;

  const annotationId = db.collection('annotations').doc().id;
  const annotationDoc: Omit<AnnotationDocument, 'id'> = {
    imageId,
    version: nextVersion,
    source,
    parentAnnotationId,
    status,
    createdByUid,
    createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
    updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
    objects,
  };

  await db.collection('annotations').doc(annotationId).set(annotationDoc);

  return {
    id: annotationId,
    ...annotationDoc,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as AnnotationDocument;
}

/**
 * Get annotations for an image
 */
export async function getImageAnnotations(imageId: string): Promise<AnnotationDocument[]> {
  const snapshot = await db
    .collection('annotations')
    .where('imageId', '==', imageId)
    .orderBy('version', 'desc')
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as AnnotationDocument[];
}

/**
 * Get latest annotation for an image
 */
export async function getLatestAnnotation(imageId: string): Promise<AnnotationDocument | null> {
  const snapshot = await db
    .collection('annotations')
    .where('imageId', '==', imageId)
    .orderBy('version', 'desc')
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data(),
  } as AnnotationDocument;
}

/**
 * Get or create category
 */
export async function getOrCreateCategory(
  categoryId: string,
  name: string,
  color?: string,
  metadata?: Record<string, any>
): Promise<CategoryDocument> {
  const categoryRef = db.collection('categories').doc(categoryId);
  const categoryDoc = await categoryRef.get();

  if (categoryDoc.exists) {
    return { id: categoryDoc.id, ...categoryDoc.data() } as CategoryDocument;
  }

  const newCategory: Omit<CategoryDocument, 'id'> = {
    name,
    color,
    metadata,
  };

  await categoryRef.set(newCategory);
  return { id: categoryId, ...newCategory };
}

/**
 * Get all categories
 */
export async function getAllCategories(): Promise<CategoryDocument[]> {
  const snapshot = await db.collection('categories').get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as CategoryDocument[];
}

/**
 * Get signed URL for image access
 */
export async function getImageSignedUrl(storagePath: string, expiresIn: number = 3600): Promise<string> {
  const file = BUCKET.file(storagePath);
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + expiresIn * 1000,
  });
  return url;
}
