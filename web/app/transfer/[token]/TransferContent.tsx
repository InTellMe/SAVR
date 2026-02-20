'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getTransferSession, addImageToTransferSession } from '@/lib/db';
import { uploadImage, getPublicUrl } from '@/lib/storage';

type SessionStatus = 'loading' | 'active' | 'expired' | 'completed' | 'error';

export default function TransferContent() {
  const params = useParams();
  const token = params.token as string;

  const [status, setStatus] = useState<SessionStatus>('loading');
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    checkSession();
  }, [token]);

  async function checkSession() {
    try {
      const session = await getTransferSession(token);
      if (!session) {
        setStatus('error');
        return;
      }

      const expiresAt = new Date(session.expires_at);

      if (session.status === 'completed') {
        setStatus('completed');
      } else if (new Date() > expiresAt) {
        setStatus('expired');
      } else {
        setStatus('active');
        setUploadedCount(session.image_urls?.length || 0);
      }
    } catch (err) {
      console.error('Session check error:', err);
      setStatus('error');
    }
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0 || status !== 'active') return;

    setUploading(true);
    setError('');

    try {
      const session = await getTransferSession(token);
      if (!session) {
        setStatus('error');
        return;
      }
      const userId = session.user_id;

      for (const file of Array.from(files)) {
        // Upload to Supabase Storage
        const filePath = await uploadImage('inventory-images', userId, file);
        const url = getPublicUrl('inventory-images', filePath);

        await addImageToTransferSession(token, url);

        setUploadedCount(prev => prev + 1);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#000' }}>
        <div className="w-8 h-8 border-2 border-[#00d4ff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#000' }}>
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">&#9203;</div>
          <h1 className="text-xl font-bold text-white mb-2">Session Expired</h1>
          <p className="text-[#9ca3c2] text-sm">This transfer link has expired. Generate a new QR code from the desktop app.</p>
        </div>
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#000' }}>
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">&#10003;</div>
          <h1 className="text-xl font-bold text-white mb-2">Transfer Complete</h1>
          <p className="text-[#9ca3c2] text-sm">Photos have been transferred. You can close this page.</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#000' }}>
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">&#10060;</div>
          <h1 className="text-xl font-bold text-white mb-2">Invalid Link</h1>
          <p className="text-[#9ca3c2] text-sm">This transfer link is not valid. Check the QR code and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4" style={{ background: '#000' }}>
      <div className="max-w-md mx-auto pt-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">SAVR Photo Transfer</h1>
          <p className="text-[#9ca3c2] text-sm">
            Take photos of your pantry, fridge, or receipts. They will appear on your desktop automatically.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {uploadedCount > 0 && (
          <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: 'rgba(0, 191, 166, 0.1)', border: '1px solid rgba(0, 191, 166, 0.2)' }}>
            <span className="text-[#00bfa6] font-medium">{uploadedCount} photo(s) transferred</span>
          </div>
        )}

        {/* Camera capture */}
        <div className="space-y-4">
          <label className="block">
            <div className="rounded-xl p-8 text-center cursor-pointer transition hover:border-[#00d4ff]/60" style={{ border: '2px dashed rgba(0, 212, 255, 0.3)', background: 'rgba(0, 212, 255, 0.04)' }}>
              <div className="text-4xl mb-3">&#128247;</div>
              <p className="text-white font-semibold mb-1">
                {uploading ? 'Uploading...' : 'Take Photo'}
              </p>
              <p className="text-[#9ca3c2] text-xs">Tap to open camera or select from gallery</p>
            </div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={(e) => handleFileUpload(e.target.files)}
              disabled={uploading}
              className="hidden"
            />
          </label>

          <label className="block">
            <div className="rounded-xl p-4 text-center cursor-pointer transition hover:border-white/30" style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-[#9ca3c2] text-sm">Or choose from gallery (multiple)</p>
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFileUpload(e.target.files)}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        {uploading && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-[#9ca3c2]">
            <div className="w-4 h-4 border-2 border-[#00d4ff] border-t-transparent rounded-full animate-spin" />
            Uploading...
          </div>
        )}
      </div>
    </div>
  );
}
