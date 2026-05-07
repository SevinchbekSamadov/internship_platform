from django.db import models
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from apps.users.models import User
from apps.internships.models import Internship


# ── Model ─────────────────────────────────────────────────────────────────────

class Attendance(models.Model):
    class Status(models.TextChoices):
        PRESENT = 'present', 'Keldi'
        ABSENT = 'absent', 'Kelmadi'
        LATE = 'late', 'Kechikdi'

    internship = models.ForeignKey(Internship, on_delete=models.CASCADE, related_name='attendance')
    date = models.DateField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PRESENT)
    check_in = models.TimeField(null=True, blank=True)
    check_out = models.TimeField(null=True, blank=True)
    note = models.TextField(blank=True)
    marked_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='marked_attendance')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Davomat'
        unique_together = ['internship', 'date']
        ordering = ['-date']

    def __str__(self):
        return f"{self.internship.student.get_full_name()} — {self.date} — {self.status}"


# ── Serializer ────────────────────────────────────────────────────────────────

class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    marked_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Attendance
        fields = '__all__'
        read_only_fields = ['marked_by', 'created_at']

    def get_student_name(self, obj): return obj.internship.student.get_full_name()
    def get_marked_by_name(self, obj): return obj.marked_by.get_full_name() if obj.marked_by else None


# ── View ──────────────────────────────────────────────────────────────────────

class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['internship', 'status', 'date']

    def get_queryset(self):
        user = self.request.user
        role = user.role

        if role == 'student':
            return Attendance.objects.filter(internship__student=user)

        if role == 'mentor':
            try:
                company = user.mentor_profile.company
                return Attendance.objects.filter(internship__company=company)
            except Exception:
                return Attendance.objects.none()

        if role == 'company_hr':
            from apps.companies.models import Company
            try:
                company = Company.objects.get(hr_user=user)
                return Attendance.objects.filter(internship__company=company)
            except Company.DoesNotExist:
                return Attendance.objects.none()

        if role == 'supervisor':
            return Attendance.objects.filter(internship__supervisor=user)

        return Attendance.objects.all()

    def perform_create(self, serializer):
        serializer.save(marked_by=self.request.user)

    @action(detail=False, methods=['post'])
    def bulk_mark(self, request):
        """Mentor bir necha talabani bir vaqtda belgilaydi"""
        records = request.data.get('records', [])
        date = request.data.get('date', str(timezone.now().date()))
        count = 0
        for rec in records:
            try:
                internship = Internship.objects.get(id=rec['internship_id'])
                Attendance.objects.update_or_create(
                    internship=internship,
                    date=date,
                    defaults={
                        'status': rec.get('status', 'present'),
                        'check_in': rec.get('check_in'),
                        'check_out': rec.get('check_out'),
                        'note': rec.get('note', ''),
                        'marked_by': request.user,
                    }
                )
                count += 1
            except Internship.DoesNotExist:
                continue
        return Response({'message': f'{count} ta davomat belgilandi'})

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Davomat statistikasi"""
        internship_id = request.query_params.get('internship_id')
        qs = self.get_queryset()
        if internship_id:
            qs = qs.filter(internship_id=internship_id)
        total = qs.count()
        present = qs.filter(status='present').count()
        late = qs.filter(status='late').count()
        absent = qs.filter(status='absent').count()
        return Response({
            'total': total,
            'present': present,
            'late': late,
            'absent': absent,
            'rate': round((present + late) / total * 100 if total else 0, 1)
        })

    @action(detail=False, methods=['post'])
    def student_checkin(self, request):
        """Talaba check-in (agar kerak bo'lsa)"""
        internship_id = request.data.get('internship_id')
        try:
            internship = Internship.objects.get(id=internship_id, student=request.user)
        except Internship.DoesNotExist:
            return Response({'error': 'Amaliyot topilmadi'}, status=404)
        today = timezone.now().date()
        now_time = timezone.now().time()
        att, _ = Attendance.objects.get_or_create(
            internship=internship, date=today,
            defaults={'status': 'present', 'check_in': now_time, 'marked_by': request.user}
        )
        return Response({'message': f'Check-in: {now_time.strftime("%H:%M")}', 'date': str(today)})
