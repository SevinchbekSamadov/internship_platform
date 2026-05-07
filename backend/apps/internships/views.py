from rest_framework import serializers, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.http import FileResponse, Http404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter
from .models import Application, Internship, Task, DailyLog, Evaluation, DailyLogBook
from apps.companies.models import Company, Mentor


def _generate_request_letter(app):
    """
    Korxonadan universitetga SO'ROV XATI (Rozilik xati).
    Namuna: korxona rahbari nomidan rektor/kafedra boshlig'iga oddiy xat.
    "Siz rahbarlik qilayotgan universiteti ... fakulteti ... guruh talabasi ...ni
     korxonamizda o'quv amaliyotini o'tashga amaliy yordam berishingizni so'rayman."
    """
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
    import io, datetime

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            leftMargin=3*cm, rightMargin=2.5*cm,
                            topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()

    def sty(name, **kw):
        return ParagraphStyle(name, parent=styles['Normal'], **kw)

    right  = sty('r',  fontSize=11, alignment=TA_RIGHT, spaceAfter=3, leading=16)
    body   = sty('b',  fontSize=11, alignment=TA_JUSTIFY, spaceAfter=0, leading=20)
    sign_s = sty('sg', fontSize=11, alignment=TA_LEFT, spaceAfter=3)

    company = app.vacancy.company
    student = app.student
    prof    = getattr(student, 'student_profile', None)
    today   = datetime.date.today()
    vacancy = app.vacancy
    hr      = app.hr_reviewed_by

    faculty_str = prof.faculty if prof and prof.faculty else "Raqamli texnologiyalar"
    group_str   = prof.group   if prof and prof.group   else "—"
    dir_str     = (prof.direction or prof.department) if prof else '—'

    story = []

    # ── Qabul qiluvchi (o'ng tomonda, xuddi namunaga mos) ──
    story.append(Paragraph(
        "Toshkent davlat iqtisodiyot<br/>"
        "universiteti rektori<br/>"
        "<b>T.Z.Teshaboyevga</b>",
        right
    ))
    story.append(Spacer(1, 0.1*cm))
    story.append(Paragraph(
        f"<b>{company.name}</b> rahbari<br/>"
        f"{hr.get_full_name() if hr else company.name + ' rahbari'}<br/>"
        f"tomonidan",
        right
    ))
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph(
        f"Hurmatli T.Z.Teshaboyev",
        sty('gr', fontSize=11, fontName='Helvetica-Oblique', alignment=TA_LEFT, spaceAfter=12)
    ))

    # ── Asosiy matn (namunaga mos) ──
    text = (
        f"Siz rahbarlik qilayotgan universiteti \"<b>{faculty_str}</b>\" fakulteti "
        f"<b>{group_str}</b> guruh talabasi <b>{student.get_full_name()}</b>ni "
        f"<b>{company.address or company.city or 'korxonamiz manzilida'}</b> "
        f"<b>{company.name}</b>da o'quv amaliyotini o'tashga amaliy yordam "
        f"berishingizni so'rayman. O'quv amaliyoti vaqtida talaba bilan bog'liq "
        f"barcha javobgarlikni o'z zimmamga olaman."
    )
    story.append(Paragraph(text, body))
    story.append(Spacer(1, 1.5*cm))

    # ── Imzo (namunaga mos: chap — shahar va lavozim, o'ng — ism) ──
    sign_data = [[
        Paragraph(
            f"Toshkent shahar<br/>"
            f"\"<b>{company.name}</b>\" rahbari",
            sign_s
        ),
        Paragraph(
            f"<br/>________________",
            sty('ms', fontSize=11, alignment=TA_CENTER)
        ),
        Paragraph(
            f"<br/>{hr.get_full_name() if hr else '___________'}",
            sty('ns', fontSize=11, alignment=TA_RIGHT)
        ),
    ]]
    sign_tbl = Table(sign_data, colWidths=[7*cm, 3.5*cm, 5.5*cm])
    sign_tbl.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(sign_tbl)
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph(f"Toshkent shahar, {today.strftime('%d.%m.%Y')} yil", sty('d', fontSize=9, textColor=colors.gray)))

    doc.build(story)
    buf.seek(0)
    return buf

    # ── Imzo ─────────────────────────────────────────────────────────────────
    sign_rows = [[
        Paragraph(
            f"<b>Korxona rahbari:</b><br/><br/>"
            f"________________<br/>"
            f'<font size="8">(imzo)</font><br/><br/>'
            f"{company.name}", left),
        Paragraph(
            f"<b>HR vakili:</b><br/><br/>"
            f"________________<br/>"
            f'<font size="8">(imzo)</font><br/><br/>'
            f"{app.hr_reviewed_by.get_full_name() if app.hr_reviewed_by else '—'}",
            left),
        Paragraph(
            f"<b>Muhur joyi:</b><br/><br/><br/>"
            f"M.O.", center),
    ]]
    sign_tbl = Table(sign_rows, colWidths=[6*cm, 5.5*cm, 4*cm])
    sign_tbl.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
    ]))
    story.append(sign_tbl)

    doc.build(story)
    buf.seek(0)
    return buf


# ── Serializers ───────────────────────────────────────────────────────────────

