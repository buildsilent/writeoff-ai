'use client';

import { Suspense, useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { AppFooter } from '@/components/AppFooter';
import { ScanResults } from '@/components/ScanResults';
import { ScanCelebrationModal, getDeductionStatsFromResult } from '@/components/ScanCelebrationModal';
import { LineItemCard } from '@/components/LineItemCard';
import { ReceiptRequirementsReminder } from '@/components/ReceiptRequirementsReminder';
import { UpgradeModal } from '@/components/UpgradeModal';
import { Camera, FileText, Loader2, RotateCcw, CheckCircle2, Receipt, LayoutDashboard } from 'lucide-react';
import { notifyScanComplete } from '@/hooks/useScansRealtime';
import { useScanWorker } from '@/hooks/useScanWorker';

const FILE_INPUT_ID = 'receipt-file-input';
const PROGRESS_MESSAGES = [
  'Reading your receipt...',
  'Identifying line items...',
  'Checking IRS categories...',
  'Calculating deductions...',
];

const TYPE_PLACEHOLDER = 'e.g. Bought a ring light and backdrop from Amazon for $89 for my content studio';

const CATEGORY_OPTIONS = [
  { value: '', label: 'Not Sure', sub: 'Skip if unsure, AI will figure it out' },
  { value: 'Business Purchase', label: 'Business Purchase' },
  { value: 'Meal or Entertainment', label: 'Meal or Entertainment' },
  { value: 'Travel', label: 'Travel' },
  { value: 'Home Office', label: 'Home Office' },
  { value: 'Vehicle', label: 'Vehicle' },
  { value: 'Personal (not deductible)', label: 'Personal (not deductible)' },
] as const;

function ScanContent() {
  const searchParams = useSearchParams();
  const canceledParam = searchParams?.get?.('canceled') ?? null;

  const [mode, setMode] = useState<'upload' | 'paste'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [result, setResult] = useState<{
    line_items?: unknown[];
    merchant_name?: string;
    date?: string | null;
    total_amount?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [checkoutCanceled, setCheckoutCanceled] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [followUpQuestion, setFollowUpQuestion] = useState<string | null>(null);
  const [pendingText, setPendingText] = useState<string>('');
  const [categoryHint, setCategoryHint] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { ready: workerReady, runScan, requestNotificationPermission } = useScanWorker();

  // Stable dependency: only run when canceled param actually changes
  useEffect(() => {
    if (canceledParam === '1') setCheckoutCanceled(true);
  }, [canceledParam]);

  // Progress interval with cleanup on unmount
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        setProgressStep((s) => (s + 1) % PROGRESS_MESSAGES.length);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [loading]);

  // Unmount cleanup: abort fetch, clear timers, prevent state updates
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

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
      setFollowUpQuestion(null);
      setPendingText('');
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

  const handleSubmit = useCallback(async () => {
    setError(null);
    setResult(null);

    if (mode === 'upload') {
      if (!file) {
        setError('Please take or select a photo first');
        return;
      }
    } else {
      if (!text.trim()) {
        setError(
          followUpQuestion
            ? 'Please type your answer above'
            : 'Please describe your receipt in plain English'
        );
        return;
      }
    }

    const originalTextForRequest = mode === 'paste' && !followUpQuestion ? text.trim() : pendingText;
    if (mode === 'paste' && !followUpQuestion) setPendingText(originalTextForRequest);

    const hintVal = categoryHint && categoryHint !== 'Not Sure' ? categoryHint : undefined;
    const body: Record<string, unknown> =
      mode === 'upload'
        ? { type: 'image', imageBase64: await fileToBase64(file!), categoryHint: hintVal }
        : followUpQuestion
          ? { type: 'text', originalText: pendingText, followUpAnswer: text.trim(), categoryHint: hintVal }
          : { type: 'text', text: originalTextForRequest, categoryHint: hintVal };

    setLoading(true);

    // Background scan: use Service Worker so processing continues if user navigates away
    if (workerReady && runScan) {
      if (mode === 'upload') await requestNotificationPermission();
      const sent = runScan(body, (res) => {
        if (!isMountedRef.current) return;
        setLoading(false);
        if (res.ok && res.followUp) {
          setFollowUpQuestion(res.followUp.followUpQuestion);
          setText('');
          return;
        }
        if (res.ok && res.result) {
          setResult(res.result);
          setSaved(true);
          setShowCelebration(true);
          setFollowUpQuestion(null);
          notifyScanComplete();
          return;
        }
        const data = res.error as { error?: string; message?: string } | undefined;
        if (data?.error === 'FREE_LIMIT_REACHED') setShowUpgrade(true);
        else if (data?.error === 'RECEIPT_UNREADABLE') {
          const attempts = failedAttempts + 1;
          setFailedAttempts(attempts);
          if (attempts >= 2) {
            setMode('paste');
            setText("No worries — just type what was on your receipt in plain English and we'll handle the rest.");
          } else {
            setError('We had trouble reading that receipt. Try taking the photo in better lighting or move closer.');
          }
        } else {
          setError(data?.message || "Something went wrong. Let's try again.");
        }
      });
      if (sent) return;
    }

    // Fallback: direct fetch (worker not ready or failed to send)
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (!isMountedRef.current) return;
        setLoading(false);
        if (data.error === 'FREE_LIMIT_REACHED') {
          setShowUpgrade(true);
        } else if (data.error === 'RECEIPT_UNREADABLE') {
          const attempts = failedAttempts + 1;
          setFailedAttempts(attempts);
          if (attempts >= 2) {
            setMode('paste');
            setError(null);
            setText(
              "No worries — just type what was on your receipt in plain English and we'll handle the rest."
            );
          } else {
            setError(
              'We had trouble reading that receipt. Try taking the photo in better lighting or move closer.'
            );
          }
        } else {
          setError(data.message || "Something went wrong. Let's try again.");
        }
        return;
      }

      const data = await res.json();
      if (!isMountedRef.current) return;
      if (data.followUpQuestion) {
        setFollowUpQuestion(data.followUpQuestion);
        setText('');
        setLoading(false);
        return;
      }
      setResult(data);
      setSaved(true);
      setShowCelebration(true);
      setFollowUpQuestion(null);
      notifyScanComplete();
    } catch (err) {
      if (!isMountedRef.current) return;
      if ((err as Error).name === 'AbortError') return;
      setError("Something went wrong. Let's try that again — we're here to help.");
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [mode, file, text, followUpQuestion, pendingText, failedAttempts, categoryHint, workerReady, runScan, requestNotificationPermission]);

  const handleSwitchToText = () => {
    setMode('paste');
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setError(null);
    setText(
      "No worries — just type what was on your receipt in plain English and we'll handle the rest."
    );
  };

  const resetForNewScan = () => {
    setMode('upload');
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setText('');
    setResult(null);
    setError(null);
    setFollowUpQuestion(null);
    setShowCelebration(false);
  };

  return (
    <div className="min-h-screen bg-[#080B14]">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold text-white">Scan a receipt</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Take a photo or type it out — we&apos;ll find every deduction
        </p>
        {checkoutCanceled && (
          <p className="mt-3 text-sm text-zinc-500">
            Checkout was canceled. Upgrade anytime when you&apos;re ready.
          </p>
        )}

        {/* Follow-up question - TOP of page, prominent, no scrolling needed */}
        {!result && !loading && followUpQuestion && (
          <div className="mt-6 rounded-[12px] border-2 border-[#4F46E5] bg-[#4F46E5]/15 p-4 shadow-[0_0_20px_rgba(79,70,229,0.2)]">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#4F46E5]">Question for you</p>
            <p className="mt-2 text-base font-medium text-white">{followUpQuestion}</p>
          </div>
        )}

        {/* Optional category selector - above upload area */}
        {!result && !loading && (
          <div className="mt-6 w-full max-w-md">
            <label htmlFor="category-hint" className="block text-sm font-medium text-white">
              Optional: What type of purchase is this?
            </label>
            <select
              id="category-hint"
              value={categoryHint}
              onChange={(e) => setCategoryHint(e.target.value)}
              className="mt-2 w-full min-h-[44px] rounded-[12px] border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-white focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value || 'empty'} value={opt.value} className="bg-[#080B14] text-white">
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-zinc-500">Skip if unsure, AI will figure it out</p>
          </div>
        )}

        {/* Two big cards - side by side, same height. Only when no result and not loading */}
        {!result && !loading && (
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {/* Photo Scan card */}
            <div
              className={`flex min-h-[320px] flex-col rounded-[12px] border-2 border-dashed transition-all ${
                file
                  ? 'border-[#4F46E5] bg-[#4F46E5]/5'
                  : 'border-white/[0.12] bg-white/[0.02] hover:border-[#4F46E5]/50 hover:bg-white/[0.04]'
              }`}
            >
              {file ? (
                <div className="flex flex-1 flex-col p-6">
                  <div className="overflow-hidden rounded-[12px] border border-white/[0.08]">
                    <img src={previewUrl!} alt="Receipt preview" className="w-full object-contain" />
                  </div>
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={handleSubmit}
                      type="button"
                      className="btn-primary flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-[12px] bg-[#4F46E5] py-2.5 font-semibold text-white shadow-[0_4px_14px_rgba(79,70,229,0.4)] transition-all hover:shadow-[0_4px_20px_rgba(79,70,229,0.5)]"
                    >
                      Looks good — Analyze
                    </button>
                    <button
                      onClick={handleRetake}
                      type="button"
                      className="flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-white/[0.12] px-4 py-2.5 text-sm font-medium text-white"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Retake
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor={FILE_INPUT_ID}
                  className="group flex min-h-[320px] cursor-pointer flex-col items-center justify-center p-6"
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
                  <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-8 transition-colors group-hover:border-[#4F46E5]/30">
                    <Camera className="h-20 w-20 text-[#4F46E5]" />
                  </div>
                  <p className="mt-6 text-lg font-semibold text-white">Photo Scan</p>
                  <p className="mt-2 text-center text-sm text-zinc-500">Tap anywhere to open camera</p>
                </label>
              )}
            </div>

            {/* Type It Out card */}
            <div className="flex min-h-[320px] flex-col rounded-[12px] border-2 border-dashed border-white/[0.12] bg-white/[0.02] p-6 transition-all hover:border-[#4F46E5]/50">
              <div className="flex items-center gap-3">
                <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4">
                  <FileText className="h-10 w-10 text-[#4F46E5]" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">Type It Out</p>
                  <p className="text-sm text-zinc-500">Describe your receipt</p>
                </div>
              </div>
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setMode('paste');
                  if (file) {
                    setFile(null);
                    if (previewUrl) URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                  }
                }}
                placeholder={followUpQuestion ? 'Type your answer here...' : TYPE_PLACEHOLDER}
                className="mt-4 min-h-[140px] flex-1 w-full resize-none rounded-[12px] border border-white/[0.08] bg-white/[0.02] p-4 text-white placeholder:text-zinc-500 focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                rows={5}
              />
              <button
                onClick={handleSubmit}
                disabled={loading || !text.trim()}
                type="button"
                className="btn-primary mt-4 flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-[12px] bg-[#4F46E5] py-2.5 font-semibold text-white shadow-[0_4px_14px_rgba(79,70,229,0.4)] transition-all hover:shadow-[0_4px_20px_rgba(79,70,229,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
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
          </div>
        )}

        {/* Loading state - animated progress bar */}
        {loading && (
          <div className="mt-8 rounded-[12px] border border-white/[0.08] bg-white/[0.02] p-8">
            <div className="flex flex-col items-center">
              <Loader2 className="h-12 w-12 animate-spin text-[#4F46E5]" />
              <p className="mt-4 text-lg font-medium text-white">Analyzing your receipt...</p>
              <div className="mt-6 w-full max-w-xs">
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-[#4F46E5] transition-all duration-500"
                    style={{
                      width: `${((progressStep + 1) / PROGRESS_MESSAGES.length) * 100}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-center text-sm text-zinc-500">
                  {PROGRESS_MESSAGES[progressStep]}
                </p>
              </div>
              <p className="mt-4 text-xs text-zinc-500">
                You can navigate away — we&apos;ll notify you when it&apos;s done.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (abortControllerRef.current) abortControllerRef.current.abort();
                  setLoading(false);
                  setError(null);
                }}
                className="mt-4 text-sm text-zinc-500 hover:text-white"
              >
                Cancel scan
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-[12px] border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-sm text-amber-200/90">{error}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {mode === 'upload' && (
                <button
                  onClick={handleRetake}
                  type="button"
                  className="btn-primary min-h-[44px] cursor-pointer rounded-[12px] bg-[#4F46E5] px-4 py-2.5 text-sm font-medium text-white"
                >
                  Try Again
                </button>
              )}
              {failedAttempts >= 1 && mode === 'upload' && (
                <button
                  onClick={handleSwitchToText}
                  type="button"
                  className="min-h-[44px] cursor-pointer text-sm font-medium text-[#4F46E5] underline"
                >
                  Type it instead →
                </button>
              )}
            </div>
          </div>
        )}

        {result && result.line_items && !loading && (
          <div className="mt-8">
            <ScanResults
              result={{
                merchant_name: result.merchant_name || 'Unknown',
                date: result.date || null,
                total_amount: result.total_amount ?? 0,
                line_items: result.line_items as Parameters<typeof ScanResults>[0]['result']['line_items'],
              }}
              saved={saved}
            />

            <div className="mt-6">
              <ReceiptRequirementsReminder
                merchantName={result.merchant_name || ''}
                date={result.date || null}
                amount={Math.round((result.total_amount ?? 0) * 100)}
                hasDeductibleItems={(result.line_items as Array<{ is_deductible?: boolean }>).some((li) => li.is_deductible)}
              />
            </div>

            {/* Post-scan prompts card */}
            <div className="mt-8 rounded-[12px] border border-emerald-500/30 bg-emerald-500/10 p-6">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <p className="font-medium">Receipt saved to My Receipts ✓</p>
              </div>
              <p className="mt-1 text-sm text-zinc-400">What would you like to do next?</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/scan"
                  onClick={(e) => {
                    e.preventDefault();
                    resetForNewScan();
                  }}
                  className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[12px] border border-white/[0.12] bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-white/[0.1]"
                >
                  Scan another receipt
                </Link>
                <Link
                  href="/receipts"
                  className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[12px] border border-[#4F46E5]/50 bg-[#4F46E5]/20 px-4 py-2.5 text-sm font-medium text-[#4F46E5] transition-all hover:bg-[#4F46E5]/30"
                >
                  <Receipt className="h-4 w-4" />
                  View all my receipts
                </Link>
                <Link
                  href="/dashboard"
                  className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[12px] border border-white/[0.12] bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-white/[0.1]"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  View my tax summary
                </Link>
              </div>
            </div>
          </div>
        )}

        {showCelebration && result && result.line_items && (
          <ScanCelebrationModal
            deductionCount={getDeductionStatsFromResult(result as Parameters<typeof getDeductionStatsFromResult>[0]).count}
            estimatedSavingsCents={getDeductionStatsFromResult(result as Parameters<typeof getDeductionStatsFromResult>[0]).savingsCents}
            onScanAnother={resetForNewScan}
            onClose={() => setShowCelebration(false)}
          />
        )}
      </main>

      <AppFooter />
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] || '');
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#080B14]">
          <Loader2 className="h-6 w-6 animate-spin text-[#4F46E5]" />
        </div>
      }
    >
      <ScanContent />
    </Suspense>
  );
}
