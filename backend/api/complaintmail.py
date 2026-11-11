import mimetypes
import threading
from email.message import EmailMessage
from html import escape

from django.conf import settings
from django.utils import timezone

from . import otpsender


def _one_line(value):
    """Collapse whitespace so user input can never inject extra email headers."""
    return " ".join(str(value).split())


def build_complaint_message(complaint):
    user = complaint.user
    reporter = _one_line(user.full_name or user.username)
    map_link = None
    if complaint.latitude is not None and complaint.longitude is not None:
        map_link = (
            f"https://www.openstreetmap.org/?mlat={complaint.latitude}&mlon={complaint.longitude}"
            f"#map=17/{complaint.latitude}/{complaint.longitude}"
        )

    rows = [
        ("Shop", complaint.shop_name),
        ("Shopkeeper", complaint.shopkeeper_name),
        ("Location", complaint.location),
        ("Map", map_link or "Not provided"),
        ("Description", complaint.description),
        ("Submitted by", f"{reporter} <{user.email}>"),
        ("Submitted on", complaint.submitted_date.strftime("%d %b %Y, %H:%M UTC")),
        ("Complaint reference", f"#{complaint.pk}"),
    ]

    message = EmailMessage()
    message["From"] = otpsender.SENDER_EMAIL
    message["To"] = complaint.dc_email
    message["Reply-To"] = user.email  # so the DC can answer the person who reported it
    message["Subject"] = _one_line(f"Complaint: {complaint.shop_name} ({complaint.shopkeeper_name}) - #{complaint.pk}")

    text = (
        "A complaint about pricing practices was submitted through the "
        "Govt. Commodities Price Calculator.\n\n"
        + "\n".join(f"{label}: {value}" for label, value in rows)
        + "\n\nYou can reply to this email to contact the person who submitted it."
    )
    html_rows = "".join(
        f"<tr><td style='padding:4px 12px 4px 0'><b>{escape(label)}</b></td>"
        f"<td style='padding:4px 0'>{escape(str(value)).replace(chr(10), '<br>')}</td></tr>"
        for label, value in rows
    )
    message.set_content(text)
    message.add_alternative(
        "<html><body><p>A complaint about pricing practices was submitted through the "
        f"Govt. Commodities Price Calculator.</p><table>{html_rows}</table>"
        "<p>You can reply to this email to contact the person who submitted it.</p></body></html>",
        subtype="html",
    )

    if complaint.photo:
        try:
            with complaint.photo.open("rb") as fh:
                data = fh.read()
            ctype = mimetypes.guess_type(complaint.photo.name)[0] or "application/octet-stream"
            maintype, _, subtype = ctype.partition("/")
            message.add_attachment(
                data, maintype=maintype, subtype=subtype or "octet-stream",
                filename=complaint.photo.name.rsplit("/", 1)[-1],
            )
        except OSError:
            pass  # the complaint is still worth sending without its photo
    return message


def notify_dc(complaint_id):
    """Email a complaint to its DC and record when that succeeded. Never raises."""
    from .models import Complaint  # local import: models import nothing from here, keep it that way

    try:
        complaint = Complaint.objects.select_related("user").get(pk=complaint_id)
        if otpsender.deliver(build_complaint_message(complaint)):
            # update() rather than save(): Complaint.save() creates status notifications
            Complaint.objects.filter(pk=complaint_id).update(dc_notified_at=timezone.now())
            return True
    except Exception as exc:  # noqa: BLE001 - a mail problem must never break the API
        print(f"❌ Could not email complaint {complaint_id}: {exc}")
    return False


def notify_dc_in_background(complaint_id):
    """Send without making the user wait for the SMTP server (synchronous when EMAIL_ASYNC is off)."""
    if getattr(settings, "EMAIL_ASYNC", True):
        threading.Thread(target=notify_dc, args=(complaint_id,), daemon=True).start()
    else:
        notify_dc(complaint_id)
