"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ClipboardPlus,
  History,
  Users,
  Settings,
  Plus,
  FileText,
  BarChart3,
  Activity,
} from "lucide-react";
import {
  Section,
  Notice,
  Button,
  EmptyState,
  Skeleton,
} from "@/components/ui/primitives";
import { useRecords, AssessmentRow } from "@/components/ui/assessment-records";
import { useUiText } from "@/components/ui/use-ui-text";
export default function Dashboard() {
  const { data: session } = useSession();
  const { records, loading, error, retry } = useRecords();
  const t = useUiText();
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const actions = [
    [
      "/dashboard/assessment",
      ClipboardPlus,
      t("New Assessment", "नया मूल्यांकन", "नवीन मूल्यांकन"),
      t(
        "Check your symptoms with AI-assisted guidance.",
        "AI-सहायता से अपने लक्षण जाँचें।",
        "AI-सहाय्याने तुमची लक्षणे तपासा.",
      ),
    ],
    [
      "/dashboard/reports",
      History,
      t("View History", "इतिहास देखें", "इतिहास पहा"),
      "See your past reports.",
    ],
    [
      "/dashboard/family",
      Users,
      t("Family Members", "परिवार के सदस्य", "कुटुंबातील सदस्य"),
      "Manage health assessments for your family.",
    ],
    [
      "/dashboard/ml-insights",
      BarChart3,
      t("ML Insights", "मॉडल विश्लेषण", "मॉडेल विश्लेषण"),
      "Explore training, ROC curves & explainability.",
    ],
    [
      "/dashboard/model-health",
      Activity,
      t("Model Health", "मॉडल स्थिति", "मॉडेल स्थिती"),
      "Live latency, accuracy & retrain health.",
    ],
    [
      "/dashboard/settings",
      Settings,
      t("Settings", "सेटिंग्स", "सेटिंग्ज"),
      "Manage language and preferences.",
    ],
  ] as const;
  return (
    <div className="page">
      <div className="content-wrapper stack-lg">
        <header className="row between page-heading">
          <div>
            <h1>
              {t(greeting, "नमस्कार", "नमस्कार")},{" "}
              {session?.user?.name?.split(" ")[0] || "there"}!
            </h1>
            <p>
              {t(
                "How can we help you today?",
                "आज हम आपकी कैसे मदद कर सकते हैं?",
                "आज आम्ही तुम्हाला कशी मदत करू शकतो?",
              )}
            </p>
          </div>
          <Link href="/dashboard/assessment" className="btn btn-primary">
            <Plus />
            New Symptom Assessment
          </Link>
        </header>
        {records[0]?.urgency === "High" && (
          <Notice tone="danger">
            Your last assessment indicated high urgency. Please follow the
            report’s advice and seek medical attention.
          </Notice>
        )}
        <div className="action-grid">
          {actions.map(([href, Icon, title, desc], i) => (
            <Link
              className={"action-card action-" + i}
              href={href}
              key={href}
            >
              <span className="icon-tile">
                <Icon />
              </span>
              <h2>{title}</h2>
              <p>{desc}</p>
            </Link>
          ))}
        </div>
        <Section>
          <div className="row between">
            <h2>
              {t(
                "Recent Assessments",
                "हालिया मूल्यांकन",
                "अलीकडील मूल्यांकने",
              )}
            </h2>
            <Link href="/dashboard/reports">View all</Link>
          </div>
          {loading ? (
            <Skeleton className="h-40" />
          ) : error ? (
            <Notice tone="warning" role="alert">
              {error}
              <Button variant="secondary" onClick={retry}>
                Try again
              </Button>
            </Notice>
          ) : records.length ? (
            <div>
              {records.slice(0, 5).map((r) => (
                <AssessmentRow key={r.id} record={r} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<FileText />}
              title={t(
                "Your health journey starts here",
                "आपकी स्वास्थ्य यात्रा यहाँ शुरू होती है",
                "तुमचा आरोग्य प्रवास येथे सुरू होतो",
              )}
              description="Your saved assessments and next steps will appear here."
              action={
                <Link className="btn btn-primary" href="/dashboard/assessment">
                  Start your first assessment
                </Link>
              }
            />
          )}
        </Section>
        <div className="dashboard-note">
          <span className="icon-tile">
            <ClipboardPlus />
          </span>
          <div>
            <strong>A little clarity when you feel unwell.</strong>
            <p>
              SymptoSense provides informational guidance, not a diagnosis.
              Always seek professional care when you need it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
