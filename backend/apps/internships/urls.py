from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (ApplicationViewSet, InternshipViewSet, TaskViewSet,
                    DailyLogViewSet, EvaluationViewSet, DailyLogBookViewSet)

router = DefaultRouter()
router.register('applications',  ApplicationViewSet,   basename='application')
router.register('internships',   InternshipViewSet,    basename='internship')
router.register('tasks',         TaskViewSet,          basename='task')
router.register('daily-logs',    DailyLogViewSet,      basename='daily-log')
router.register('evaluations',   EvaluationViewSet,    basename='evaluation')
router.register('logbooks',      DailyLogBookViewSet,  basename='logbook')

urlpatterns = [path('', include(router.urls))]
