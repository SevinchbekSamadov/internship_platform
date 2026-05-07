from django.db import models
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Count, Avg
from apps.users.models import User
from apps.internships.models import Internship


# ── Model ─────────────────────────────────────────────────────────────────────

class Report(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Qoralama'
        SUBMITTED = 'submitted', 'Yuborildi'
        APPROVED = 'approved', 'Tasdiqlandi'
        REJECTED = 'rejected', 'Rad etildi'

    internship = models.OneToOneField(Internship, on_delete=models.CASCADE, related_name='report')
    title = models.CharField(max_length=200)
    content = models.TextField()
    file = models.FileField(upload_to='reports/', null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    grade = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    reviewer_comment = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                     related_name='reviewed_reports')
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    # Kafedra dual-approval
    kafedra_approved = models.BooleanField(default=False, null=True)
    kafedra_reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                             related_name='kafedra_reviewed_reports')
    kafedra_reviewed_at = models.DateTimeField(null=True, blank=True)
    kafedra_comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Hisobot'
        ordering = ['-created_at']

    def __str__(self):
        return f"Hisobot: {self.internship.student.get_full_name()}"


# ── Serializer ────────────────────────────────────────────────────────────────

class ReportSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()
    kafedra_reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = '__all__'
        read_only_fields = ['status', 'reviewed_by', 'submitted_at', 'reviewed_at', 'created_at',
                            'kafedra_approved', 'kafedra_reviewed_by', 'kafedra_reviewed_at']

    def get_student_name(self, obj): return obj.internship.student.get_full_name()
    def get_company_name(self, obj): return obj.internship.company.name
    def get_reviewed_by_name(self, obj): return obj.reviewed_by.get_full_name() if obj.reviewed_by else None
    def get_kafedra_reviewed_by_name(self, obj):
        return obj.kafedra_reviewed_by.get_full_name() if obj.kafedra_reviewed_by else None


# ── PDF generatsiya ───────────────────────────────────────────────────────────