class ApplicationSerializer(serializers.ModelSerializer):
    student_name             = serializers.SerializerMethodField()
    vacancy_title            = serializers.SerializerMethodField()
    company_name             = serializers.SerializerMethodField()
    company_id               = serializers.SerializerMethodField()
    company_has_contract     = serializers.SerializerMethodField()
    student_group            = serializers.SerializerMethodField()
    assigned_supervisor_name = serializers.SerializerMethodField()
    assigned_supervisor_id   = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = '__all__'
        read_only_fields = ['student', 'status', 'hr_reviewed_by', 'sup_reviewed_by',
                            'kafedra_reviewed_by', 'assigned_supervisor', 'created_at']

    def get_student_name(self, obj):         return obj.student.get_full_name()
    def get_vacancy_title(self, obj):        return obj.vacancy.title
    def get_company_name(self, obj):         return obj.vacancy.company.name
    def get_company_id(self, obj):           return obj.vacancy.company.id
    def get_company_has_contract(self, obj): return obj.vacancy.company.has_contract
    def get_student_group(self, obj):
        try: return obj.student.student_profile.group
        except Exception: return None
    def get_assigned_supervisor_name(self, obj):
        return obj.assigned_supervisor.get_full_name() if obj.assigned_supervisor else None
    def get_assigned_supervisor_id(self, obj):
        return obj.assigned_supervisor.id if obj.assigned_supervisor else None


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = '__all__'
        read_only_fields = ['created_at', 'completed_at']


class DailyLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyLog
        fields = '__all__'
        read_only_fields = ['is_auto', 'created_at',
                            'approved_by_supervisor', 'supervisor_comment',
                            'approved_by_kafedra', 'kafedra_log_comment']


class EvaluationSerializer(serializers.ModelSerializer):
    evaluator_name = serializers.SerializerMethodField()
    class Meta:
        model = Evaluation
        fields = '__all__'
        read_only_fields = ['evaluator', 'created_at']
    def get_evaluator_name(self, obj): return obj.evaluator.get_full_name()


class InternshipSerializer(serializers.ModelSerializer):
    student_name    = serializers.SerializerMethodField()
    company_name    = serializers.SerializerMethodField()
    mentor_name     = serializers.SerializerMethodField()
    mentor_user_id  = serializers.SerializerMethodField()
    supervisor_name = serializers.SerializerMethodField()
    progress_percent = serializers.ReadOnlyField()
    tasks       = TaskSerializer(many=True, read_only=True)
    evaluations = EvaluationSerializer(many=True, read_only=True)

    class Meta:
        model = Internship
        fields = '__all__'
        read_only_fields = ['student', 'company', 'created_at']

    def get_student_name(self, obj):    return obj.student.get_full_name()
    def get_company_name(self, obj):    return obj.company.name
    def get_mentor_name(self, obj):     return obj.mentor.user.get_full_name() if obj.mentor else None
    def get_mentor_user_id(self, obj):  return obj.mentor.user.id if obj.mentor else None
    def get_supervisor_name(self, obj): return obj.supervisor.get_full_name() if obj.supervisor else None


# ── Helper: get company for HR/Mentor ────────────────────────────────────────

def get_user_company(user):
    """HR yoki Mentor uchun kompaniyani qaytaradi"""
    if user.role == 'company_hr':
        try:
            return Company.objects.get(hr_user=user)
        except Company.DoesNotExist:
            return None
    if user.role == 'mentor':
        try:
            return user.mentor_profile.company
        except Exception:
            return None
    return None


# ── Views ─────────────────────────────────────────────────────────────────────

class ApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['status']
    search_fields = ['student__first_name', 'student__last_name']

    def get_queryset(self):
        user = self.request.user
        role = user.role

        if role == 'student':
            return Application.objects.filter(student=user)

        if role in ['company_hr', 'mentor']:
            company = get_user_company(user)
            if company:
                return Application.objects.filter(vacancy__company=company)
            return Application.objects.none()

        if role == 'supervisor':
            # Supervisor faqat o'ziga biriktirilgan talabalar arizalarini ko'radi
            my_students = Internship.objects.filter(supervisor=user).values_list('student_id', flat=True)
            return Application.objects.filter(student__in=my_students)

        if role == 'kafedra':
            # Kafedra o'z kafedrasi barcha talabalarining arizalarini ko'radi
            try:
                dept = user.kafedra_profile.department
                return Application.objects.filter(
                    student__student_profile__department=dept
                )
            except Exception:
                return Application.objects.none()

        # dekanat, admin — hammasi
        return Application.objects.all()

    def perform_create(self, serializer):
        vacancy = serializer.validated_data['vacancy']
        if Application.objects.filter(student=self.request.user, vacancy=vacancy).exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError('Bu vakansiyaga ariza allaqachon yuborilgan')
        serializer.save(student=self.request.user)

    @action(detail=True, methods=['post'])
    def hr_approve(self, request, pk=None):
        """Korxona HR tasdiqlaydi → Ilmiy rahbarga o'tadi"""
        app = self.get_object()
        if app.status != 'pending':
            return Response({'error': 'Ariza holati noto\'g\'ri'}, status=400)
        app.status = Application.Status.HR_APPROVED
        app.hr_reviewed_by = request.user
        app.hr_note = request.data.get('note', '')
        app.save()
        return Response({'message': 'Tasdiqlandi. Ilmiy rahbar ko\'rib chiqadi.'})

    @action(detail=True, methods=['post'])
    def hr_reject(self, request, pk=None):
        """Korxona HR rad etadi"""
        app = self.get_object()
        app.status = Application.Status.HR_REJECTED
        app.hr_reviewed_by = request.user
        app.hr_note = request.data.get('note', '')
        app.save()
        return Response({'message': 'Rad etildi'})

    @action(detail=True, methods=['post'])
    def sup_approve(self, request, pk=None):
        """Ilmiy rahbar tasdiqlaydi → Dekanat yo'llanma yaratadi"""
        app = self.get_object()
        if app.status != 'hr_approved':
            return Response({'error': 'Avval HR tasdiqlashi kerak'}, status=400)
        app.status = Application.Status.SUP_APPROVED
        app.sup_reviewed_by = request.user
        app.sup_note = request.data.get('note', '')
        app.save()
        return Response({'message': 'Tasdiqlandi. Dekanat yo\'llanma yaratadi.'})

    @action(detail=True, methods=['post'])
    def sup_reject(self, request, pk=None):
        """Amaliyot rahbar rad etadi"""
        app = self.get_object()
        app.status = Application.Status.SUP_REJECTED
        app.sup_reviewed_by = request.user
        app.sup_note = request.data.get('note', '')
        app.save()
        return Response({'message': 'Rad etildi'})

    @action(detail=True, methods=['post'])
    def kafedra_approve(self, request, pk=None):
        """Kafedra bitta ariza tasdiqlaydi + ixtiyoriy supervisor biriktiradi"""
        from apps.users.models import User as UserModel
        app = self.get_object()
        if app.status != Application.Status.HR_APPROVED:
            return Response({'error': 'Avval HR tasdiqlashi kerak'}, status=400)
        app.status = Application.Status.KAFEDRA_APPROVED
        app.kafedra_reviewed_by = request.user
        app.kafedra_note = request.data.get('note', '')
        supervisor_id = request.data.get('supervisor_id')
        if supervisor_id:
            try:
                app.assigned_supervisor = UserModel.objects.get(id=supervisor_id, role='supervisor')
            except UserModel.DoesNotExist:
                return Response({'error': 'Amaliyot rahbar topilmadi'}, status=404)
        app.save()
        sup_name = app.assigned_supervisor.get_full_name() if app.assigned_supervisor else 'biriktirilmagan'
        return Response({'message': f'Tasdiqlandi. Rahbar: {sup_name}. Dekanat yo\'llanma yaratadi.'})

    @action(detail=True, methods=['post'])
    def kafedra_reject(self, request, pk=None):
        """Kafedra ariza rad etadi"""
        app = self.get_object()
        if app.status != Application.Status.HR_APPROVED:
            return Response({'error': 'Faqat HR tasdiqlagan arizani rad etish mumkin'}, status=400)
        app.status = Application.Status.KAFEDRA_REJECTED
        app.kafedra_reviewed_by = request.user
        app.kafedra_note = request.data.get('note', '')
        app.save()
        return Response({'message': 'Rad etildi'})

    @action(detail=True, methods=['get'])
    def request_letter(self, request, pk=None):
        """Shartnomasi yo'q korxona uchun So'rov xati PDF."""
        from django.http import HttpResponse
        app = self.get_object()
        if app.vacancy.company.has_contract:
            return Response({'error': 'Bu korxona bilan shartnoma mavjud, so\'rov xati shart emas'}, status=400)
        buf = _generate_request_letter(app)
        response = HttpResponse(buf.read(), content_type='application/pdf')
        name = app.student.get_full_name().replace(' ', '_')
        response['Content-Disposition'] = f'attachment; filename="rozilik_xati_{name}.pdf"'
        return response

    @action(detail=False, methods=['post'])
    def kafedra_assign_place(self, request):
        """
        Kafedra talabalar uchun amaliyot joyi belgilaydi.
        Application yaratadi yoki mavjudini kafedra_approved ga o'tkazadi.
        Body: { student_ids, vacancy_id, supervisor_id?, note? }
        """
        from apps.companies.models import Vacancy as VacModel
        from apps.users.models import User as UserModel

        student_ids   = request.data.get('student_ids', [])
        vacancy_id    = request.data.get('vacancy_id')
        supervisor_id = request.data.get('supervisor_id')
        note          = request.data.get('note', 'Kafedra tomonidan tayinlandi')

        if not student_ids or not vacancy_id:
            return Response({'error': 'student_ids va vacancy_id majburiy'}, status=400)

        try:
            vacancy = VacModel.objects.get(id=vacancy_id)
        except VacModel.DoesNotExist:
            return Response({'error': 'Vakansiya topilmadi'}, status=404)

        supervisor = None
        if supervisor_id:
            try:
                supervisor = UserModel.objects.get(id=supervisor_id, role='supervisor')
            except UserModel.DoesNotExist:
                return Response({'error': 'Amaliyot rahbar topilmadi'}, status=404)

        created_ids, errors = [], []
        for sid in student_ids:
            try:
                student = UserModel.objects.get(id=sid, role='student')
            except UserModel.DoesNotExist:
                errors.append({'student_id': sid, 'error': 'Talaba topilmadi'})
                continue

            # Mavjud arizani yangilash yoki yangi yaratish
            app, new = Application.objects.update_or_create(
                student=student, vacancy=vacancy,
                defaults=dict(
                    cover_letter=note,
                    status=Application.Status.KAFEDRA_APPROVED,
                    kafedra_reviewed_by=request.user,
                    kafedra_note=note,
                    assigned_supervisor=supervisor,
                )
            )
            created_ids.append(app.id)

        return Response({
            'message': f'{len(created_ids)} ta talabaga amaliyot joyi biriktirildi',
            'created_count': len(created_ids),
            'error_count': len(errors),
            'errors': errors,
        }, status=201)

    @action(detail=False, methods=['post'])
    def kafedra_batch_approve(self, request):
        """Kafedra guruh bo'yicha arizalarni tasdiqlaydi va amaliyot rahbar biriktiradi"""
        ids           = request.data.get('application_ids', [])
        note          = request.data.get('note', '')
        supervisor_id = request.data.get('supervisor_id')

        if not ids:
            return Response({'error': 'application_ids majburiy'}, status=400)

        supervisor = None
        if supervisor_id:
            from apps.users.models import User as UserModel
            try:
                supervisor = UserModel.objects.get(id=supervisor_id, role='supervisor')
            except UserModel.DoesNotExist:
                return Response({'error': 'Amaliyot rahbar topilmadi'}, status=404)

        apps = Application.objects.filter(id__in=ids, status=Application.Status.HR_APPROVED)
        count = apps.update(
            status=Application.Status.KAFEDRA_APPROVED,
            kafedra_reviewed_by=request.user,
            kafedra_note=note,
            assigned_supervisor=supervisor,
        )
        return Response({
            'message': f'{count} ta ariza tasdiqlandi'
                       + (f', amaliyot rahbar: {supervisor.get_full_name()}' if supervisor else ''),
            'approved_count': count,
        })


