"""
Barcha mavjud ma'lumotlarni o'chirib, har bir holat uchun to'liq sample data yaratadi.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import transaction
from datetime import date, timedelta, datetime
import random

User = get_user_model()


class Command(BaseCommand):
    help = 'Eski ma\'lumotlarni o\'chirib, har bir holat uchun 10 ta sample yaratadi'

    def handle(self, *args, **options):
        self.stdout.write('=' * 65)
        self.stdout.write('  SAMPLE DATA GENERATOR — barcha ma\'lumotlar yangilanadi')
        self.stdout.write('=' * 65)

        with transaction.atomic():
            self._clear_all()
            self._create_admins()
            self._create_dekanat()
            self._create_kafedra()
            self._create_supervisors()
            companies, vacancies, mentors = self._create_companies_and_mentors()
            students = self._create_students()
            self._create_full_workflow(students, companies, vacancies, mentors)

        self._print_summary()

    # ── 1. Tozalash ───────────────────────────────────────────────────────────

    def _clear_all(self):
        from apps.reports.models import Report
        from apps.attendance.models import Attendance
        from apps.documents.models import Document
        from apps.internships.models import Evaluation, DailyLog, Task, Internship, Application
        from apps.companies.models import Mentor, Vacancy, ContractRequest, Company
        from apps.users.models import StudentProfile, SupervisorProfile, KafedraProfile

        Report.objects.all().delete()
        Attendance.objects.all().delete()
        Document.objects.all().delete()
        Evaluation.objects.all().delete()
        DailyLog.objects.all().delete()
        Task.objects.all().delete()
        Internship.objects.all().delete()
        Application.objects.all().delete()
        ContractRequest.objects.all().delete()
        Mentor.objects.all().delete()
        Vacancy.objects.all().delete()
        Company.objects.all().delete()
        StudentProfile.objects.all().delete()
        SupervisorProfile.objects.all().delete()
        KafedraProfile.objects.all().delete()
        User.objects.all().delete()
        self.stdout.write(self.style.WARNING('  [TOZALANDI] Barcha eski ma\'lumotlar o\'chirildi'))

    # ── 2. Adminlar ───────────────────────────────────────────────────────────

    def _create_admins(self):
        data = [
            ('admin@otm.uz',   'admin',    'admin123456', 'Saidakbar', 'Toshmatov'),
            ('admin2@otm.uz',  'admin2',   'admin123456', 'Aziza',     'Nazarova'),
            ('admin3@otm.uz',  'admin3',   'admin123456', 'Bekzod',    'Tursunov'),
            ('admin4@otm.uz',  'admin4',   'admin123456', 'Dilshod',   'Yusupov'),
            ('admin5@otm.uz',  'admin5',   'admin123456', 'Eldora',    'Mirzayeva'),
            ('admin6@otm.uz',  'admin6',   'admin123456', 'Farruх',    'Holiqov'),
            ('admin7@otm.uz',  'admin7',   'admin123456', 'Gulbahor',  'Rahimova'),
            ('admin8@otm.uz',  'admin8',   'admin123456', 'Husan',     'Xolmatov'),
            ('admin9@otm.uz',  'admin9',   'admin123456', 'Inobat',    'Sultonova'),
            ('admin10@otm.uz', 'admin10',  'admin123456', 'Javlon',    'Abdullayev'),
        ]
        for email, uname, pwd, fname, lname in data:
            User.objects.create_superuser(
                email=email, username=uname, password=pwd,
                first_name=fname, last_name=lname, role='admin'
            )
        self.stdout.write(self.style.SUCCESS('  [OK] 10 ta Admin'))

    # ── 3. Dekanat ────────────────────────────────────────────────────────────

    def _create_dekanat(self):
        data = [
            ('dekanat@otm.uz',    'dekanat',    'dekanat123', 'Sardor',   'Yusupov'),
            ('dekanat2@otm.uz',   'dekanat2',   'dekanat123', 'Kamola',   'Ergasheva'),
            ('dekanat3@otm.uz',   'dekanat3',   'dekanat123', 'Lochin',   'Xasanov'),
            ('dekanat4@otm.uz',   'dekanat4',   'dekanat123', 'Muazzam',  'Tosheva'),
            ('dekanat5@otm.uz',   'dekanat5',   'dekanat123', 'Nodir',    'Qodirov'),
            ('dekanat6@otm.uz',   'dekanat6',   'dekanat123', 'Oydin',    'Botirov'),
            ('dekanat7@otm.uz',   'dekanat7',   'dekanat123', 'Parviz',   'Normatov'),
            ('dekanat8@otm.uz',   'dekanat8',   'dekanat123', 'Qunduz',   'Salimova'),
            ('dekanat9@otm.uz',   'dekanat9',   'dekanat123', 'Rustam',   'Xoliqov'),
            ('dekanat10@otm.uz',  'dekanat10',  'dekanat123', 'Sarvinoz', 'Nazarova'),
        ]
        for email, uname, pwd, fname, lname in data:
            User.objects.create_user(
                email=email, username=uname, password=pwd,
                first_name=fname, last_name=lname, role='dekanat'
            )
        self.stdout.write(self.style.SUCCESS('  [OK] 10 ta Dekanat'))

    # ── 4. Kafedra ────────────────────────────────────────────────────────────

    def _create_kafedra(self):
        from apps.users.models import KafedraProfile
        data = [
            ('kafedra@otm.uz',    'kafedra',    'kafedra123', 'Alisher',  'Karimov',
             'Dasturlash texnologiyalari', 'Kafedra mudiri'),
            ('kafedra2@otm.uz',   'kafedra2',   'kafedra123', 'Barno',    'Nazarova',
             'Axborot tizimlari', 'Kafedra mudiri o\'rinbosari'),
            ('kafedra3@otm.uz',   'kafedra3',   'kafedra123', 'Comil',    'Xolmatov',
             'Sun\'iy intellekt', 'Kafedra mudiri'),
            ('kafedra4@otm.uz',   'kafedra4',   'kafedra123', 'Dilnoza',  'Ergasheva',
             'Kibersecurity', 'Katta o\'qituvchi'),
            ('kafedra5@otm.uz',   'kafedra5',   'kafedra123', 'Elbek',    'Tursunov',
             'Matematik modellashtirish', 'Kafedra mudiri'),
            ('kafedra6@otm.uz',   'kafedra6',   'kafedra123', 'Feruza',   'Yusupova',
             'Kompyuter injiniringi', 'Dotsent'),
            ('kafedra7@otm.uz',   'kafedra7',   'kafedra123', 'Gulsanam', 'Qodirova',
             'Dasturlash texnologiyalari', 'Kafedra mudiri o\'rinbosari'),
            ('kafedra8@otm.uz',   'kafedra8',   'kafedra123', 'Husan',    'Mirzayev',
             'Axborot tizimlari', 'Kafedra mudiri'),
            ('kafedra9@otm.uz',   'kafedra9',   'kafedra123', 'Iroda',    'Salimova',
             'Sun\'iy intellekt', 'Katta o\'qituvchi'),
            ('kafedra10@otm.uz',  'kafedra10',  'kafedra123', 'Jasur',    'Abdullayev',
             'Kibersecurity', 'Kafedra mudiri'),
        ]
        kafedra_users = []
        for email, uname, pwd, fname, lname, dept, pos in data:
            u = User.objects.create_user(
                email=email, username=uname, password=pwd,
                first_name=fname, last_name=lname, role='kafedra'
            )
            KafedraProfile.objects.create(user=u, department=dept, position=pos)
            kafedra_users.append(u)
        self.stdout.write(self.style.SUCCESS('  [OK] 10 ta Kafedra'))
        return kafedra_users

    # ── 5. Amaliyot Rahbarlar ─────────────────────────────────────────────────

    def _create_supervisors(self):
        from apps.users.models import SupervisorProfile
        data = [
            ('rahbar@otm.uz',    'rahbar',    'rahbar123', 'Bobur',   'Xasanov',
             'Dasturlash texnologiyalari', 'Dotsent'),
            ('rahbar2@otm.uz',   'rahbar2',   'rahbar123', 'Umida',   'Mirzayeva',
             'Kompyuter injiniringi', 'Professor'),
            ('rahbar3@otm.uz',   'rahbar3',   'rahbar123', 'Vohid',   'Tursunov',
             'Axborot tizimlari', 'Dotsent'),
            ('rahbar4@otm.uz',   'rahbar4',   'rahbar123', 'Xurmo',   'Ergasheva',
             'Sun\'iy intellekt', 'Katta o\'qituvchi'),
            ('rahbar5@otm.uz',   'rahbar5',   'rahbar123', 'Yorqin',  'Nazarov',
             'Kibersecurity', 'Dotsent'),
            ('rahbar6@otm.uz',   'rahbar6',   'rahbar123', 'Zulfiya', 'Qodirova',
             'Matematik modellashtirish', 'Professor'),
            ('rahbar7@otm.uz',   'rahbar7',   'rahbar123', 'Anvar',   'Xolmatov',
             'Dasturlash texnologiyalari', 'O\'qituvchi'),
            ('rahbar8@otm.uz',   'rahbar8',   'rahbar123', 'Barno',   'Sultonova',
             'Kompyuter injiniringi', 'Dotsent'),
            ('rahbar9@otm.uz',   'rahbar9',   'rahbar123', 'Comil',   'Abdullayev',
             'Axborot tizimlari', 'Katta o\'qituvchi'),
            ('rahbar10@otm.uz',  'rahbar10',  'rahbar123', 'Dildora', 'Yusupova',
             'Sun\'iy intellekt', 'Professor'),
        ]
        sups = []
        for email, uname, pwd, fname, lname, dept, pos in data:
            u = User.objects.create_user(
                email=email, username=uname, password=pwd,
                first_name=fname, last_name=lname, role='supervisor'
            )
            SupervisorProfile.objects.create(user=u, department=dept, position=pos)
            sups.append(u)
        self.stdout.write(self.style.SUCCESS('  [OK] 10 ta Amaliyot Rahbar'))
        return sups

    # ── 6. Korxonalar, Vakansiyalar, Mentorlar ────────────────────────────────

    def _create_companies_and_mentors(self):
        from apps.companies.models import Company, Vacancy, Mentor

        companies_raw = [
            ('hr@techuz.com',      'hr_tech',     'hr123456', 'Malika',   'Rahimova',
             'TechSolutions Uz',  '1111111111', 'IT',        'Toshkent, Yunusobod'),
            ('hr2@itpark.uz',      'hr_itpark',   'hr123456', 'Otabek',   'Normatov',
             'IT Park Uzbekistan','2222222222', 'IT',        'Toshkent, MU'),
            ('hr3@uzcard.uz',      'hr_uzcard',   'hr123456', 'Nilufar',  'Azimova',
             'UzCard',            '3333333333', 'Fintech',   'Toshkent, Shayxontohur'),
            ('hr4@click.uz',       'hr_click',    'hr123456', 'Sherzod',  'Hamidov',
             'Click Payment',     '4444444444', 'Fintech',   'Toshkent, Chilonzor'),
            ('hr5@myid.uz',        'hr_myid',     'hr123456', 'Feruza',   'Toshmatova',
             'MyID',              '5555555555', 'IT',        'Toshkent, Yakkasaroy'),
            ('hr6@eskiz.uz',       'hr_eskiz',    'hr123456', 'Davron',   'Xoliqov',
             'Eskiz.uz',          '6666666666', 'IT',        'Toshkent, Uchtepa'),
            ('hr7@humans.uz',      'hr_humans',   'hr123456', 'Gulnora',  'Rajabova',
             'Humans.uz',         '7777777777', 'HR-tech',   'Toshkent, Olmazor'),
            ('hr8@uzinfocom.uz',   'hr_uzinfo',   'hr123456', 'Hamid',    'Karimov',
             'Uzinfocom',         '8888888888', 'IT',        'Toshkent, MU'),
            ('hr9@nbu.uz',         'hr_nbu',      'hr123456', 'Iroda',    'Yusupova',
             'National Bank',     '9999999999', 'Bank',      'Toshkent, Shayxontohur'),
            ('hr10@geocad.uz',     'hr_geocad',   'hr123456', 'Jasur',    'Sultonov',
             'GeoCad',            '0000000000', 'GIS',       'Toshkent, Yunusobod'),
        ]

        vacancies_titles = [
            ('Junior Python Developer',  'Python/Django asoslari',       'Python asoslari'),
            ('Frontend Intern',          'React.js bilan ishlash',        'HTML, CSS, JS'),
            ('Data Analyst Intern',      'Ma\'lumotlarni tahlil qilish',  'Excel, SQL asoslari'),
            ('Mobile Dev Intern',        'Flutter/React Native',          'Dart yoki JS'),
            ('DevOps Intern',            'CI/CD, Docker asoslari',        'Linux, bash'),
            ('Full Stack Intern',        'Node.js + React stack',         'JS, HTML, CSS'),
            ('UI/UX Design Intern',      'Figma bilan dizayn',            'Figma, Photoshop'),
            ('Network Intern',           'Tarmoq infratuzilmasi',         'Cisco asoslari'),
            ('Fintech Intern',           'Moliya tizimlari',              'SQL, Python'),
            ('GIS Intern',               'Geo ma\'lumotlar',              'QGIS, Python'),
        ]

        mentors_raw = [
            ('mentor@techuz.com',   'mentor_tech',  'mentor123', 'Jasur',    'Toshmatov',
             'Senior Frontend Dev', 5),
            ('mentor2@itpark.uz',   'mentor_itpark','mentor123', 'Kamola',   'Ergasheva',
             'Backend Engineer',    4),
            ('mentor3@uzcard.uz',   'mentor_uzcard','mentor123', 'Lochin',   'Xolmatov',
             'Data Analyst',        3),
            ('mentor4@click.uz',    'mentor_click', 'mentor123', 'Murod',    'Normatov',
             'Mobile Developer',    4),
            ('mentor5@myid.uz',     'mentor_myid',  'mentor123', 'Nargiza',  'Abdullayeva',
             'DevOps Engineer',     3),
            ('mentor6@eskiz.uz',    'mentor_eskiz', 'mentor123', 'Otabek',   'Tursunov',
             'Full Stack Dev',      5),
            ('mentor7@humans.uz',   'mentor_humans','mentor123', 'Parizod',  'Qodirova',
             'UI/UX Designer',      3),
            ('mentor8@uzinfocom.uz','mentor_uzinfo','mentor123', 'Qodir',    'Salimov',
             'Network Engineer',    4),
            ('mentor9@nbu.uz',      'mentor_nbu',   'mentor123', 'Rohila',   'Yusupova',
             'Financial Analyst',   3),
            ('mentor10@geocad.uz',  'mentor_geocad','mentor123', 'Sarvarbek','Mirzayev',
             'GIS Developer',       4),
        ]

        companies, vacancies, mentors = [], [], []

        for i, (email, uname, pwd, fname, lname, cname, inn, industry, addr) in enumerate(companies_raw):
            hr = User.objects.create_user(
                email=email, username=uname, password=pwd,
                first_name=fname, last_name=lname, role='company_hr'
            )
            company = Company.objects.create(
                hr_user=hr, name=cname, inn=inn, industry=industry,
                address=addr, city='Toshkent',
                phone=f'+99890{i+1:07d}', email=email,
                has_contract=True, status='approved'
            )
            vtitle, vdesc, vreq = vacancies_titles[i]
            vac = Vacancy.objects.create(
                company=company, title=vtitle, description=vdesc,
                requirements=vreq, slots=5, filled_slots=0,
                duration_weeks=8, is_paid=True, salary=1500000 + i * 100000,
                status='open'
            )
            companies.append(company)
            vacancies.append(vac)

        for i, (email, uname, pwd, fname, lname, pos, max_std) in enumerate(mentors_raw):
            mu = User.objects.create_user(
                email=email, username=uname, password=pwd,
                first_name=fname, last_name=lname, role='mentor'
            )
            m = Mentor.objects.create(
                user=mu, company=companies[i], position=pos, max_students=max_std
            )
            mentors.append(m)

        self.stdout.write(self.style.SUCCESS('  [OK] 10 ta Korxona + Vakansiya + Mentor'))
        return companies, vacancies, mentors

    # ── 7. Talabalar ──────────────────────────────────────────────────────────

    def _create_students(self):
        from apps.users.models import StudentProfile
        data = [
            ('talaba1@student.uz',  'talaba1',  'talaba123', 'Alisher',   'Karimov',
             'ST-2024-001', 'Kompyuter Injiniringi', 'Dasturlash texnologiyalari',
             'Dasturiy injiniring', 3, 'DT-31'),
            ('talaba2@student.uz',  'talaba2',  'talaba123', 'Nilufar',   'Azimova',
             'ST-2024-002', 'Kompyuter Injiniringi', 'Dasturlash texnologiyalari',
             'Web dasturlash', 3, 'DT-31'),
            ('talaba3@student.uz',  'talaba3',  'talaba123', 'Sherzod',   'Hamidov',
             'ST-2024-003', 'Kompyuter Injiniringi', 'Axborot tizimlari',
             'Axborot xavfsizligi', 2, 'AT-21'),
            ('talaba4@student.uz',  'talaba4',  'talaba123', 'Feruza',    'Tosheva',
             'ST-2024-004', 'Kompyuter Injiniringi', 'Dasturlash texnologiyalari',
             'Mobil dasturlash', 4, 'DT-41'),
            ('talaba5@student.uz',  'talaba5',  'talaba123', 'Davron',    'Xoliqov',
             'ST-2024-005', 'Kompyuter Injiniringi', "Sun'iy intellekt",
             'Machine Learning', 3, 'SI-31'),
            ('talaba6@student.uz',  'talaba6',  'talaba123', 'Gulnora',   'Rajabova',
             'ST-2024-006', 'Kompyuter Injiniringi', 'Axborot tizimlari',
             'Axborot xavfsizligi', 3, 'AT-31'),
            ('talaba7@student.uz',  'talaba7',  'talaba123', 'Hamid',     'Normatov',
             'ST-2024-007', 'Kompyuter Injiniringi', 'Dasturlash texnologiyalari',
             'Web dasturlash', 2, 'DT-22'),
            ('talaba8@student.uz',  'talaba8',  'talaba123', 'Iroda',     'Sultonova',
             'ST-2024-008', 'Kompyuter Injiniringi', "Sun'iy intellekt",
             'Deep Learning', 4, 'SI-41'),
            ('talaba9@student.uz',  'talaba9',  'talaba123', 'Jasur',     'Abdullayev',
             'ST-2024-009', 'Kompyuter Injiniringi', 'Dasturlash texnologiyalari',
             'Backend dasturlash', 3, 'DT-32'),
            ('talaba10@student.uz', 'talaba10', 'talaba123', 'Kamola',    'Yusupova',
             'ST-2024-010', 'Kompyuter Injiniringi', 'Axborot tizimlari',
             'Tarmoq texnologiyalari', 2, 'AT-22'),
        ]
        students = []
        for (email, uname, pwd, fname, lname,
             sid, faculty, dept, direction, course, group) in data:
            u = User.objects.create_user(
                email=email, username=uname, password=pwd,
                first_name=fname, last_name=lname, role='student'
            )
            StudentProfile.objects.create(
                user=u, student_id=sid, faculty=faculty,
                department=dept, direction=direction, course=course, group=group
            )
            students.append(u)
        self.stdout.write(self.style.SUCCESS('  [OK] 10 ta Talaba'))
        return students

    # ── 8. To'liq workflow — 10 xil holat ────────────────────────────────────

    def _create_full_workflow(self, students, companies, vacancies, mentors):
        from apps.internships.models import Application, Internship, Task, DailyLog, Evaluation
        from apps.documents.models import Document
        from apps.attendance.models import Attendance
        from apps.reports.models import Report

        hr_users = [User.objects.get(email=f'hr{i if i > 1 else ""}@{"techuz.com" if i == 1 else f"itpark.uz" if i == 2 else f"uzcard.uz" if i == 3 else f"click.uz" if i == 4 else f"myid.uz" if i == 5 else f"eskiz.uz" if i == 6 else f"humans.uz" if i == 7 else f"uzinfocom.uz" if i == 8 else f"nbu.uz" if i == 9 else f"geocad.uz"}') for i in range(1, 11)]
        # Simpler approach
        hr_users = list(User.objects.filter(role='company_hr').order_by('id'))
        sup_users = list(User.objects.filter(role='supervisor').order_by('id'))
        kafedra_users = list(User.objects.filter(role='kafedra').order_by('id'))
        dekanat_user = User.objects.filter(role='dekanat').first()

        today = date.today()

        # ── HOLAT 1: Talaba ariza yubordi (pending) ───────────────────────────
        app1 = Application.objects.create(
            student=students[0], vacancy=vacancies[0],
            cover_letter='Python va Django bo\'yicha tajribaga ega bo\'lishni xohlayman.',
            status='pending',
        )
        self.stdout.write('  ->talaba1: ariza yuborildi (pending)')

        # ── HOLAT 2: HR tasdiqladi, kafedra kutmoqda (hr_approved) ───────────
        app2 = Application.objects.create(
            student=students[1], vacancy=vacancies[1],
            cover_letter='Frontend texnologiyalarini o\'rganishni istayman.',
            status='hr_approved',
            hr_reviewed_by=hr_users[1],
            hr_note='Talaba rezyumesi yaxshi, qabul qilinadi.',
        )
        self.stdout.write('  ->talaba2: HR tasdiqladi (hr_approved)')

        # ── HOLAT 3: Kafedra tasdiqladi, dekanat yo'llanma kutmoqda ──────────
        app3 = Application.objects.create(
            student=students[2], vacancy=vacancies[2],
            cover_letter='Data tahlil sohasida o\'zimi sinab ko\'rmoqchiman.',
            status='kafedra_approved',
            hr_reviewed_by=hr_users[2],
            hr_note='Talaba yaxshi.',
            kafedra_reviewed_by=kafedra_users[2],
            kafedra_note='Kafedra tomonidan tasdiqlandi. Yo\'llanma berilsin.',
        )
        self.stdout.write('  ->talaba3: Kafedra tasdiqladi (kafedra_approved)')

        # ── HOLAT 4: HR rad etdi ──────────────────────────────────────────────
        app4 = Application.objects.create(
            student=students[3], vacancy=vacancies[3],
            cover_letter='Mobile ilovalar yaratishni o\'rganmoqchiman.',
            status='hr_rejected',
            hr_reviewed_by=hr_users[3],
            hr_note='Hozircha bo\'sh joy yo\'q.',
        )
        self.stdout.write('  ->talaba4: HR rad etdi (hr_rejected)')

        # ── HOLAT 5: Kafedra rad etdi ─────────────────────────────────────────
        app5 = Application.objects.create(
            student=students[4], vacancy=vacancies[4],
            cover_letter='DevOps sohasida tajriba olmoqchiman.',
            status='kafedra_rejected',
            hr_reviewed_by=hr_users[4],
            hr_note='Qabul qilinadi.',
            kafedra_reviewed_by=kafedra_users[4],
            kafedra_note='Talabaning o\'zlashtirishi past, hozircha qabul qilinmaydi.',
        )
        self.stdout.write('  ->talaba5: Kafedra rad etdi (kafedra_rejected)')

        # ── HOLAT 6: Yo'llanma yaratildi, korxona kutmoqda (PENDING internship) ─
        app6 = Application.objects.create(
            student=students[5], vacancy=vacancies[5],
            cover_letter='Full stack dasturlashni o\'rganmoqchiman.',
            status='completed',
            hr_reviewed_by=hr_users[5],
            kafedra_reviewed_by=kafedra_users[5],
        )
        internship6 = Internship.objects.create(
            application=app6,
            student=students[5],
            company=companies[5],
            mentor=mentors[5],
            supervisor=sup_users[5],
            position='Full Stack Developer Intern',
            start_date=today + timedelta(days=7),
            end_date=today + timedelta(days=63),
            status='pending',
        )
        doc6 = Document.objects.create(
            internship=internship6,
            student=students[5],
            company=companies[5],
            status='dekan_approved',
            created_by=dekanat_user,
        )
        self.stdout.write('  ->talaba6: Yo\'llanma yaratildi, korxona kutmoqda (pending internship)')

        # ── HOLAT 7: Yo'llanma yuborildi, korxona qabul qilishi kutilmoqda ───
        app7 = Application.objects.create(
            student=students[6], vacancy=vacancies[6],
            cover_letter='UI/UX dizayn sohasida tajriba olmoqchiman.',
            status='completed',
            hr_reviewed_by=hr_users[6],
            kafedra_reviewed_by=kafedra_users[6],
        )
        internship7 = Internship.objects.create(
            application=app7,
            student=students[6],
            company=companies[6],
            mentor=mentors[6],
            supervisor=sup_users[6],
            position='UI/UX Design Intern',
            start_date=today + timedelta(days=3),
            end_date=today + timedelta(days=59),
            status='pending',
        )
        doc7 = Document.objects.create(
            internship=internship7,
            student=students[6],
            company=companies[6],
            status='sent',
            created_by=dekanat_user,
            sent_at=timezone.now(),
        )
        self.stdout.write('  ->talaba7: Yo\'llanma yuborildi, javob kutilmoqda (sent)')

        # ── HOLAT 8: Faol amaliyot — boshlanish bosqichi (ACTIVE, 2 hafta) ───
        app8 = Application.objects.create(
            student=students[7], vacancy=vacancies[7],
            cover_letter='Tarmoq injiniringini o\'rganmoqchiman.',
            status='completed',
            hr_reviewed_by=hr_users[7],
            kafedra_reviewed_by=kafedra_users[7],
        )
        start8 = today - timedelta(days=14)
        internship8 = Internship.objects.create(
            application=app8,
            student=students[7],
            company=companies[7],
            mentor=mentors[7],
            supervisor=sup_users[7],
            position='Network Engineer Intern',
            start_date=start8,
            end_date=start8 + timedelta(days=56),
            status='active',
        )
        doc8 = Document.objects.create(
            internship=internship8,
            student=students[7],
            company=companies[7],
            status='company_accepted',
            created_by=dekanat_user,
            sent_at=timezone.now() - timedelta(days=15),
            accepted_at=timezone.now() - timedelta(days=14),
        )
        # Vazifalar
        task8_1 = Task.objects.create(
            internship=internship8, title='Tarmoq topologiyasini o\'rganish',
            description='Kompaniya tarmoq sxemasini tahlil qilish',
            due_date=start8 + timedelta(days=5),
            status='approved',
            student_note='Tahlil qildim, hisobot yozaman.',
            mentor_note='Yaxshi bajarilgan.',
        )
        task8_2 = Task.objects.create(
            internship=internship8, title='Cisco router konfiguratsiyasi',
            description='Asosiy router sozlamalarini o\'rnatish',
            due_date=start8 + timedelta(days=10),
            status='done',
            student_note='Konfiguratsiyani yaratdim.',
        )
        task8_3 = Task.objects.create(
            internship=internship8, title='Firewall qoidalarini o\'rnatish',
            description='Xavfsizlik qoidalarini konfiguratsiya qilish',
            due_date=today + timedelta(days=5),
            status='pending',
        )
        # Kundaliklar (10 ta)
        for d in range(10):
            log_date = start8 + timedelta(days=d)
            by_mentor = d < 7
            by_sup = d < 5
            by_kaf = d < 4
            DailyLog.objects.create(
                internship=internship8,
                date=log_date,
                description=f'{log_date}: Tarmoq texnologiyalari bo\'yicha {d+1}-kun ishi bajarildi.',
                hours_worked=8,
                approved_by_mentor=by_mentor,
                mentor_comment='Yaxshi' if by_mentor else '',
                approved_by_supervisor=by_sup,
                supervisor_comment='Tasdiqlandi' if by_sup else '',
                approved_by_kafedra=by_kaf,
                kafedra_log_comment='OK' if by_kaf else '',
            )
        # Davomat (14 kun)
        for d in range(14):
            att_date = start8 + timedelta(days=d)
            status = 'present' if d != 4 else 'late'
            Attendance.objects.create(
                internship=internship8,
                date=att_date,
                status=status,
                marked_by=mentors[7].user,
                note='' if status == 'present' else 'Kech keldi',
            )
        self.stdout.write('  ->talaba8: Faol amaliyot, boshlanish bosqichi (2 hafta, 10 kundalik)')

        # ── HOLAT 9: Faol amaliyot — o'rta bosqich (4 hafta, hisobot yozilmoqda)
        app9 = Application.objects.create(
            student=students[8], vacancy=vacancies[8],
            cover_letter='Fintech sohasini o\'rganmoqchiman.',
            status='completed',
            hr_reviewed_by=hr_users[8],
            kafedra_reviewed_by=kafedra_users[8],
        )
        start9 = today - timedelta(days=28)
        internship9 = Internship.objects.create(
            application=app9,
            student=students[8],
            company=companies[8],
            mentor=mentors[8],
            supervisor=sup_users[8],
            position='Financial Systems Analyst Intern',
            start_date=start9,
            end_date=start9 + timedelta(days=56),
            status='active',
            mentor_grade=87.5,
        )
        doc9 = Document.objects.create(
            internship=internship9,
            student=students[8],
            company=companies[8],
            status='company_accepted',
            created_by=dekanat_user,
            sent_at=timezone.now() - timedelta(days=29),
            accepted_at=timezone.now() - timedelta(days=28),
        )
        Evaluation.objects.create(
            internship=internship9,
            evaluator=mentors[8].user,
            evaluator_type='mentor',
            grade=87.5,
            comment='Talaba faol, mustaqil ishlaydi.',
        )
        # 10 ta vazifa (barchasi tasdiqlangan)
        for t in range(10):
            Task.objects.create(
                internship=internship9,
                title=f'Moliyaviy tahlil vazifa #{t+1}',
                description=f'{t+1}-vazifa: Bank ma\'lumotlarini tahlil qilish',
                due_date=start9 + timedelta(days=(t+1)*3),
                status='approved' if t < 8 else 'done',
                student_note='Bajarildi.',
                mentor_note='Tasdiqlandi.' if t < 8 else '',
            )
        # 10 ta kundalik (hammasi tasdiqlangan)
        for d in range(10):
            DailyLog.objects.create(
                internship=internship9,
                date=start9 + timedelta(days=d * 2),
                description=f'Bank tizimlari bilan ishlash — {d+1}-kun. SQL so\'rovlar yozildi.',
                hours_worked=8,
                approved_by_mentor=True,
                mentor_comment='Yaxshi ishladi.',
                approved_by_supervisor=True,
                supervisor_comment='Tasdiqlandi.',
                approved_by_kafedra=d < 8,
                kafedra_log_comment='OK' if d < 8 else '',
            )
        # Hisobot yuborilgan lekin tasdiqlanmagan
        Report.objects.create(
            internship=internship9,
            title='4 haftalik amaliyot hisoboti — Moliya tizimlari',
            content=(
                'Ushbu hisobotda bank tizimlari bilan ishlash tajribam bayon etilgan.\n\n'
                '1. Birinchi hafta: Bank ma\'lumotlar bazasi tuzilishi o\'rganildi.\n'
                '2. Ikkinchi hafta: SQL so\'rovlari yordamida tahlil ishlari amalga oshirildi.\n'
                '3. Uchinchi hafta: Moliyaviy hisobotlar tayyorlash texnologiyalari o\'rganildi.\n'
                '4. To\'rtinchi hafta: Mustaqil loyiha tayyorlandi va taqdim etildi.\n\n'
                'Xulosa: Amaliyot davomida moliya texnologiyalari bo\'yicha chuqur bilim oldim.'
            ),
            status='submitted',
            submitted_at=timezone.now() - timedelta(days=1),
        )
        # Davomat 28 kun
        for d in range(28):
            att_date = start9 + timedelta(days=d)
            if att_date.weekday() < 5:
                Attendance.objects.create(
                    internship=internship9,
                    date=att_date,
                    status='present' if d != 10 else 'absent',
                    marked_by=mentors[8].user,
                    note='' if d != 10 else 'Kasal',
                )
        self.stdout.write('  ->talaba9: Faol amaliyot, o\'rta bosqich (4 hafta, hisobot yuborilgan)')

        # ── HOLAT 10: Yakunlangan amaliyot — barcha baholar, hisobot tasdiqlangan
        app10 = Application.objects.create(
            student=students[9], vacancy=vacancies[9],
            cover_letter='GIS texnologiyalarini o\'rganmoqchiman.',
            status='completed',
            hr_reviewed_by=hr_users[9],
            kafedra_reviewed_by=kafedra_users[9],
        )
        start10 = today - timedelta(days=70)
        internship10 = Internship.objects.create(
            application=app10,
            student=students[9],
            company=companies[9],
            mentor=mentors[9],
            supervisor=sup_users[9],
            position='GIS Developer Intern',
            start_date=start10,
            end_date=start10 + timedelta(days=56),
            status='completed',
            mentor_grade=91.0,
            supervisor_grade=88.0,
            final_grade=89.5,
            final_grade_letter='A',
        )
        doc10 = Document.objects.create(
            internship=internship10,
            student=students[9],
            company=companies[9],
            status='company_accepted',
            created_by=dekanat_user,
            sent_at=timezone.now() - timedelta(days=71),
            accepted_at=timezone.now() - timedelta(days=70),
        )
        Evaluation.objects.create(
            internship=internship10,
            evaluator=mentors[9].user,
            evaluator_type='mentor',
            grade=91.0,
            comment='Ajoyib talaba, barcha topshiriqlarni o\'z vaqtida bajarildi.',
        )
        Evaluation.objects.create(
            internship=internship10,
            evaluator=sup_users[9],
            evaluator_type='supervisor',
            grade=88.0,
            comment='Talaba mustaqil fikrlash qobiliyatini ko\'rsatdi.',
        )
        # 10 ta vazifa (hammasi tasdiqlangan)
        for t in range(10):
            Task.objects.create(
                internship=internship10,
                title=f'GIS loyiha vazifasi #{t+1}',
                description=f'{t+1}-bosqich: Geo ma\'lumotlarni qayta ishlash',
                due_date=start10 + timedelta(days=(t+1)*5),
                status='approved',
                student_note='Bajarildi va taqdim etildi.',
                mentor_note='A\'lo darajada bajarilgan.',
            )
        # 10 ta kundalik (hammasi tasdiqlangan)
        for d in range(10):
            DailyLog.objects.create(
                internship=internship10,
                date=start10 + timedelta(days=d * 5),
                description=f'GIS ma\'lumotlarni tahlil qilish — {d+1}-kun. QGIS va Python ishlatildi.',
                hours_worked=8,
                approved_by_mentor=True,
                mentor_comment='Yaxshi ishladi.',
                approved_by_supervisor=True,
                supervisor_comment='Tasdiqlandi.',
                approved_by_kafedra=True,
                kafedra_log_comment='OK',
            )
        # Hisobot — tasdiqlangan
        supervisor_user = sup_users[9]
        kafedra_u = kafedra_users[9]
        report10 = Report.objects.create(
            internship=internship10,
            title='Yakuniy amaliyot hisoboti — GIS texnologiyalari',
            content=(
                'Ushbu yakuniy hisobotda 8 haftalik amaliyot natijalari bayon etilgan.\n\n'
                '1-2 hafta: QGIS dasturida geoma\'lumotlar bilan ishlash o\'rganildi.\n'
                '3-4 hafta: Python yordamida geo-ma\'lumotlarni qayta ishlash amalga oshirildi.\n'
                '5-6 hafta: Xarita yaratish va vizualizatsiya texnikasi o\'rganildi.\n'
                '7-8 hafta: Yakuniy loyiha: Toshkent shahrining transport xaritasi yaratildi.\n\n'
                'Natijalar: GIS sohasida mustaqil ishlash ko\'nikmalari o\'zlashtirildi.\n'
                'Xulosa: Amaliyot muvaffaqiyatli yakunlandi.'
            ),
            status='approved',
            grade=92.0,
            reviewer_comment='Hisobot a\'lo darajada yozilgan, loyiha muvaffaqiyatli.',
            reviewed_by=supervisor_user,
            submitted_at=timezone.now() - timedelta(days=10),
            reviewed_at=timezone.now() - timedelta(days=8),
            kafedra_approved=True,
            kafedra_reviewed_by=kafedra_u,
            kafedra_reviewed_at=timezone.now() - timedelta(days=7),
            kafedra_comment='Kafedra ham tasdiqladi.',
        )
        # Davomat 56 kun
        att_count = 0
        for d in range(56):
            att_date = start10 + timedelta(days=d)
            if att_date.weekday() < 5:
                Attendance.objects.create(
                    internship=internship10,
                    date=att_date,
                    status='present' if d not in [7, 21] else 'absent',
                    marked_by=mentors[9].user,
                )
                att_count += 1
        self.stdout.write('  ->talaba10: Amaliyot yakunlandi, A baho, hisobot tasdiqlangan')

    # ── Yakuniy hisobot ───────────────────────────────────────────────────────

    def _print_summary(self):
        self.stdout.write('\n' + '=' * 65)
        self.stdout.write('  BARCHA AKKAUNTLAR')
        self.stdout.write('=' * 65)
        rows = [
            ('Admin (10 ta)',          'admin@otm.uz ... admin10@otm.uz',         'admin123456'),
            ('Dekanat (10 ta)',         'dekanat@otm.uz ... dekanat10@otm.uz',     'dekanat123'),
            ('Kafedra (10 ta)',         'kafedra@otm.uz ... kafedra10@otm.uz',     'kafedra123'),
            ('Amaliyot Rahbar (10 ta)','rahbar@otm.uz ... rahbar10@otm.uz',        'rahbar123'),
            ('Korxona HR (10 ta)',      'hr@techuz.com ... hr10@geocad.uz',         'hr123456'),
            ('Mentor (10 ta)',          'mentor@techuz.com ... mentor10@geocad.uz', 'mentor123'),
            ('Talaba (10 ta)',          'talaba1@student.uz ... talaba10@student.uz','talaba123'),
        ]
        for role, emails, pwd in rows:
            self.stdout.write(f'  {role:<25} | Parol: {pwd}')
        self.stdout.write('\n  AMALIYOT HOLATLARI (talabalar bo\'yicha):')
        self.stdout.write('=' * 65)
        statuses = [
            ('talaba1', 'PENDING',           'Ariza yuborildi, HR kutmoqda'),
            ('talaba2', 'HR_APPROVED',       'HR tasdiqladi, kafedra kutmoqda'),
            ('talaba3', 'KAFEDRA_APPROVED',  'Kafedra tasdiqladi, yo\'llanma kutmoqda'),
            ('talaba4', 'HR_REJECTED',       'HR rad etdi'),
            ('talaba5', 'KAFEDRA_REJECTED',  'Kafedra rad etdi'),
            ('talaba6', 'PENDING internship','Yo\'llanma yaratildi, korxona kutmoqda'),
            ('talaba7', 'SENT document',     'Yo\'llanma yuborildi, korxona javob berishi kerak'),
            ('talaba8', 'ACTIVE — boshlang\'ich','2 hafta faol, vazifalar, kundaliklar, davomat'),
            ('talaba9', 'ACTIVE — o\'rta',  '4 hafta faol, mentor baho, hisobot yuborilgan'),
            ('talaba10','COMPLETED — A baho','Yakunlandi, barcha baholar, hisobot tasdiqlangan'),
        ]
        for talaba, holat, izoh in statuses:
            self.stdout.write(f'  {talaba:<10} | {holat:<22} | {izoh}')
        self.stdout.write('=' * 65)
        self.stdout.write(self.style.SUCCESS('\n  [TAYYOR] Jami 70 ta foydalanuvchi + to\'liq workflow data!'))
