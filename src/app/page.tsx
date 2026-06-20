import { redirect } from "next/navigation";

// No marketing surface: authenticated users land on the dashboard, everyone
// else is bounced to /sign-in by the Clerk middleware.
export default function Home() {
  redirect("/dashboard");
}