from django.db import models as django_models


class InternshipViewSet(viewsets.ModelViewSet):
    serializer_class = InternshipSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['status']
    search_fields = ['student__first_name', 'student__last_name']

    def get_queryset(self):
        user = self.request.user
        role = user.role

        if role == 'student':
            return Internship.objects.filter(student=user)

        if role in ['company_hr', 'mentor']:
            # Korxonaga tegishli BARCHA amaliyotlar
            company = get_user_company(user)
            if company:
                return Internship.objects.filter(company=company)
            return Internship.objects.none()

        if role == 'supervisor':
            return Internship.objects.filter(supervisor=user)

        if role == 'kafedra':
            try:
                dept = user.kafedra_profile.department
                return Internship.objects.filter(student__student_profile__department=dept)
            except Exception:
                return Internship.objects.none()

        # dekanat, admin — hammasi
        return Internship.objects.all()

    @action(detail=True, methods=['post'])
    def assign_mentor(self, request, pk=None):
        """Korxona HR mentor tayinlaydi"""
        internship = self.get_object()
        mentor_id = request.data.get('mentor_id')
        try:
            mentor = Mentor.objects.get(id=mentor_id, company=internship.company)
            internship.mentor = mentor
            internship.save()
            return Response({'message': f'Mentor tayinlandi: {mentor.user.get_full_name()}'})
        except Mentor.DoesNotExist:
            return Response({'error': 'Mentor topilmadi'}, status=404)

    @action(detail=True, methods=['post'])
    def assign_supervisor(self, request, pk=None):
        """Dekanat ilmiy rahbar tayinlaydi"""
        internship = self.get_object()
        supervisor_id = request.data.get('supervisor_id')
        from apps.users.models import User
        try:
            supervisor = User.objects.get(id=supervisor_id, role='supervisor')
            internship.supervisor = supervisor
            internship.save()
            return Response({'message': f'Ilmiy rahbar tayinlandi: {supervisor.get_full_name()}'})
        except User.DoesNotExist:
            return Response({'error': 'Ilmiy rahbar topilmadi'}, status=404)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        internship = self.get_object()
        internship.status = Internship.Status.ACTIVE
        internship.save()
        return Response({'message': 'Amaliyot faollashtirildi'})

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        internship = self.get_object()
        internship.status = Internship.Status.COMPLETED
        internship.save()
        return Response({'message': 'Amaliyot yakunlandi'})

    @action(detail=True, methods=['post'])
    def set_mentor_grade(self, request, pk=None):
        """Mentor baho beradi"""
        internship = self.get_object()
        grade = float(request.data.get('grade', 0))
        internship.mentor_grade = grade
        internship.save()
        # Evaluation yaratish/yangilash
        Evaluation.objects.update_or_create(
            internship=internship,
            evaluator_type='mentor',
            defaults={'evaluator': request.user, 'grade': grade,
                      'comment': request.data.get('comment', '')}
        )
        return Response({'message': f'Mentor bahosi: {grade}'})

    @action(detail=True, methods=['post'])
    def set_supervisor_grade(self, request, pk=None):
        """Ilmiy rahbar baho beradi"""
        internship = self.get_object()
        grade = float(request.data.get('grade', 0))
        internship.supervisor_grade = grade
        internship.save()
        Evaluation.objects.update_or_create(
            internship=internship,
            evaluator_type='supervisor',
            defaults={'evaluator': request.user, 'grade': grade,
                      'comment': request.data.get('comment', '')}
        )
        return Response({'message': f'Ilmiy rahbar bahosi: {grade}'})

    @action(detail=True, methods=['post'])
    def set_final_grade(self, request, pk=None):
        """Amaliyot rahbar yakuniy baho qo'yadi"""
        internship = self.get_object()
        grade = float(request.data.get('grade', 0))
        internship.final_grade = grade
        if grade >= 90:   internship.final_grade_letter = '5'
        elif grade >= 70: internship.final_grade_letter = '4'
        elif grade >= 60: internship.final_grade_letter = '3'
        else:             internship.final_grade_letter = '2'
        internship.save()
        label = {'5':'A\'lo','4':'Yaxshi','3':'Qoniqarli','2':'Qoniqarsiz'}.get(internship.final_grade_letter,'')
        return Response({'message': f'Yakuniy baho: {grade} — {internship.final_grade_letter} ({label})'})

    @action(detail=True, methods=['post'])
    def kafedra_assign_supervisor(self, request, pk=None):
        """Kafedra amaliyot rahbar biriktiradi"""
        internship = self.get_object()
        supervisor_id = request.data.get('supervisor_id')
        from apps.users.models import User as UserModel
        try:
            supervisor = UserModel.objects.get(id=supervisor_id, role='supervisor')
            internship.supervisor = supervisor
            internship.save()
            return Response({'message': f'Amaliyot rahbar tayinlandi: {supervisor.get_full_name()}'})
        except UserModel.DoesNotExist:
            return Response({'error': 'Amaliyot rahbar topilmadi'}, status=404)


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['internship', 'status']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'student':
            return Task.objects.filter(internship__student=user)
        if user.role in ['company_hr', 'mentor']:
            company = get_user_company(user)
            if company:
                return Task.objects.filter(internship__company=company)
            return Task.objects.none()
        if user.role == 'supervisor':
            return Task.objects.filter(internship__supervisor=user)
        return Task.objects.all()

    @action(detail=True, methods=['post'])
    def mark_done(self, request, pk=None):
        """Talaba: vazifani bajarildi deb belgilaydi"""
        task = self.get_object()
        task.status = Task.Status.DONE
        task.student_note = request.data.get('note', '')
        task.completed_at = timezone.now()
        task.save()
        # Avtomatik kundalikka yozish
        self._auto_daily_log(task)
        return Response({'message': 'Vazifa bajarildi deb belgilandi'})

    def _auto_daily_log(self, task):
        today = timezone.now().date()
        log, created = DailyLog.objects.get_or_create(
            internship=task.internship,
            date=today,
            defaults={'description': '', 'is_auto': True}
        )
        if task.title not in log.description:
            sep = '\n' if log.description else ''
            log.description += f"{sep}✅ {task.title} — bajarildi"
            log.save()

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Mentor: vazifani tasdiqlaydi"""
        task = self.get_object()
        task.status = Task.Status.APPROVED
        task.mentor_note = request.data.get('note', '')
        task.save()
        return Response({'message': 'Vazifa tasdiqlandi'})


class DailyLogViewSet(viewsets.ModelViewSet):
    serializer_class = DailyLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['internship', 'date']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'student':
            return DailyLog.objects.filter(internship__student=user)
        if user.role in ['company_hr', 'mentor']:
            company = get_user_company(user)
            if company:
                return DailyLog.objects.filter(internship__company=company)
            return DailyLog.objects.none()
        if user.role == 'supervisor':
            return DailyLog.objects.filter(internship__supervisor=user)
        if user.role == 'kafedra':
            try:
                dept = user.kafedra_profile.department
                return DailyLog.objects.filter(internship__student__student_profile__department=dept)
            except Exception:
                return DailyLog.objects.none()
        return DailyLog.objects.all()

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Mentor kundalikni tasdiqlaydi"""
        log = self.get_object()
        log.approved_by_mentor = True
        log.mentor_comment = request.data.get('comment', '')
        log.save()
        return Response({'message': 'Kundalik mentor tomonidan tasdiqlandi'})

    @action(detail=True, methods=['post'])
    def supervisor_approve(self, request, pk=None):
        """Amaliyot rahbar kundalikni tasdiqlaydi — faqat mentor tasdiqlagan bo'lsa"""
        log = self.get_object()
        if not log.approved_by_mentor:
            return Response(
                {'error': 'Avval mentor tasdiqlashi kerak'},
                status=status.HTTP_400_BAD_REQUEST
            )
        log.approved_by_supervisor = True
        log.supervisor_comment = request.data.get('comment', '')
        log.save()
        return Response({'message': 'Kundalik amaliyot rahbar tomonidan tasdiqlandi'})

    @action(detail=True, methods=['post'])
    def kafedra_approve(self, request, pk=None):
        """Kafedra kundalikni tasdiqlaydi"""
        log = self.get_object()
        log.approved_by_kafedra = True
        log.kafedra_log_comment = request.data.get('comment', '')
        log.save()
        return Response({'message': 'Kundalik kafedra tomonidan tasdiqlandi'})


