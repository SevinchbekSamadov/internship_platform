from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        STUDENT = 'student', 'Talaba'
        COMPANY_HR = 'company_hr', 'Korxona HR'
        MENTOR = 'mentor', 'Mentor'
        SUPERVISOR = 'supervisor', 'Amaliyot Rahbar'
        DEKANAT = 'dekanat', 'Dekanat'
        KAFEDRA = 'kafedra', 'Kafedra'
        ADMIN = 'admin', 'Admin'

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Role.choices)
    phone = models.CharField(max_length=20, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'role']

    class Meta:
        verbose_name = 'Foydalanuvchi'
        verbose_name_plural = 'Foydalanuvchilar'

    def __str__(self):
        return f"{self.get_full_name()} ({self.role})"


class StudentProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_profile')
    student_id = models.CharField(max_length=20, unique=True)
    faculty = models.CharField(max_length=100)
    department = models.CharField(max_length=100)
    direction = models.CharField(max_length=100)
    course = models.IntegerField(default=1)
    group = models.CharField(max_length=20, blank=True)

    class Meta:
        verbose_name = 'Talaba profili'

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.student_id}"


class SupervisorProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='supervisor_profile')
    department = models.CharField(max_length=100)
    position = models.CharField(max_length=100)

    class Meta:
        verbose_name = 'Amaliyot rahbar profili'


class KafedraProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='kafedra_profile')
    department = models.CharField(max_length=100)
    position = models.CharField(max_length=100, blank=True)

    class Meta:
        verbose_name = 'Kafedra profili'

    def __str__(self):
        return f"{self.user.get_full_name()} — {self.department}"
