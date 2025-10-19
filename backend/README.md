Talk2Campus backend (FastAPI)

Setup

1. Create a virtualenv and install dependencies:

   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt

2. Copy `.env.example` to `.env` and update `MONGO_URL` and `JWT_SECRET`.

3. Run the app:

   uvicorn backend.main:app --reload --port 8000

Endpoints

- POST /signup  { name, email, password } -> creates user
- POST /login   { email, password } -> sets httpOnly cookie `access_token` on success
- GET /me       -> current user (reads token from Authorization header OR cookie)

Notes

- Passwords are hashed (pbkdf2_sha256) and never stored in plain text.
- The `/login` endpoint sets an httpOnly cookie named `access_token`. The server also accepts a Bearer token via `Authorization` header for API clients.
- For production, set `secure=True` on cookies and use HTTPS.

Smoke test

1. Start the backend as above.
2. From the `backend` directory run:

   python smoke_test.py

This script will attempt signup, login (using a requests Session which preserves cookies), and call `/me` to verify authentication via cookie.

