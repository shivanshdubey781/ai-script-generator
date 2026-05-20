"""
Email service using Gmail SMTP for OTP delivery.
No domain needed — works for any email address, completely free.
Uses Python's built-in smtplib, no extra packages required.
Credentials are read from app settings (loaded via pydantic-settings from .env).
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

APP_NAME = "AI Script Generator"


def _get_credentials():
    """Lazy-load credentials from settings so .env is always resolved first."""
    from app.core.config import settings
    return settings.gmail_user, settings.gmail_app_password


def send_otp_email(to_email: str, otp_code: str, purpose: str = "registration") -> bool:
    """
    Send OTP email via Gmail SMTP.
    Returns True if sent successfully, False otherwise.
    """
    gmail_user, gmail_app_password = _get_credentials()

    if not gmail_user or not gmail_app_password:
        print("[Email Error] GMAIL_USER or GMAIL_APP_PASSWORD not set in .env")
        return False

    if purpose == "registration":
        subject = f"Verify your email — {APP_NAME}"
        heading = "Welcome! Verify your email"
        message = "You're almost there. Use the OTP below to verify your email and activate your account."
    else:
        subject = f"Password reset OTP — {APP_NAME}"
        heading = "Reset your password"
        message = "Use the OTP below to reset your password. If you didn't request this, ignore this email."

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#0f0f1a;font-family:Inter,Arial,sans-serif;">
      <div style="max-width:480px;margin:40px auto;background:#1a1a2e;border-radius:12px;
                  border:1px solid #2d2d4e;overflow:hidden;">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;">
            {APP_NAME}
          </h1>
        </div>

        <!-- Body -->
        <div style="padding:32px;">
          <h2 style="margin:0 0 12px;color:#e2e2f0;font-size:20px;font-weight:600;">
            {heading}
          </h2>
          <p style="margin:0 0 28px;color:#8888aa;font-size:15px;line-height:1.6;">
            {message}
          </p>

          <!-- OTP Box -->
          <div style="background:#0f0f1a;border:2px dashed #6366f1;border-radius:10px;
                      padding:24px;text-align:center;margin-bottom:28px;">
            <p style="margin:0 0 8px;color:#8888aa;font-size:12px;
                      text-transform:uppercase;letter-spacing:2px;">
              Your OTP Code
            </p>
            <div style="font-size:40px;font-weight:700;letter-spacing:10px;
                        color:#6366f1;font-family:monospace;">
              {otp_code}
            </div>
          </div>

          <!-- Expiry warning -->
          <div style="background:#2d1f0a;border:1px solid #f59e0b;border-radius:8px;
                      padding:12px 16px;margin-bottom:24px;">
            <p style="margin:0;color:#f59e0b;font-size:13px;">
              &#9203; This OTP expires in <strong>10 minutes</strong>.
              Do not share it with anyone.
            </p>
          </div>

          <p style="margin:0;color:#555577;font-size:13px;line-height:1.6;">
            If you didn't request this, you can safely ignore this email.
            Your account will remain unchanged.
          </p>
        </div>

        <!-- Footer -->
        <div style="padding:20px 32px;border-top:1px solid #2d2d4e;text-align:center;">
          <p style="margin:0;color:#555577;font-size:12px;">
            &copy; 2025 {APP_NAME}
          </p>
        </div>
      </div>
    </body>
    </html>
    """

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{APP_NAME} <{gmail_user}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.ehlo()
            server.starttls()
            server.login(gmail_user, gmail_app_password)
            server.sendmail(gmail_user, to_email, msg.as_string())

        print(f"[Email] OTP sent successfully to {to_email}")
        return True

    except smtplib.SMTPAuthenticationError:
        print("[Email Error] Gmail authentication failed. Check GMAIL_USER and GMAIL_APP_PASSWORD in .env")
        return False
    except Exception as e:
        print(f"[Email Error] Failed to send OTP to {to_email}: {e}")
        return False
