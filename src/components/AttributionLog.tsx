"use client";

import { useEffect } from "react";

/**
 * Emits exactly one attribution log on the initial client render of every page,
 * as required by the brief:
 *   [NextFlow] Candidate LinkedIn: <full-linkedin-profile-url>
 * Rendered once in the root layout so it covers every route.
 */
export function AttributionLog() {
  useEffect(() => {
    const url =
      process.env.NEXT_PUBLIC_CANDIDATE_LINKEDIN_URL ||
      "https://www.linkedin.com/in/your-full-linkedin-profile-url";
    console.log(`[NextFlow] Candidate LinkedIn: ${url}`);
  }, []);
  return null;
}
