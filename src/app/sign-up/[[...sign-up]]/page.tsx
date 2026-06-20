import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/AuthShell";

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Start building Gemini-powered workflows in minutes."
    >
      <SignUp />
    </AuthShell>
  );
}