class EvaluationViewSet(viewsets.ModelViewSet):
    serializer_class = EvaluationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['internship']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'student':
            return Evaluation.objects.filter(internship__student=user)
        if user.role in ['company_hr', 'mentor']:
            company = get_user_company(user)
            if company:
                return Evaluation.objects.filter(internship__company=company)
            return Evaluation.objects.none()
        if user.role == 'supervisor':
            return Evaluation.objects.filter(internship__supervisor=user)
        return Evaluation.objects.all()

    def perform_create(self, serializer):
        serializer.save(evaluator=self.request.user)


# ── DailyLogBook ──────────────────────────────────────────────────────────────

class DailyLogBookSerializer(serializers.ModelSerializer):
    student_name  = serializers.SerializerMethodField()
    company_name  = serializers.SerializerMethodField()
    hr_approved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = DailyLogBook
        fields = '__all__'
        read_only_fields = ['pdf_file', 'status', 'total_logs', 'total_hours',
                            'generated_at', 'hr_approved_by', 'hr_approved_at', 'created_at']

    def get_student_name(self, obj):  return obj.internship.student.get_full_name()
    def get_company_name(self, obj):  return obj.internship.company.name
    def get_hr_approved_by_name(self, obj):
        return obj.hr_approved_by.get_full_name() if obj.hr_approved_by else None


