import type { Query } from 'firebase-admin/firestore';
import { db } from './firebase';
import {
  ImageDocument,
  AnnotationDocument,
  CategoryDocument,
  CocoDataset,
  CocoImage,
  CocoAnnotation,
  CocoCategory,
  LabelStatus,
} from '../types';
import { calculatePolygonArea, calculateBoundingBox } from '../services/segmentation';

interface ExportFilters {
  labelStatus?: LabelStatus[];
  ownerUid?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Export dataset to COCO format
 */
export async function exportToCocoFormat(filters: ExportFilters): Promise<CocoDataset> {
  // Build Firestore query
  let query: Query = db.collection('images') as Query;

  if (filters.ownerUid) {
    query = query.where('ownerUid', '==', filters.ownerUid);
  }

  if (filters.labelStatus && filters.labelStatus.length > 0) {
    query = query.where('labelStatus', 'in', filters.labelStatus);
  }

  if (filters.startDate) {
    query = query.where('createdAt', '>=', filters.startDate);
  }

  if (filters.endDate) {
    query = query.where('createdAt', '<=', filters.endDate);
  }

  const imagesSnapshot = await query.get();
  const images: ImageDocument[] = imagesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as ImageDocument[];

  // Get all categories
  const categoriesSnapshot = await db.collection('categories').get();
  const categories: CategoryDocument[] = categoriesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as CategoryDocument[];

  // Create category ID mapping (COCO requires contiguous integer IDs)
  const categoryIdMap = new Map<string, number>();
  categories.forEach((cat, index) => {
    categoryIdMap.set(cat.id, index + 1); // COCO IDs start at 1
  });

  // Build COCO dataset
  const cocoImages: CocoImage[] = [];
  const cocoAnnotations: CocoAnnotation[] = [];
  const cocoCategories: CocoCategory[] = categories.map((cat, index) => ({
    id: index + 1,
    name: cat.name,
    supercategory: cat.metadata?.group || 'object',
  }));

  let annotationIdCounter = 1;

  for (const image of images) {
    // Get approved annotation (prefer user-approved, fallback to latest)
    const annotationsSnapshot = await db
      .collection('annotations')
      .where('imageId', '==', image.id)
      .orderBy('version', 'desc')
      .get();

    let approvedAnnotation: AnnotationDocument | null = null;

    // Prefer user-approved annotation
    for (const doc of annotationsSnapshot.docs) {
      const ann = { id: doc.id, ...doc.data() } as AnnotationDocument;
      if (ann.source === 'user' && ann.status === 'approved') {
        approvedAnnotation = ann;
        break;
      }
    }

    // Fallback to latest annotation if no approved user annotation
    if (!approvedAnnotation && !annotationsSnapshot.empty) {
      approvedAnnotation = {
        id: annotationsSnapshot.docs[0].id,
        ...annotationsSnapshot.docs[0].data(),
      } as AnnotationDocument;
    }

    if (!approvedAnnotation || approvedAnnotation.objects.length === 0) {
      continue; // Skip images without annotations
    }

    // Add COCO image entry
    const cocoImage: CocoImage = {
      id: cocoImages.length + 1,
      file_name: image.storagePathOriginal.split('/').pop() || `${image.id}.jpg`,
      width: image.width,
      height: image.height,
    };
    cocoImages.push(cocoImage);

    // Add COCO annotation entries for each object
    for (const obj of approvedAnnotation.objects) {
      const categoryId = categoryIdMap.get(obj.categoryId);
      if (!categoryId) {
        console.warn(`Unknown categoryId: ${obj.categoryId}, skipping`);
        continue;
      }

      // Convert normalized polygon to pixel coordinates
      const pixelPolygon = obj.polygon.map(p => ({
        x: p.x * image.width,
        y: p.y * image.height,
      }));

      // Flatten polygon for COCO format: [x1, y1, x2, y2, ...]
      const segmentation: number[][] = [
        pixelPolygon.flatMap(p => [p.x, p.y]),
      ];

      // Calculate area (normalized polygon area * image area)
      const normalizedArea = calculatePolygonArea(obj.polygon);
      const area = normalizedArea * image.width * image.height;

      // Calculate bounding box
      const bbox = calculateBoundingBox(obj.polygon, image.width, image.height);

      const cocoAnnotation: CocoAnnotation = {
        id: annotationIdCounter++,
        image_id: cocoImage.id,
        category_id: categoryId,
        segmentation,
        area,
        bbox,
        iscrowd: 0, // 0 for polygon, 1 for RLE (not supported yet)
      };

      cocoAnnotations.push(cocoAnnotation);
    }
  }

  return {
    images: cocoImages,
    annotations: cocoAnnotations,
    categories: cocoCategories,
  };
}

/**
 * Export dataset to YOLO segmentation format
 * Returns a map of imageId -> YOLO format string
 */
export async function exportToYoloFormat(filters: ExportFilters): Promise<Map<string, string>> {
  const cocoData = await exportToCocoFormat(filters);
  const yoloMap = new Map<string, string>();

  // Build category ID to class index mapping
  const categoryToClass = new Map<number, number>();
  cocoData.categories.forEach((cat, index) => {
    categoryToClass.set(cat.id, index);
  });

  // Group annotations by image
  const annotationsByImage = new Map<number, CocoAnnotation[]>();
  cocoData.annotations.forEach(ann => {
    const imageAnns = annotationsByImage.get(ann.image_id) || [];
    imageAnns.push(ann);
    annotationsByImage.set(ann.image_id, imageAnns);
  });

  // Convert each image's annotations to YOLO format
  cocoData.images.forEach(img => {
    const annotations = annotationsByImage.get(img.id) || [];
    const yoloLines: string[] = [];

    annotations.forEach(ann => {
      const classIndex = categoryToClass.get(ann.category_id) || 0;
      
      // YOLO format: class x1 y1 x2 y2 x3 y3 ... (normalized coordinates)
      const normalizedSeg = ann.segmentation[0].map((coord, index) => {
        const isX = index % 2 === 0;
        return isX ? coord / img.width : coord / img.height;
      });

      yoloLines.push(`${classIndex} ${normalizedSeg.join(' ')}`);
    });

    yoloMap.set(img.file_name.replace(/\.[^.]+$/, ''), yoloLines.join('\n'));
  });

  return yoloMap;
}
