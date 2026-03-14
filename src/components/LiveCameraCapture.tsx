'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2, X } from 'lucide-react';

interface LiveCameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
  onError?: (message: string) => void;
}

export function LiveCameraCapture({ onCapture, onClose, onError }: LiveCameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<'requesting' | 'ready' | 'denied' | 'error'>('requesting');
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setStatus('error');
          setPermissionMessage('Camera not supported. Please use file upload instead.');
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          try {
            await video.play();
          } catch {
            // Autoplay may be blocked; playsInline + muted usually works on iOS
          }
        }
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Camera access failed';
        setStatus(msg.toLowerCase().includes('permission') || msg.includes('denied') ? 'denied' : 'error');
        setPermissionMessage(
          msg.toLowerCase().includes('permission') || msg.includes('denied')
            ? 'Camera access denied. Enable it in your browser settings, or use file upload instead.'
            : 'Could not open camera. Try file upload or check permissions.'
        );
        onError?.(msg);
      }
    })();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [stopStream, onError]);

  const previewBlobRef = useRef<Blob | null>(null);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !streamRef.current || video.readyState < 2) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          previewBlobRef.current = blob;
          stopStream();
          setPreviewUrl(URL.createObjectURL(blob));
        }
      },
      'image/jpeg',
      0.9
    );
  }, [stopStream]);

  const handleUsePhoto = useCallback(() => {
    const blob = previewBlobRef.current;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    previewBlobRef.current = null;
    if (blob) onCapture(blob);
  }, [previewUrl, onCapture]);

  const handleRetake = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    previewBlobRef.current = null;
    setStatus('requesting');
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          try {
            await video.play();
          } catch {
            // Ignore autoplay failure
          }
        }
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    })();
  }, [previewUrl]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
        aria-label="Close camera"
      >
        <X className="h-5 w-5" />
      </button>

      {status === 'requesting' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-white">
          <Loader2 className="h-12 w-12 animate-spin text-[#4F46E5]" />
          <p className="text-sm text-zinc-400">Requesting camera access...</p>
        </div>
      )}

      {(status === 'denied' || status === 'error') && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="rounded-full bg-amber-500/20 p-4">
            <Camera className="h-10 w-10 text-amber-400" />
          </div>
          <p className="text-sm text-zinc-300">{permissionMessage}</p>
          <p className="text-xs text-zinc-500">
            To enable: Settings → Site settings → Camera → Allow for this site
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 min-h-[44px] cursor-pointer rounded-[12px] bg-[#4F46E5] px-6 py-2.5 text-sm font-medium text-white"
          >
            Use file upload instead
          </button>
        </div>
      )}

      {previewUrl ? (
        <>
          <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black p-4">
            <img src={previewUrl} alt="Receipt preview" className="max-h-full max-w-full object-contain" />
          </div>
          <div className="flex gap-3 border-t border-white/10 bg-black/80 p-6 pb-safe">
            <button
              type="button"
              onClick={handleRetake}
              className="flex flex-1 min-h-[48px] cursor-pointer items-center justify-center rounded-[12px] border border-white/30 py-3 font-medium text-white transition-colors hover:bg-white/10"
            >
              Retake
            </button>
            <button
              type="button"
              onClick={handleUsePhoto}
              className="flex flex-1 min-h-[48px] cursor-pointer items-center justify-center rounded-[12px] bg-[#4F46E5] py-3 font-semibold text-white transition-colors hover:bg-[#4338ca]"
            >
              Use Photo
            </button>
          </div>
        </>
      ) : status === 'ready' && (
        <>
          <div className="relative flex flex-1 items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div
              className="pointer-events-none absolute rounded-2xl border-2 border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
              style={{ width: 'min(90vw, 320px)', aspectRatio: '3/4' }}
            />
          </div>
          <div className="border-t border-white/10 bg-black/80 p-6 pb-safe">
            <button
              type="button"
              onClick={handleCapture}
              className="mx-auto flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-4 border-white bg-white/10 transition-transform active:scale-95 hover:bg-white/20"
              aria-label="Capture receipt"
            >
              <span className="h-3 w-3 rounded-full bg-white" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
