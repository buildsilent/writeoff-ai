'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { ScanResultCard, type ScanResult } from '@/components/ScanResultCard';
import { UpgradeModal } from '@/components/UpgradeModal';
import { Camera, FileText, Loader2 } from 'lucide-react';

export default function ScanPage() {
  const [mode, setMode] = useState<'upload' | 'paste'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && (f.type.startsWith('image/') || f.type === 'application/pdf')) {
      setFile(f);
      setError(null);
    } else {
      setFile(null);
      setError('Please select an image file (JPEG, PNG, WebP)');
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setResult(null);

    if (mode === 'upload') {
      if (!file) {
        setError('Please select an image');
        return;
      }
    } else {
      if (!text.trim()) {
        setError('Please paste receipt text');
        return;
      }
    }

    setLoading(true);
    try {
      const body =
        mode === 'upload'
          ? { type: 'image', imageBase64: await fileToBase64(file!) }
          : { type: 'text', text: text.trim() };

      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'FREE_LIMIT_REACHED') {
          setShowUpgrade(true);
        } else {
          setError(data.error || data.message || 'Scan failed');
        }
        return;
      }

      setResult(data);
      setSaved(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />
      <main className="mx-auto max-w-2xl px-6 py-12">
        <Link
          href="/dashboard"
          className="text-sm text-zinc-500 transition-colors hover:text-white"
        >
          ← Back to dashboard
        </Link>

        <h1 className="mt-8 text-2xl font-semibold text-white">Scan a receipt</h1>
        <p className="mt-1 text-zinc-500">
          Upload a photo or paste the receipt text below
        </p>

        {/* Mode toggle */}
        <div className="mt-8 flex gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-1">
          <button
            onClick={() => {
              setMode('upload');
              setFile(null);
              setText('');
              setError(null);
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-colors ${
              mode === 'upload'
                ? 'bg-white text-black'
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            <Camera className="h-4 w-4" />
            Upload photo
          </button>
          <button
            onClick={() => {
              setMode('paste');
              setFile(null);
              setError(null);
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-colors ${
              mode === 'paste'
                ? 'bg-white text-black'
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            <FileText className="h-4 w-4" />
            Paste text
          </button>
        </div>

        {/* Input area */}
        <div className="mt-6">
          {mode === 'upload' ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/[0.08] bg-white/[0.02] transition-colors hover:border-white/[0.12]"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 transition-colors group-hover:border-white/[0.1]">
                <Camera className="h-12 w-12 text-zinc-600" />
              </div>
              <p className="mt-4 text-sm font-medium text-white">
                {file ? file.name : 'Tap to select or take a photo'}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                JPEG, PNG, or WebP
              </p>
            </div>
          ) : (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your receipt text here..."
              className="min-h-[200px] w-full rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-white placeholder:text-zinc-600 focus:border-[#22c55e] focus:outline-none focus:ring-1 focus:ring-[#22c55e]"
              rows={8}
            />
          )}
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-400">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn-primary mt-8 flex w-full items-center justify-center gap-2 rounded-lg bg-[#22c55e] py-3.5 text-sm font-medium text-black disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Camera className="h-4 w-4" />
              Scan receipt
            </>
          )}
        </button>

        {result && (
          <div className="mt-12">
            <ScanResultCard
              result={result as unknown as ScanResult}
              saved={saved}
            />
          </div>
        )}
      </main>

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64 || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