def _generate_logbook_pdf(logbook):
    """
    MALAKAVIY AMALIYOT DAFTARI — namunaga mos.
    Tarkib: muqova bet + talaba ma'lumotlari + reja-jadval + kundalik yozuvlar + xulosa.
    """
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import cm
    from reportlab.platypus import (SimpleDocTemplate, Table, TableStyle,
                                    Paragraph, Spacer, PageBreak, HRFlowable)
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
    import io

    internship = logbook.internship
    student    = internship.student
    company    = internship.company
    mentor     = internship.mentor
    supervisor = internship.supervisor
    logs       = DailyLog.objects.filter(internship=internship).order_by('date')
    prof       = getattr(student, 'student_profile', None)
    total_hours = sum(float(l.hours_worked) for l in logs)

    buf = io.BytesIO()
    doc_obj = SimpleDocTemplate(buf, pagesize=A4,
                                leftMargin=2*cm, rightMargin=1.5*cm,
                                topMargin=1.5*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()

    def sty(name, **kw):
        return ParagraphStyle(name, parent=styles['Normal'], **kw)

    bold_c = sty('bc', fontSize=14, fontName='Helvetica-Bold', alignment=TA_CENTER, spaceAfter=4)
    title  = sty('tt', fontSize=22, fontName='Helvetica-Bold', alignment=TA_CENTER, spaceBefore=8, spaceAfter=6)
    center = sty('c',  fontSize=11, alignment=TA_CENTER, spaceAfter=4)
    left_s = sty('ls', fontSize=10, alignment=TA_LEFT, spaceAfter=3, leading=16)
    bold_l = sty('bl', fontSize=10, fontName='Helvetica-Bold', alignment=TA_LEFT, spaceAfter=3)
    body   = sty('b',  fontSize=10, alignment=TA_JUSTIFY, leading=16, spaceAfter=4)
    small  = sty('sm', fontSize=9,  alignment=TA_LEFT, textColor=colors.HexColor('#374151'))

    story = []

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # 1-BET: MUQOVA
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    story.append(Paragraph("O'ZBEKISTON RESPUBLIKASI", bold_c))
    story.append(Paragraph("OLIY TA'LIM, FAN VA INNOVATSIYALAR VAZIRLIGI", bold_c))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph("TOSHKENT DAVLAT IQTISODIYOT UNIVERSITETI", bold_c))
    story.append(Spacer(1, 0.8*cm))

    # Yo'nalish va guruh
    dir_str    = (prof.direction or prof.department) if prof else "—"
    group_str  = prof.group   if prof and prof.group   else "—"
    course_str = f"{prof.course}" if prof and prof.course else "—"

    story.append(Paragraph(f'<b>"{dir_str}"</b>', center))
    story.append(Paragraph(
        f'bakalavriat ta\'lim yo\'nalishi {course_str}-kurs '
        f'<b>{group_str}</b> guruh talabasi',
        center
    ))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph(f'<b>{student.get_full_name()}</b>ning', center))
    story.append(Spacer(1, 0.4*cm))
    story.append(Paragraph("MALAKAVIY AMALIYOT", title))
    story.append(Paragraph("DAFTARI", title))
    story.append(Spacer(1, 1.5*cm))

    # Muqova pastki qism: 2 ustun jadval
    cover_box = Table(
        [[
            Paragraph(
                '<b>Kafedra tomonidan ro\'yxatga olingan</b><br/><br/>'
                'tartib raqami № ________<br/><br/>'
                '"____" _________ 202_-y.<br/><br/>'
                '_______________________<br/>(imzo)',
                sty('cb', fontSize=9, alignment=TA_LEFT, leading=14)
            ),
            Paragraph(
                '<b>Amaliyot yakuni bo\'yicha talabaning bahosi</b><br/><br/>'
                f'<b>{internship.final_grade or "___________"}</b> ball<br/><br/>'
                f'Amaliyot rahbari: {supervisor.get_full_name() if supervisor else "________________________"}<br/><br/>'
                '________________________<br/>(imzo)',
                sty('cb2', fontSize=9, alignment=TA_LEFT, leading=14)
            ),
        ]],
        colWidths=[8*cm, 8*cm]
    )
    cover_box.setStyle(TableStyle([
        ('BOX',      (0, 0), (0, 0), 0.8, colors.black),
        ('BOX',      (1, 0), (1, 0), 0.8, colors.black),
        ('VALIGN',   (0, 0), (-1, -1), 'TOP'),
        ('PADDING',  (0, 0), (-1, -1), 8),
    ]))
    story.append(cover_box)
    story.append(Spacer(1, 1*cm))

    import datetime
    story.append(Paragraph(f"Toshkent-{datetime.date.today().year}", center))
    story.append(PageBreak())

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # 2-BET: TALABA MA'LUMOTLARI
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    story.append(Paragraph(
        f'{course_str}-kurs <b>{group_str}</b> guruh talabasi '
        f'<u>{student.get_full_name()}</u>',
        left_s
    ))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph(
        f'<b>Amaliyot joyi</b> <u>{company.name}'
        f'{(" — " + company.address) if company.address else ""}</u>',
        left_s
    ))
    story.append(Spacer(1, 0.4*cm))
    story.append(HRFlowable(width='100%', thickness=0.5))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph(
        f'<b>Amaliyot o\'tash muddati:</b> {internship.start_date} dan {internship.end_date} gacha',
        left_s
    ))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph(
        f'<b>Universitetdan tayinlangan rahbar:</b> '
        f'{supervisor.get_full_name() if supervisor else "________________________"}',
        left_s
    ))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph(
        f'<b>Kafedra mudiri:</b> _________________ ',
        left_s
    ))
    story.append(HRFlowable(width='100%', thickness=0.5))
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph(
        f'Talaba <b>{student.get_full_name()}</b> {internship.start_date} da amaliyot joyiga keldi.',
        left_s
    ))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph(
        f'<b>Amaliyot o\'tash joyidan tayinlangan rahbar:</b> '
        f'{mentor.user.get_full_name() if mentor else "________________________"} ________',
        left_s
    ))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph(
        '<b>Korxona (muassasa, tashkilot) rahbari:</b> __________ ________________________',
        left_s
    ))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph('(muhr o\'rni)', sty('mo', fontSize=9, alignment=TA_CENTER)))
    story.append(PageBreak())

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # 3-BET: AMALIYOT O'TASH REJA-JADVALI
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    story.append(Paragraph("<b>AMALIYOT O'TASH REJA-JADVALI</b>", sty('rj', fontSize=12, fontName='Helvetica-Bold', alignment=TA_CENTER, spaceAfter=8)))

    total_days = (internship.end_date - internship.start_date).days + 1 if internship.start_date and internship.end_date else 0
    work_days = max(0, total_days - (total_days // 7) * 2)

    schedule_header = [
        ['No', 'Amaliyot ish joyi', 'Ish kunlari soni', ''],
        ['', '', 'Reja', 'Haqiqat'],
    ]
    schedule_rows = [
        ['1', "Korxona bilan tanishish va moslashish\nKorxona tuzilmasi, ichki qoidalar bilan tanishish", str(round(work_days * 0.13)), str(logs.filter(date__lte=internship.start_date + datetime.timedelta(days=10)).count() if internship.start_date else '')],
        ['2', "Tahlil va tadqiqot\nAmaliyot ob'ektidagi mavjud jarayonlar tahlili", str(round(work_days * 0.13)), ''],
        ['3', "Asosiy ishlar bajarish\nBiriktirilgan vazifalarni amalga oshirish", str(round(work_days * 0.27)), ''],
        ['4', "Korporativ tizimlar bilan ishlash\nTashkilot faoliyatiga hissa qo'shish", str(round(work_days * 0.27)), ''],
        ['5', "Tekshirish va takomillashtirish\nBajarilgan ishlarni baholash", str(round(work_days * 0.13)), ''],
        ['6', "Hisobot tayyorlash\nAmaliyot natijalari umumlashtiriladi", str(round(work_days * 0.07)), ''],
        ['', '<b>Jami</b>', f'<b>{work_days}</b>', f'<b>{logs.count()}</b>'],
    ]

    all_rows = [schedule_header[0], schedule_header[1]] + schedule_rows
    sched_tbl = Table(all_rows, colWidths=[1*cm, 10*cm, 2.5*cm, 2.5*cm], repeatRows=2)
    sched_tbl.setStyle(TableStyle([
        ('SPAN',          (1, 0), (1, 1)),
        ('SPAN',          (0, 0), (0, 1)),
        ('SPAN',          (2, 0), (3, 0)),
        ('BACKGROUND',    (0, 0), (-1, 1), colors.HexColor('#1e293b')),
        ('TEXTCOLOR',     (0, 0), (-1, 1), colors.white),
        ('FONTNAME',      (0, 0), (-1, 1), 'Helvetica-Bold'),
        ('FONTSIZE',      (0, 0), (-1, -1), 9),
        ('ALIGN',         (0, 0), (-1, -1), 'CENTER'),
        ('ALIGN',         (1, 2), (1, -1), 'LEFT'),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID',          (0, 0), (-1, -1), 0.5, colors.HexColor('#94a3b8')),
        ('ROWBACKGROUNDS',(0, 2), (-1, -2), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING',    (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(sched_tbl)
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph(
        f'<b>Universitetdan tayinlangan rahbar</b> '
        f'{supervisor.get_full_name() if supervisor else "________________________"} ________',
        left_s
    ))
    story.append(Paragraph(
        f'<b>Amaliyot o\'tash joyidan tayinlangan rahbar</b> '
        f'{mentor.user.get_full_name() if mentor else "________________________"} ________',
        left_s
    ))
    story.append(PageBreak())

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # KUNDALIK YOZUVLAR (har bir log alohida bo'lim)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    story.append(Paragraph("<b>KUNDALIK YOZUVLAR</b>", sty('ky', fontSize=12, fontName='Helvetica-Bold', alignment=TA_CENTER, spaceAfter=8)))
    story.append(HRFlowable(width='100%', thickness=1, color=colors.HexColor('#1e293b')))
    story.append(Spacer(1, 0.3*cm))

    for idx, log in enumerate(logs, 1):
        story.append(Paragraph(
            f'<b>{idx}-kun. {log.date} ({log.hours_worked} soat)</b>',
            sty('kd', fontSize=10, fontName='Helvetica-Bold', spaceAfter=4)
        ))
        story.append(Paragraph(log.description, body))
        # Rahbar izohi
        if log.mentor_comment:
            story.append(Paragraph(
                f'Mentor izohi: {log.mentor_comment}',
                sty('mi', fontSize=9, textColor=colors.HexColor('#374151'), spaceAfter=2)
            ))
        # Tasdiq holati
        status_text = []
        if log.approved_by_mentor:     status_text.append('Mentor tasdiqladi')
        if log.approved_by_supervisor: status_text.append('Rahbar tasdiqladi')
        if status_text:
            story.append(Paragraph(' | '.join(status_text), sty('st', fontSize=8, textColor=colors.HexColor('#16a34a'), spaceAfter=2)))
        story.append(Paragraph(
            'Korxona (muassasa, tashkilot) rahbari ________________________ ________',
            sty('kr', fontSize=9, spaceAfter=8)
        ))
        story.append(HRFlowable(width='100%', thickness=0.3, color=colors.HexColor('#e2e8f0')))
        story.append(Spacer(1, 0.2*cm))

    story.append(PageBreak())

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # YAKUNIY XULOSA (korxona rahbari)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    story.append(Paragraph(
        'Malakaviy amaliyotni o\'tashi bo\'yicha amaliyot obyektidan biriktirilgan rahbar',
        sty('yt', fontSize=10, alignment=TA_CENTER, spaceAfter=2)
    ))
    story.append(Paragraph("<b>YAKUNIY XULOSA</b>", sty('yx', fontSize=13, fontName='Helvetica-Bold', alignment=TA_CENTER, spaceAfter=10)))

    story.append(Paragraph(
        f'{course_str}-kurs {group_str} guruh talabasi '
        f'<u>{student.get_full_name()}</u>',
        left_s
    ))
    story.append(Paragraph(
        f'{internship.start_date} dan {internship.end_date} gacha',
        left_s
    ))
    story.append(Paragraph(
        f'<u>{company.name}</u>da malakaviy amaliyotni o\'tadi.',
        left_s
    ))
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph(
        f'Jami bajarilgan ish: {total_hours:.0f} soat, {logs.count()} ta kundalik yozuv.',
        left_s
    ))
    story.append(Spacer(1, 5*cm))  # Xulosa uchun joy

    story.append(Paragraph(
        f'<b>Amaliyot o\'tash joyidan tayinlangan rahbar</b> '
        f'{mentor.user.get_full_name() if mentor else "________________________"}',
        left_s
    ))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph(
        'Korxona (muassasa, tashkilot) rahbari ________________________ ________',
        left_s
    ))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph('(muhr o\'rni)', sty('m2', fontSize=9, alignment=TA_CENTER)))

    doc_obj.build(story)
    buf.seek(0)
    return buf


