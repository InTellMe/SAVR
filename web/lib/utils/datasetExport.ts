import { getSupabaseAdmin } from '../supabase';
import {
  ImageDocument,
  AnnotationDocument,
  CategoryDocument,
  CocoDataset,
  CocoImage,
  CocoAnnotation,
  CocoCategory,
  LabelStatus,
} from '../types/functions';
import { calculatePolygonArea, calculateBoundingBox } from '../services/segmentation';

// Use lazy initialization for Supabase admin client
function getSupabase() {
  return getSupabaseAdmin();
}

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
  // Build Supabase query
  let query = getSupabase()
    .from('images')
    .select('*');

  if (filters.ownerUid) {
    query = query.eq('uploaded_by', filters.ownerUid);
  }

  if (filters.labelStatus && filters.labelStatus.length > 0) {
    query = query.in('label_status', filters.labelStatus);
  }

  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate.toISOString());
  }

  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate.toISOString());
  }

  const { data: imagesData, error: imagesError } = await query;
  
  if (imagesError) {
    throw new Error(`Failed to fetch images: ${imagesError.message}`);
  }

  const images: ImageDocument[] = (imagesData || []).map((item: any) => ({
    id: item.id,
    ownerUid: item.uploaded_by,
    source: item.source as 'photo' | 'video_frame',
    videoId: item.video_id,
    frameIndex: item.frame_index,
    storagePathOriginal: item.storage_path,
    thumbnailPath: item.thumbnail_path,
    width: item.width,
    height: item.height,
    createdAt: new Date(item.created_at),
    updatedAt: new Date(item.updated_at),
    labelStatus: item.label_status as ImageDocument['labelStatus'],
    currentAnnotationId: item.current_annotation_id,
  }));

  // Get all categories
  const { data: categoriesData, error: categoriesError } = await getSupabase()
    .from('categories')
    .select('*');

  if (categoriesError) {
    throw new Error(`Failed to fetch categories: ${categoriesError.message}`);
  }

  const categories: CategoryDocument[] = (categoriesData || []).map((item: any) => ({
    id: item.id,
    name: item.name,
    color: item.color,
    metadata: item.metadata,
  }));

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
    supercategory: (cat.metadata?.group as string) || 'object',
  }));

  let annotationIdCounter = 1;

  for (const image of images) {
    // Get approved annotation (prefer user-approved, fallback to latest)
    const { data: annotationsData, error: annotationsError } = await getSupabase()
      .from('annotations')
      .select('*')
      .eq('image_id', image.id)
      .order('version', { ascending: false });

    if (annotationsError) {
      console.error(`Failed to fetch annotations for image ${image.id}:`, annotationsError);
      continue;
    }

    const annotations: AnnotationDocument[] = (annotationsData || []).map((item: any) => ({
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

    let approvedAnnotation: AnnotationDocument | null = null;

    // Prefer user-approved annotation
    for (const ann of annotations) {
      if (ann.source === 'user' && ann.status === 'approved') {
        approvedAnnotation = ann;
        break;
      }
    }

    // Fallback to latest annotation if no approved user annotation
    if (!approvedAnnotation && annotations.length > 0) {
      approvedAnnotation = annotations[0];
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
