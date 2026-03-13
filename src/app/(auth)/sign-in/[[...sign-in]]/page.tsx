import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080B14] p-6">
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
