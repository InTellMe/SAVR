import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { getImageDocument, createAnnotationDocument, updateImageLabelStatus } from '@/lib/utils/datasetStorage';

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.error) return auth.error;
  
  const { user } = auth;

  try {
    const { imageId, objects, parentAnnotationId, status } = await request.json();

    if (!imageId || typeof imageId !== 'string') {
      return NextResponse.json({
        error: 'imageId is required and must be a string',
      }, { status: 400 });
    }
    if (!Array.isArray(objects)) {
      return NextResponse.json({
        error: 'objects must be an array',
      }, { status: 400 });
    }

    // Validate polygon structure
    for (const obj of objects) {
      if (!obj.categoryId || typeof obj.categoryId !== 'string') {
        return NextResponse.json({
          error: 'Each object must have a valid categoryId',
        }, { status: 400 });
      }
      if (!Array.isArray(obj.polygon) || obj.polygon.length < 3) {
        return NextResponse.json({
          error: 'Each object must have a polygon with at least 3 points',
        }, { status: 400 });
      }
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

    const annotation = await createAnnotationDocument(
      imageId,
      user.id,
      objects,
      'user',
      parentAnnotationId,
      status || 'submitted'
    );

    // Update image status
    await updateImageLabelStatus(
      imageId,
      status === 'approved' ? 'approved' : 'in_review',
      annotation.id
    );

    return NextResponse.json({
      success: true,
      annotationId: annotation.id,
      annotation,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to save annotation';
    console.error('Save annotation error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
