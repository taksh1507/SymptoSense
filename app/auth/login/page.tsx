"use client";

import { Suspense } from "react";
import { AuthForm } from "@/components/ui/auth-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <AuthForm />
    </Suspense>
  );
}
