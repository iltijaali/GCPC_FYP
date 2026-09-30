# Government Commodities Price Calculator (GCPC)

A final-year project (FYP) web application that shows users the daily prices of essential commodities (fruits and vegetables), lets them build and save a shopping cart with a running total, and lets them report unfair pricing practices by a shopkeeper to a District Commissioner (DC), with the shop's location pinned on a map.

The repository contains a Django REST API and two separate frontends.

## Features

- **Accounts**: register, log in, and reset a forgotten password through an emailed one-time password (OTP) that expires after 10 minutes, locks after 5 wrong tries and can be re-requested once a minute.
- **Product prices**: browse products by category (Fruit / Vegetable), with the price and the date it was last updated.
- **Cart**: add products (adding the same product again increases its quantity), change quantities, remove items, see the total, and save the cart.
- **Purchase history**: every saved cart appears as an order with its items, quantities, total and date.
- **Complaints**: submit a complaint with shop name, shopkeeper name, DC email, location text, description, an optional photo, and a pinned map location (latitude/longitude). The complaint is **emailed to the DC** (with the photo attached and a map link; replying goes to the person who reported it), and its page shows whether the email was delivered. Users can review their past complaints and their status (`Pending`, `In Progress`, `Resolved`); only administrators can change the status.
- **Notifications**: when a complaint's status changes, the owner gets a notification, shown in a bell dropdown in the header and markable as read.
- **Django admin**: prices, complaints and all other models are managed through `/admin/`.

## Repository layout

```
.
├── docker-compose.yml      Runs database + API + both frontends (see "Running with Docker")
├── .env.example            Settings template for docker compose
├── backend/                Django project (REST API)
│   ├── Dockerfile, docker-entrypoint.sh
│   ├── manage.py
│   ├── requirements.txt
│   ├── gcpc_fyp/           Project settings, root URLs, WSGI/ASGI
│   ├── api/                The single app: models, serializers, views, urls,
│   │                       custom token auth, OTP email sender, migrations
│   └── media/complaints/   Uploaded complaint photos
├── frontend/
│   ├── fe/                 Main frontend: React 19 + Vite + Tailwind CSS 4 (Dockerfile, nginx.conf)
│   └── hello/              Earlier frontend: plain HTML/CSS/JS pages (see note below; has a Dockerfile)
└── gcpc_fyp                Empty folder recorded as a git submodule-style
                            entry with no .gitmodules; it has no content
```

## Tech stack

| Part | Technology |
| --- | --- |
| Backend | Python, Django, Django REST Framework, django-cors-headers |
| Database | PostgreSQL (`psycopg`, `psycopg2-binary`) |
| File uploads | Pillow (complaint photos) |
| Email | Gmail SMTP over `smtplib` (OTP emails) |
| Frontend | React 19, React Router 7, Vite 6, Tailwind CSS 4, react-icons |
| Map | Leaflet + react-leaflet with OpenStreetMap tiles |

## How it works

### Data model ([backend/api/models.py](backend/api/models.py))

