import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { getImageDocument, getImageAnnotations, getAllCategories, getImageSignedUrl } from '@/lib/utils/datasetStorage';

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.error) return auth.error;
  
  const { user } = auth;

  try {
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('imageId');

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

    const annotations = await getImageAnnotations(imageId);
    const categories = await getAllCategories();

    // Provide a usable signed URL for the image if stored in Supabase Storage
    let resolvedImage = image;
    if (image.storagePathOriginal.startsWith('labeling-images/')) {
      const signedUrl = await getImageSignedUrl(image.storagePathOriginal);
      resolvedImage = { ...image, storagePathOriginal: signedUrl };
    }

    return NextResponse.json({
      success: true,
      image: resolvedImage,
      annotations,
      categories,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to get annotations';
    console.error('Get annotations error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
