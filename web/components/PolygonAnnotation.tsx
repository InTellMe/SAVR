'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { WebPolygonPoint, WebAnnotationObject, WebCategoryDocument } from '@/types';

interface PolygonAnnotationProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  annotations: WebAnnotationObject[];
  categories: WebCategoryDocument[];
  selectedCategoryId?: string;
  onAnnotationsChange: (annotations: WebAnnotationObject[]) => void;
  onCategorySelect?: (categoryId: string) => void;
  readOnly?: boolean;
}

export default function PolygonAnnotation({
  imageUrl,
  imageWidth,
  imageHeight,
  annotations,
  categories,
  selectedCategoryId,
  onAnnotationsChange,
  onCategorySelect,
  readOnly = false,
}: PolygonAnnotationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState<WebPolygonPoint[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [hoveredVertexIndex, setHoveredVertexIndex] = useState<{ objectId: string; vertexIndex: number } | null>(null);

  // Scale factor for display
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate scale to fit image in container
  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      const scaleX = containerWidth / imageWidth;
      const scaleY = containerHeight / imageHeight;
      setScale(Math.min(scaleX, scaleY, 1)); // Don't scale up
    }
  }, [imageWidth, imageHeight]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const displayWidth = imageWidth * scale;
    const displayHeight = imageHeight * scale;

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    // Clear canvas
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    // Draw all polygons
    annotations.forEach(obj => {
      const isSelected = obj.id === selectedObjectId;
      const category = categories.find(c => c.id === obj.categoryId);
      const color = category?.color || '#3b82f6';

      // Draw polygon
      ctx.beginPath();
      const points = obj.polygon.map(p => ({
        x: p.x * displayWidth,
        y: p.y * displayHeight,
      }));

      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();

      // Fill polygon with transparency
      ctx.fillStyle = isSelected ? `${color}40` : `${color}20`;
      ctx.fill();

      // Draw polygon outline
      ctx.strokeStyle = isSelected ? color : `${color}80`;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();

      // Draw vertices
      points.forEach((point, index) => {
        const isHovered = hoveredVertexIndex?.objectId === obj.id && hoveredVertexIndex?.vertexIndex === index;
        ctx.beginPath();
        ctx.arc(point.x, point.y, isHovered ? 6 : 4, 0, 2 * Math.PI);
        ctx.fillStyle = isSelected ? color : `${color}cc`;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    });

    // Draw current polygon being drawn
    if (currentPolygon.length > 0) {
      ctx.beginPath();
      const points = currentPolygon.map(p => ({
        x: p.x * displayWidth,
        y: p.y * displayHeight,
      }));

      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }

      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw vertices
      points.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
      });
    }
  }, [annotations, currentPolygon, selectedObjectId, hoveredVertexIndex, imageWidth, imageHeight, scale, categories]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>): WebPolygonPoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    return {
      x: Math.max(0, Math.min(1, x / imageWidth)),
      y: Math.max(0, Math.min(1, y / imageHeight)),
    };
  };

  const findVertexAtPoint = (point: WebPolygonPoint): { objectId: string; vertexIndex: number } | null => {
    const threshold = 0.02; // 2% of image size

    for (const obj of annotations) {
      for (let i = 0; i < obj.polygon.length; i++) {
        const vertex = obj.polygon[i];
        const dx = Math.abs(vertex.x - point.x);
        const dy = Math.abs(vertex.y - point.y);
        if (dx < threshold && dy < threshold) {
          return { objectId: obj.id, vertexIndex: i };
        }
      }
    }
    return null;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;

    const point = getCanvasCoordinates(e);

    if (isDrawing) {
      // Continue drawing polygon
      setCurrentPolygon([...currentPolygon, point]);
    } else {
      // Check if clicking on a vertex
      const vertex = findVertexAtPoint(point);
      if (vertex) {
        // Start dragging vertex
        setSelectedObjectId(vertex.objectId);
        setHoveredVertexIndex(vertex);
        return;
      }

      // Check if clicking on a polygon
      const clickedObject = annotations.find(obj => {
        // Simple point-in-polygon check
        const points = obj.polygon;
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const xi = points[i].x;
          const yi = points[i].y;
          const xj = points[j].x;
          const yj = points[j].y;
          const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
          if (intersect) inside = !inside;
        }
        return inside;
      });

      if (clickedObject) {
        setSelectedObjectId(clickedObject.id);
        return;
      }

      // Start new polygon
      if (selectedCategoryId) {
        setIsDrawing(true);
        setCurrentPolygon([point]);
      }
    }
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly || !isDrawing) return;

    e.preventDefault();

    // Close polygon (minimum 3 points)
    if (currentPolygon.length >= 3 && selectedCategoryId) {
      const newObject: WebAnnotationObject = {
        id: `obj_${Date.now()}`,
        categoryId: selectedCategoryId,
        polygon: [...currentPolygon],
      };

      onAnnotationsChange([...annotations, newObject]);
      setCurrentPolygon([]);
      setIsDrawing(false);
      setSelectedObjectId(newObject.id);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getCanvasCoordinates(e);
    const vertex = findVertexAtPoint(point);
    setHoveredVertexIndex(vertex);
  };

  const handleDeleteSelected = () => {
    if (selectedObjectId) {
      onAnnotationsChange(annotations.filter(obj => obj.id !== selectedObjectId));
      setSelectedObjectId(null);
    }
  };

  const handleChangeCategory = (objectId: string, categoryId: string) => {
    onAnnotationsChange(
      annotations.map(obj =>
        obj.id === objectId ? { ...obj, categoryId } : obj
      )
    );
  };

  return (
    <div className="relative w-full">
      <div ref={containerRef} className="relative border border-gray-300 rounded-lg overflow-hidden bg-gray-100">
        <img
          src={imageUrl}
          alt="Annotation target"
          className="block max-w-full h-auto"
          style={{ width: `${imageWidth * scale}px`, height: `${imageHeight * scale}px` }}
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 cursor-crosshair"
          onClick={handleCanvasClick}
          onDoubleClick={handleCanvasDoubleClick}
          onMouseMove={handleCanvasMouseMove}
        />
      </div>

      {!readOnly && (
        <div className="mt-4 flex gap-2 flex-wrap">
          <button
            onClick={() => {
              setIsDrawing(false);
              setCurrentPolygon([]);
            }}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            disabled={!isDrawing}
          >
            Cancel Drawing
          </button>
          {selectedObjectId && (
            <>
              <button
                onClick={handleDeleteSelected}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete Selected
              </button>
              <select
                value={annotations.find(obj => obj.id === selectedObjectId)?.categoryId || ''}
                onChange={e => handleChangeCategory(selectedObjectId, e.target.value)}
                className="px-4 py-2 border rounded"
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      )}

      {isDrawing && (
        <div className="mt-2 text-sm text-gray-600">
          Drawing polygon... Double-click to finish (minimum 3 points)
        </div>
      )}
    </div>
  );
}
