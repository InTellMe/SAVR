'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import ImageUpload from '@/components/ImageUpload';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import { getInventory, addInventoryItem, TransferSession } from '@/lib/db';
import { uploadImage, getPublicUrl } from '@/lib/storage';
import { callApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';

interface ExtractedIngredient {
  name: string;
  quantity: number;
  unit: string;
  confidence: number;
  category: 'pantry' | 'fridge' | 'freezer';
  price?: number;
  isDuplicate?: boolean;
}

type ScanMode = 'inventory' | 'receipt';

export default function UploadPage() {
  return (
    <ProtectedRoute>
      <UploadContent />
    </ProtectedRoute>
  );
}

function UploadContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<ExtractedIngredient[]>([]);
  const [scanMode, setScanMode] = useState<ScanMode>('inventory');
  const [existingItems, setExistingItems] = useState<string[]>([]);
  const [transferQr, setTransferQr] = useState<string | null>(null);
  const [transferSessionId, setTransferSessionId] = useState<string | null>(null);
  const [transferPhotos, setTransferPhotos] = useState<string[]>([]);
  const [creatingTransfer, setCreatingTransfer] = useState(false);

  // Load existing inventory item names for duplicate detection
  useEffect(() => {
    async function loadExisting() {
      if (!user) return;
      try {
        const items = await getInventory(user.id);
        setExistingItems(items.map(item => item.name.toLowerCase()));
      } catch {
        // Non-critical
      }
    }
    loadExisting();
  }, [user]);

  // Auto-launch camera if URL param specifies it
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'receipt') setScanMode('receipt');
  }, [searchParams]);

  async function handleImageUpload(file: File) {
    if (!user) return;

    setUploading(true);
    setError('');
    setSuccessMessage('');
    setIngredients([]);
    setImageUrl(null);

    try {
      // Upload to Supabase Storage
      const filePath = await uploadImage('inventory-images', user.id, file);
      const url = getPublicUrl('inventory-images', filePath);
      setImageUrl(url);

      if (scanMode === 'receipt') {
        // Receipt scanning mode
        const result = await callApi('/ai/scan-receipt', { imageUrl: url });
        const data = result as {
          success: boolean;
          items: Array<{ name: string; quantity: number; unit: string; price?: number }>;
        };

        if (!data.success || !data.items) {
          throw new Error('Receipt scanning failed');
        }

        const mapped: ExtractedIngredient[] = data.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          confidence: 0.9,
          category: 'pantry' as const,
          price: item.price,
          isDuplicate: existingItems.includes(item.name.toLowerCase()),
        }));
        setIngredients(mapped);
      } else {
        // Standard inventory scanning
        const result = await callApi('/ai/analyze-image', { imageUrl: url });
        const data = result as { success: boolean; ingredients: Array<{ name: string; quantity: number; unit: string; confidence: number }> };

        if (!data.success || !data.ingredients) {
          throw new Error('Image analysis failed');
        }

        const mapped: ExtractedIngredient[] = data.ingredients.map(ing => ({
          ...ing,
          category: 'pantry' as const,
          isDuplicate: existingItems.includes(ing.name.toLowerCase()),
        }));
        setIngredients(mapped);
      }
    } catch (err: unknown) {
      console.error('Upload/analyze error:', err);
      setError(scanMode === 'receipt' ? 'Failed to scan receipt. Please try again.' : 'Failed to analyze image. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  function updateIngredient(index: number, updates: Partial<ExtractedIngredient>) {
    setIngredients(prev => prev.map((ing, i) => i === index ? { ...ing, ...updates } : ing));
  }

  function removeIngredient(index: number) {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  }

  function setAllCategories(category: 'pantry' | 'fridge' | 'freezer') {
    setIngredients(prev => prev.map(ing => ({ ...ing, category })));
  }

  async function handleCreateTransferSession() {
    if (!user || creatingTransfer) return;
    setCreatingTransfer(true);
    try {
      const result = await callApi('/transfer/create-session', {});
      const data = result as { success: boolean; sessionId: string };

      if (data.success) {
        setTransferSessionId(data.sessionId);
        const transferUrl = `${window.location.origin}/transfer/${data.sessionId}`;
        const qrDataUrl = await QRCode.toDataURL(transferUrl, {
          width: 300,
          margin: 2,
          color: { dark: '#00d4ff', light: '#000000' },
        });
        setTransferQr(qrDataUrl);
        setTransferPhotos([]);
      }
    } catch (err) {
      console.error('Transfer session error:', err);
      setError('Failed to create transfer session.');
    } finally {
      setCreatingTransfer(false);
    }
  }

  // Listen for incoming transferred photos using Supabase realtime
  useEffect(() => {
    if (!transferSessionId) return;
    
    const channel = supabase
      .channel(`transfer_session_${transferSessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transfer_sessions',
          filter: `id=eq.${transferSessionId}`,
        },
        (payload) => {
          const session = payload.new as TransferSession;
          setTransferPhotos(session.image_urls || []);
        }
      )
      .subscribe();
    
    return () => {
      channel.unsubscribe();
    };
  }, [transferSessionId]);

  async function handleAnalyzeTransferredPhoto(url: string) {
    if (!user) return;
    setUploading(true);
    setError('');
    setImageUrl(url);
    try {
      const result = await callApi('/ai/analyze-image', { imageUrl: url });
      const data = result as { success: boolean; ingredients: Array<{ name: string; quantity: number; unit: string; confidence: number }> };
      if (data.success && data.ingredients) {
        const mapped: ExtractedIngredient[] = data.ingredients.map(ing => ({
          ...ing,
          category: 'pantry' as const,
          isDuplicate: existingItems.includes(ing.name.toLowerCase()),
        }));
        setIngredients(prev => [...prev, ...mapped]);
      }
    } catch (err) {
      console.error('Analyze transferred photo error:', err);
      setError('Failed to analyze transferred photo.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveToInventory() {
    if (!user || ingredients.length === 0) return;

    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const toSave = ingredients.filter(ing => !ing.isDuplicate || confirm(`"${ing.name}" may already be in your inventory. Add anyway?`));

      await Promise.all(
        toSave.map((ingredient) =>
          addInventoryItem(user.id, {
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            category: ingredient.category,
            image_url: imageUrl || undefined,
          })
        )
      );

      setSuccessMessage(`${toSave.length} item(s) saved to your inventory.`);
      setIngredients([]);
    } catch (err: unknown) {
      console.error('Save to inventory error:', err);
      setError('Failed to save ingredients to inventory.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <Navbar />

      <div className="container mx-auto px-4 pt-24 pb-8">
        <h1 className="text-3xl font-bold text-white mb-4">
          {scanMode === 'receipt' ? 'Scan Receipt' : 'Upload Pantry Photo'}
        </h1>
        <p className="text-[#9ca3c2] mb-4">
          {scanMode === 'receipt'
            ? 'Upload a photo of your grocery receipt. Our AI will extract items and quantities so you can add them to your inventory in bulk.'
            : 'Upload a photo of your pantry or fridge. Our AI will analyze it and extract ingredients that you can add to your inventory with one click.'}
        </p>

        {/* Mode switcher */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setScanMode('inventory')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              scanMode === 'inventory'
                ? 'bg-[#00d4ff] text-black'
                : 'border border-white/20 text-[#9ca3c2] hover:text-white hover:border-[#00d4ff]/40'
            }`}
          >
            Pantry Scan
          </button>
          <button
            onClick={() => setScanMode('receipt')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              scanMode === 'receipt'
                ? 'bg-[#f59e0b] text-black'
                : 'border border-white/20 text-[#9ca3c2] hover:text-white hover:border-[#f59e0b]/40'
            }`}
          >
            Receipt Scan
          </button>
        </div>

        <div className="rounded-xl px-5 py-4 mb-8 text-sm" style={{ background: 'rgba(0, 212, 255, 0.06)', border: '1px solid rgba(0, 212, 255, 0.15)' }}>
          <p className="font-semibold text-[#00d4ff] mb-1">
            {scanMode === 'receipt' ? 'Tips for receipt scanning' : 'Tips for best results'}
          </p>
          <ul className="text-[#9ca3c2] space-y-1 list-disc list-inside">
            {scanMode === 'receipt' ? (
              <>
                <li>Make sure the full receipt is visible and text is readable.</li>
                <li>Flatten the receipt on a surface before photographing.</li>
                <li>Prices will be extracted when visible for your reference.</li>
                <li>Review detected items and assign the correct storage category before saving.</li>
              </>
            ) : (
              <>
                <li>Use good lighting and avoid blurry photos.</li>
                <li>Lay items out so labels are visible when possible.</li>
                <li>After analysis, review detected items — you can remove any that are wrong before saving.</li>
                <li>If something is missed, head to <span className="text-[#00d4ff]">Inventory</span> to add it manually or scan a barcode.</li>
              </>
            )}
          </ul>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-400">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 rounded border border-[#00bfa6]/20 bg-[#00bfa6]/10 px-4 py-3 text-[#00bfa6]">
            {successMessage}
          </div>
        )}

        {/* QR Transfer section */}
        <div className="glass-card rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Transfer from Phone</h2>
              <p className="text-sm text-[#9ca3c2]">Scan the QR code on your phone to upload photos directly.</p>
            </div>
            <button
              onClick={handleCreateTransferSession}
              disabled={creatingTransfer}
              className="px-4 py-2 rounded-lg border border-[#a855f7]/40 text-[#a855f7] text-sm font-semibold hover:bg-[#a855f7]/10 disabled:opacity-50 transition"
            >
              {creatingTransfer ? 'Creating...' : transferQr ? 'New QR Code' : 'Generate QR Code'}
            </button>
          </div>

          {transferQr && (
            <div className="flex flex-col items-center gap-4">
              <img src={transferQr} alt="QR Code for transfer" className="w-48 h-48 rounded-lg" />
              <p className="text-xs text-[#9ca3c2]">Scan with your phone camera. Link expires in 15 minutes.</p>

              {transferPhotos.length > 0 && (
                <div className="w-full">
                  <p className="text-sm text-[#00bfa6] font-medium mb-2">
                    {transferPhotos.length} photo(s) received
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {transferPhotos.map((url, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAnalyzeTransferredPhoto(url)}
                        className="relative aspect-square rounded-lg overflow-hidden border border-white/10 hover:border-[#00d4ff]/40 transition"
                      >
                        <img src={url} alt={`Transfer ${idx + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                          <span className="text-white text-xs font-semibold">Analyze</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="glass-card rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            {scanMode === 'receipt' ? 'Upload Receipt Photo' : 'Upload an Image'}
          </h2>
          <ImageUpload onUpload={handleImageUpload} loading={uploading} />
        </div>

        {ingredients.length > 0 && (
          <div className="glass-card rounded-lg p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
              <h2 className="text-xl font-semibold text-white">
                Step 2: Review Detected Items ({ingredients.length})
              </h2>
              <div className="flex gap-2 flex-wrap">
                {/* Bulk category assignment */}
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-[#9ca3c2]">Set all to:</span>
                  {(['pantry', 'fridge', 'freezer'] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setAllCategories(cat)}
                      className="px-2 py-1 rounded border border-white/10 text-[#9ca3c2] hover:border-[#00d4ff]/40 hover:text-[#00d4ff] transition capitalize"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleSaveToInventory}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-black text-sm font-semibold hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Add All to Inventory'}
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ingredients.map((ingredient, index) => (
                <div
                  key={`${ingredient.name}-${index}`}
                  className={`rounded-lg border p-4 transition ${
                    ingredient.isDuplicate
                      ? 'border-[#f59e0b]/30 bg-[#f59e0b]/5'
                      : 'border-white/6 hover:border-[#00d4ff]/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <input
                      type="text"
                      value={ingredient.name}
                      onChange={(e) => updateIngredient(index, { name: e.target.value })}
                      className="font-semibold text-white bg-transparent border-b border-transparent hover:border-white/20 focus:border-[#00d4ff] focus:outline-none w-full mr-2"
                    />
                    <button
                      onClick={() => removeIngredient(index)}
                      className="text-red-400 hover:text-red-300 text-lg leading-none shrink-0"
                    >
                      &times;
                    </button>
                  </div>

                  {ingredient.isDuplicate && (
                    <p className="text-xs text-[#f59e0b] mb-2">May already be in inventory</p>
                  )}

                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="number"
                      value={ingredient.quantity}
                      onChange={(e) => updateIngredient(index, { quantity: parseFloat(e.target.value) || 0 })}
                      className="w-16 px-2 py-1 text-sm border border-white/6 rounded bg-white/5 text-white"
                      min="0"
                      step="0.5"
                    />
                    <input
                      type="text"
                      value={ingredient.unit}
                      onChange={(e) => updateIngredient(index, { unit: e.target.value })}
                      className="w-16 px-2 py-1 text-sm border border-white/6 rounded bg-white/5 text-white"
                    />
                    {ingredient.price !== undefined && (
                      <span className="text-xs text-[#9ca3c2]">${ingredient.price.toFixed(2)}</span>
                    )}
                  </div>

                  {/* Category selector */}
                  <div className="flex gap-1">
                    {(['pantry', 'fridge', 'freezer'] as const).map(cat => (
                      <button
                        key={cat}
                        onClick={() => updateIngredient(index, { category: cat })}
                        className={`text-xs px-2 py-1 rounded transition capitalize ${
                          ingredient.category === cat
                            ? 'bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/40'
                            : 'bg-white/5 text-[#9ca3c2] border border-white/6 hover:border-[#00d4ff]/20'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="mt-2">
                    <span className="rounded bg-[#00d4ff]/10 px-2 py-0.5 text-xs text-[#00d4ff]">
                      {(ingredient.confidence * 100).toFixed(0)}% confident
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