class DailyLogBookViewSet(viewsets.ModelViewSet):
    serializer_class = DailyLogBookSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'student':
            return DailyLogBook.objects.filter(internship__student=user)
        if user.role in ['company_hr', 'mentor']:
            company = get_user_company(user)
            if company:
                return DailyLogBook.objects.filter(internship__company=company)
            return DailyLogBook.objects.none()
        if user.role == 'supervisor':
            return DailyLogBook.objects.filter(internship__supervisor=user)
        if user.role == 'kafedra':
            try:
                dept = user.kafedra_profile.department
                return DailyLogBook.objects.filter(
                    internship__student__student_profile__department=dept)
            except Exception:
                return DailyLogBook.objects.none()
        return DailyLogBook.objects.all()

    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Talaba: o'z kundalik daftarini PDF sifatida yaratadi."""
        internship_id = request.data.get('internship_id')
        if not internship_id:
            return Response({'error': 'internship_id majburiy'}, status=400)
        try:
            internship = Internship.objects.get(id=internship_id, student=request.user)
        except Internship.DoesNotExist:
            return Response({'error': 'Amaliyot topilmadi'}, status=404)

        logs = DailyLog.objects.filter(internship=internship)
        if not logs.exists():
            return Response({'error': 'Hali kundalik yozilmagan'}, status=400)

        logbook, _ = DailyLogBook.objects.get_or_create(internship=internship)
        logbook.status     = DailyLogBook.Status.PENDING
        logbook.total_logs = logs.count()
        logbook.total_hours = sum(float(l.hours_worked) for l in logs)
        logbook.generated_at = timezone.now()
        logbook.save()

        # PDF yaratish
        buf = _generate_logbook_pdf(logbook)
        from django.core.files.base import ContentFile
        filename = f"logbook_{internship.student.id}_{internship.id}.pdf"
        logbook.pdf_file.save(filename, ContentFile(buf.read()), save=True)

        return Response(DailyLogBookSerializer(logbook).data, status=201)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """PDF faylni yuklab olish."""
        logbook = self.get_object()
        if not logbook.pdf_file:
            return Response({'error': 'PDF hali yaratilmagan'}, status=404)
        try:
            return FileResponse(
                logbook.pdf_file.open('rb'),
                as_attachment=True,
                filename=f"kundalik_daftar_{logbook.internship.student.get_full_name()}.pdf"
            )
        except Exception:
            raise Http404

    @action(detail=True, methods=['post'])
    def hr_approve(self, request, pk=None):
        """Korxona HR kundalik daftarni tasdiqlaydi."""
        if request.user.role != 'company_hr':
            return Response({'error': 'Faqat korxona HR tasdiqlaydi'}, status=403)
        logbook = self.get_object()
        if logbook.status != DailyLogBook.Status.PENDING:
            return Response({'error': 'Daftar tasdiqlanishga tayyor emas'}, status=400)
        logbook.status         = DailyLogBook.Status.APPROVED
        logbook.hr_approved_by = request.user
        logbook.hr_approved_at = timezone.now()
        logbook.hr_note        = request.data.get('note', '')
        logbook.save()
        return Response({'message': 'Kundalik daftar tasdiqlandi'})

    @action(detail=True, methods=['post'])
    def hr_reject(self, request, pk=None):
        """Korxona HR rad etadi — talaba qayta yuborishi kerak."""
        if request.user.role != 'company_hr':
            return Response({'error': 'Faqat korxona HR rad etadi'}, status=403)
        logbook = self.get_object()
        logbook.status  = DailyLogBook.Status.REJECTED
        logbook.hr_note = request.data.get('note', '')
        logbook.save()
        return Response({'message': 'Rad etildi. Talaba qayta yuborishi kerak.'})
