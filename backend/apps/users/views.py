from rest_framework import serializers, viewsets, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth.password_validation import validate_password
import random
import string
from .models import User, StudentProfile, SupervisorProfile, KafedraProfile


# ── Serializers ──────────────────────────────────────────────────────────────

class LoginSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['full_name'] = user.get_full_name()
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = {
            'id': self.user.id,
            'email': self.user.email,
            'role': self.user.role,
            'full_name': self.user.get_full_name(),
        }
        return data


class StudentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentProfile
        exclude = ['user']


class SupervisorProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupervisorProfile
        exclude = ['user']


class KafedraProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = KafedraProfile
        exclude = ['user']


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    student_profile = StudentProfileSerializer(read_only=True)
    supervisor_profile = SupervisorProfileSerializer(read_only=True)
    kafedra_profile = KafedraProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name',
                  'full_name', 'role', 'phone', 'student_profile', 'supervisor_profile',
                  'kafedra_profile']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.email


class RegisterSerializer(serializers.ModelSerializer):
    password        = serializers.CharField(write_only=True, validators=[validate_password])
    username        = serializers.CharField(required=False, allow_blank=True, default='')
    student_profile = StudentProfileSerializer(required=False)
    # Korxona HR ro'yxatdan o'tishda korxona ma'lumotlari
    company_name    = serializers.CharField(required=False, allow_blank=True, write_only=True)
    company_inn     = serializers.CharField(required=False, allow_blank=True, write_only=True)
    company_industry= serializers.CharField(required=False, allow_blank=True, write_only=True)
    company_city    = serializers.CharField(required=False, allow_blank=True, write_only=True)
    company_address = serializers.CharField(required=False, allow_blank=True, write_only=True)
    company_phone   = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = User
        fields = ['email', 'username', 'first_name', 'last_name', 'role', 'phone',
                  'password', 'student_profile',
                  'company_name', 'company_inn', 'company_industry',
                  'company_city', 'company_address', 'company_phone']

    def create(self, validated_data):
        profile_data  = validated_data.pop('student_profile', None)
        company_name  = validated_data.pop('company_name', '')
        company_inn   = validated_data.pop('company_inn', '')
        company_ind   = validated_data.pop('company_industry', '')
        company_city  = validated_data.pop('company_city', '')
        company_addr  = validated_data.pop('company_address', '')
        company_phone = validated_data.pop('company_phone', '')

        import uuid
        if 'username' not in validated_data or not validated_data.get('username'):
            validated_data['username'] = validated_data['email'].split('@')[0] + '_' + uuid.uuid4().hex[:6]

        user = User.objects.create_user(**validated_data)

        if profile_data and user.role == 'student':
            StudentProfile.objects.create(user=user, **profile_data)

        if user.role == 'company_hr' and company_name:
            from apps.companies.models import Company
            Company.objects.create(
                hr_user=user,
                name=company_name,
                inn=company_inn,
                industry=company_ind,
                city=company_city,
                address=company_addr,
                phone=company_phone or user.phone,
                email=user.email,
                status='pending',
                has_contract=False,
            )
        return user


# ── Views ─────────────────────────────────────────────────────────────────────

class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = User.objects.all()
        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)
        return qs

    @action(detail=False, methods=['get', 'patch'])
    def me(self, request):
        if request.method == 'GET':
            return Response(UserSerializer(request.user).data)
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def supervisors(self, request):
        """Amaliyot rahbarlar ro'yxati"""
        users = User.objects.filter(role='supervisor')
        return Response(UserSerializer(users, many=True).data)

    @action(detail=False, methods=['get'])
    def kafedra_students(self, request):
        """Kafedra: o'z kafedrasi talabalarini qaytaradi (barcha guruhlar)"""
        if request.user.role not in ['kafedra', 'dekanat', 'admin']:
            return Response({'error': 'Ruxsat yo\'q'}, status=403)
        if request.user.role == 'kafedra':
            try:
                dept = request.user.kafedra_profile.department
                students = User.objects.filter(
                    role='student',
                    student_profile__department=dept
                ).select_related('student_profile').order_by(
                    'student_profile__group', 'last_name', 'first_name'
                )
            except Exception:
                students = User.objects.filter(role='student').select_related('student_profile')
        else:
            students = User.objects.filter(role='student').select_related('student_profile').order_by(
                'student_profile__group', 'last_name', 'first_name'
            )
        return Response(UserSerializer(students, many=True).data)

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser])
    def import_students(self, request):
        """Admin: Excel fayldan talabalarni bulk import qiladi"""
        if request.user.role != 'admin':
            return Response({'error': 'Faqat admin import qila oladi'}, status=403)

        excel_file = request.FILES.get('file')
        if not excel_file:
            return Response({'error': 'file majburiy'}, status=400)

        try:
            import openpyxl
        except ImportError:
            return Response({'error': 'openpyxl kutubxonasi o\'rnatilmagan'}, status=500)

        try:
            wb = openpyxl.load_workbook(excel_file)
            ws = wb.active
        except Exception:
            return Response({'error': 'Excel faylni o\'qib bo\'lmadi'}, status=400)

        created, errors = [], []
        for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
            if not any(row):
                continue
            full_name = str(row[0] or '').strip()
            email = str(row[1] or '').strip().lower()
            student_id = str(row[2] or '').strip()
            group = str(row[3] or '').strip()
            course = int(row[4]) if row[4] else 1
            department = str(row[5] or '').strip()
            faculty = str(row[6] or '').strip()

            if not email or not full_name:
                errors.append({'row': row_num, 'error': 'email va ism majburiy'})
                continue
            if User.objects.filter(email=email).exists():
                errors.append({'row': row_num, 'error': f'{email} allaqachon mavjud'})
                continue

            password = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
            parts = full_name.split()
            first_name = parts[0] if parts else ''
            last_name = ' '.join(parts[1:]) if len(parts) > 1 else ''

            user = User.objects.create_user(
                email=email,
                username=email,
                first_name=first_name,
                last_name=last_name,
                role='student',
                password=password,
            )
            if not student_id:
                student_id = f"STU{user.id:05d}"
            StudentProfile.objects.create(
                user=user,
                student_id=student_id,
                faculty=faculty,
                department=department,
                direction='',
                course=course,
                group=group,
            )
            created.append({'email': email, 'password': password,
                            'student_id': student_id, 'full_name': full_name})

        return Response({
            'created_count': len(created),
            'error_count': len(errors),
            'credentials': created,
            'errors': errors,
        }, status=201)

