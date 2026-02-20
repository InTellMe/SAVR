'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { callApi } from '@/lib/api';
import { CocoDataset } from '@/types';

export default function ExportDatasetPage() {
  return (
    <ProtectedRoute>
      <ExportContent />
    </ProtectedRoute>
  );
}

function ExportContent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exportData, setExportData] = useState<CocoDataset | null>(null);
  const [exportFormat, setExportFormat] = useState<'coco' | 'yolo' | 'custom'>('coco');
  const [labelStatus, setLabelStatus] = useState<string[]>(['approved']);

  const handleExport = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const result = await callApi('/labeling/export', {
        labelStatus,
        ownerUid: user.id,
        format: exportFormat,
      });

      const data = result as {
        success: boolean;
        exportData: CocoDataset;
        imageCount: number;
        annotationCount: number;
      };

      if (data.success && data.exportData) {
        setExportData(data.exportData);
      } else {
        throw new Error('Export failed');
      }
    } catch (err: any) {
      console.error('Export error:', err);
      setError(err.message || 'Failed to export dataset');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!exportData) return;

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dataset_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-6">Export Dataset</h1>

        {error && (
          <div className="mb-4 p-4 border-red-500/20 bg-red-500/10 border text-red-400 rounded">
            {error}
          </div>
        )}

        <div className="glass-card rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Export Settings</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#9ca3c2] mb-2">Export Format</label>
              <select
                value={exportFormat}
                onChange={e => setExportFormat(e.target.value as 'coco' | 'yolo' | 'custom')}
                className="px-4 py-2 border border-white/6 rounded w-full max-w-xs bg-white/5 text-white"
              >
                <option value="coco">COCO Segmentation Format</option>
                <option value="yolo">YOLO Segmentation Format</option>
                <option value="custom">Custom JSON</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#9ca3c2] mb-2">Label Status</label>
              <div className="space-y-2">
                {['unlabeled', 'ai_labeled', 'in_review', 'approved'].map(status => (
                  <label key={status} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={labelStatus.includes(status)}
                      onChange={e => {
                        if (e.target.checked) {
                          setLabelStatus([...labelStatus, status]);
                        } else {
                          setLabelStatus(labelStatus.filter(s => s !== status));
                        }
                      }}
                      className="mr-2 accent-[#00d4ff]"
                    />
                    <span className="capitalize text-[#9ca3c2]">{status.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleExport}
              disabled={loading}
              className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Exporting...' : 'Export Dataset'}
            </button>
          </div>
        </div>

        {loading && <LoadingSpinner />}

        {exportData && (
          <div className="glass-card rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Export Results</h2>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Download JSON
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-[#9ca3c2]">
                <span className="font-semibold">Images:</span> {exportData.images.length}
              </p>
              <p className="text-[#9ca3c2]">
                <span className="font-semibold">Annotations:</span> {exportData.annotations.length}
              </p>
              <p className="text-[#9ca3c2]">
                <span className="font-semibold">Categories:</span> {exportData.categories.length}
              </p>
            </div>

            <div className="mt-4">
              <h3 className="font-semibold text-white mb-2">Categories:</h3>
              <ul className="list-disc list-inside space-y-1">
                {exportData.categories.map(cat => (
                  <li key={cat.id} className="text-[#9ca3c2]">
                    {cat.name} (ID: {cat.id})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
