// The assignment requires every executable Trigger.dev task to emit exactly one
// log line in this format so the build can be attributed. Set your real profile
// URL in CANDIDATE_LINKEDIN_URL.
export const CANDIDATE_LINKEDIN =
  process.env.NEXT_PUBLIC_CANDIDATE_LINKEDIN_URL ||
  process.env.CANDIDATE_LINKEDIN_URL ||
  "https://www.linkedin.com/in/your-full-linkedin-profile-url";

export function attributionLog(): void {
  // Exactly one console.log per task, in the required format.
  console.log(`[NextFlow] Candidate LinkedIn: ${CANDIDATE_LINKEDIN}`);
}
