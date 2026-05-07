from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CompanyViewSet, VacancyViewSet, MentorViewSet, ContractRequestViewSet

router = DefaultRouter()
router.register('companies', CompanyViewSet, basename='company')
router.register('vacancies', VacancyViewSet, basename='vacancy')
router.register('mentors', MentorViewSet, basename='mentor')
router.register('contract-requests', ContractRequestViewSet, basename='contract-request')

urlpatterns = [path('', include(router.urls))]