- `User` is a custom model (not Django's `AuthUser`) with `username`, `email`, `password`, `full_name`, `otp`, `token` and `token_expiry`.
- `Product`: `name`, `category` (`Fruit` / `Vegetable` / `Other`), `price`, `date_updated` (set automatically on every save).
- `Cart`: belongs to a user; `saved` is `False` while it is the active cart and `True` once saved.
- `CartItem`: a product and a quantity inside a cart.
- `CartHistory`: one per user; saved carts are linked to it, and it is what the history page lists.
- `Complaint`: shop and shopkeeper details, `dc_email`, `location`, `description`, optional `photo`, `latitude`/`longitude` and `status`. Saving a complaint with a changed status creates a `Notification` for its owner.
- `Notification`: `recipient`, `message`, `timestamp`, `is_read`.

### Authentication

Login does not use JWT, even though `rest_framework_simplejwt` is installed and set as the DRF default. It uses a custom scheme in [backend/api/authentication.py](backend/api/authentication.py):

1. `POST /api/login/` with `username_or_email` and `password` returns a token of the form `<base64 username>_<14 random characters>`, valid for 15 days.
2. The frontend stores it in `localStorage` under `token`.
3. Protected endpoints expect the header `Authorization: MyToken <token>`.
4. The frontend's `ProtectedRoute` calls `POST /api/get-me/` with the token before showing `/products`, `/cart`, `/complaints` and `/history`, and redirects to `/auth` if it fails.

### API endpoints (all under `/api/`)

| Endpoint | Method(s) | Auth | Purpose |
| --- | --- | --- | --- |
| `register/` | POST | No | Create an account (`full_name`, `username`, `email`, `password`) |
| `login/` | POST | No | Returns `token`, `token_expiry`, `username` |
| `get-me/` | POST | No | Body `{ "token": ... }`; returns the username |
| `request-reset-password/` | POST | No | Emails a 6-digit OTP (valid 10 minutes) to the given `email`; at most one per minute per account |
| `verify-otp/` | POST | No | Checks `email` + `otp`; 5 wrong tries lock the code |
| `reset-password/` | POST | No | Sets `new_password` given `email` + `otp`, then invalidates the OTP |
| `products/` | GET, POST, PUT, PATCH, DELETE | Yes | Products; filter with `?category=Fruit` |
| `cart-items/` | POST, PATCH, DELETE, GET | Yes | POST `{ "product": id }` adds the product to the user's open cart (creating it if needed) or increments its quantity |
| `cart/` | GET, ... | Yes | The user's unsaved carts with their items and total |
| `cart/<id>/save_cart/` | POST | Yes | Marks the cart saved and attaches it to the user's history |
| `cart-history/` | GET | Yes | The user's history with all saved carts |
| `complaints/` | GET, POST | Yes | The user's complaints; POST accepts multipart form data with a photo, saves it and emails the DC in the background (10 per hour). `status` and `dc_notified_at` are read-only |
| `notifications/` | GET, PATCH | Yes | The user's notifications; PATCH `{ "is_read": true }` |

Uploaded photos are served from `/media/` in development.

### Frontend routes ([frontend/fe/src/App.jsx](frontend/fe/src/App.jsx))

| Route | Page | Login required |
| --- | --- | --- |
| `/` | Home | No |
| `/auth` | Login / register | No |
| `/forgot-password` | Three-step OTP reset (email, OTP, new password) | No |
| `/products` | Choose Fruits or Vegetables, then add items to cart | Yes |
| `/cart` | Edit quantities, remove items, save cart | Yes |
| `/history` | Saved orders and their details | Yes |
| `/complaints` | Complaint history plus the new-complaint form with map | Yes |

### The `frontend/hello` folder

A first version of the UI written as plain HTML pages (`index.html`, `cart.html`, `complaints.html`, `history.html`, `auth/`, `products/`) with `api.js`, `script.js` and `index.js`. It is less complete than `frontend/fe`: `products/products.html` links to `fruits.html` and `vegetables.html`, but the file in the repo is named `vegitables.html`; the complaints page loads Google Maps with a placeholder `YOUR_API_KEY`. The login and register pages, the home page and the complaints page load without errors. The cart, history, fruits and vegetables pages are unfinished: they call `updateCartDisplay()`, `loadHistory()` and `showProducts()`, which are not defined anywhere, so they show nothing. The React app in `frontend/fe` has all of these features. Use `frontend/fe` as the working frontend.

## Running with Docker

One command starts PostgreSQL, the Django API (gunicorn) and the React app (nginx). You only need Docker with the Compose plugin.

```bash
cp .env.example .env        # then edit it: at least the passwords and DJANGO_SECRET_KEY
docker compose up --build
```

| What | Address |
| --- | --- |
| App | http://localhost:8080 |
| API | http://localhost:8000/api/ |
| Django admin | http://localhost:8000/admin/ |
| Older plain-HTML frontend (optional, see below) | http://localhost:5500 |

`docker compose` refuses to start until `.env` exists and the database password and secret key are set.

**What happens on start:** the database migrations run, then (with `SEED_DEMO_DATA=true`) the demo data from [seed_data](backend/api/management/commands/seed_data.py) is loaded, and the admin account from `DJANGO_SUPERUSER_*` is created if it doesn't exist yet. Demo app logins are `demo` / `Demo@1234`, `ali` / `Ali@1234` and `sara` / `Sara@1234`; the admin login is whatever you put in `.env`. Set `SEED_DEMO_DATA=false` for real data.

**Data is kept** in two Docker volumes (`pgdata` for the database, `media` for complaint photos), so `docker compose down` and `up` keep everything. `docker compose down -v` deletes it. Docker uses its own PostgreSQL, so data from a local `db.sqlite3` does not appear there.

**Email** works the same as without Docker: set `EMAIL_HOST_USER` and `EMAIL_HOST_PASSWORD` in `.env`.

Useful commands:

```bash
docker compose logs -f backend                 # follow the API log
docker compose exec backend python manage.py test   # run the backend tests inside the container
docker compose exec backend python manage.py seed_data --no-admin   # (re)load demo data
docker compose down                            # stop, keep data
```

**The older HTML frontend** ([frontend/hello](frontend/hello)) is included but not started by default. Start everything including it with:

```bash
docker compose --profile legacy up --build
```

It is served on `LEGACY_PORT` (default 5500) and talks to the same API. Its API address is filled in at build time from the same settings as the main frontend.

**Other ports or addresses.** If 8000 or 8080 are taken, change `BACKEND_PORT` / `FRONTEND_PORT` in `.env`. The frontend address of the API is built into the app at build time, so after changing ports or opening the app from another machine (for example `http://192.168.1.20:8080`) set `VITE_API_URL` and `CORS_ALLOWED_ORIGINS` (and `DJANGO_ALLOWED_HOSTS` for the API host) in `.env` and run `docker compose up --build` again.

**Notes.**

- The containers run with `DEBUG` off. The API runs gunicorn with one process and several threads, because the rate limits are kept in memory; move them to Redis before adding more processes.
- Uploaded photos are served by Django itself (`SERVE_MEDIA=True`), which is fine for a demo or a small site; put a web server or object storage in front for heavier use.
- Docker does not change the security notes below: use your own passwords, do not keep the demo data on a public server, and put HTTPS in front before real use.

## Getting started

### Prerequisites

- Python 3
- Node.js and npm
- PostgreSQL running locally

### 1. Database

Settings are read from environment variables (see [backend/.env.example](backend/.env.example)); a `backend/.env` file is loaded automatically. Create the database and put your credentials in `.env`:

```bash
createdb -U postgres gcpc_db
cd backend && cp .env.example .env    # then edit: DB_PASSWORD, DJANGO_SECRET_KEY, EMAIL_*
```

| Variable | Purpose | Default |
| --- | --- | --- |
| `DJANGO_SECRET_KEY` | Django secret key | throwaway dev key, only while `DJANGO_DEBUG` is on |
| `DJANGO_DEBUG` | Debug mode | `True` |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated hosts | empty |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | PostgreSQL connection | `gcpc_db`, `postgres`, empty, `localhost`, `5432` |
| `DB_ENGINE=sqlite` | Use a local SQLite file instead of PostgreSQL | unset |
| `DB_SQLITE_PATH` | Location of that SQLite file | `backend/db.sqlite3` |
| `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` | Account and app password used to send OTPs and DC complaint emails | empty (nothing is sent; complaints are still saved and shown as not emailed) |
| `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`, `EMAIL_USE_STARTTLS` | SMTP server | `smtp.gmail.com`, `587`, `True` |
| `CORS_ALLOWED_ORIGINS` | Browser origins allowed to call the API (comma-separated) | `localhost` / `127.0.0.1` on ports 5173, 3000 and 5500 |

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser     # for /admin/
python manage.py runserver           # http://localhost:8000
```

Run the tests (SQLite, no PostgreSQL needed):

```bash
DB_ENGINE=sqlite python manage.py test
```

### 3. Load demo data

```bash
python manage.py seed_data            # safe to re-run; add --reset to wipe first, --no-admin to skip the admin user
```

This creates 20 products (fruits and vegetables), three users, saved orders, an open cart, three complaints with map coordinates and some notifications.

| Login | Username | Password |
| --- | --- | --- |
| App user | `demo` | `Demo@1234` |
| App user | `ali` | `Ali@1234` |
| App user | `sara` | `Sara@1234` |
| Django admin | `admin` | `Admin@1234` |

These are throwaway development passwords: never run the seed command against a real deployment. Prices can be edited afterwards in `/admin/`.

### 4. Frontend

```bash
cd frontend/fe
npm install
npm run dev                          # http://localhost:5173
```

Other scripts: `npm run build`, `npm run preview`, `npm run lint`, `npm test`.

The frontend talks to `http://localhost:8000` by default. To point it elsewhere, set `VITE_API_URL` (see [frontend/fe/.env.example](frontend/fe/.env.example)), for example in `frontend/fe/.env.local`.

**How the frontend is organised** (all under [frontend/fe/src/](frontend/fe/src/)):

- `api.js`: the one place that knows the API address, the `MyToken` header and how to turn server errors into readable messages. A rejected or expired token ends the session once and sends the user to `/auth`.
- `context/`: `AuthProvider` (who is logged in) and `ToastProvider` (success and error messages), used by every page.
- `components/`: one file per page. Protected pages send logged-out users to `/auth` and return them to the page they asked for after login.
- Tests: `npm test` runs Vitest unit and component tests (`api.test.js`, `components.test.jsx`).

### 5. Try it

1. Open the frontend and register on `/auth`, then log in.
2. Open `/products`, pick a category and add items to the cart.
3. Open `/cart`, adjust quantities and save the cart; it then appears in `/history`.
4. Open `/complaints`, fill in the form, click the map to pin a location and submit.
5. In `/admin/`, change the complaint's status; the user gets a notification in the header bell.

## Security notes

Already in place: passwords are hashed (old plain-text ones are upgraded on first login); secrets and the SMTP account come from the environment; `cart-items/` only touches the current user's items; `products/` is read-only through the API (change prices in `/admin/`); users cannot change their own complaint's `status`; OTPs come from `secrets`, expire after 10 minutes, lock after 5 wrong tries and stop working once used; login (20/min), the OTP endpoints (30/min) and complaint creation (10/hour) are rate-limited per client IP; CORS only allows the listed origins; user text in DC emails cannot inject headers or HTML.

Still open before this is used in production:

- The Gmail app password that was previously committed to git history is still in that history. Revoke it in the Google account and create a new one.
- `DEBUG` defaults to on for local work: set `DJANGO_DEBUG=False`, a real `DJANGO_SECRET_KEY` and `DJANGO_ALLOWED_HOSTS` when deploying.
- Any logged-in user can make the server email a complaint to any address they type as the DC (limited to 10 an hour). Restricting `dc_email` to an allow-list of official domains would close this.
- Rate limits are per IP and kept in memory, so they reset on restart and are not shared between server processes. Use a shared cache (for example Redis) in production.
- `request-reset-password/` reveals whether an email is registered.
- Tokens are stored unhashed in the database, and `get-me/` takes the token in the request body.
- Complaints are emailed once; there is no retry queue if the SMTP server is down (the complaint shows as not emailed).
- Compiled `__pycache__` files and uploaded media images are committed to git.
