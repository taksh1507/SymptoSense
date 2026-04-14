"use client";

import { useEffect, use } from "react";
import { useTestSession } from "@/hooks/useTestSession";
import { QuestionShell } from "@/components/questions/QuestionShell";

interface TestPageProps {
  params: Promise<{ sessionId: string }>;
}

export default function TestPage({ params }: TestPageProps) {
  const resolvedParams = use(params);
  const { sessionId, setSessionId, resetFlow } = useTestSession();

  useEffect(() => {
    if (resolvedParams.sessionId !== sessionId) {
      setSessionId(resolvedParams.sessionId);
      resetFlow();
    }
  }, [resolvedParams.sessionId]);

  return <QuestionShell sessionId={resolvedParams.sessionId} />;
}
