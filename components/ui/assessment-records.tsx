"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Thermometer, Wind, Activity, ArrowRight } from "lucide-react";
import { Badge } from "./primitives";

export interface AssessmentRecord {
  id: string;
  createdAt: string;
  urgency: string | null;
  score: number | null;
  primaryCategory: string | null;
  personName: string;
  isSelf: boolean;
  relation: string | null;
  gender: string | null;
  answers: string;
}

export function useRecords(page = 1, query = "", subject = "all") {
  const { status } = useSession();
  const [records, setRecords] = useState<AssessmentRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (status === "loading") {
      setLoading(true);
      return;
    }
    if (status === "unauthenticated") {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      page: String(page),
      search: query,
      subject,
    });
    fetch("/api/sessions?" + params, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok)
          throw new Error("Could not load assessments. Please try again.");
        return r.json();
      })
      .then((d) => {
        setRecords(d.sessions ?? []);
        setTotal(d.total ?? 0);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, query, subject, revision, status]);

  return {
    records,
    total,
    loading,
    error,
    retry: () => setRevision((v) => v + 1),
  };
}

/** Returns a colored icon tile matching the urgency level, per reference image */
function UrgencyIcon({ urgency }: { urgency: string | null }) {
  const level = urgency?.toLowerCase() ?? "";
  if (level === "high") {
    return (
      <span
        className="icon-tile"
        style={{ background: "#fef2f2", color: "#DC4545", borderRadius: "50%" }}
        aria-hidden="true"
      >
        <Thermometer />
      </span>
    );
  }
  if (level === "medium") {
    return (
      <span
        className="icon-tile"
        style={{ background: "#fffbeb", color: "#b86d05", borderRadius: "50%" }}
        aria-hidden="true"
      >
        <Wind />
      </span>
    );
  }
  // low or unknown
  return (
    <span
      className="icon-tile"
      style={{ background: "#ecfdf5", color: "#159B72", borderRadius: "50%" }}
      aria-hidden="true"
    >
      <Activity />
    </span>
  );
}

export function AssessmentRow({ record: r }: { record: AssessmentRecord }) {
  const urgencyLevel = r.urgency?.toLowerCase() ?? "low";
  const urgencyLabel =
    urgencyLevel === "high"
      ? "High Risk"
      : urgencyLevel === "medium"
        ? "Moderate"
        : "Low Risk";

  return (
    <Link
      href={"/dashboard/reports/" + r.id}
      className={`assessment-row urgency-${urgencyLevel}`}
    >
      <UrgencyIcon urgency={r.urgency} />
      <div className="assessment-row-copy">
        <strong>{r.primaryCategory || "Symptom Assessment"}</strong>
        <p>
          {r.isSelf ? "Self" : r.personName}
          {r.relation ? " · " + r.relation : ""} ·{" "}
          {new Date(r.createdAt).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </div>
      <Badge urgency={r.urgency || "low"}>{urgencyLabel}</Badge>
      <span className="view-report">
        View
        <ArrowRight />
      </span>
    </Link>
  );
}
