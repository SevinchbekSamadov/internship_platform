from django.db import models
from apps.users.models import User
from apps.companies.models import Company, Vacancy, Mentor


class Application(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Kutilmoqda'
        HR_APPROVED = 'hr_approved', 'HR tasdiqladi'
        HR_REJECTED = 'hr_rejected', 'HR rad etdi'
        # Legacy statuses — mavjud ma'lumotlar uchun saqlanadi
        SUP_APPROVED = 'sup_approved', 'Rahbar tasdiqladi'
        SUP_REJECTED = 'sup_rejected', 'Rahbar rad etdi'
        # Yangi kafedra workflow
        KAFEDRA_APPROVED = 'kafedra_approved', 'Kafedra tasdiqladi'
        KAFEDRA_REJECTED = 'kafedra_rejected', 'Kafedra rad etdi'
        DEKAN_APPROVED = 'dekan_approved', 'Dekanat tasdiqladi'
        COMPLETED = 'completed', 'Yakunlandi'

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='applications')
    vacancy = models.ForeignKey(Vacancy, on_delete=models.CASCADE, related_name='applications')
    cover_letter = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    # Kim tasdiqladi
    hr_note = models.TextField(blank=True)
    hr_reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                        related_name='hr_reviewed_apps')
    sup_note = models.TextField(blank=True)
    sup_reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                         related_name='sup_reviewed_apps')
    kafedra_note = models.TextField(blank=True)
    kafedra_reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                             related_name='kafedra_reviewed_apps')
    assigned_supervisor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                             related_name='assigned_applications')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Ariza'
        unique_together = ['student', 'vacancy']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.student.get_full_name()} → {self.vacancy.company.name}"


class Internship(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Kutilmoqda'
        ACTIVE = 'active', 'Faol'
        COMPLETED = 'completed', 'Yakunlangan'

    application = models.OneToOneField(Application, on_delete=models.CASCADE,
                                        related_name='internship', null=True, blank=True)
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='internships')
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='internships')
    mentor = models.ForeignKey(Mentor, on_delete=models.SET_NULL, null=True, blank=True,
                                related_name='internships')
    supervisor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name='supervised_internships')
    position = models.CharField(max_length=200)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    # Baholar
    mentor_grade = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    supervisor_grade = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    final_grade = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    final_grade_letter = models.CharField(max_length=5, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Amaliyot'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.student.get_full_name()} @ {self.company.name}"

    @property
    def progress_percent(self):
        from django.utils import timezone
        today = timezone.now().date()
        if today <= self.start_date:
            return 0
        if today >= self.end_date:
            return 100
        total = (self.end_date - self.start_date).days
        elapsed = (today - self.start_date).days
        return min(100, int(elapsed / total * 100)) if total else 0


class Task(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Kutilmoqda'
        DONE = 'done', 'Bajarildi'
        APPROVED = 'approved', 'Tasdiqlandi'

    internship = models.ForeignKey(Internship, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    student_note = models.TextField(blank=True)
    mentor_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Vazifa'
        ordering = ['due_date']

    def __str__(self):
        return f"{self.internship.student.get_full_name()} — {self.title}"


class DailyLog(models.Model):
    internship = models.ForeignKey(Internship, on_delete=models.CASCADE, related_name='daily_logs')
    date = models.DateField()
    description = models.TextField()
    hours_worked = models.DecimalField(max_digits=4, decimal_places=1, default=8)
    is_auto = models.BooleanField(default=False)
    approved_by_mentor = models.BooleanField(default=False)
    mentor_comment = models.TextField(blank=True)
    # Dual-supervisor approval (nullable — mavjud yozuvlar uchun backward compat)
    approved_by_supervisor = models.BooleanField(default=False, null=True)
    supervisor_comment = models.TextField(blank=True)
    approved_by_kafedra = models.BooleanField(default=False, null=True)
    kafedra_log_comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Kundalik'
        unique_together = ['internship', 'date']
        ordering = ['-date']

    def __str__(self):
        return f"{self.internship.student.get_full_name()} — {self.date}"


class DailyLogBook(models.Model):
    """Talabaning barcha kundaliklari birlashtirilgan PDF daftar"""
    class Status(models.TextChoices):
        DRAFT    = 'draft',    'Qoralama'
        PENDING  = 'pending',  'HR tasdiqlashi kutilmoqda'
        APPROVED = 'approved', 'Tasdiqlandi'
        REJECTED = 'rejected', 'Rad etildi'

    internship    = models.OneToOneField(Internship, on_delete=models.CASCADE, related_name='logbook')
    pdf_file      = models.FileField(upload_to='logbooks/', null=True, blank=True)
    status        = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    total_logs    = models.IntegerField(default=0)
    total_hours   = models.DecimalField(max_digits=6, decimal_places=1, default=0)
    generated_at  = models.DateTimeField(null=True, blank=True)
    hr_approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                       related_name='approved_logbooks')
    hr_approved_at = models.DateTimeField(null=True, blank=True)
    hr_note       = models.TextField(blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Kundalik daftar'

    def __str__(self):
        return f"Daftar: {self.internship.student.get_full_name()}"


class Evaluation(models.Model):
    """Mentor yoki Ilmiy rahbar bahosi"""
    class EvaluatorType(models.TextChoices):
        MENTOR = 'mentor', 'Mentor'
        SUPERVISOR = 'supervisor', 'Ilmiy Rahbar'

    internship = models.ForeignKey(Internship, on_delete=models.CASCADE, related_name='evaluations')
    evaluator = models.ForeignKey(User, on_delete=models.CASCADE)
    evaluator_type = models.CharField(max_length=20, choices=EvaluatorType.choices)
    grade = models.DecimalField(max_digits=4, decimal_places=1)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Baholash'
        unique_together = ['internship', 'evaluator_type']

    def __str__(self):
        return f"{self.internship} — {self.evaluator_type}: {self.grade}"
