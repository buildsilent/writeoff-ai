'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { AppFooter } from '@/components/AppFooter';
import { useUser, SignOutButton } from '@clerk/nextjs';
import { Loader2, Download } from 'lucide-react';

interface Usage {
  scanCount: number;
  limit: number;
  hasSubscription: boolean;
}

function AccountContent() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      router.push('/sign-in');
      return;
    }

    let isMounted = true;
    fetch('/api/usage')
      .then((r) => r.json())
      .then((data) => {
        if (isMounted) {
          setUsage(data?.hasOwnProperty('scanCount') ? data : null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user, isLoaded, router]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const r = await fetch('/api/export');
      if (!r.ok) throw new Error();
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `taxsnapper-data-${new Date().getFullYear()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Pro required
    } finally {
      setExporting(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const r = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await r.json();
      if (data?.url) window.location.href = data.url;
      else setPortalLoading(false);
    } catch {
      setPortalLoading(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#080B14]">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#4F46E5]" />
        </main>
        <AppFooter />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen flex-col bg-[#080B14]">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold text-white">Account</h1>
        <p className="mt-1 text-sm text-zinc-500">Manage your profile and subscription</p>

        {/* Profile */}
        <div className="mt-8 rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-6">
          <h2 className="text-sm font-medium text-white">Profile</h2>
          <div className="mt-4 flex items-center gap-4">
            {user.imageUrl && (
              <img
                src={user.imageUrl}
                alt=""
                className="h-16 w-16 rounded-full border border-white/[0.08]"
              />
            )}
            <div>
              <p className="font-medium text-white">{user.fullName || 'User'}</p>
              <p className="text-sm text-zinc-500">{user.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-zinc-500">Managed by Clerk. Update your profile in the account menu.</p>
        </div>

        {/* Subscription */}
        <div className="mt-6 rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-6">
          <h2 className="text-sm font-medium text-white">Subscription</h2>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-white">
                {usage?.hasSubscription ? 'Pro' : 'Free'}
              </p>
              <p className="text-sm text-zinc-500">
                {usage?.hasSubscription
                  ? 'Unlimited scans'
                  : `${usage?.scanCount ?? 0} of ${usage?.limit ?? 3} scans used this month`}
              </p>
            </div>
            {usage?.hasSubscription ? (
              <button
                type="button"
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="btn-primary min-h-[44px] cursor-pointer rounded-[12px] border border-white/[0.12] bg-white/[0.02] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-white/[0.06] hover:shadow-[0_0_20px_rgba(79,70,229,0.2)] disabled:opacity-50"
              >
                {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Manage subscription'}
              </button>
            ) : (
              <Link
                href="/go-pro"
                className="btn-primary flex min-h-[44px] cursor-pointer items-center justify-center rounded-[12px] bg-[#4F46E5] px-4 py-2.5 text-sm font-medium text-white shadow-[0_4px_14px_rgba(79,70,229,0.4)] transition-all hover:shadow-[0_4px_20px_rgba(79,70,229,0.5)]"
              >
                Upgrade to Pro
              </Link>
            )}
          </div>
        </div>

        {/* Data */}
        <div className="mt-6 rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-6">
          <h2 className="text-sm font-medium text-white">Your data</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Your data is permanently stored and never deleted. We never sell or share your information.
          </p>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="btn-primary mt-4 flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[12px] border border-white/[0.12] bg-white/[0.02] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-white/[0.06] hover:shadow-[0_0_20px_rgba(79,70,229,0.2)] disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export all my data
          </button>
          {!usage?.hasSubscription && (
            <p className="mt-2 text-xs text-zinc-500">CSV export requires Pro subscription</p>
          )}
        </div>

        {/* Notifications */}
        <div className="mt-6 rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-6">
          <h2 className="text-sm font-medium text-white">Notification preferences</h2>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-zinc-400">Email notifications</p>
            <button
              type="button"
              role="switch"
              aria-checked={notifications}
              onClick={() => setNotifications((n) => !n)}
              className={`relative h-8 w-12 cursor-pointer rounded-full transition-colors ${
                notifications ? 'bg-[#4F46E5]' : 'bg-white/[0.12]'
              }`}
            >
              <span
                className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${
                  notifications ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Cancel account */}
        <div className="mt-12 text-center">
          <SignOutButton>
            <button
              type="button"
              className="cursor-pointer text-sm text-zinc-500 transition-colors hover:text-zinc-400"
            >
              Sign out
            </button>
          </SignOutButton>
          <p className="mt-4 text-xs text-zinc-600">
            Cancel account options available in your account settings. Your data remains stored per our policy.
          </p>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#080B14]">
          <Loader2 className="h-6 w-6 animate-spin text-[#4F46E5]" />
        </div>
      }
    >
      <AccountContent />
    </Suspense>
  );
}
