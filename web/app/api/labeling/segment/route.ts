import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { getImageDocument, getImageSignedUrl, createAnnotationDocument, updateImageLabelStatus } from '@/lib/utils/datasetStorage';
import { runSegmentationInference } from '@/lib/services/segmentation';

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.error) return auth.error;
  
  const { user } = auth;

  try {
    const { imageId } = await request.json();

    if (!imageId || typeof imageId !== 'string') {
      return NextResponse.json({
        error: 'imageId is required and must be a string',
      }, { status: 400 });
    }

    const image = await getImageDocument(imageId);
    if (!image) {
      return NextResponse.json({
        error: 'Image not found',
      }, { status: 404 });
    }

    if (image.ownerUid !== user.id) {
      return NextResponse.json({
        error: 'Access denied',
      }, { status: 403 });
    }

    // Get a usable URL for the image
    let imageUrl: string;
    if (image.storagePathOriginal.startsWith('labeling-images/')) {
      imageUrl = await getImageSignedUrl(image.storagePathOriginal);
    } else {
      imageUrl = image.storagePathOriginal;
    }

    const objects = await runSegmentationInference(
      imageUrl,
      image.width,
      image.height
    );

    const annotation = await createAnnotationDocument(
      imageId,
      'system',
      objects,
      'ai',
      undefined,
      'draft'
    );

    await updateImageLabelStatus(imageId, 'ai_labeled', annotation.id);

    return NextResponse.json({
      success: true,
      annotationId: annotation.id,
      objectCount: objects.length,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to run segmentation';
    console.error('Segmentation inference error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
