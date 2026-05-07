from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .models import ReportViewSet

router = DefaultRouter()
router.register('', ReportViewSet, basename='report')
urlpatterns = [path('', include(router.urls))]
