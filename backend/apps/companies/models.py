from django.db import models
from apps.users.models import User


class Company(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Kutilmoqda'
        APPROVED = 'approved', 'Tasdiqlangan'
        REJECTED = 'rejected', 'Rad etilgan'

    hr_user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='company')
    name = models.CharField(max_length=200)
    inn = models.CharField(max_length=20, unique=True)
    industry = models.CharField(max_length=100)
    address = models.TextField()
    city = models.CharField(max_length=100, default='Toshkent')
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    description = models.TextField(blank=True)
    has_contract = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Korxona'
        verbose_name_plural = 'Korxonalar'

    def __str__(self):
        return self.name


class Vacancy(models.Model):
    class Status(models.TextChoices):
        OPEN = 'open', 'Ochiq'
        CLOSED = 'closed', 'Yopiq'

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='vacancies')
    title = models.CharField(max_length=200)
    description = models.TextField()
    requirements = models.TextField(blank=True)
    slots = models.IntegerField(default=1)
    filled_slots = models.IntegerField(default=0)
    duration_weeks = models.IntegerField(default=8)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    is_paid = models.BooleanField(default=False)
    salary = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Vakansiya'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.company.name} — {self.title}"

    @property
    def available_slots(self):
        return self.slots - self.filled_slots


class Mentor(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='mentor_profile')
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='mentors')
    position = models.CharField(max_length=100)
    max_students = models.IntegerField(default=5)

    class Meta:
        verbose_name = 'Mentor'

    def __str__(self):
        return f"{self.user.get_full_name()} — {self.company.name}"


class ContractRequest(models.Model):
    """Korxona OTMga shartnoma so'rovi"""
    class Status(models.TextChoices):
        PENDING = 'pending', 'Kutilmoqda'
        APPROVED = 'approved', 'Tasdiqlangan'
        REJECTED = 'rejected', 'Rad etilgan'

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='contract_requests')
    message = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    response = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        verbose_name = "Shartnoma so'rovi"
        ordering = ['-created_at']
