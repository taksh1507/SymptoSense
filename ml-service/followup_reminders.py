"""Follow-up outcome reminders.

Finds pending FollowUps that are due and (optionally) not yet reminded today,
then pings users via email (primary, free) — WhatsApp (Meta Cloud API,
metered) only when explicitly configured:
  - Email    via SMTP  (SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM)
  - WhatsApp via Meta  (WHATSAPP_TOKEN/WHATSAPP_PHONE_NUMBER_ID/WHATSAPP_TEMPLATE)
If no channel is configured, sends are logged and skipped so nothing is sent.

Usage:
    python followup_reminders.py            # send due reminders
    python followup_reminders.py --dry-run  # preview only
"""
import argparse
import os
import smtplib
import sqlite3
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from urllib.request import Request, urlopen

SCRIPT_DIR = Path(__file__).resolve().parent
try:
    from dotenv import load_dotenv
    load_dotenv(SCRIPT_DIR.parent / ".env")  # optional, does not override existing vars
except Exception:
    pass
DB_PATH = Path(os.environ.get("SYMPTOSENSE_DB", SCRIPT_DIR.parent / "prisma" / "dev.db"))
APP_URL = os.environ.get("APP_URL", "http://localhost:3000")

MAX_REMINDERS = int(os.environ.get("FOLLOWUP_MAX_REMINDERS", "3"))
REMINDER_MIN_DAYS = float(os.environ.get("FOLLOWUP_REMINDER_MIN_DAYS", "1"))


def locate_db():
    candidates = [
        Path(os.environ.get("SYMPTOSENSE_DB", "")) if os.environ.get("SYMPTOSENSE_DB") else None,
        SCRIPT_DIR.parent / "prisma" / "dev.db",
        SCRIPT_DIR.parent / "dev.db",
    ]
    for p in candidates:
        if p and p.is_file():
            return p
    return candidates[-1]


def find_due(db_path: Path, now: datetime):
    con = sqlite3.connect(str(db_path))
    cutoff = (now - timedelta(days=REMINDER_MIN_DAYS)).isoformat()
    rows = con.execute(
        """
        SELECT f.id, f."testSessionId", f."scheduledAt", f."reminderCount",
               ts."primaryCategory", ts.urgency, u.email, u.name
        FROM "FollowUp" f
        JOIN "TestSession" ts ON ts.id = f."testSessionId"
        LEFT JOIN "User" u ON u.id = ts."userId"
        WHERE f.status = 'pending'
          AND f."scheduledAt" <= ?
          AND f."reminderCount" < ?
          AND (f."lastRemindedAt" IS NULL OR f."lastRemindedAt" < ?)
        """,
        (now.isoformat(), MAX_REMINDERS, cutoff),
    ).fetchall()
    con.close()
    return rows


