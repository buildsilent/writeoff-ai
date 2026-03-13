'use client';

import { useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  FileText,
  FileSpreadsheet,
  FileDown,
  Sheet,
  Mail,
  X,
  Loader2,
} from 'lucide-react';
import {
  type DateRangePreset,
  filterScansByDateRange,
  scansToExportRows,
  getCategoryTotals,
  formatCentsForExport,
  type ExportScan,
} from '@/lib/export-utils';

const DISCLAIMER = 'TaxSnapper provides estimates for informational purposes. Consult a licensed CPA for official tax advice.';

interface ExportModalProps {
  scans: ExportScan[];
  userName?: string | null;
  onClose: () => void;
}

const EXPORT_OPTIONS = [
  { id: 'pdf', icon: FileText, label: 'PDF', desc: 'Professional tax summary with categories and totals' },
  { id: 'excel', icon: FileSpreadsheet, label: 'Excel/XLSX', desc: 'Formatted spreadsheet for editing' },
  { id: 'csv', icon: FileDown, label: 'CSV', desc: 'Simple comma-separated file' },
  { id: 'sheets', icon: Sheet, label: 'Google Sheets', desc: 'Download CSV and import to a new Sheet' },
  { id: 'email', icon: Mail, label: 'Email to myself', desc: 'Send PDF summary to your email' },
] as const;

type ExportType = (typeof EXPORT_OPTIONS)[number]['id'];

