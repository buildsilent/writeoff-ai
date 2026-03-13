'use client';

import { Suspense, useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { ScanResults } from '@/components/ScanResults';
import { UpgradeModal } from '@/components/UpgradeModal';
import { Camera, FileText, Loader2, RotateCcw } from 'lucide-react';

const FILE_INPUT_ID = 'receipt-file-input';
const PROGRESS_MESSAGES = [
  'Reading receipt...',
  'Identifying deductions...',
  'Calculating IRS categories...',
  'Almost done...',
];

function ScanContent() {
  const [mode, setMode] = useState<'upload' | 'paste'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [result, setResult] = useState<{ line_items?: unknown[]; merchant_name?: string; date?: string; total_amount?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [saved, setSaved] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [checkoutCanceled, setCheckoutCanceled] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [followUpQuestion, setFollowUpQuestion] = useState<string | null>(null);
  const [pendingText, setPendingText] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('canceled') === '1') setCheckoutCanceled(true);
  }, [searchParams]);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setProgressStep((s) => (s + 1) % PROGRESS_MESSAGES.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [loading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const f = input.files?.[0];
    if (f && f.type.startsWith('image/')) {
      setFile(f);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(f));
      setError(null);
      setResult(null);
      setFailedAttempts(0);
    } else if (f) {
      setFile(null);
      setPreviewUrl(null);
      setError('Please select an image file (JPEG, PNG, or WebP)');
    }
    input.value = '';
  };

  const handleRetake = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setFailedAttempts(0);
    fileInputRef.current?.click();
  };

  const handleSubmit = async () => {
    setError(null);
    setResult(null);
    setSuccessMessage(false);

    if (mode === 'upload') {
      if (!file) {
        setError('Please take or select a photo first');
        return;
      }
    } else {
      if (!text.trim()) {
        setError(followUpQuestion ? 'Please type your answer above' : 'Please describe your receipt in plain English');
        return;
      }
    }

    const originalTextForRequest = mode === 'paste' && !followUpQuestion ? text.trim() : pendingText;
    if (mode === 'paste' && !followUpQuestion) setPendingText(originalTextForRequest);

    setLoading(true);
    try {
      const body: Record<string, unknown> =
        mode === 'upload'
          ? { type: 'image', imageBase64: await fileToBase64(file!) }
          : followUpQuestion
            ? { type: 'text', originalText: pendingText, followUpAnswer: text.trim() }
            : { type: 'text', text: originalTextForRequest };

      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setLoading(false);
        if (data.error === 'FREE_LIMIT_REACHED') {
          setShowUpgrade(true);
        } else if (data.error === 'RECEIPT_UNREADABLE') {
          const attempts = failedAttempts + 1;
          setFailedAttempts(attempts);
          if (attempts >= 2) {
            setMode('paste');
            setError(null);
            setText('No worries — just type what was on your receipt in plain English and we\'ll handle the rest.');
          } else {
            setError('We had trouble reading that receipt. Try taking the photo in better lighting or move closer.');
          }
        } else {
          setError(data.message || 'Something went wrong. Let\'s try again.');
        }
        return;
      }

      if (data.followUpQuestion) {
        setFollowUpQuestion(data.followUpQuestion);
        setText('');
        setLoading(false);
        return;
      }

      setResult(data);
      setSaved(true);
      setSuccessMessage(true);
      setFollowUpQuestion(null);
      setPendingText('');
      setTimeout(() => setSuccessMessage(false), 3000);
    } catch {
      setError('Something went wrong. Let\'s try that again — we\'re here to help.');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToText = () => {
    setMode('paste');
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setError(null);
    setText('No worries — just type what was on your receipt in plain English and we\'ll handle the rest.');
  };

  return (
    <div className="min-h-screen bg-[#080B14]">
      <Header />
      <main className="mx-auto max-w-2xl px-6 py-12">
        <Link
          href="/dashboard"
          className="text-sm text-zinc-400 transition-colors hover:text-white"
        >
          ← Back to dashboard
        </Link>

        <h1 className="mt-8 text-2xl font-semibold text-white">Scan a receipt</h1>
        <p className="mt-1 text-zinc-500">
          Upload a photo or describe your receipt in plain English
        </p>
        {checkoutCanceled && (
          <p className="mt-3 text-sm text-zinc-500">
            Checkout was canceled. Upgrade anytime when you&apos;re ready.
          </p>
        )}

        <div className="mt-8 flex gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-1">
          <button
            onClick={() => {
              setMode('upload');
              setFile(null);
              setPreviewUrl(null);
              setText('');
              setError(null);
              setResult(null);
              setFollowUpQuestion(null);
            }}
            type="button"
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-colors ${
              mode === 'upload' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'
            }`}
          >
            <Camera className="h-4 w-4" />
            Photo
          </button>
          <button
            onClick={() => {
              setMode('paste');
              setFile(null);
              setPreviewUrl(null);
              setError(null);
              setResult(null);
            }}
            type="button"
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-colors ${
              mode === 'paste' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'
            }`}
          >
            <FileText className="h-4 w-4" />
            Type it
          </button>
        </div>

        <div className="mt-6">
          {mode === 'upload' ? (
            !file && !loading ? (
              <label
                htmlFor={FILE_INPUT_ID}
                className="group flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/[0.12] bg-white/[0.02] transition-colors hover:border-[#4F46E5]/50"
              >
                <input
                  ref={fileInputRef}
                  id={FILE_INPUT_ID}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  capture="environment"
                  onChange={handleFileChange}
                  className="absolute h-0 w-0 opacity-0"
                  aria-label="Select or take a photo of your receipt"
                />
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 transition-colors group-hover:border-[#4F46E5]/30">
                  <Camera className="h-16 w-16 text-zinc-500" />
                </div>
                <p className="mt-6 text-base font-medium text-white">
                  Tap to photograph your receipt
                </p>
                <p className="mt-2 max-w-xs text-center text-sm text-zinc-500">
                  Works with any receipt — restaurants, software, supplies, travel, home office.
                </p>
              </label>
            ) : file && !loading ? (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-xl border border-white/[0.08]">
                  <img
                    src={previewUrl!}
                    alt="Receipt preview"
                    className="w-full object-contain"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleSubmit()}
                    type="button"
                    className="btn-primary flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#4F46E5] py-3.5 font-semibold text-white shadow-[0_4px_14px_rgba(79,70,229,0.4)]"
                  >
                    Looks good — Analyze Receipt
                  </button>
                  <button
                    onClick={handleRetake}
                    type="button"
                    className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.12] px-6 py-3.5 text-sm font-medium text-white"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Retake
                  </button>
                </div>
              </div>
            ) : loading ? (
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-8">
                <div className="flex flex-col items-center">
                  <Loader2 className="h-12 w-12 animate-spin text-[#4F46E5]" />
                  <p className="mt-4 text-lg font-medium text-white">
                    Analyzing your receipt...
                  </p>
                  <div className="mt-6 w-full max-w-xs">
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full bg-[#4F46E5] transition-all duration-500"
                        style={{ width: `${((progressStep + 1) / PROGRESS_MESSAGES.length) * 100}%` }}
                      />
                    </div>
                    <p className="mt-2 text-center text-sm text-zinc-500">
                      {PROGRESS_MESSAGES[progressStep]}
                    </p>
                  </div>
                </div>
              </div>
            ) : null
          ) : (
            <div className="space-y-4">
              {followUpQuestion && (
                <div className="rounded-xl border border-[#4F46E5]/30 bg-[#4F46E5]/10 p-4">
                  <p className="text-sm font-medium text-white">{followUpQuestion}</p>
                </div>
              )}
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={followUpQuestion ? 'Type your answer here...' : 'e.g. I bought printer paper and pens at Office Depot for $47.50 on March 3rd'}
                className="min-h-[180px] w-full rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-white placeholder:text-zinc-500 focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                rows={6}
              />
              <button
                onClick={handleSubmit}
                disabled={loading || !text.trim()}
                type="button"
                className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl bg-[#4F46E5] py-3.5 font-semibold text-white disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Analyze Receipt'
                )}
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-sm text-amber-200/90">{error}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {mode === 'upload' && (
                <button
                  onClick={handleRetake}
                  type="button"
                  className="rounded-lg bg-[#4F46E5] px-4 py-2 text-sm font-medium text-white"
                >
                  Try Again
                </button>
              )}
              {failedAttempts >= 1 && mode === 'upload' && (
                <button
                  onClick={handleSwitchToText}
                  type="button"
                  className="text-sm font-medium text-[#4F46E5] underline"
                >
                  Type it instead →
                </button>
              )}
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 rounded-xl border border-[#4F46E5]/30 bg-[#4F46E5]/10 p-4 text-center">
            <p className="font-medium text-[#4F46E5]">Receipt scanned successfully</p>
          </div>
        )}

        {result && result.line_items && !loading && (
          <ScanResults
            result={{
              merchant_name: result.merchant_name || 'Unknown',
              date: result.date || null,
              total_amount: result.total_amount ?? 0,
              line_items: result.line_items as Parameters<typeof ScanResults>[0]['result']['line_items'],
            }}
            saved={saved}
          />
        )}
      </main>

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#080B14]">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
        </div>
      }
    >
      <ScanContent />
    </Suspense>
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
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
