from django.db import models


class Account(models.Model):
    ROLE_CHOICES = [
        ('student', 'Student'),
        ('admin', 'Admin'),
    ]

    full_name = models.CharField(max_length=120)
    username = models.CharField(max_length=80, unique=True)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    password_hash = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['full_name']

    def __str__(self):
        return f'{self.full_name} ({self.role})'


class Test(models.Model):
    title = models.CharField(max_length=150)
    subject = models.CharField(max_length=120)
    duration = models.PositiveIntegerField(help_text='Duration in minutes')
    session_start = models.DateTimeField(null=True, blank=True)
    session_end = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        Account,
        related_name='created_tests',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={'role': 'admin'},
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class Question(models.Model):
    test = models.ForeignKey(Test, related_name='questions', on_delete=models.CASCADE)
    text = models.TextField()
    option_a = models.CharField(max_length=255)
    option_b = models.CharField(max_length=255)
    option_c = models.CharField(max_length=255)
    option_d = models.CharField(max_length=255)
    correct_answer = models.CharField(max_length=255)

    def __str__(self):
        return self.text[:80]


class Attempt(models.Model):
    student = models.ForeignKey(
        Account,
        related_name='attempts',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={'role': 'student'},
    )
    student_name = models.CharField(max_length=120)
    test = models.ForeignKey(Test, related_name='attempts', on_delete=models.CASCADE)
    score = models.PositiveIntegerField()
    correct_count = models.PositiveIntegerField()
    total_questions = models.PositiveIntegerField()
    completion_seconds = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-submitted_at']

    def __str__(self):
        return f'{self.student_name} - {self.test.title} ({self.score}%)'
