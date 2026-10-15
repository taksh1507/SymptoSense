"use client";
import { useState } from "react";
import { FileText } from "lucide-react";
import AppShell from "@/app/components/AppShell";
import { useRecords, AssessmentRow } from "@/components/ui/assessment-records";
import {
  Button,
  Field,
  Notice,
  Section,
  Skeleton,
  EmptyState,
} from "@/components/ui/primitives";
import { useUiText } from "@/components/ui/use-ui-text";
export default function ReportsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("all");
  const { records, total, loading, error, retry } = useRecords(
    page,
    search,
    subject,
  );
  const t = useUiText();
  return (
    <AppShell>
      <div className="page">
        <div className="content-wrapper stack-lg">
          <header className="page-heading">
            <h1>
              {t(
                "Your Assessment History",
                "आपके मूल्यांकन का इतिहास",
                "तुमच्या मूल्यांकनांचा इतिहास",
              )}
            </h1>
            <p>
              {t(
                "View and manage your past symptom assessments.",
                "अपने पिछले लक्षण मूल्यांकन देखें।",
                "तुमची मागील लक्षण मूल्यांकने पहा.",
              )}
            </p>
          </header>
          <div className="history-toolbar">
            <div className="filter-tabs">
              {[
                ["all", t("All", "सभी", "सर्व")],
                [
                  "self",
                  t("My Assessments", "मेरे मूल्यांकन", "माझी मूल्यांकने"),
                ],
                [
                  "family",
                  t(
                    "Family Assessments",
                    "परिवार के मूल्यांकन",
                    "कुटुंबाची मूल्यांकने",
                  ),
                ],
              ].map(([value, label]) => (
                <button
                  key={value}
                  aria-pressed={subject === value}
                  onClick={() => {
                    setSubject(value);
                    setPage(1);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <Field
              className="history-search"
              id="history-search"
              label={t(
                "Search assessments",
                "मूल्यांकन खोजें",
                "मूल्यांकने शोधा",
              )}
              type="search"
              placeholder="Search by subject or assessment…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          {loading ? (
            <Skeleton className="h-48" />
          ) : error ? (
            <Notice tone="warning" role="alert">
              {error}
              <Button variant="secondary" onClick={retry}>
                Try again
              </Button>
            </Notice>
          ) : records.length ? (
            <Section>
              <div>
                {records.map((r) => (
                  <AssessmentRow key={r.id} record={r} />
                ))}
              </div>
            </Section>
          ) : (
            <EmptyState
              icon={<FileText />}
              title={t(
                "No assessments found",
                "कोई मूल्यांकन नहीं मिला",
                "मूल्यांकन सापडले नाही",
              )}
              description={
                search
                  ? "Try another search or filter."
                  : "Complete an assessment to see your saved report here."
              }
            />
          )}
          <nav className="row between" aria-label="Assessment pages">
            <Button
              variant="secondary"
              disabled={page === 1 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="muted">
              {total} assessments · Page {page} of{" "}
              {Math.max(1, Math.ceil(total / 20))}
            </span>
            <Button
              variant="secondary"
              disabled={page * 20 >= total || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </nav>
        </div>
      </div>
    </AppShell>
  );
}
