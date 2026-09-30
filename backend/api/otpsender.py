import os
import smtplib
from html import escape
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Sender's email credentials, read from the environment (see backend/.env.example)
SENDER_EMAIL = os.environ.get("EMAIL_HOST_USER", "")
APP_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
SMTP_HOST = os.environ.get("EMAIL_SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("EMAIL_SMTP_PORT", "587"))
USE_STARTTLS = os.environ.get("EMAIL_USE_STARTTLS", "True").lower() in ("1", "true", "yes")


def deliver(message):
    """Send a prepared email message through the configured SMTP account. Returns True on success."""
    if not SENDER_EMAIL or not APP_PASSWORD:
        print("❌ Email not sent. EMAIL_HOST_USER / EMAIL_HOST_PASSWORD are not set.")
        return False
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
            if USE_STARTTLS:
                server.starttls()  # Secure the connection
            server.login(SENDER_EMAIL, APP_PASSWORD)
            server.send_message(message)
        return True
    except Exception as e:
        print(f"❌ Failed to send email. Error: {e}")
        return False


def send_otp_email(otp, recipient_email, recipient_name="User"):
    """
    Sends an OTP to the specified recipient email address with the OTP in bold.

    Parameters:
    - otp (str): The one-time password to send.
    - recipient_email (str): The recipient's email address.
    - recipient_name (str): The recipient's name. Defaults to "User".

    Returns:
    - bool: True if the email was handed to the SMTP server
    """
    recipient_name = recipient_name or "User"

    # Create the email message
    message = MIMEMultipart("alternative")
    message['From'] = SENDER_EMAIL
    message['To'] = recipient_email
    message['Subject'] = 'Your One-Time Password (OTP)'

    text = f"""\
Dear {recipient_name},

Your One-Time Password (OTP) is: {otp}

This code is valid for 10 minutes. Please use it to proceed with your verification.

If you did not request this, please ignore this email.

Regards,
Govt. Commodities Price Calculator Team
"""
    html = f"""\
<html>
<body>
    <p>Dear {escape(str(recipient_name))},</p>
    <p>Your One-Time Password (OTP) is: <b>{otp}</b></p>
    <p>This code is valid for 10 minutes. Please use it to proceed with your verification.</p>
    <p>If you did not request this, please ignore this email.</p>
    <p>Regards,<br>
    Govt. Commodities Price Calculator Team</p>
</body>
</html>
"""
    message.attach(MIMEText(text, "plain"))
    message.attach(MIMEText(html, "html"))

    if deliver(message):
        print(f"✅ OTP sent successfully to {recipient_email}")
        return True
    return False


if __name__ == "__main__":
    send_otp_email("123456", "iltijaali15@gmail.com", "iltija ali")