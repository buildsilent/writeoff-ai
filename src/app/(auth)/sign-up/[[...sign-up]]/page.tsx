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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] p-6">
      <SignUp
        fallbackRedirectUrl={goPro ? `${appUrl}/go-pro` : `${appUrl}/dashboard`}
        appearance={{
          variables: {
            colorPrimary: "#FF6B00",
            colorBackground: "#ffffff",
            colorText: "#0a0a0a",
            colorInputBackground: "#f8faf8",
            borderRadius: "0.75rem",
          },
        }}
      />
      <p className="mt-6 text-center text-sm text-zinc-500">
        Want to pay immediately?{" "}
        <Link
          href="/sign-up?goPro=1"
          className="text-[#FF6B00] underline hover:no-underline"
        >
          Skip to Pro
        </Link>
      </p>
    </div>
  );
}
