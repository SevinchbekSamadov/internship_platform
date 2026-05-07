from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .models import AttendanceViewSet

router = DefaultRouter()
router.register('', AttendanceViewSet, basename='attendance')
urlpatterns = [path('', include(router.urls))]
