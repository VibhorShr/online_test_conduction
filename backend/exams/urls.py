from django.urls import path

from . import views

urlpatterns = [
    path('auth/register/', views.register_view, name='register'),
    path('auth/login/', views.login_view, name='login'),
    path('tests/', views.tests_view, name='tests'),
    path('tests/<int:test_id>/questions/', views.questions_view, name='questions'),
    path('tests/<int:test_id>/session/', views.session_view, name='session'),
    path('attempts/', views.attempts_view, name='attempts'),
]
