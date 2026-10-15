"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { AppLogo } from "@/components/ui/brand";
import { useUiText } from "@/components/ui/use-ui-text";
export default function PublicNav({ activeLink }: { activeLink?: string }) {
  const [open, setOpen] = useState(false);
  const t = useUiText();
  return (
    <header className="public-nav">
      <AppLogo />
      <button
        className="btn btn-secondary mobile-menu-toggle"
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        aria-controls="public-navigation"
        onClick={() => setOpen(!open)}
      >
        {open ? <X /> : <Menu />}
      </button>
      <nav
        id="public-navigation"
        className={"public-navigation" + (open ? " is-open" : "")}
        aria-label="Main navigation"
      >
        <div className="public-links">
          {[
            ["/", t("Home", "होम", "मुख्यपृष्ठ"), "home"],
            ["/#features", t("Features", "सुविधाएँ", "वैशिष्ट्ये"), "features"],
            [
              "/how-it-works",
              t("How It Works", "कैसे काम करता है", "कसे कार्य करते"),
              "how-it-works",
            ],
            ["/about", t("About", "परिचय", "आमच्याविषयी"), "about"],
          ].map(([href, label, key]) => (
            <Link
              key={key}
              href={href}
              aria-current={key === activeLink ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
        </div>
        <div className="row">
          <Link href="/auth/login" className="btn btn-secondary">
            {t("Login", "लॉग इन", "लॉग इन")}
          </Link>
          <Link href="/auth/signup" className="btn btn-primary">
            {t("Get Started", "शुरू करें", "सुरू करा")}
          </Link>
        </div>
      </nav>
    </header>
  );
}