def _send_email(recipient: str, name: str, symptom: str, urgency: str, report_url: str) -> bool:
    host = os.environ.get("SMTP_HOST")
    user = os.environ.get("SMTP_USER")
    pwd = os.environ.get("SMTP_PASS")
    from_addr = os.environ.get("SMTP_FROM") or user
    if not (host and user and pwd and from_addr):
        print(f"    [email] not configured - would send to {recipient} (report {report_url})")
        return False

    subject = "SymptoSense: how did it go?"
    urgency_color = {"high": "#E53E3E", "medium": "#DD6B20", "low": "#38A169"}.get((urgency or "").lower(), "#718096")
    urgency_label = (urgency or "assessed").capitalize()
    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <body style="margin:0;padding:0;background:#F7FAFC">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7FAFC;padding:24px 12px">
        <tr><td align="center">
          <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;background:#FFFFFF;font-family:Inter,Arial,Helvetica,sans-serif">
            <tr><td style="background:#FFFFFF;padding:28px 32px;border-bottom:1px solid #EDF2F7">
              <span style="font-size:20px;font-weight:800;color:#1A202C;letter-spacing:-0.5px">Sympto<span style="color:#E53E3E">Sense</span></span>
              <span style="display:block;font-size:12px;color:#A0AEC0;margin-top:2px">Check-in</span>
            </td></tr>
            <tr><td style="padding:32px 32px 20px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#A0AEC0;padding-bottom:6px">Follow-up</td>
                </tr>
                <tr><td style="font-size:24px;font-weight:800;color:#1A202C;letter-spacing:-0.5px;line-height:1.2">How are you feeling now?</td></tr>
                <tr><td style="padding-top:16px;font-size:15px;line-height:1.6;color:#4A5568">
                  Hi {name or 'there'},
                </td></tr>
                <tr><td style="padding-top:10px;font-size:15px;line-height:1.6;color:#4A5568">
                  A few days ago you checked <strong style="color:#1A202C">{symptom or 'a health concern'}</strong> with SymptoSense. Tell us how things went - your response directly helps improve the accuracy of future assessments.
                </td></tr>
                <tr><td style="padding-top:16px">
                  <span style="display:inline-block;padding:4px 12px;border-radius:9999px;font-size:12px;font-weight:700;color:#FFFFFF;background:{urgency_color}">{urgency_label} risk</span>
                </td></tr>
                <tr><td align="center" style="padding:28px 0 8px">
                  <a href="{report_url}" style="display:inline-block;background:#E53E3E;color:#FFFFFF;padding:14px 26px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700">Respond to your check-in</a>
                </td></tr>
                <tr><td align="center" style="padding-bottom:24px">
                  <a href="{report_url}" style="font-size:12px;color:#A0AEC0;text-decoration:underline">Open your report</a>
                </td></tr>
              </table>
            </td></tr>
            <tr><td style="background:#F7FAFC;border-top:1px solid #EDF2F7;padding:16px 32px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="font-size:12px;line-height:1.5;color:#A0AEC0">
                  This email helps you track a SymptoSense assessment from <span style="font-weight:600;color:#718096">{APP_URL}</span>.
                </td></tr>
                <tr><td style="font-size:12px;line-height:1.5;color:#A0AEC0;padding-top:4px">
                  Responses are used only to measure and improve assessment accuracy.
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    """
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = recipient
    msg.attach(MIMEText(f"Hi {name or 'there'} — a few days ago you used SymptoSense for {symptom or 'a health concern'} ({urgency or 'assessed'} risk). How are things now? Open your report: {report_url}", "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))
    try:
        with smtplib.SMTP(host, int(os.environ.get("SMTP_PORT", "587")), timeout=15) as server:
            server.starttls()
            server.login(user, pwd)
            server.sendmail(from_addr, [recipient], msg.as_string())
        return True
    except Exception as e:
        print(f"    [email] failed for {recipient}: {e}")
        return False


def _send_whatsapp(phone: str, symptom: str, urgency: str, report_url: str) -> bool:
    token = os.environ.get("WHATSAPP_TOKEN")
    number_id = os.environ.get("WHATSAPP_PHONE_NUMBER_ID")
    template = os.environ.get("WHATSAPP_TEMPLATE", "symptosense_followup")
    if not (token and number_id and phone):
        print(f"    [whatsapp] not configured - would message {phone or 'n/a'} (report {report_url})")
        return False
    url = f"https://graph.facebook.com/v21.0/{number_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "template",
        "template": {
            "name": template,
            "language": {"code": "en"},
            "components": [{
                "type": "body",
                "parameters": [
                    {"type": "text", "text": symptom or "a health concern"},
                    {"type": "text", "text": urgency or "assessed"},
                    {"type": "text", "text": report_url},
                ],
            }],
        },
    }
    try:
        req = Request(url, data=__import__("json").dumps(payload).encode(),
                      headers={"Content-Type": "application/json",
                               "Authorization": f"Bearer {token}"}, method="POST")
        with urlopen(req, timeout=15) as resp:
            ok = 200 <= resp.status < 300
        return ok
    except Exception as e:
        print(f"    [whatsapp] failed: {e}")
        return False


def run_reminders(db_path: Path = None, dry_run: bool = False, now: datetime = None) -> int:
    db_path = db_path or locate_db()
    now = now or datetime.now(timezone.utc)
    due = find_due(db_path, now)
    sent = 0

    if not due:
        print(f"No due follow-ups (checked {now:%Y-%m-%d %H:%M}).")
        return 0

    con = sqlite3.connect(str(db_path))
    for fup_id, session_id, scheduled, count, symptom, urgency, email, name in due:
        report_url = f"{APP_URL}/dashboard/reports/{session_id}"
        print(f"[{fup_id}] {symptom or 'general'} ({urgency or 'n/a'} risk) -> {email or 'no email'}")
        if dry_run:
            print("    would send follow-up email")
            continue
        delivered = False
        if email:
            delivered = _send_email(email, name, symptom, urgency, report_url) or delivered
        if delivered:
            new_count = count + 1
            new_status = "dismissed" if new_count >= MAX_REMINDERS else "pending"
            con.execute(
                'UPDATE "FollowUp" SET "reminderCount" = ?, "lastRemindedAt" = ?, status = ?, "updatedAt" = ? WHERE id = ?',
                (new_count, now.isoformat(), new_status, now.isoformat(), fup_id),
            )
            sent += 1
            print(f"    sent (reminder #{new_count}/{MAX_REMINDERS}); status now {new_status}")

    con.commit()
    con.close()
    print(f"Reminders: {sent} sent, {len(due) - sent} skipped (no delivery channel)")
    return sent


def main():
    parser = argparse.ArgumentParser(description="Send follow-up outcome reminders")
    parser.add_argument("--dry-run", action="store_true", help="preview without sending")
    args = parser.parse_args()
    run_reminders(dry_run=args.dry_run)


if __name__ == "__main__":
    main()