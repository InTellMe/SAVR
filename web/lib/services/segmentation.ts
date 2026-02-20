import OpenAI from 'openai';
import { AnnotationObject, PolygonPoint } from '../types/functions';

// Type for raw segmentation response from OpenAI
interface RawSegmentationObject {
  id?: string;
  categoryId?: string;
  polygon?: Array<{ x: number; y: number }>;
  confidence?: number;
  attributes?: Record<string, unknown>;
  isOccluded?: boolean;
  isTruncated?: boolean;
}

// Type for raw polygon point
interface RawPolygonPoint {
  x: number;
  y: number;
}

// Lazy initialization to avoid instantiation during Firebase deployment analysis
let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    // Firebase deployment analysis doesn't set FUNCTION_NAME or FUNCTION_TARGET
    // Use dummy key only during build/analysis, fail fast at runtime if missing
    const isDeploymentAnalysis = !process.env.FUNCTION_NAME && !process.env.FUNCTION_TARGET;
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      if (isDeploymentAnalysis) {
        // Allow dummy key during Firebase deployment analysis
        console.warn('[Segmentation] Using dummy OpenAI key during Firebase deployment analysis');
        openaiInstance = new OpenAI({ apiKey: 'dummy_key_for_build' });
      } else {
        // Fail fast at runtime with clear error
        throw new Error(
          'OPENAI_API_KEY environment variable is required. ' +
          'Please configure it in your Firebase Functions environment.'
        );
      }
    } else {
      openaiInstance = new OpenAI({ apiKey });
    }
  }
  return openaiInstance;
}

/**
 * Run segmentation inference on an image
 * This is a placeholder implementation that can be replaced with actual segmentation models
 * (e.g., Segment Anything Model, Mask R-CNN, YOLO segmentation, etc.)
 */
export async function runSegmentationInference(
  imageUrl: string,
  imageWidth: number,
  imageHeight: number
): Promise<AnnotationObject[]> {
  // For now, use GPT-4 Vision with structured output to generate polygon annotations
  // In production, replace this with actual segmentation model inference
  
  try {
    return await runSegmentationWithOpenAI(imageUrl, imageWidth, imageHeight);
  } catch (error) {
    console.error('Segmentation inference failed:', error);
    // Return empty array if inference fails
    return [];
  }
}

/**
 * Use OpenAI Vision to generate polygon annotations
 * This is a fallback/placeholder - replace with actual segmentation model in production
 */
async function runSegmentationWithOpenAI(
  imageUrl: string,
  imageWidth: number,
  imageHeight: number
): Promise<AnnotationObject[]> {
  const prompt = `Analyze this pantry/fridge image and identify all food items, containers, and objects.
For each object, provide:
1. A bounding polygon (array of {x, y} points normalized to [0, 1])
2. Category ID (e.g., "jar", "can", "box_cereal", "bottle", "package", "bag", "container")
3. Confidence score (0-1)
4. Optional attributes like {"isTransparent": true/false, "brand": "name", etc.}

Return a JSON array with this structure:
[
  {
    "id": "unique_id",
    "categoryId": "jar",
    "polygon": [{"x": 0.1, "y": 0.2}, {"x": 0.3, "y": 0.2}, ...],
    "confidence": 0.95,
    "attributes": {"isTransparent": true}
  }
]

Image dimensions: ${imageWidth}x${imageHeight}
Return only the JSON array, no other text.`;

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
    max_tokens: 4000,
    response_format: { type: 'json_object' },
    stream: false,
  });

  const content = completion.choices[0]?.message?.content || '{}';
  
  try {
    const parsed = JSON.parse(content) as { objects?: RawSegmentationObject[] } | RawSegmentationObject[];
    // Handle both {objects: [...]} and [...] formats
    const objects = Array.isArray(parsed) ? parsed : parsed.objects || [];
    
    return objects.map((obj: RawSegmentationObject, index: number) => ({
      id: obj.id || `obj_${Date.now()}_${index}`,
      categoryId: obj.categoryId || 'unknown',
      polygon: normalizePolygon(obj.polygon || [], imageWidth, imageHeight),
      confidence: obj.confidence || 0.5,
      attributes: obj.attributes || {},
      isOccluded: obj.isOccluded || false,
      isTruncated: obj.isTruncated || false,
    })) as AnnotationObject[];
  } catch (error) {
    console.error('Failed to parse segmentation response:', content);
    return [];
  }
}

/**
 * Normalize polygon coordinates
 * Converts pixel coordinates to normalized [0, 1] if needed
 */
function normalizePolygon(
  polygon: RawPolygonPoint[],
  imageWidth: number,
  imageHeight: number
): PolygonPoint[] {
  if (!Array.isArray(polygon) || polygon.length === 0) {
    return [];
  }

  return polygon.map((point: RawPolygonPoint) => {
    let x = point.x;
    let y = point.y;

    // If coordinates are in pixels (greater than 1), normalize them
    if (x > 1 || y > 1) {
      x = x / imageWidth;
      y = y / imageHeight;
    }

    // Ensure coordinates are within [0, 1]
    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));

    return { x, y };
  });
}

/**
 * Convert normalized polygon to pixel coordinates
 */
export function denormalizePolygon(
  polygon: PolygonPoint[],
  imageWidth: number,
  imageHeight: number
): Array<{ x: number; y: number }> {
  return polygon.map(point => ({
    x: point.x * imageWidth,
    y: point.y * imageHeight,
  }));
}

/**
 * Calculate polygon area (for export metrics)
 */
export function calculatePolygonArea(polygon: PolygonPoint[]): number {
  if (polygon.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    area += polygon[i].x * polygon[j].y;
    area -= polygon[j].x * polygon[i].y;
  }
  return Math.abs(area) / 2;
}

/**
 * Calculate bounding box from polygon
 */
export function calculateBoundingBox(
  polygon: PolygonPoint[],
  imageWidth: number,
  imageHeight: number
): [number, number, number, number] {
  if (polygon.length === 0) {
    return [0, 0, 0, 0];
  }

  const pixels = denormalizePolygon(polygon, imageWidth, imageHeight);
  const xs = pixels.map(p => p.x);
  const ys = pixels.map(p => p.y);

  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  // COCO format: [x, y, width, height]
  return [minX, minY, maxX - minX, maxY - minY];
}