export function ExportModal({ scans, userName, onClose }: ExportModalProps) {
  const [dateRange, setDateRange] = useState<DateRangePreset>('this_year');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [exporting, setExporting] = useState<ExportType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const filtered = filterScansByDateRange(scans, dateRange, customStart || undefined, customEnd || undefined);
  const rows = scansToExportRows(filtered);
  const categoryTotals = getCategoryTotals(rows);
  const grandTotalCents = rows.reduce((s, r) => s + r.deductibleAmount, 0);

  const generatePdf = (): Blob => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229);
    doc.text('TaxSnapper', 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Tax Deduction Summary', 14, 28);
    doc.setFontSize(9);
    doc.text(userName ? `Prepared for: ${userName}` : '', 14, 34);
    doc.text(`Date range: ${dateRange === 'all_time' ? 'All Time' : dateRange === 'this_year' ? 'This Year' : dateRange === 'this_month' ? 'This Month' : `${customStart} to ${customEnd}`}`, 14, 40);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 46);

    const catRows = Array.from(categoryTotals.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([cat, amt]) => [cat, `$${formatCentsForExport(amt)}`]);

    autoTable(doc, {
      startY: 54,
      head: [['IRS Category', 'Deductible Amount']],
      body: [...catRows, ['TOTAL', `$${formatCentsForExport(grandTotalCents)}`]],
      theme: 'plain',
      headStyles: { fillColor: [79, 70, 229], textColor: 255 },
      margin: { left: 14 },
    });

    const finalY = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 60;
    autoTable(doc, {
      startY: finalY + 10,
      head: [['Date', 'Merchant', 'Amount', 'Deductible', 'Category', 'Deduction %', 'Confidence']],
      body: rows.slice(0, 50).map((r) => [
        r.date,
        r.merchant.slice(0, 20),
        `$${formatCentsForExport(r.amount)}`,
        `$${formatCentsForExport(r.deductibleAmount)}`,
        r.irsCategory,
        `${r.deductionPercent}%`,
        (r.confidence * 100).toFixed(0) + '%',
      ]),
      theme: 'striped',
      margin: { left: 14 },
    });

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(DISCLAIMER, 14, doc.internal.pageSize.height - 10, { maxWidth: 180 });
    return doc.output('blob');
  };

  const generateCsv = (): string => {
    const headers = ['Date', 'Merchant', 'Amount', 'Deductible Amount', 'IRS Category', 'Deduction %', 'Confidence', 'Notes'];
    const csvRows = [
      headers.join(','),
      ...rows.map((r) =>
        [
          `"${r.date}"`,
          `"${r.merchant.replace(/"/g, '""')}"`,
          formatCentsForExport(r.amount),
          formatCentsForExport(r.deductibleAmount),
          `"${(r.irsCategory || '').replace(/"/g, '""')}"`,
          r.deductionPercent,
          (r.confidence * 100).toFixed(1),
          `"${(r.notes || '').replace(/"/g, '""')}"`,
        ].join(',')
      ),
    ];
    return csvRows.join('\n');
  };

  const generateExcel = (): Blob => {
    const wsData = [
      ['Date', 'Merchant', 'Amount', 'Deductible Amount', 'IRS Category', 'Deduction %', 'Confidence', 'Notes'],
      ...rows.map((r) => [
        r.date,
        r.merchant,
        Number(formatCentsForExport(r.amount)),
        Number(formatCentsForExport(r.deductibleAmount)),
        r.irsCategory,
        r.deductionPercent,
        (r.confidence * 100).toFixed(1) + '%',
        r.notes,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Receipts');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async (type: ExportType) => {
    setError(null);
    setSuccess(null);
    setExporting(type);
    try {
      if (rows.length === 0) {
        setError('No receipts in selected date range');
        return;
      }
      const suffix = `${dateRange === 'all_time' ? 'all' : dateRange === 'this_year' ? new Date().getFullYear() : dateRange === 'this_month' ? new Date().toISOString().slice(0, 7) : 'custom'}`;

      if (type === 'pdf') {
        const blob = generatePdf();
        downloadBlob(blob, `taxsnapper-summary-${suffix}.pdf`);
        setSuccess('PDF downloaded');
      } else if (type === 'excel') {
        const blob = generateExcel();
        downloadBlob(blob, `taxsnapper-receipts-${suffix}.xlsx`);
        setSuccess('Excel file downloaded');
      } else if (type === 'csv') {
        const csv = generateCsv();
        const blob = new Blob([csv], { type: 'text/csv' });
        downloadBlob(blob, `taxsnapper-receipts-${suffix}.csv`);
        setSuccess('CSV downloaded');
      } else if (type === 'sheets') {
        const csv = generateCsv();
        const blob = new Blob([csv], { type: 'text/csv' });
        downloadBlob(blob, `taxsnapper-receipts-${suffix}.csv`);
        window.open('https://sheets.new', '_blank');
        setSuccess('CSV downloaded — import it in the new Sheet (File > Import > Upload)');
      } else if (type === 'email') {
        const res = await fetch('/api/export/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dateRange,
            customStart: customStart || undefined,
            customEnd: customEnd || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Email failed');
        setSuccess('Email sent! Check your inbox.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-[16px] border border-white/[0.08] bg-[#0f1729] p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Export your data</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] p-2 text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Date range */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-zinc-400">Date range</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {(['this_month', 'this_year', 'all_time'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setDateRange(r)}
                className={`min-h-[36px] cursor-pointer rounded-[8px] px-3 py-2 text-sm font-medium transition-colors ${
                  dateRange === r
                    ? 'bg-[#4F46E5] text-white'
                    : 'border border-white/[0.12] text-zinc-400 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                {r === 'this_month' ? 'This Month' : r === 'this_year' ? 'This Year' : 'All Time'}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setDateRange('custom')}
              className={`min-h-[36px] cursor-pointer rounded-[8px] px-3 py-2 text-sm font-medium transition-colors ${
                dateRange === 'custom'
                  ? 'bg-[#4F46E5] text-white'
                  : 'border border-white/[0.12] text-zinc-400 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              Custom
            </button>
          </div>
          {dateRange === 'custom' && (
            <div className="mt-3 flex gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="min-h-[36px] flex-1 rounded-[8px] border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-sm text-white"
              />
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="min-h-[36px] flex-1 rounded-[8px] border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-sm text-white"
              />
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-zinc-500">{filtered.length} receipts in range</p>

        {error && (
          <div className="mt-4 rounded-[8px] border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 rounded-[8px] border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
            {success}
          </div>
        )}

        <div className="mt-6 space-y-2">
          {EXPORT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleExport(opt.id)}
              disabled={exporting !== null}
              className="flex w-full min-h-[56px] cursor-pointer items-center gap-4 rounded-[12px] border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-left transition-colors hover:bg-white/[0.06] disabled:opacity-50"
            >
              <opt.icon className="h-5 w-5 shrink-0 text-[#4F46E5]" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white">{opt.label}</p>
                <p className="text-xs text-zinc-500">{opt.desc}</p>
              </div>
              {exporting === opt.id ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[#4F46E5]" />
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
