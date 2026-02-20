import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { createImageDocument, getImageSignedUrl } from '@/lib/utils/datasetStorage';
import { runSegmentationInference } from '@/lib/services/segmentation';
import { createAnnotationDocument, updateImageLabelStatus } from '@/lib/utils/datasetStorage';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.error) return auth.error;
  
  const { user } = auth;

  try {
    const { imageUrl, width, height, source, videoId, frameIndex, autoLabel } = await request.json();

    // Validate required fields
    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json({
        error: 'imageUrl is required and must be a string',
      }, { status: 400 });
    }
    if (!width || typeof width !== 'number' || width <= 0) {
      return NextResponse.json({
        error: 'width is required and must be a positive number',
      }, { status: 400 });
    }
    if (!height || typeof height !== 'number' || height <= 0) {
      return NextResponse.json({
        error: 'height is required and must be a positive number',
      }, { status: 400 });
    }

    const imageId = randomUUID();

    // Create image document
    const imageDoc = await createImageDocument(
      user.id,
      imageId,
      imageUrl,
      width,
      height,
      source || 'photo',
      videoId,
      frameIndex
    );

    // Optionally trigger AI inference automatically
    if (autoLabel !== false) {
      // Convert storage paths to signed URLs if needed for OpenAI vision API
      let usableImageUrl = imageUrl;
      if (imageUrl.startsWith('labeling-images/')) {
        usableImageUrl = await getImageSignedUrl(imageUrl);
      }

      // Trigger segmentation asynchronously (don't wait for it)
      triggerSegmentationInference(imageId, usableImageUrl, width, height).catch(err => {
        console.error(`Failed to trigger segmentation inference for image ${imageId}:`, err);
      });
    }

    return NextResponse.json({
      success: true,
      imageId,
      image: imageDoc,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
    console.error('Image upload error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Helper function to trigger segmentation asynchronously
async function triggerSegmentationInference(
  imageId: string,
  imageUrl: string,
  width: number,
  height: number
): Promise<void> {
  try {
    const objects = await runSegmentationInference(imageUrl, width, height);
    const annotation = await createAnnotationDocument(
      imageId,
      'system',
      objects,
      'ai',
      undefined,
      'draft'
    );
    await updateImageLabelStatus(imageId, 'ai_labeled', annotation.id);
  } catch (error) {
    console.error('Async segmentation failed:', error);
    throw error;
  }
}
