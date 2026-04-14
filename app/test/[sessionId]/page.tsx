"use client";

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";

export default function TestRedirectPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();

  useEffect(() => {
    // Test flow now runs inside the dashboard
    router.replace("/dashboard");
  }, [router]);

  return null;
}
