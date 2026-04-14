"use client";

import React, { use } from "react";
import { AIQuestionEngine } from "@/components/ai-question-engine/AIQuestionEngine";
import { useRouter } from "next/navigation";

export default function AIQuestionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();

  const handleComplete = (result: any) => {
    console.log("Assessment complete:", result);
    // You could save to DB here or the engine might have already done it
    // Redirect to results
    router.push(`/test/${sessionId}/results`);
  };

  return (
    <div className="min-h-screen bg-[#070D1A] py-12 px-4 flex items-center justify-center">
      <AIQuestionEngine 
        initialSymptom="General Assessment" 
        onComplete={handleComplete} 
      />
    </div>
  );
}
