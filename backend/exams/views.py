import json
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404
from django.http import JsonResponse
from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.views.decorators.csrf import csrf_exempt

from .models import Account, Attempt, Question, Test

FRONTEND_DIR = settings.BASE_DIR.parent / 'frontend'


def frontend_file_response(filename, content_type):
    file_path = FRONTEND_DIR / filename
    if not file_path.exists():
        file_path = settings.BASE_DIR.parent / filename
    if not file_path.exists():
        raise Http404(f'{filename} not found.')
    return FileResponse(file_path.open('rb'), content_type=content_type)


def index_page(request):
    return frontend_file_response('index.html', 'text/html')


def admin_page(request):
    return frontend_file_response('admin.html', 'text/html')


def student_page(request):
    return frontend_file_response('student.html', 'text/html')


def frontend_asset(request, filename):
    content_types = {
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
    }
    suffix = Path(filename).suffix
    if suffix not in content_types:
        raise Http404('Unsupported asset type.')
    return frontend_file_response(filename, content_types[suffix])


def parse_json(request):
    try:
        return json.loads(request.body.decode('utf-8') or '{}')
    except json.JSONDecodeError:
        return None


def question_to_dict(question):
    return {
        'id': question.id,
        'text': question.text,
        'options': [
            question.option_a,
            question.option_b,
            question.option_c,
            question.option_d,
        ],
        'answer': question.correct_answer,
    }


def test_to_dict(test):
    now = timezone.now()
    session_status = 'not_scheduled'
    if test.session_start and test.session_end:
        if now < test.session_start:
            session_status = 'upcoming'
        elif now > test.session_end:
            session_status = 'closed'
        else:
            session_status = 'active'

    return {
        'id': test.id,
        'title': test.title,
        'subject': test.subject,
        'duration': test.duration,
        'sessionStart': test.session_start.isoformat() if test.session_start else None,
        'sessionEnd': test.session_end.isoformat() if test.session_end else None,
        'sessionStatus': session_status,
        'questions': [question_to_dict(question) for question in test.questions.all()],
    }


def attempt_to_dict(attempt):
    return {
        'id': attempt.id,
        'student': attempt.student_name,
        'test': attempt.test.title,
        'score': attempt.score,
        'status': attempt.status,
        'correctCount': attempt.correct_count,
        'totalQuestions': attempt.total_questions,
        'completionSeconds': attempt.completion_seconds,
        'submittedAt': attempt.submitted_at.isoformat(),
    }


def account_to_dict(account):
    return {
        'id': account.id,
        'fullName': account.full_name,
        'username': account.username,
        'email': account.email,
        'role': account.role,
    }


def ensure_default_tests():
    if Test.objects.exists():
        return

    software_test = Test.objects.create(
        title='Software Engineering Basics',
        subject='Software Engineering',
        duration=30,
    )
    Question.objects.create(
        test=software_test,
        text='Which SDLC phase focuses on understanding user needs?',
        option_a='Design',
        option_b='Requirement Analysis',
        option_c='Testing',
        option_d='Deployment',
        correct_answer='Requirement Analysis',
    )
    Test.objects.create(
        title='DBMS Fundamentals',
        subject='Database Management',
        duration=25,
    )


