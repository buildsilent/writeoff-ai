import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080B14] px-4 py-8 sm:px-6">
      <SignIn
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
    </div>
  );
}
