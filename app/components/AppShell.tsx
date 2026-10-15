"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ClipboardPlus,
  History,
  Users,
  Settings,
  Menu,
  X,
  LogOut,
  Activity,
  BarChart3,
} from "lucide-react";
import { AppLogo } from "@/components/ui/brand";
import { useUiText } from "@/components/ui/use-ui-text";
import { useApp } from "../context/AppContext";
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const t = useUiText();
  const { language } = useApp();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState(false);
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth/login");
  }, [status, router]);

  if (status === "unauthenticated") {
    return null;
  }

  const nav = [
    ["/dashboard", LayoutDashboard, t("Dashboard", "डैशबोर्ड", "डॅशबोर्ड")],
    [
      "/dashboard/assessment",
      ClipboardPlus,
      t("New Assessment", "नया मूल्यांकन", "नवीन मूल्यांकन"),
    ],
    ["/dashboard/reports", History, t("History", "इतिहास", "इतिहास")],
    ["/dashboard/family", Users, t("Family", "परिवार", "कुटुंब")],
    [
      "/dashboard/ml-insights",
      BarChart3,
      t("ML Insights", "मॉडल विश्लेषण", "मॉडेल विश्लेषण"),
    ],
    [
      "/dashboard/model-health",
      Activity,
      t("Model Health", "मॉडल स्थिति", "मॉडेल स्थिती"),
    ],
    ["/dashboard/settings", Settings, t("Settings", "सेटिंग्स", "सेटिंग्ज")],
  ] as const;
  const name =
    session?.user?.name || session?.user?.email?.split("@")[0] || "User";
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="app-topbar">
        <AppLogo />
        <nav
          id="app-navigation"
          className={"app-navigation" + (open ? " is-open" : "")}
          aria-label="Account navigation"
        >
          {nav.map(([path, Icon, label]) => (
            <Link
              key={path}
              href={path}
              className={
                "app-nav-link" +
                (pathname === path ||
                (path === "/dashboard/reports" &&
                  pathname.startsWith(path + "/"))
                  ? " active"
                  : "")
              }
              aria-current={pathname === path ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              <Icon />
              {label}
            </Link>
          ))}
        </nav>
        <div className="account-menu">
          <button
            className="avatar-button"
            aria-label="Open profile menu"
            aria-expanded={profile}
            onClick={() => setProfile(!profile)}
          >
            {name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </button>
          {profile && (
            <div className="profile-popover">
              <strong>{name}</strong>
              <Link
                href="/dashboard/settings"
                onClick={() => setProfile(false)}
              >
                <Settings />
                Account settings
              </Link>
              <Link href="/dashboard/model-health">
                <Activity />
                Model health
              </Link>
              <Link href="/dashboard/ml-insights">
                <Activity />
                ML insights
              </Link>
              <button onClick={() => signOut({ callbackUrl: "/auth/login" })}>
                <LogOut />
                Sign out
              </button>
            </div>
          )}
        </div>
        <button
          className="btn btn-secondary mobile-menu-toggle"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-controls="app-navigation"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </header>
      <main
        id="main-content"
        className="app-main"
        lang={
          language === "Hindi" ? "hi" : language === "Marathi" ? "mr" : "en"
        }
      >
        {children}
      </main>
    </div>
  );
}