@csrf_exempt
def register_view(request):
    if request.method == 'OPTIONS':
        return JsonResponse({})

    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed.'}, status=405)

    data = parse_json(request)
    if data is None:
        return JsonResponse({'error': 'Invalid JSON body.'}, status=400)

    full_name = data.get('fullName', '').strip()
    username = data.get('username', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    role = data.get('role', '').strip()

    if role not in {'student', 'admin'}:
        return JsonResponse({'error': 'Please select student or admin account type.'}, status=400)

    if not full_name or not username or not email or not password:
        return JsonResponse({'error': 'All account fields are required.'}, status=400)

    if len(password) < 6:
        return JsonResponse({'error': 'Password must be at least 6 characters.'}, status=400)

    if Account.objects.filter(username=username).exists():
        return JsonResponse({'error': 'Username is already registered.'}, status=400)

    if Account.objects.filter(email=email).exists():
        return JsonResponse({'error': 'Email is already registered.'}, status=400)

    account = Account.objects.create(
        full_name=full_name,
        username=username,
        email=email,
        role=role,
        password_hash=make_password(password),
    )
    return JsonResponse({'account': account_to_dict(account)}, status=201)


@csrf_exempt
def login_view(request):
    if request.method == 'OPTIONS':
        return JsonResponse({})

    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed.'}, status=405)

    data = parse_json(request)
    if data is None:
        return JsonResponse({'error': 'Invalid JSON body.'}, status=400)

    identifier = data.get('identifier', '').strip()
    password = data.get('password', '')
    role = data.get('role', '').strip()

    if role not in {'student', 'admin'}:
        return JsonResponse({'error': 'Invalid account role.'}, status=400)

    account = Account.objects.filter(username=identifier, role=role).first()
    if account is None:
        account = Account.objects.filter(email=identifier.lower(), role=role).first()

    if account is None or not check_password(password, account.password_hash):
        return JsonResponse({'error': 'Invalid username/email or password.'}, status=400)

    return JsonResponse({'account': account_to_dict(account)})


@csrf_exempt
def tests_view(request):
    if request.method == 'OPTIONS':
        return JsonResponse({})

    if request.method == 'GET':
        ensure_default_tests()
        tests = Test.objects.prefetch_related('questions').all()
        return JsonResponse({'tests': [test_to_dict(test) for test in tests]})

    if request.method == 'POST':
        data = parse_json(request)
        if data is None:
            return JsonResponse({'error': 'Invalid JSON body.'}, status=400)

        title = data.get('title', '').strip()
        subject = data.get('subject', '').strip()
        duration = data.get('duration')

        if not title or not subject or not duration:
            return JsonResponse({'error': 'Title, subject, and duration are required.'}, status=400)

        created_by = None
        account_id = data.get('accountId')
        if account_id:
            created_by = Account.objects.filter(id=account_id, role='admin').first()

        test = Test.objects.create(
            title=title,
            subject=subject,
            duration=int(duration),
            created_by=created_by,
        )
        return JsonResponse({'test': test_to_dict(test)}, status=201)

    return JsonResponse({'error': 'Method not allowed.'}, status=405)


@csrf_exempt
def questions_view(request, test_id):
    if request.method == 'OPTIONS':
        return JsonResponse({})

    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed.'}, status=405)

    data = parse_json(request)
    if data is None:
        return JsonResponse({'error': 'Invalid JSON body.'}, status=400)

    try:
        test = Test.objects.get(id=test_id)
    except Test.DoesNotExist:
        return JsonResponse({'error': 'Test not found.'}, status=404)

    options = data.get('options') or []
    text = data.get('text', '').strip()
    answer = data.get('answer', '').strip()

    if not text or len(options) != 4 or not answer:
        return JsonResponse({'error': 'Question, four options, and answer are required.'}, status=400)

    question = Question.objects.create(
        test=test,
        text=text,
        option_a=options[0].strip(),
        option_b=options[1].strip(),
        option_c=options[2].strip(),
        option_d=options[3].strip(),
        correct_answer=answer,
    )
    return JsonResponse({'question': question_to_dict(question)}, status=201)


@csrf_exempt
def session_view(request, test_id):
    if request.method == 'OPTIONS':
        return JsonResponse({})

    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed.'}, status=405)

    data = parse_json(request)
    if data is None:
        return JsonResponse({'error': 'Invalid JSON body.'}, status=400)

    try:
        test = Test.objects.prefetch_related('questions').get(id=test_id)
    except Test.DoesNotExist:
        return JsonResponse({'error': 'Test not found.'}, status=404)

    start = parse_datetime(data.get('sessionStart', ''))
    end = parse_datetime(data.get('sessionEnd', ''))

    if start is None or end is None:
        return JsonResponse({'error': 'Session start and end time are required.'}, status=400)

    if timezone.is_naive(start):
        start = timezone.make_aware(start)
    if timezone.is_naive(end):
        end = timezone.make_aware(end)

    if end <= start:
        return JsonResponse({'error': 'Session end time must be after start time.'}, status=400)

    test.session_start = start
    test.session_end = end
    test.save(update_fields=['session_start', 'session_end'])

    return JsonResponse({'test': test_to_dict(test)})


@csrf_exempt
def attempts_view(request):
    if request.method == 'OPTIONS':
        return JsonResponse({})

    if request.method == 'GET':
        attempts = Attempt.objects.select_related('test').all()
        return JsonResponse({'results': [attempt_to_dict(attempt) for attempt in attempts]})

    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed.'}, status=405)

    data = parse_json(request)
    if data is None:
        return JsonResponse({'error': 'Invalid JSON body.'}, status=400)

    try:
        test = Test.objects.prefetch_related('questions').get(id=data.get('testId'))
    except Test.DoesNotExist:
        return JsonResponse({'error': 'Test not found.'}, status=404)

    now = timezone.now()
    if not test.session_start or not test.session_end:
        return JsonResponse({'error': 'This test session has not been scheduled.'}, status=400)
    if now < test.session_start:
        return JsonResponse({'error': 'This test session has not started yet.'}, status=400)
    if now > test.session_end:
        return JsonResponse({'error': 'This test session is closed.'}, status=400)

    answers = data.get('answers') or {}
    questions = list(test.questions.all())
    correct_count = 0

    for index, question in enumerate(questions):
        if answers.get(str(index)) == question.correct_answer:
            correct_count += 1

    total_questions = len(questions)
    score = round((correct_count / total_questions) * 100) if total_questions else 0
    completion_seconds = max(0, int(data.get('completionSeconds') or 0))
    student = None
    account_id = data.get('accountId')
    if account_id:
        student = Account.objects.filter(id=account_id, role='student').first()

    attempt = Attempt.objects.create(
        student=student,
        student_name=data.get('studentName', 'Student').strip() or 'Student',
        test=test,
        score=score,
        correct_count=correct_count,
        total_questions=total_questions,
        completion_seconds=completion_seconds,
        status='Passed' if score >= 60 else 'Review',
    )

    return JsonResponse({'result': attempt_to_dict(attempt)}, status=201)
