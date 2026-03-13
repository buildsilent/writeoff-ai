'use client';

import { X } from 'lucide-react';

interface ReceiptImageModalProps {
  imageUrl: string;
  onClose: () => void;
}

export function ReceiptImageModal({ imageUrl, onClose }: ReceiptImageModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
      onClick={onClose}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        aria-label="Close"
      >
        <X className="h-6 w-6" />
      </button>
      <img
        src={imageUrl}
        alt="Receipt"
        className="max-h-full max-w-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
