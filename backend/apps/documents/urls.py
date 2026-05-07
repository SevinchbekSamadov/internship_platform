from django.urls import path, include
from rest_framework.routers import DefaultRouter, SimpleRouter
from .models import DocumentViewSet, CompanyOrderViewSet

doc_router = DefaultRouter()
doc_router.register('', DocumentViewSet, basename='document')

order_router = SimpleRouter()
order_router.register('company-orders', CompanyOrderViewSet, basename='company-order')

urlpatterns = [
    path('', include(order_router.urls)),   # aniqroq — avval
    path('', include(doc_router.urls)),
]
