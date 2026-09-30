FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN groupadd --system app && useradd --system --gid app --create-home --home-dir /home/app app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Collect the admin's static files at build time (no database needed for this step)
RUN DJANGO_SECRET_KEY=build-only DJANGO_DEBUG=False python manage.py collectstatic --noinput \
    && mkdir -p /app/media \
    && chmod +x /app/docker-entrypoint.sh \
    && chown -R app:app /app/media /app/staticfiles

USER app
EXPOSE 8000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
# One worker with several threads: rate-limit counters live in process memory, so a single
# process keeps them accurate. Raise --workers only after moving the cache to Redis.
CMD ["gunicorn", "gcpc_fyp.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "1", "--threads", "8", "--access-logfile", "-"]
