# Online Test Conduction System

An online examination portal with separate student and admin flows. The project includes a static frontend and a Django backend API for authentication, test management, questions, and attempt submission.

## Features

- Student and admin registration/login
- Admin test and question management
- Student test listing and attempt submission
- Result/attempt tracking through backend APIs
- Django SQLite database for local development

## Project Structure

```text
online_test_conduction/
+-- backend/     # Django backend API
+-- frontend/    # HTML, CSS, and JavaScript frontend
+-- images.jpeg
+-- sky.jpeg
+-- README.md
```

## Requirements

- Python 3
- Django 6.0.3

Install backend dependencies:

```powershell
cd backend
pip install -r requirements.txt
```

## Run The Backend

```powershell
cd backend
python manage.py migrate
python manage.py runserver
```

The API runs at:

```text
http://127.0.0.1:8000/api/
```

## Run The Frontend

Open the frontend files in a browser:

```text
frontend/index.html
```

The current frontend calls the local backend API automatically.

## API Endpoints

- `POST /api/auth/register/` - create a student or admin account
- `POST /api/auth/login/` - login with username/email, password, and role
- `GET /api/tests/` - list tests with questions
- `POST /api/tests/` - create a test
- `POST /api/tests/<test_id>/questions/` - add a question to a test
- `GET /api/attempts/` - list student results
- `POST /api/attempts/` - submit a student attempt

## Notes

- Local database files such as `db.sqlite3` are ignored by Git.
- Python cache folders and virtual environments are ignored.
- For production deployment, set `DJANGO_SECRET_KEY` as an environment variable and disable Django debug mode.
