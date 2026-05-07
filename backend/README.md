# Django Backend

This backend provides JSON APIs for the Online Test Conduction System frontend.

## Run

```powershell
cd backend
python manage.py migrate
python manage.py runserver
```

The API runs at:

```text
http://127.0.0.1:8000/api/
```

## API

- `POST /api/auth/register/` - create a student or admin account
- `POST /api/auth/login/` - login with username/email, password, and role
- `GET /api/tests/` - list tests with questions
- `POST /api/tests/` - create a test
- `POST /api/tests/<test_id>/questions/` - add a question to a test
- `GET /api/attempts/` - list student results
- `POST /api/attempts/` - submit a student attempt

The current frontend calls this API automatically. Accounts, tests, questions, and attempts are stored in the Django database.
