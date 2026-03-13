import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ goPro?: string }>;
}) {
  const params = await searchParams;
  const goPro = params?.goPro === "1";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#080B14] px-4 py-8 sm:px-6">
      <SignUp
        fallbackRedirectUrl={goPro ? `${appUrl}/go-pro` : `${appUrl}/dashboard`}
        appearance={{
          variables: {
            colorPrimary: "#4F46E5",
            colorBackground: "#ffffff",
            colorText: "#080B14",
            colorInputBackground: "#f8faf8",
            borderRadius: "0.75rem",
          },
        }}
      />
      <p className="mt-6 text-center text-sm text-zinc-500">
        Want to pay immediately?{" "}
        <Link
          href="/sign-up?goPro=1"
          className="text-[#4F46E5] underline hover:no-underline"
        >
          Skip to Pro
        </Link>
      </p>
    </div>
  );
}
