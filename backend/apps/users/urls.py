from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LoginView, RegisterView, UserViewSet

router = DefaultRouter()
router.register('users', UserViewSet, basename='user')

urlpatterns = [
    path('login/', LoginView.as_view()),
    path('register/', RegisterView.as_view()),
    path('', include(router.urls)),
]
