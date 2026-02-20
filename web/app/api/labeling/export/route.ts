import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { exportToCocoFormat, exportToYoloFormat } from '@/lib/utils/datasetExport';

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.error) return auth.error;
  
  const { user } = auth;

  try {
    const { labelStatus, ownerUid, startDate, endDate, format } = await request.json();

    // Only allow users to export their own data
    const filterUid = ownerUid || user.id;
    if (filterUid !== user.id) {
      return NextResponse.json({
        error: 'Can only export your own data',
      }, { status: 403 });
    }

    const filters = {
      labelStatus: labelStatus || ['approved'],
      ownerUid: filterUid,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    let exportData: unknown;
    let imageCount = 0;
    let annotationCount = 0;

    if (format === 'yolo') {
      const yoloData = await exportToYoloFormat(filters);
      exportData = Object.fromEntries(yoloData);
      imageCount = yoloData.size;
      // Count annotation lines across all files
      for (const content of yoloData.values()) {
        annotationCount += content.split('\n').filter(Boolean).length;
      }
    } else {
      // Default to COCO format
      const cocoData = await exportToCocoFormat(filters);
      exportData = cocoData;
      imageCount = cocoData.images.length;
      annotationCount = cocoData.annotations.length;
    }

    return NextResponse.json({
      success: true,
      exportData,
      imageCount,
      annotationCount,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to export dataset';
    console.error('Export dataset error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
