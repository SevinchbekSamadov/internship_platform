from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter
from .models import Company, Vacancy, Mentor, ContractRequest


# ── Serializers ───────────────────────────────────────────────────────────────

class CompanySerializer(serializers.ModelSerializer):
    hr_name = serializers.SerializerMethodField()
    class Meta:
        model = Company
        fields = '__all__'
        read_only_fields = ['hr_user', 'status', 'created_at']
    def get_hr_name(self, obj):
        return obj.hr_user.get_full_name()


class VacancySerializer(serializers.ModelSerializer):
    company_name         = serializers.SerializerMethodField()
    company_has_contract = serializers.SerializerMethodField()
    available_slots      = serializers.ReadOnlyField()
    class Meta:
        model = Vacancy
        fields = '__all__'
        read_only_fields = ['company', 'filled_slots', 'created_at']
    def get_company_name(self, obj):         return obj.company.name
    def get_company_has_contract(self, obj): return obj.company.has_contract


class MentorSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()
    class Meta:
        model = Mentor
        fields = '__all__'
        read_only_fields = ['user', 'company']
    def get_user_name(self, obj):
        return obj.user.get_full_name()
    def get_user_email(self, obj):
        return obj.user.email


class ContractRequestSerializer(serializers.ModelSerializer):
    company_name = serializers.SerializerMethodField()
    class Meta:
        model = ContractRequest
        fields = '__all__'
        read_only_fields = ['company', 'status', 'reviewed_by', 'reviewed_at', 'created_at']
    def get_company_name(self, obj):
        return obj.company.name


# ── Views ─────────────────────────────────────────────────────────────────────

class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['status', 'has_contract']
    search_fields = ['name', 'industry', 'city']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'company_hr':
            return Company.objects.filter(hr_user=user)
        return Company.objects.all()

    def perform_create(self, serializer):
        serializer.save(hr_user=self.request.user)

    @action(detail=False, methods=['get'])
    def my(self, request):
        try:
            company = Company.objects.get(hr_user=request.user)
            return Response(CompanySerializer(company).data)
        except Company.DoesNotExist:
            return Response({'detail': 'Topilmadi'}, status=404)

    @action(detail=False, methods=['post'])
    def admin_create(self, request):
        """
        Admin shartnomali korxona + HR foydalanuvchisini bir vaqtda yaratadi.
        Body: { company_name, inn, industry, city, address, phone, email,
                hr_first_name, hr_last_name, hr_email, hr_password }
        """
        if request.user.role != 'admin':
            return Response({'error': 'Faqat admin yarata oladi'}, status=403)

        data = request.data
        required = ['company_name', 'hr_email', 'hr_password', 'hr_first_name', 'hr_last_name']
        for f in required:
            if not data.get(f):
                return Response({'error': f'{f} majburiy'}, status=400)

        from apps.users.models import User
        if User.objects.filter(email=data['hr_email']).exists():
            return Response({'error': f"{data['hr_email']} allaqachon mavjud"}, status=400)

        import uuid
        username = data['hr_email'].split('@')[0] + '_' + uuid.uuid4().hex[:6]
        hr = User.objects.create_user(
            email=data['hr_email'],
            username=username,
            first_name=data['hr_first_name'],
            last_name=data['hr_last_name'],
            role='company_hr',
            phone=data.get('hr_phone', ''),
            password=data['hr_password'],
        )
        company = Company.objects.create(
            hr_user=hr,
            name=data['company_name'],
            inn=data.get('inn', ''),
            industry=data.get('industry', ''),
            city=data.get('city', ''),
            address=data.get('address', ''),
            phone=data.get('phone', ''),
            email=data.get('email', data['hr_email']),
            status='approved',
            has_contract=True,
        )
        return Response({
            'message': f'{company.name} muvaffaqiyatli qo\'shildi',
            'company': CompanySerializer(company).data,
            'hr_email': hr.email,
            'hr_password': data['hr_password'],
        }, status=201)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        company = self.get_object()
        company.status = 'approved'
        company.save()
        return Response({'message': f'{company.name} tasdiqlandi'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        company = self.get_object()
        company.status = 'rejected'
        company.save()
        return Response({'message': 'Rad etildi'})


class VacancyViewSet(viewsets.ModelViewSet):
    queryset = Vacancy.objects.select_related('company').all()
    serializer_class = VacancySerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['status', 'is_paid']
    search_fields = ['title', 'company__name']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'company_hr':
            try:
                company = Company.objects.get(hr_user=user)
                return Vacancy.objects.filter(company=company)
            except Company.DoesNotExist:
                return Vacancy.objects.none()
        # talaba va boshqalar ochiq vakansiyalarni ko'radi
        return Vacancy.objects.filter(status='open')

    def perform_create(self, serializer):
        company = Company.objects.get(hr_user=self.request.user)
        serializer.save(company=company)


class MentorViewSet(viewsets.ModelViewSet):
    queryset = Mentor.objects.select_related('user', 'company').all()
    serializer_class = MentorSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'company_hr':
            try:
                company = Company.objects.get(hr_user=user)
                return Mentor.objects.filter(company=company)
            except Company.DoesNotExist:
                return Mentor.objects.none()
        if user.role == 'mentor':
            return Mentor.objects.filter(user=user)
        return Mentor.objects.all()

    def perform_create(self, serializer):
        company = Company.objects.get(hr_user=self.request.user)
        serializer.save(company=company)


class ContractRequestViewSet(viewsets.ModelViewSet):
    queryset = ContractRequest.objects.all()
    serializer_class = ContractRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'company_hr':
            try:
                company = Company.objects.get(hr_user=user)
                return ContractRequest.objects.filter(company=company)
            except Company.DoesNotExist:
                return ContractRequest.objects.none()
        return ContractRequest.objects.all()

    def perform_create(self, serializer):
        company = Company.objects.get(hr_user=self.request.user)
        serializer.save(company=company)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        req = self.get_object()
        req.status = 'approved'
        req.reviewed_by = request.user
        req.reviewed_at = timezone.now()
        req.response = request.data.get('response', '')
        req.save()
        req.company.has_contract = True
        req.company.save()
        return Response({'message': "Shartnoma so'rovi tasdiqlandi"})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        req = self.get_object()
        req.status = 'rejected'
        req.reviewed_by = request.user
        req.reviewed_at = timezone.now()
        req.response = request.data.get('response', '')
        req.save()
        return Response({'message': 'Rad etildi'})

