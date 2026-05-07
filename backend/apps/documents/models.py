import uuid
import qrcode
import io
from django.db import models
from django.core.files.base import ContentFile
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from apps.users.models import User
from apps.companies.models import Company, Mentor
from apps.internships.models import Application, Internship


# ── Model ─────────────────────────────────────────────────────────────────────

class CompanyOrder(models.Model):
    """Korxonaning ichki buyrug'i — universitetga yuboriladi."""
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Qoralama'
        SENT  = 'sent',  'Universitetga yuborildi'

    internship = models.ForeignKey(Internship, on_delete=models.CASCADE,
                                   related_name='company_orders')
    company    = models.ForeignKey(Company, on_delete=models.CASCADE,
                                   related_name='orders')
    pdf_file   = models.FileField(upload_to='buyruqlar/', null=True, blank=True)
    status     = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE,
                                   related_name='created_orders')
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at    = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Korxona buyrug\'i'
        ordering = ['-created_at']

    def __str__(self):
        return f"Buyruq: {self.company.name} — {self.internship.student.get_full_name()}"


class Document(models.Model):
    class Status(models.TextChoices):
        DRAFT            = 'draft',             'Qoralama'
        DEKAN_APPROVED   = 'dekan_approved',    'Dekanat tasdiqladi'
        SENT             = 'sent',              'Korxonaga yuborildi'
        COMPANY_ACCEPTED = 'company_accepted',  'Korxona qabul qildi'
        REJECTED         = 'rejected',          'Rad etildi'

    unique_id   = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    internship  = models.OneToOneField(Internship, on_delete=models.CASCADE,
                                       related_name='document', null=True, blank=True)
    student     = models.ForeignKey(User, on_delete=models.CASCADE, related_name='documents')
    company     = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='documents')
    status      = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    qr_code     = models.ImageField(upload_to='qr_codes/', null=True, blank=True)
    created_by  = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_docs')
    created_at  = models.DateTimeField(auto_now_add=True)
    sent_at     = models.DateTimeField(null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    reject_note = models.TextField(blank=True)

    class Meta:
        verbose_name = "Yo'llanma"
        ordering = ['-created_at']

    def __str__(self):
        return f"Yo'llanma #{self.unique_id} — {self.student.get_full_name()}"

    def generate_qr(self):
        url = f"http://localhost:8000/api/documents/verify/{self.unique_id}/"
        qr = qrcode.QRCode(version=1, box_size=8, border=4)
        qr.add_data(url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        buf.seek(0)
        self.qr_code.save(f'qr_{self.unique_id}.png', ContentFile(buf.read()), save=True)


# ── Serializer ────────────────────────────────────────────────────────────────

class DocumentSerializer(serializers.ModelSerializer):
    student_name   = serializers.SerializerMethodField()
    student_group  = serializers.SerializerMethodField()
    company_name   = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    internship_data = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = '__all__'
        read_only_fields = ['unique_id', 'created_by', 'qr_code',
                            'created_at', 'sent_at', 'accepted_at']

    def get_student_name(self, obj):   return obj.student.get_full_name()
    def get_company_name(self, obj):   return obj.company.name
    def get_status_display(self, obj): return obj.get_status_display()
    def get_student_group(self, obj):
        try: return obj.student.student_profile.group
        except Exception: return None

    def get_internship_data(self, obj):
        if obj.internship:
            i = obj.internship
            return {
                'id': i.id,
                'position': i.position,
                'start_date': str(i.start_date),
                'end_date':   str(i.end_date),
                'status': i.status,
                'mentor_name': i.mentor.user.get_full_name() if i.mentor else None,
                'mentor_phone': i.mentor.user.phone if i.mentor else None,
                'supervisor_name': i.supervisor.get_full_name() if i.supervisor else None,
                'supervisor_phone': i.supervisor.phone if i.supervisor else None,
            }
        return None


# ── PDF generatsiya ───────────────────────────────────────────────────────────

def _generate_yollanma_pdf(doc):
    """
    Rasmiy YO'LLANMA — TDIU rektor nomidan korxona rahbariga xat.
    Namuna formati: rektorning rasmiy xati + ilova jadvali.
    """
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import cm
    from reportlab.platypus import (SimpleDocTemplate, Table, TableStyle,
                                    Paragraph, Spacer, Image as RLImage,
                                    HRFlowable, PageBreak)
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
    import io, os, datetime

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # TDIU rasmiy xat formati (namunaga mos)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    buf = io.BytesIO()
    doc_obj = SimpleDocTemplate(buf, pagesize=A4,
                                leftMargin=2.5*cm, rightMargin=2*cm,
                                topMargin=1.5*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()

    def sty(name, **kw):
        return ParagraphStyle(name, parent=styles['Normal'], **kw)

    bold_c  = sty('bc', fontSize=12, fontName='Helvetica-Bold', alignment=TA_CENTER, spaceAfter=4)
    right_s = sty('rs', fontSize=10, fontName='Helvetica-Bold', alignment=TA_RIGHT, spaceAfter=2)
    right_n = sty('rn', fontSize=10, alignment=TA_RIGHT, spaceAfter=2)
    italic  = sty('it', fontSize=10, fontName='Helvetica-Oblique', spaceAfter=4)
    body    = sty('b',  fontSize=11, alignment=TA_JUSTIFY, spaceAfter=6, leading=18, firstLineIndent=1*cm)
    left_s  = sty('ls', fontSize=10, alignment=TA_LEFT, spaceAfter=3)
    small   = sty('sm', fontSize=8,  textColor=colors.gray, alignment=TA_LEFT)

    student    = doc.student
    company    = doc.company
    internship = doc.internship
    prof       = getattr(student, 'student_profile', None)
    today      = doc.created_at.strftime('%d.%m.%Y') if doc.created_at else datetime.date.today().strftime('%d.%m.%Y')
    doc_num    = f"01-03/5-{str(doc.unique_id).replace('-','')[:4].upper()}-sonli {today}"

    story = []

    # ── TDIU sarlavhasi (yuqori qism ikki ustun: logo joyi | manzil) ──
    header_data = [[
        Paragraph(
            "<b>TOSHKENT DAVLAT IQTISODIYOT UNIVERSITETI</b><br/>"
            "<font size='8'>KELAJAK BUNYODKORLARI</font>",
            sty('hl', fontSize=11, fontName='Helvetica-Bold')
        ),
        Paragraph(
            "100066, Toshkent shahar, Islom Karimov ko'chasi, 49<br/>"
            "info@tsue.uz; www.tsue.uz<br/>"
            "Tel.: (+99871) 239-28-09; 239-01-49; 239-27-23<br/>"
            "Faks: (+99871) 239-41-23",
            sty('hr', fontSize=8, textColor=colors.HexColor('#444444'))
        ),
    ]]
    header_tbl = Table(header_data, colWidths=[9*cm, 7*cm])
    header_tbl.setStyle(TableStyle([
        ('VALIGN',       (0, 0), (-1, -1), 'MIDDLE'),
        ('LINEBELOW',    (0, 0), (-1, -1), 1.5, colors.HexColor('#1e293b')),
        ('TOPPADDING',   (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING',(0, 0), (-1, -1), 8),
    ]))
    story.append(header_tbl)
    story.append(Spacer(1, 0.4*cm))

    # ── Hujjat raqami (kursiv, chap) ──
    story.append(Paragraph(f"<i>{doc_num}</i>", italic))
    story.append(Spacer(1, 0.5*cm))

    # ── Qabul qiluvchi (o'ng, qalin) ──
    story.append(Paragraph(f"<b>{company.name}</b>", right_s))
    story.append(Paragraph(f"Rahbariga", right_n))
    story.append(Spacer(1, 0.8*cm))

    # ── Murojaat ──
    story.append(Paragraph("Hurmatli rahbar,", italic))
    story.append(Spacer(1, 0.3*cm))

    # ── Asosiy matn ──
    course_str = f"{prof.course}-kurs" if prof and prof.course else "kurs"
    group_str  = prof.group if prof and prof.group else "—"
    dir_str    = (prof.direction or prof.department) if prof else "—"
    start      = str(internship.start_date) if internship else "—"
    end        = str(internship.end_date)   if internship else "—"

    text = (
        f"O'zbekiston Respublikasining \"Ta'lim to'g'risida\"gi Qonuni, O'zbekiston "
        f"Respublikasi Prezidentining 2019-yil 8-oktabrdagi \"O'zbekiston Respublikasi oliy ta'lim "
        f"tizimini 2030-yilgacha rivojlantirish konsepsiyasini tasdiqlash to'g'risida\"gi "
        f"PF-5847-sonli Farmoni hamda O'zbekiston Respublikasi Oliy ta'lim, fan va "
        f"innovatsiyalar vazirligining 2003-yil 9-yanvardagi 9-sonli buyrug'i bilan tasdiqlangan "
        f"\"Oliy ta'lim to'g'risida\"gi nizomning 6-bo'limi 35 va 37-bandlariga asosan "
        f"<b>{course_str} {group_str} guruh</b> talabasi "
        f"<b>{student.get_full_name()}</b>ning malakaviy amaliyotini "
        f"<b>{start}</b>dan <b>{end}</b>gacha "
        f"<b>{company.name}</b>da o'tashiga amaliy yordam ko'rsatishingizni so'raymiz."
    )
    story.append(Paragraph(text, body))
    story.append(Spacer(1, 1*cm))

    # ── Imzo bloki ──
    qr_cell = ''
    if doc.qr_code and os.path.exists(doc.qr_code.path):
        qr_cell = RLImage(doc.qr_code.path, width=2.5*cm, height=2.5*cm)

    sign_data = [[
        Paragraph("Hurmat bilan,<br/><b>rektor</b>", left_s),
        qr_cell if qr_cell else '',
        Paragraph("<b>T. Teshabayev</b>", sty('rr', fontSize=10, fontName='Helvetica-Bold', alignment=TA_RIGHT)),
    ]]
    sign_tbl = Table(sign_data, colWidths=[5*cm, 4*cm, 7*cm])
    sign_tbl.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN',  (2, 0), (2, -1), 'RIGHT'),
    ]))
    story.append(sign_tbl)
    story.append(Spacer(1, 0.8*cm))

    # ── Ijrochi ──
    story.append(Paragraph(f"Ijrochi: {doc.created_by.get_full_name() if doc.created_by else '—'}", small))
    story.append(Spacer(1, 1.5*cm))

    # ── ILOVA: talaba jadvali ──
    story.append(Paragraph("<b>Ilova</b>", sty('il', fontSize=10, fontName='Helvetica-Bold', alignment=TA_RIGHT)))
    story.append(Spacer(1, 0.3*cm))

    ilova_header = ['No', 'Talaba F.I.Sh.', 'Kurs', 'Guruh', "Malakaviy amaliyot o'tash joyi"]
    pos = internship.position if internship else '—'
    ilova_rows = [
        ilova_header,
        ['1', student.get_full_name(), course_str, group_str,
         f"{company.name}{chr(10) + company.address if company.address else ''}"]
    ]
    ilova_tbl = Table(ilova_rows, colWidths=[1*cm, 5*cm, 1.8*cm, 2.2*cm, 6*cm])
    ilova_tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, 0), colors.HexColor('#1e293b')),
        ('TEXTCOLOR',     (0, 0), (-1, 0), colors.white),
        ('FONTNAME',      (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE',      (0, 0), (-1, -1), 9),
        ('ALIGN',         (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID',          (0, 0), (-1, -1), 0.5, colors.HexColor('#94a3b8')),
        ('ROWBACKGROUNDS',(0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING',    (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(ilova_tbl)

    doc_obj.build(story)
    buf.seek(0)
    return buf


def _generate_buyruq_pdf(doc):
    """
    Korxona BUYRUG'I — 'Malakaviy amaliyotni tashkil etish to'g'risida'.
    Namuna formati: korxona ichki buyrug'i + ilova jadvali (talabalar + rahbarlar).
    """
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import cm
    from reportlab.platypus import (SimpleDocTemplate, Table, TableStyle,
                                    Paragraph, Spacer, PageBreak)
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
    import io, datetime

    buf = io.BytesIO()
    doc_obj = SimpleDocTemplate(buf, pagesize=A4,
                                leftMargin=2.5*cm, rightMargin=2*cm,
                                topMargin=1.5*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()

    def sty(name, **kw):
        return ParagraphStyle(name, parent=styles['Normal'], **kw)

    bold_c  = sty('bc', fontSize=14, fontName='Helvetica-Bold', alignment=TA_CENTER, spaceAfter=4)
    title_q = sty('tq', fontSize=12, fontName='Helvetica-Bold', alignment=TA_CENTER, spaceAfter=6)
    body    = sty('b',  fontSize=11, alignment=TA_JUSTIFY, leading=18, spaceAfter=8, firstLineIndent=1.2*cm)
    buyur   = sty('bu', fontSize=13, fontName='Helvetica-Bold', alignment=TA_CENTER, spaceBefore=6, spaceAfter=8)
    left_s  = sty('ls', fontSize=10, alignment=TA_LEFT, spaceAfter=3, leading=16)
    italic  = sty('it', fontSize=10, fontName='Helvetica-Oblique', alignment=TA_JUSTIFY, leading=16, spaceAfter=6)
    small   = sty('sm', fontSize=9,  alignment=TA_CENTER, textColor=colors.HexColor('#374151'))

    internship = doc.internship
    student    = doc.student
    company    = doc.company
    mentor     = internship.mentor if internship else None
    supervisor = internship.supervisor if internship else None
    prof       = getattr(student, 'student_profile', None)
    today      = datetime.date.today()

    story = []

    # ── Korxona sarlavhasi ──
    story.append(Paragraph(f"<b>{company.name.upper()}</b>", bold_c))
    if company.address or company.city:
        story.append(Paragraph(company.address or company.city, small))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph("─" * 80, sty('hr', fontSize=6, alignment=TA_CENTER)))
    story.append(Spacer(1, 0.4*cm))

    # ── Buyruq raqami va sanasi ──
    order_data = [[
        Paragraph(f"{today.year}-y. \"{today.day:02d}\" {today.strftime('%B')}", left_s),
        Paragraph("<b>BUYRUQ</b>", bold_c),
        Paragraph(f"No ______", sty('nr', fontSize=10, alignment=TA_RIGHT)),
    ]]
    order_tbl = Table(order_data, colWidths=[5*cm, 6*cm, 5*cm])
    order_tbl.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(order_tbl)
    story.append(Spacer(1, 0.4*cm))

    # ── Sarlavha ──
    story.append(Paragraph(
        "\"Malakaviy amaliyotni tashkil etish to'g'risida\"",
        title_q
    ))
    story.append(Spacer(1, 0.3*cm))

    # ── Asos ──
    start = str(internship.start_date) if internship else '—'
    end   = str(internship.end_date)   if internship else '—'

    body_text = (
        f"Toshkent davlat iqtisodiyot universiteti va <b>{company.name}</b> "
        f"o'rtasida imzolangan o'zaro hamkorlikni rivojlantirish memorandumiga asosan, "
        f"shuningdek, Universitet talabalariga malakaviy amaliyot o'tashi uchun zarur "
        f"shart-sharoit yaratish maqsadida,"
    )
    story.append(Paragraph(body_text, body))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph("B U Y U R A M A N", buyur))

    # ── Buyruq bandlari ──
    course_str = f"{prof.course}-kurs" if prof and prof.course else ""
    group_str  = prof.group if prof and prof.group else ""

    p1 = (f"1. Toshkent davlat iqtisodiyot universitetining <b>{company.name}</b>da "
          f"malakaviy amaliyot o'tash uchun yo'naltirilgan talabalar mazkur buyruqning "
          f"<b>ilovasiga asosan</b> joriy yil <b>{start}</b>dan <b>{end}</b>ga qadar "
          f"malakaviy amaliyotini o'tashga ruxsat berilsin.")
    p2 = ("2. Xavfsizlik va axborotlarni muhofaza qilish hamda mehnatni muhofaza "
          "qilish yo'nalishlari mas'ul xodimlari tomonidan korxonadagi ichki tartib "
          "qoidalar va xavfsizlik talablari bilan amaliyotchilar batafsil tanishtirilsin.")
    p3 = ("3. Mazkur buyruq ijrosini nazorat qilish talabalarning amaliyot rahbarlari "
          "zimmasiga yuklatilsin.")

    for p in [p1, p2, p3]:
        story.append(Paragraph(p, body))

    # ── Asos ──
    asos = (
        f"<i>Asos: Toshkent davlat iqtisodiyot universitetining tegishli xatlari, "
        f"{company.name} va Toshkent davlat iqtisodiyot universiteti o'rtasida "
        f"imzolangan o'zaro hamkorlikni rivojlantirish memorandumi.</i>"
    )
    story.append(Paragraph(asos, italic))
    story.append(Spacer(1, 1*cm))

    # ── Imzo bloki ──
    sign_rows = [[
        Paragraph("<b>Korxona rahbari:</b><br/><br/>________________", left_s),
        Paragraph(f"<b>{company.name}</b>", sty('cr', fontSize=10, fontName='Helvetica-Bold', alignment=TA_RIGHT)),
    ]]
    sign_tbl = Table(sign_rows, colWidths=[8*cm, 8*cm])
    sign_tbl.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(sign_tbl)
    story.append(PageBreak())

    # ── ILOVA: Talabalar jadvali ──
    story.append(Paragraph(
        f"<b>{company.name}</b> Boshqaruvining {today.year}-yil "
        f"{today.day:02d}-{today.strftime('%B')}dagi buyrug'i ilovasiga",
        sty('il', fontSize=9, fontName='Helvetica-Oblique', alignment=TA_RIGHT, spaceAfter=12)
    ))

    ilova_h = ['No', 'Talabaning F.I.Sh.', 'Mutaxassislik', "Amaliyot o'tash joyi", 'Biriktirilgan rahbar']
    dir_str = (prof.direction or prof.department) if prof else '—'
    mentor_name = mentor.user.get_full_name() if mentor else '—'
    ilova_rows = [ilova_h, ['1', student.get_full_name(), dir_str, internship.position if internship else '—', mentor_name]]

    ilova_tbl = Table(ilova_rows, colWidths=[0.8*cm, 4.5*cm, 3.5*cm, 4*cm, 3.7*cm])
    ilova_tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, 0), colors.HexColor('#1e293b')),
        ('TEXTCOLOR',     (0, 0), (-1, 0), colors.white),
        ('FONTNAME',      (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE',      (0, 0), (-1, -1), 8),
        ('ALIGN',         (0, 0), (0, -1), 'CENTER'),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID',          (0, 0), (-1, -1), 0.5, colors.HexColor('#94a3b8')),
        ('ROWBACKGROUNDS',(0, 1), (-1, -1), [colors.white]),
        ('TOPPADDING',    (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING',   (0, 0), (-1, -1), 4),
        ('WORDWRAP',      (0, 0), (-1, -1), 1),
    ]))
    story.append(ilova_tbl)

    doc_obj.build(story)
    buf.seek(0)
    return buf


# ── CompanyOrder serializer va ViewSet ───────────────────────────────────────

class CompanyOrderSerializer(serializers.ModelSerializer):
    student_name  = serializers.SerializerMethodField()
    company_name  = serializers.SerializerMethodField()
    internship_info = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CompanyOrder
        fields = '__all__'
        read_only_fields = ['pdf_file', 'status', 'created_by', 'created_at', 'sent_at']

    def get_student_name(self, obj):    return obj.internship.student.get_full_name()
    def get_company_name(self, obj):    return obj.company.name
    def get_created_by_name(self, obj): return obj.created_by.get_full_name() if obj.created_by else None
    def get_internship_info(self, obj):
        i = obj.internship
        return {
            'position':   i.position,
            'start_date': str(i.start_date),
            'end_date':   str(i.end_date),
            'mentor':     i.mentor.user.get_full_name() if i.mentor else None,
            'supervisor': i.supervisor.get_full_name() if i.supervisor else None,
            'group':      i.student.student_profile.group if hasattr(i.student, 'student_profile') else None,
        }


def _generate_company_order_pdf(order):
    """Korxona ichki buyrug'i PDF — namuna formati."""
    return _generate_buyruq_pdf_from_internship(order.internship, order.company)


def _generate_buyruq_pdf_from_internship(internship, company):
    """Internship asosida korxona buyrug'i PDF yaratadi."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import cm
    from reportlab.platypus import (SimpleDocTemplate, Table, TableStyle,
                                    Paragraph, Spacer, PageBreak)
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
    import io, datetime

    buf = io.BytesIO()
    doc_obj = SimpleDocTemplate(buf, pagesize=A4,
                                leftMargin=2.5*cm, rightMargin=2*cm,
                                topMargin=1.5*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()

    def sty(name, **kw):
        return ParagraphStyle(name, parent=styles['Normal'], **kw)

    bold_c = sty('bc', fontSize=14, fontName='Helvetica-Bold', alignment=TA_CENTER, spaceAfter=4)
    title_q = sty('tq', fontSize=12, fontName='Helvetica-Bold', alignment=TA_CENTER, spaceAfter=6)
    body   = sty('b',  fontSize=11, alignment=TA_JUSTIFY, leading=18, spaceAfter=8, firstLineIndent=1.2*cm)
    buyur  = sty('bu', fontSize=13, fontName='Helvetica-Bold', alignment=TA_CENTER, spaceBefore=6, spaceAfter=8)
    left_s = sty('ls', fontSize=10, alignment=TA_LEFT, spaceAfter=3, leading=16)
    italic = sty('it', fontSize=10, fontName='Helvetica-Oblique', alignment=TA_JUSTIFY, leading=16, spaceAfter=6)
    small  = sty('sm', fontSize=9,  alignment=TA_CENTER, textColor=colors.HexColor('#374151'))

    student    = internship.student
    mentor     = internship.mentor
    supervisor = internship.supervisor
    prof       = getattr(student, 'student_profile', None)
    today      = datetime.date.today()
    start      = str(internship.start_date)
    end        = str(internship.end_date)
    course_str = f"{prof.course}-kurs" if prof and prof.course else ""
    group_str  = prof.group if prof and prof.group else ""
    dir_str    = (prof.direction or prof.department) if prof else '—'
    mentor_name = mentor.user.get_full_name() if mentor else '________________________'

    story = []

    # ── Korxona sarlavhasi ──
    story.append(Paragraph(f"<b>{company.name.upper()}</b>", bold_c))
    if company.address or company.city:
        story.append(Paragraph(company.address or company.city, small))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph("─" * 80, sty('hr2', fontSize=5, alignment=TA_CENTER)))
    story.append(Spacer(1, 0.3*cm))

    # ── Buyruq raqami ──
    order_data = [[
        Paragraph(f"{today.year}-y. \"{today.day:02d}\" {today.strftime('%B')}", left_s),
        Paragraph("<b>BUYRUQ</b>", bold_c),
        Paragraph("No ______", sty('nr2', fontSize=10, alignment=TA_RIGHT)),
    ]]
    order_tbl = Table(order_data, colWidths=[5*cm, 6*cm, 5*cm])
    order_tbl.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'MIDDLE')]))
    story.append(order_tbl)
    story.append(Spacer(1, 0.4*cm))
    story.append(Paragraph('"Malakaviy amaliyotni tashkil etish to\'g\'risida"', title_q))
    story.append(Spacer(1, 0.3*cm))

    body_text = (
        f"Toshkent davlat iqtisodiyot universiteti va <b>{company.name}</b> "
        f"o'rtasida imzolangan o'zaro hamkorlikni rivojlantirish memorandumiga asosan, "
        f"shuningdek, Universitet talabalariga malakaviy amaliyot o'tashi uchun zarur "
        f"shart-sharoit yaratish maqsadida,"
    )
    story.append(Paragraph(body_text, body))
    story.append(Paragraph("B U Y U R A M A N", buyur))

    p1 = (f"1. Toshkent davlat iqtisodiyot universitetining <b>{company.name}</b>da "
          f"malakaviy amaliyot o'tash uchun yo'naltirilgan talabalar mazkur buyruqning "
          f"<b>ilovasiga asosan</b> joriy yil <b>{start}</b>dan <b>{end}</b>ga qadar "
          f"malakaviy amaliyotini o'tashga ruxsat berilsin.")
    p2 = ("2. Xavfsizlik va axborotlarni muhofaza qilish hamda mehnatni muhofaza "
          "qilish yo'nalishlari mas'ul xodimlari tomonidan korxonadagi ichki tartib "
          "qoidalar va xavfsizlik talablari bilan amaliyotchilar batafsil tanishtirilsin.")
    p3 = ("3. Mazkur buyruq ijrosini nazorat qilish talabalarning amaliyot rahbarlari "
          "zimmasiga yuklatilsin.")
    for p in [p1, p2, p3]:
        story.append(Paragraph(p, body))

    story.append(Paragraph(
        f"<i>Asos: Toshkent davlat iqtisodiyot universitetining tegishli xatlari, "
        f"{company.name} va TDIU o'rtasida imzolangan hamkorlik memorandumi.</i>",
        italic
    ))
    story.append(Spacer(1, 0.8*cm))
    story.append(Paragraph(
        f"<b>Korxona rahbari:</b> _________________ &nbsp;&nbsp;&nbsp;&nbsp; {company.name}",
        left_s
    ))
    story.append(PageBreak())

    # ── Ilova jadvali ──
    story.append(Paragraph(
        f"<b>{company.name}</b> Boshqaruvining "
        f"{today.year}-yil {today.day:02d}-{today.strftime('%B')}dagi buyrug'i ilovasiga",
        sty('il2', fontSize=9, fontName='Helvetica-Oblique', alignment=TA_RIGHT, spaceAfter=12)
    ))
    ilova_h = ['No', 'Talabaning F.I.Sh.', 'Mutaxassislik', "Amaliyot o'tash joyi", 'Biriktirilgan rahbar']
    ilova_rows = [ilova_h, ['1', student.get_full_name(), dir_str, internship.position, mentor_name]]
    ilova_tbl = Table(ilova_rows, colWidths=[0.8*cm, 4.5*cm, 3.5*cm, 4*cm, 3.7*cm])
    ilova_tbl.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, 0), colors.HexColor('#1e293b')),
        ('TEXTCOLOR',     (0, 0), (-1, 0), colors.white),
        ('FONTNAME',      (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE',      (0, 0), (-1, -1), 8),
        ('ALIGN',         (0, 0), (0, -1), 'CENTER'),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID',          (0, 0), (-1, -1), 0.5, colors.HexColor('#94a3b8')),
        ('TOPPADDING',    (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING',   (0, 0), (-1, -1), 4),
    ]))
    story.append(ilova_tbl)

    doc_obj.build(story)
    buf.seek(0)
    return buf


class CompanyOrderViewSet(viewsets.ModelViewSet):
    serializer_class = CompanyOrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'company_hr':
            try:
                company = Company.objects.get(hr_user=user)
                return CompanyOrder.objects.filter(company=company)
            except Company.DoesNotExist:
                return CompanyOrder.objects.none()
        if user.role == 'mentor':
            try:
                company = user.mentor_profile.company
                return CompanyOrder.objects.filter(company=company)
            except Exception:
                return CompanyOrder.objects.none()
        if user.role == 'kafedra':
            try:
                dept = user.kafedra_profile.department
                return CompanyOrder.objects.filter(
                    internship__student__student_profile__department=dept
                )
            except Exception:
                return CompanyOrder.objects.none()
        # dekanat, admin, supervisor — hammasi
        return CompanyOrder.objects.all()

    @action(detail=False, methods=['post'])
    def create_and_send(self, request):
        """Korxona HR buyruq yaratadi va universitetga yuboradi."""
        if request.user.role != 'company_hr':
            return Response({'error': 'Faqat korxona HR yarata oladi'}, status=403)

        internship_id = request.data.get('internship_id')
        if not internship_id:
            return Response({'error': 'internship_id majburiy'}, status=400)

        try:
            company = Company.objects.get(hr_user=request.user)
            internship = Internship.objects.get(id=internship_id, company=company)
        except (Company.DoesNotExist, Internship.DoesNotExist):
            return Response({'error': 'Amaliyot topilmadi'}, status=404)

        # PDF yaratish
        buf = _generate_buyruq_pdf_from_internship(internship, company)

        order, created = CompanyOrder.objects.get_or_create(
            internship=internship,
            company=company,
            defaults={'created_by': request.user, 'status': CompanyOrder.Status.SENT, 'sent_at': timezone.now()}
        )
        if not created:
            order.status = CompanyOrder.Status.SENT
            order.sent_at = timezone.now()
            order.save()

        from django.core.files.base import ContentFile
        filename = f"buyruq_{internship.student.get_full_name().replace(' ', '_')}.pdf"
        order.pdf_file.save(filename, ContentFile(buf.read()), save=True)

        return Response(CompanyOrderSerializer(order).data, status=201)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Buyruq PDF ni yuklab olish."""
        from django.http import HttpResponse, Http404
        order = self.get_object()
        if not order.pdf_file:
            return Response({'error': 'PDF yaratilmagan'}, status=404)
        try:
            response = HttpResponse(order.pdf_file.open('rb'), content_type='application/pdf')
            name = order.internship.student.get_full_name().replace(' ', '_')
            response['Content-Disposition'] = f'attachment; filename="buyruq_{name}.pdf"'
            return response
        except Exception:
            raise Http404


# ── ViewSet ───────────────────────────────────────────────────────────────────

class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'student':
            return Document.objects.filter(student=user)
        if user.role == 'company_hr':
            try:
                company = Company.objects.get(hr_user=user)
                return Document.objects.filter(company=company)
            except Company.DoesNotExist:
                return Document.objects.none()
        if user.role == 'supervisor':
            return Document.objects.filter(internship__supervisor=user)
        if user.role == 'kafedra':
            try:
                dept = user.kafedra_profile.department
                return Document.objects.filter(student__student_profile__department=dept)
            except Exception:
                return Document.objects.none()
        if user.role == 'mentor':
            try:
                company = user.mentor_profile.company
                return Document.objects.filter(company=company)
            except Exception:
                return Document.objects.none()
        # dekanat, admin
        return Document.objects.all()

    # ── 1. DEKANAT: yo'llanma yaratadi ────────────────────────────────────────
    @action(detail=False, methods=['post'], url_path='create_yollanma')
    def create_yollanma(self, request):
        """
        Dekanat ariza (application_id) asosida Internship + Yo'llanma yaratadi.

        Body:
          application_id  – tasdiqlanган ariza ID
          start_date      – amaliyot boshlanish sanasi (YYYY-MM-DD)
          end_date        – amaliyot tugash sanasi (YYYY-MM-DD)
          position        – lavozim (ixtiyoriy, bo'lmasa vakansiya sarlavhasi)
          supervisor_id   – ilmiy rahbar user ID (ixtiyoriy)
          mentor_id       – mentor ID (ixtiyoriy)
        """
        if request.user.role not in ['dekanat', 'admin']:
            return Response({'error': "Faqat dekanat yo'llanma yarata oladi"}, status=403)

        application_id = request.data.get('application_id')
        start_date     = request.data.get('start_date')
        end_date       = request.data.get('end_date')

        if not all([application_id, start_date, end_date]):
            return Response({'error': 'application_id, start_date, end_date majburiy'}, status=400)

        try:
            application = Application.objects.get(id=application_id)
        except Application.DoesNotExist:
            return Response({'error': 'Ariza topilmadi'}, status=404)

        valid_statuses = ['sup_approved', 'kafedra_approved', 'dekan_approved']
        if application.status not in valid_statuses:
            return Response(
                {'error': f"Ariza holati: '{application.status}'. Kafedra yoki rahbar tasdiqlamagan."},
                status=400
            )

        # Takroriy yo'llanma tekshiruvi
        if Document.objects.filter(internship__application=application).exists():
            return Response({'error': "Bu ariza uchun yo'llanma allaqachon yaratilgan"}, status=400)

        # Internship yaratish
        internship_kwargs = dict(
            application=application,
            student=application.student,
            company=application.vacancy.company,
            position=request.data.get('position') or application.vacancy.title,
            start_date=start_date,
            end_date=end_date,
            status=Internship.Status.PENDING,
        )

        supervisor_id = request.data.get('supervisor_id')
        if supervisor_id:
            try:
                from apps.users.models import User as UserModel
                internship_kwargs['supervisor'] = UserModel.objects.get(
                    id=supervisor_id, role='supervisor'
                )
            except UserModel.DoesNotExist:
                return Response({'error': 'Ilmiy rahbar topilmadi'}, status=404)

        mentor_id = request.data.get('mentor_id')
        if mentor_id:
            try:
                internship_kwargs['mentor'] = Mentor.objects.get(id=mentor_id)
            except Mentor.DoesNotExist:
                return Response({'error': 'Mentor topilmadi'}, status=404)

        internship = Internship.objects.create(**internship_kwargs)

        # Yo'llanma (Document) yaratish
        doc = Document.objects.create(
            internship=internship,
            student=application.student,
            company=application.vacancy.company,
            status=Document.Status.DEKAN_APPROVED,
            created_by=request.user,
        )
        doc.generate_qr()

        # Ariza statusini yakunlandi deb belgilash — endi bildirishnoma chiqmaydi
        application.status = Application.Status.COMPLETED
        application.save()

        return Response(DocumentSerializer(doc).data, status=201)

    # ── 1b. DEKANAT: guruh bo'yicha batch yo'llanma ──────────────────────────
    @action(detail=False, methods=['post'], url_path='batch_create_yollanma')
    def batch_create_yollanma(self, request):
        """
        Dekanat bir guruh uchun barcha kafedra_approved arizalardan
        bir vaqtda yo'llanma yaratadi.

        Body:
          application_ids – [id, id, ...]
          start_date, end_date
          supervisor_id (ixtiyoriy)
        """
        if request.user.role not in ['dekanat', 'admin']:
            return Response({'error': "Faqat dekanat yo'llanma yarata oladi"}, status=403)

        ids        = request.data.get('application_ids', [])
        start_date = request.data.get('start_date')
        end_date   = request.data.get('end_date')
        position   = request.data.get('position', '')

        if not ids or not start_date or not end_date:
            return Response({'error': 'application_ids, start_date, end_date majburiy'}, status=400)

        valid_statuses = ['sup_approved', 'kafedra_approved', 'dekan_approved']
        applications = Application.objects.filter(id__in=ids, status__in=valid_statuses)

        created, skipped = [], []
        for application in applications:
            if Document.objects.filter(internship__application=application).exists():
                skipped.append(application.id)
                continue
            # Supervisor kafedra tomonidan biriktirilgan — application.assigned_supervisor
            internship = Internship.objects.create(
                application=application,
                student=application.student,
                company=application.vacancy.company,
                position=position or application.vacancy.title,
                start_date=start_date,
                end_date=end_date,
                status=Internship.Status.PENDING,
                supervisor=application.assigned_supervisor,
            )
            doc = Document.objects.create(
                internship=internship,
                student=application.student,
                company=application.vacancy.company,
                status=Document.Status.DEKAN_APPROVED,
                created_by=request.user,
            )
            doc.generate_qr()
            application.status = Application.Status.COMPLETED
            application.save()
            created.append(application.id)

        return Response({
            'message': f"{len(created)} ta yo'llanma yaratildi",
            'created': len(created),
            'skipped': len(skipped),
        }, status=201)

    # ── 1c. DEKANAT: guruh bo'yicha batch yuborish ───────────────────────────
    @action(detail=False, methods=['post'], url_path='batch_send')
    def batch_send(self, request):
        """Dekanat bir guruhning barcha dekan_approved hujjatlarini yuboradi."""
        if request.user.role not in ['dekanat', 'admin']:
            return Response({'error': 'Ruxsat yo\'q'}, status=403)
        doc_ids = request.data.get('doc_ids', [])
        if not doc_ids:
            return Response({'error': 'doc_ids majburiy'}, status=400)
        docs = Document.objects.filter(id__in=doc_ids, status=Document.Status.DEKAN_APPROVED)
        count = 0
        for doc in docs:
            doc.status  = Document.Status.SENT
            doc.sent_at = timezone.now()
            doc.save()
            count += 1
        return Response({'message': f'{count} ta yo\'llanma yuborildi', 'sent_count': count})

    # ── 1d. PDF yo'llanma yuklab olish ───────────────────────────────────────
    @action(detail=True, methods=['get'], url_path='download_pdf')
    def download_pdf(self, request, pk=None):
        """Yo'llanmani PDF sifatida yuklab olish."""
        from django.http import FileResponse, Http404
        doc = self.get_object()
        pdf_buf = _generate_yollanma_pdf(doc)
        from django.http import HttpResponse
        response = HttpResponse(pdf_buf.read(), content_type='application/pdf')
        student_name = doc.student.get_full_name().replace(' ', '_')
        response['Content-Disposition'] = (
            f'attachment; filename="yollanma_{student_name}_{doc.unique_id}.pdf"'
        )
        return response

    # ── 1e. PDF buyruq yuklab olish ───────────────────────────────────────────
    @action(detail=True, methods=['get'], url_path='download_buyruq')
    def download_buyruq(self, request, pk=None):
        """Mentorlik buyrug'ini PDF sifatida yuklab olish."""
        from django.http import HttpResponse
        doc = self.get_object()
        if not doc.internship or not doc.internship.mentor:
            return Response({'error': 'Mentor hali tayinlanmagan'}, status=400)
        pdf_buf = _generate_buyruq_pdf(doc)
        response = HttpResponse(pdf_buf.read(), content_type='application/pdf')
        student_name = doc.student.get_full_name().replace(' ', '_')
        response['Content-Disposition'] = (
            f'attachment; filename="buyruq_{student_name}.pdf"'
        )
        return response

    # ── 2. DEKANAT: korxonaga yuboradi ────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='send_to_company')
    def send_to_company(self, request, pk=None):
        """Dekanat yo'llanmani korxonaga yuboradi."""
        if request.user.role != 'dekanat':
            return Response({'error': 'Faqat dekanat yuborishga ruxsatli'}, status=403)

        doc = self.get_object()
        if doc.status != Document.Status.DEKAN_APPROVED:
            return Response({'error': f"Yo'llanma holati: '{doc.status}'"}, status=400)

        doc.status  = Document.Status.SENT
        doc.sent_at = timezone.now()
        doc.save()
        return Response({
            'message': "Yo'llanma korxonaga yuborildi",
            'document': DocumentSerializer(doc).data,
        })

    # ── 3. KORXONA HR: qabul qiladi → amaliyot boshlanadi ────────────────────
    @action(detail=True, methods=['post'], url_path='company_accept')
    def company_accept(self, request, pk=None):
        """
        Korxona HR yo'llanmani qabul qiladi.
        Shu zahoti bog'liq Internship ACTIVE holatga o'tadi.
        """
        if request.user.role != 'company_hr':
            return Response({'error': 'Faqat korxona HR qabul qila oladi'}, status=403)

        doc = self.get_object()

        # Faqat shu korxonaga tegishli yo'llanmani qabul qila oladi
        try:
            company = Company.objects.get(hr_user=request.user)
        except Company.DoesNotExist:
            return Response({'error': 'Korxona topilmadi'}, status=404)

        if doc.company != company:
            return Response({'error': 'Bu yo\'llanma sizning korxonangizga tegishli emas'}, status=403)

        if doc.status != Document.Status.SENT:
            return Response({'error': f"Yo'llanma yuborilmagan (holat: '{doc.status}')"}, status=400)

        doc.status      = Document.Status.COMPANY_ACCEPTED
        doc.accepted_at = timezone.now()
        doc.save()

        if doc.internship:
            doc.internship.status = Internship.Status.ACTIVE
            doc.internship.save()

        return Response({
            'message': "Yo'llanma qabul qilindi! Amaliyot boshlandi.",
            'document': DocumentSerializer(doc).data,
        })

    # ── 4. KORXONA HR: rad etadi ──────────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='company_reject')
    def company_reject(self, request, pk=None):
        """Korxona HR yo'llanmani rad etadi."""
        if request.user.role != 'company_hr':
            return Response({'error': 'Faqat korxona HR rad eta oladi'}, status=403)

        doc = self.get_object()

        try:
            company = Company.objects.get(hr_user=request.user)
        except Company.DoesNotExist:
            return Response({'error': 'Korxona topilmadi'}, status=404)

        if doc.company != company:
            return Response({'error': 'Bu yo\'llanma sizning korxonangizga tegishli emas'}, status=403)

        if doc.status != Document.Status.SENT:
            return Response({'error': f"Yo'llanma yuborilmagan (holat: '{doc.status}')"}, status=400)

        doc.status      = Document.Status.REJECTED
        doc.reject_note = request.data.get('note', '')
        doc.save()

        return Response({
            'message': "Yo'llanma rad etildi.",
            'document': DocumentSerializer(doc).data,
        })

    # ── 5. QR orqali tekshirish ───────────────────────────────────────────────
    @action(detail=False, methods=['get'], permission_classes=[AllowAny],
            url_path='verify/(?P<uid>[^/.]+)')
    def verify(self, request, uid=None):
        """QR kod orqali yo'llanmani tekshirish."""
        try:
            doc = Document.objects.get(unique_id=uid)
            return Response({
                'valid':      True,
                'unique_id':  str(doc.unique_id),
                'student':    doc.student.get_full_name(),
                'company':    doc.company.name,
                'status':     doc.status,
                'status_display': doc.get_status_display(),
                'created_at': doc.created_at,
                'sent_at':    doc.sent_at,
                'accepted_at': doc.accepted_at,
            })
        except Document.DoesNotExist:
            return Response({'valid': False, 'error': 'Hujjat topilmadi'}, status=404)