def _generate_report_pdf(report):
    """
    Talabaning yakuniy amaliyot hisobotini ko'p betli PDF sifatida yaratadi.
    Tarkib: muqova, talaba ma'lumotlari, amaliyot muddati,
            hisobot matni, bajarilgan vazifalar, davomat, baho.
    """
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import cm
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        PageBreak, HRFlowable,
    )
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
    import io

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2.5*cm, rightMargin=2.5*cm,
        topMargin=2*cm, bottomMargin=2.2*cm,
        title=report.title,
        author=report.internship.student.get_full_name(),
    )
    styles = getSampleStyleSheet()

    def sty(name, **kw):
        return ParagraphStyle(name, parent=styles['Normal'], **kw)

    h1     = sty('H1', fontSize=16, fontName='Helvetica-Bold', alignment=TA_CENTER, spaceAfter=6, spaceBefore=4)
    h2     = sty('H2', fontSize=13, fontName='Helvetica-Bold', spaceAfter=6, spaceBefore=10, textColor=colors.HexColor('#1e293b'))
    h3s    = sty('H3', fontSize=11, fontName='Helvetica-Bold', spaceAfter=4, spaceBefore=8)
    center = sty('C',  fontSize=10, alignment=TA_CENTER, spaceAfter=3)
    body   = sty('B',  fontSize=10, alignment=TA_JUSTIFY, spaceAfter=4, leading=16)
    small  = sty('S',  fontSize=9,  textColor=colors.HexColor('#64748b'), spaceAfter=3)
    label  = sty('L',  fontSize=9,  fontName='Helvetica-Bold', textColor=colors.HexColor('#374151'))

    internship = report.internship
    student    = internship.student
    company    = internship.company
    prof       = getattr(student, 'student_profile', None)

    start = internship.start_date
    end   = internship.end_date
    total_days = (end - start).days + 1 if start and end else 0
    work_days  = max(0, total_days - (total_days // 7) * 2)

    # Kundaliklar
    from apps.internships.models import DailyLog, Task, Evaluation
    from apps.attendance.models import Attendance
    logs   = DailyLog.objects.filter(internship=internship).order_by('date')
    tasks  = Task.objects.filter(internship=internship)
    att    = Attendance.objects.filter(internship=internship)
    evals  = Evaluation.objects.filter(internship=internship)

    total_hours  = sum(float(l.hours_worked) for l in logs)
    done_tasks   = tasks.filter(status__in=['done', 'approved']).count()
    present_days = att.filter(status='present').count()
    absent_days  = att.filter(status='absent').count()

    story = []

    # ── MUQOVA ───────────────────────────────────────────────────────────────
    story.append(Spacer(1, 1*cm))
    story.append(Paragraph("O'ZBEKISTON RESPUBLIKASI OLIY TA'LIM,", center))
    story.append(Paragraph("FAN VA INNOVATSIYALAR VAZIRLIGI", center))
    story.append(Paragraph("TDIU — Toshkent Davlat Iqtisodiyot Universiteti", center))
    story.append(Spacer(1, 1.5*cm))
    story.append(HRFlowable(width='100%', thickness=2, color=colors.HexColor('#1e293b')))
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph("AMALIYOT HISOBOTI", h1))
    story.append(Spacer(1, 0.4*cm))
    story.append(HRFlowable(width='100%', thickness=2, color=colors.HexColor('#1e293b')))
    story.append(Spacer(1, 1.5*cm))

    # Muqova ma'lumotlar jadvali
    cover_data = [
        ['Talaba:', student.get_full_name()],
        ['Guruh:', prof.group if prof else '—'],
        ['Yunalish:', (prof.direction or prof.department) if prof else '—'],
        ['Korxona:', company.name],
        ['Lavozim:', internship.position],
        ['Amaliyot boshlanishi:', str(start)],
        ['Amaliyot tugashi:', str(end)],
        ['Jami muddati:', f'{total_days} kun ({work_days} ish kuni)'],
        ['Amaliyot Rahbar:', internship.supervisor.get_full_name() if internship.supervisor else '—'],
        ['Mentor:', internship.mentor.user.get_full_name() if internship.mentor else '—'],
    ]
    cover_tbl = Table(cover_data, colWidths=[5.5*cm, 10*cm])
    cover_tbl.setStyle(TableStyle([
        ('FONTNAME',      (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE',      (0, 0), (-1, -1), 10),
        ('TOPPADDING',    (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW',     (0, 0), (-1, -1), 0.3, colors.HexColor('#e2e8f0')),
        ('TEXTCOLOR',     (0, 0), (0, -1), colors.HexColor('#374151')),
    ]))
    story.append(cover_tbl)
    story.append(Spacer(1, 2*cm))

    # Imzo
    import datetime
    sign_data = [[
        Paragraph(f'Toshkent, {datetime.date.today().strftime("%d.%m.%Y")} yil', small),
    ]]
    story.append(Table(sign_data, colWidths=[16*cm]))
    story.append(PageBreak())

    # ── KIRISH ────────────────────────────────────────────────────────────────
    story.append(Paragraph("1. KIRISH", h2))
    story.append(HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#e2e8f0')))
    story.append(Spacer(1, 0.3*cm))

    intro = (
        f"Ushbu hisobot <b>{student.get_full_name()}</b> tomonidan "
        f"<b>{company.name}</b> korxonasida o'tkazilgan "
        f"amaliyoti natijalari asosida tayyorlangan.<br/><br/>"
        f"Amaliyot muddati: <b>{start}</b> dan <b>{end}</b> gacha, "
        f"jami <b>{total_days} kun</b> ({work_days} ish kuni). "
        f"Amaliyot davomida jami <b>{total_hours:.0f} soat</b> ish bajarildi. "
        f"Bajarilgan vazifalar soni: <b>{done_tasks}</b> ta."
    )
    story.append(Paragraph(intro, body))
    story.append(Spacer(1, 0.5*cm))

    # ── ASOSIY HISOBOT MATNI ──────────────────────────────────────────────────
    story.append(Paragraph(f"2. {report.title.upper()}", h2))
    story.append(HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#e2e8f0')))
    story.append(Spacer(1, 0.3*cm))

    # Matnni bo'laklarga bo'lib chiqish (har xil mavzu uchun)
    paragraphs = [p.strip() for p in report.content.split('\n') if p.strip()]
    for i, para in enumerate(paragraphs):
        if para.startswith(('1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.')):
            story.append(Paragraph(para, h3s))
        else:
            story.append(Paragraph(para, body))

    story.append(Spacer(1, 0.5*cm))

    # ── AMALIYOT STATISTIKASI ─────────────────────────────────────────────────
    story.append(Paragraph("3. AMALIYOT STATISTIKASI", h2))
    story.append(HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#e2e8f0')))
    story.append(Spacer(1, 0.3*cm))

    stat_data = [
        ['Ko\'rsatkich', 'Qiymat'],
        ['Jami amaliyot muddati', f'{total_days} kun'],
        ['Ish kunlari soni', f'{work_days} kun'],
        ['Jami ishlangan soat', f'{total_hours:.0f} soat'],
        ['Yozilgan kundaliklar', f'{logs.count()} ta'],
        ['Bajarilgan vazifalar', f'{done_tasks} / {tasks.count()} ta'],
        ['Kelgan kunlar', f'{present_days} kun'],
        ['Kelmagan kunlar', f'{absent_days} kun'],
        ['Davomat foizi', f'{round(present_days / work_days * 100) if work_days else 0}%'],
    ]
    stat_tbl = Table(stat_data, colWidths=[9*cm, 6*cm])
    stat_tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, 0), colors.HexColor('#1e293b')),
        ('TEXTCOLOR',     (0, 0), (-1, 0), colors.white),
        ('FONTNAME',      (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME',      (0, 1), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE',      (0, 0), (-1, -1), 10),
        ('ROWBACKGROUNDS',(0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
        ('GRID',          (0, 0), (-1, -1), 0.4, colors.HexColor('#e2e8f0')),
        ('TOPPADDING',    (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING',   (0, 0), (-1, -1), 8),
    ]))
    story.append(stat_tbl)
    story.append(Spacer(1, 0.5*cm))

    # ── BAHOLAR ───────────────────────────────────────────────────────────────
    if report.grade or internship.mentor_grade or internship.final_grade:
        story.append(Paragraph("4. BAHOLAR", h2))
        story.append(HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#e2e8f0')))
        story.append(Spacer(1, 0.3*cm))

        grade_data = [['Baholovchi', 'Ball', 'Izoh']]
        if internship.mentor_grade:
            mentor_name = internship.mentor.user.get_full_name() if internship.mentor else 'Mentor'
            grade_data.append([mentor_name, str(internship.mentor_grade), 'Mentor bahosi'])
        if internship.supervisor_grade:
            sup_name = internship.supervisor.get_full_name() if internship.supervisor else 'Rahbar'
            grade_data.append([sup_name, str(internship.supervisor_grade), 'Amaliyot rahbar bahosi'])
        if internship.final_grade:
            letter = {'5':"A'lo",'4':'Yaxshi','3':'Qoniqarli','2':'Qoniqarsiz'}.get(internship.final_grade_letter,'')
            grade_data.append(['Yakuniy baho', f'{internship.final_grade} ({internship.final_grade_letter} — {letter})', ''])
        if report.grade:
            grade_data.append(['Hisobot bahosi', str(report.grade), report.reviewer_comment or ''])

        grade_tbl = Table(grade_data, colWidths=[6*cm, 3*cm, 6*cm])
        grade_tbl.setStyle(TableStyle([
            ('BACKGROUND',    (0, 0), (-1, 0), colors.HexColor('#1e293b')),
            ('TEXTCOLOR',     (0, 0), (-1, 0), colors.white),
            ('FONTNAME',      (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE',      (0, 0), (-1, -1), 10),
            ('GRID',          (0, 0), (-1, -1), 0.4, colors.HexColor('#e2e8f0')),
            ('ROWBACKGROUNDS',(0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
            ('TOPPADDING',    (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING',   (0, 0), (-1, -1), 8),
        ]))
        story.append(grade_tbl)
        story.append(Spacer(1, 0.5*cm))

    # ── XULOSA ────────────────────────────────────────────────────────────────
    next_section = '5' if (report.grade or internship.mentor_grade or internship.final_grade) else '4'
    story.append(Paragraph(f"{next_section}. XULOSA", h2))
    story.append(HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#e2e8f0')))
    story.append(Spacer(1, 0.3*cm))
    conclusion = (
        f"Ishlab chiqarish amaliyoti muvaffaqiyatli yakunlandi. "
        f"Amaliyot davomida <b>{company.name}</b> korxonasida "
        f"<b>{internship.position}</b> lavozimida {work_days} kun ish bajarildi. "
        f"Jami {total_hours:.0f} soat ish vaqti sarflandi, "
        f"{done_tasks} ta vazifa bajarildi va {logs.count()} ta kundalik yozuv kiritildi."
    )
    story.append(Paragraph(conclusion, body))
    story.append(Spacer(1, 1.5*cm))

    # ── IMZO JOYLARI ──────────────────────────────────────────────────────────
    sign_rows = [[
        Paragraph('<b>Talaba:</b><br/><br/>________________<br/>'
                  f'<font size="8">{student.get_full_name()}</font>', body),
        Paragraph('<b>Amaliyot Rahbar:</b><br/><br/>________________<br/>'
                  f'<font size="8">{internship.supervisor.get_full_name() if internship.supervisor else "—"}</font>', body),
        Paragraph('<b>Dekanat:</b><br/><br/>________________<br/>'
                  '<font size="8">(muhur va imzo)</font>', body),
    ]]
    sign_tbl = Table(sign_rows, colWidths=[5*cm, 5.5*cm, 5*cm])
    sign_tbl.setStyle(TableStyle([
        ('VALIGN',    (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING',(0, 0), (-1, -1), 6),
    ]))
    story.append(sign_tbl)

    doc.build(story)
    buf.seek(0)
    return buf


# ── View ──────────────────────────────────────────────────────────────────────

class ReportViewSet(viewsets.ModelViewSet):
    serializer_class = ReportSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'student':
            return Report.objects.filter(internship__student=user)
        if user.role == 'supervisor':
            return Report.objects.filter(internship__supervisor=user)
        if user.role == 'kafedra':
            try:
                dept = user.kafedra_profile.department
                return Report.objects.filter(internship__student__student_profile__department=dept)
            except Exception:
                return Report.objects.none()
        if user.role in ['company_hr', 'mentor']:
            from apps.companies.models import Company
            try:
                if user.role == 'company_hr':
                    company = Company.objects.get(hr_user=user)
                else:
                    company = user.mentor_profile.company
                return Report.objects.filter(internship__company=company)
            except Exception:
                return Report.objects.none()
        return Report.objects.all()

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Talaba hisobotni yuboradi"""
        report = self.get_object()
        report.status = Report.Status.SUBMITTED
        report.submitted_at = timezone.now()
        report.save()
        return Response({'message': 'Hisobot yuborildi'})

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Ilmiy rahbar tasdiqlaydi"""
        report = self.get_object()
        report.status = Report.Status.APPROVED
        report.grade = request.data.get('grade')
        report.reviewer_comment = request.data.get('comment', '')
        report.reviewed_by = request.user
        report.reviewed_at = timezone.now()
        report.save()
        return Response({'message': 'Hisobot tasdiqlandi'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Amaliyot rahbar rad etadi"""
        report = self.get_object()
        report.status = Report.Status.REJECTED
        report.reviewer_comment = request.data.get('comment', '')
        report.reviewed_by = request.user
        report.reviewed_at = timezone.now()
        report.save()
        return Response({'message': 'Rad etildi'})

    @action(detail=True, methods=['post'])
    def kafedra_approve(self, request, pk=None):
        """Kafedra hisobotni tasdiqlaydi (dual-approval)"""
        report = self.get_object()
        if report.status != Report.Status.SUBMITTED:
            return Response({'error': 'Faqat yuborilgan hisobotni tasdiqlash mumkin'}, status=400)
        report.kafedra_approved = True
        report.kafedra_reviewed_by = request.user
        report.kafedra_reviewed_at = timezone.now()
        report.kafedra_comment = request.data.get('comment', '')
        # Agar amaliyot rahbar ham tasdiqlagan bo'lsa — to'liq tasdiqlash
        if report.reviewed_by is not None:
            report.status = Report.Status.APPROVED
        report.save()
        return Response({'message': 'Kafedra hisobotni tasdiqladi'})

    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        """Hisobotni PDF sifatida yuklab olish."""
        from django.http import HttpResponse
        report = self.get_object()
        buf = _generate_report_pdf(report)
        response = HttpResponse(buf.read(), content_type='application/pdf')
        name = report.internship.student.get_full_name().replace(' ', '_')
        response['Content-Disposition'] = (
            f'attachment; filename="hisobot_{name}.pdf"'
        )
        return response

    @action(detail=True, methods=['post'])
    def kafedra_reject(self, request, pk=None):
        """Kafedra hisobotni rad etadi"""
        report = self.get_object()
        report.kafedra_approved = False
        report.kafedra_reviewed_by = request.user
        report.kafedra_reviewed_at = timezone.now()
        report.kafedra_comment = request.data.get('comment', '')
        report.status = Report.Status.REJECTED
        report.save()
        return Response({'message': 'Kafedra hisobotni rad etdi'})

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Umumiy statistika — Admin/Dekanat"""
        from apps.attendance.models import Attendance
        total = Internship.objects.count()
        active = Internship.objects.filter(status='active').count()
        completed = Internship.objects.filter(status='completed').count()
        avg_grade = Internship.objects.filter(
            final_grade__isnull=False
        ).aggregate(avg=Avg('final_grade'))['avg'] or 0

        return Response({
            'internships': {'total': total, 'active': active, 'completed': completed},
            'avg_grade': round(float(avg_grade), 1),
            'reports_submitted': Report.objects.filter(status='submitted').count(),
            'reports_approved': Report.objects.filter(status='approved').count(),
        })
