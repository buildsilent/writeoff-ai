import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-6">
      <SignIn
        appearance={{
          variables: {
            colorPrimary: "#22c55e",
            colorBackground: "#ffffff",
            colorText: "#0a0a0a",
            colorInputBackground: "#f8faf8",
            borderRadius: "0.75rem",
          },
        }}
      />
    </div>
  );
}
