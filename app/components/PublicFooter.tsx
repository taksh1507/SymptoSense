"use client";
import Link from "next/link";
import { AppLogo } from "@/components/ui/brand";
export default function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="footer-inner">
        <div className="row between">
          <AppLogo />
          <nav className="footer-links" aria-label="Footer">
            <Link href="/#features">Features</Link>
            <Link href="/about">About</Link>
            <Link href="/privacy">Privacy policy</Link>
            <Link href="/terms">Terms of use</Link>
            <Link href="/terms#medical-disclaimer">Medical disclaimer</Link>
          </nav>
        </div>
        <p>
          SymptoSense provides informational guidance and does not replace
          professional medical evaluation or diagnosis.
        </p>
        <p className="muted">
          For life-threatening symptoms, seek emergency care immediately.
        </p>
        <div className="row between footer-bottom">
          <span>© {new Date().getFullYear()} SymptoSense</span>
          <span>English · हिन्दी · मराठी</span>
        </div>
      </div>
    </footer>
  );
}
