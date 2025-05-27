import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Sender's email credentials
SENDER_EMAIL = "gcpc164@gmail.com"
APP_PASSWORD = "rsst taba jzkt ipzc"  # Replace with your actual app password

def send_otp_email(otp, recipient_email, recipient_name="User"):
    """
    Sends an OTP to the specified recipient email address with the OTP in bold.

    Parameters:
    - otp (str): The one-time password to send.
    - recipient_email (str): The recipient's email address.
    - recipient_name (str): The recipient's name. Defaults to "User".

    Returns:
    - None
    """
    try:
        # Create the email message
        message = MIMEMultipart("alternative")
        message['From'] = SENDER_EMAIL
        message['To'] = recipient_email
        message['Subject'] = 'Your One-Time Password (OTP)'

        # Plain-text version of the email
        text = f"""\
            Dear {recipient_name},

            Your One-Time Password (OTP) is: {otp}

            Please use this OTP to proceed with your verification.

            If you did not request this, please ignore this email.

            Regards,
            Govt. Commodities Price Calculator Team
            """

        # HTML version of the email
        html = f"""\
            <html>
            <body>
                <p>Dear {recipient_name},</p>
                <p>Your One-Time Password (OTP) is: <b>{otp}</b></p>
                <p>Please use this OTP to proceed with your verification.</p>
                <p>If you did not request this, please ignore this email.</p>
                <p>Regards,<br>
                Govt. Commodities Price Calculator Team</p>
            </body>
            </html>
            """

        # Attach both plain-text and HTML versions to the email
        part1 = MIMEText(text, "plain")
        part2 = MIMEText(html, "html")
        message.attach(part1)
        message.attach(part2)

        # Connect to the Gmail SMTP server and send the email
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()  # Secure the connection
            server.login(SENDER_EMAIL, APP_PASSWORD)
            server.send_message(message)
            print(f"✅ OTP sent successfully to {recipient_email}")

    except Exception as e:
        print(f"❌ Failed to send OTP. Error: {e}")


if __name__ == "__main__":
    send_otp_email("123456", "iltijaali15@gmail.com", "iltija ali")