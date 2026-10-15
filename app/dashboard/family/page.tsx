"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, Plus } from "lucide-react";
import AppShell from "@/app/components/AppShell";
import { useApp, type Relation, type Gender } from "@/app/context/AppContext";
import {
  Button,
  Card,
  EmptyState,
  Notice,
  Skeleton,
} from "@/components/ui/primitives";
import { useUiText } from "@/components/ui/use-ui-text";
type Member = {
  name: string;
  relation: Relation | null;
  gender: Gender | null;
  assessmentCount: number;
  lastAssessment: string;
};
export default function FamilyPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const app = useApp();
  const router = useRouter();
  const t = useUiText();
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch("/api/sessions?view=family", { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not load family assessments.");
        return r.json();
      })
      .then((d) => setMembers(d.members))
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retry]);
  function assess(member?: Member) {
    app.cancelTest();
    app.setPersonType("family");
    app.setPatientInfo(
      member?.name || "",
      member?.relation || null,
      member?.gender || null,
    );
    router.push("/dashboard/assessment");
  }
  return (
    <AppShell>
      <div className="page">
        <div className="content-wrapper stack-lg">
          <header className="row between page-heading">
            <div>
              <h1>
                {t("Family Members", "परिवार के सदस्य", "कुटुंबातील सदस्य")}
              </h1>
              <p>
                {t(
                  "Manage health assessments for your family members.",
                  "अपने परिवार के स्वास्थ्य मूल्यांकन देखें।",
                  "तुमच्या कुटुंबाची आरोग्य मूल्यांकने पहा.",
                )}
              </p>
            </div>
            <Button onClick={() => assess()}>
              <Plus />
              {t(
                "New Family Assessment",
                "नया पारिवारिक मूल्यांकन",
                "नवीन कुटुंब मूल्यांकन",
              )}
            </Button>
          </header>
          <p className="muted">
            Members appear here after a saved family assessment. Separate family
            profiles, editing, and removal are not supported yet. People with
            the same name, relationship, and sex are grouped together.
          </p>
          {loading ? (
            <Skeleton className="h-48" />
          ) : error ? (
            <Notice tone="warning" role="alert">
              {error}
              <Button onClick={() => setRetry((v) => v + 1)}>Try again</Button>
            </Notice>
          ) : members.length ? (
            <div className="family-grid">
              {members.map((m) => (
                <Card
                  className="family-card"
                  key={[m.name, m.relation, m.gender].join(":")}
                >
                  <div className="row">
                    <span className="family-avatar">
                      {m.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                    <div>
                      <h2>{m.name}</h2>
                      <p className="muted">
                        {m.relation || "Family member"}
                        {m.gender ? " · " + m.gender : ""}
                      </p>
                    </div>
                  </div>
                  <p>
                    {m.assessmentCount}{" "}
                    {m.assessmentCount === 1 ? "assessment" : "assessments"}
                  </p>
                  <p className="muted">
                    Last assessment:{" "}
                    {new Date(m.lastAssessment).toLocaleDateString()}
                  </p>
                  <Button variant="secondary" onClick={() => assess(m)}>
                    Start assessment
                  </Button>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Users />}
              title="Care for the people you love"
              description="Complete an assessment for a family member. Their saved assessment history will appear here."
              action={
                <Button onClick={() => assess()}>
                  Start a family assessment
                </Button>
              }
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
