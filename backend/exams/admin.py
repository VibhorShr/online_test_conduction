from django.contrib import admin

from .models import Account, Attempt, Question, Test


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'username', 'email', 'role', 'created_at')
    list_filter = ('role',)
    search_fields = ('full_name', 'username', 'email')


class QuestionInline(admin.TabularInline):
    model = Question
    extra = 0


@admin.register(Test)
class TestAdmin(admin.ModelAdmin):
    list_display = ('title', 'subject', 'duration', 'session_start', 'session_end', 'created_by', 'created_at')
    search_fields = ('title', 'subject')
    inlines = [QuestionInline]


@admin.register(Attempt)
class AttemptAdmin(admin.ModelAdmin):
    list_display = ('student_name', 'test', 'score', 'status', 'submitted_at')
    list_filter = ('status', 'test')
    search_fields = ('student_name', 'test__title')
