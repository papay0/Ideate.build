import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-zinc-900 border-zinc-800",
          }
        }}
      />
    </div>
  );
}
