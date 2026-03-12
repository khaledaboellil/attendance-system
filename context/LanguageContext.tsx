// context/LanguageContext.tsx
"use client"
import { createContext, useContext, useState, useEffect } from 'react'

type Language = 'ar' | 'en'

type LanguageContextType = {
    language: Language
    setLanguage: (lang: Language) => void
    t: (key: string) => string
    dir: 'rtl' | 'ltr'
}

// تعريف موحد للترجمات بدون تكرار
const translations = {
    ar: {
        // عام
        'dashboard': 'لوحة المعلومات',
        'employees': 'الموظفين',
        'departments': 'الأقسام',
        'requests': 'الطلبات',
        'reports': 'التقارير',
        'attendance': 'الحضور',
        'settings': 'الإعدادات',
        'logout': 'تسجيل خروج',
        'add': 'إضافة',
        'edit': 'تعديل',
        'delete': 'حذف',
        'save': 'حفظ',
        'cancel': 'إلغاء',
        'search': 'بحث',
        'filter': 'تصفية',
        'all': 'الكل',
        'from': 'من',
        'to': 'إلى',
        'date': 'التاريخ',
        'reason': 'السبب',
        'actions': 'الإجراءات',
        'status': 'الحالة',
        'name': 'الاسم',
        'username': 'اسم المستخدم',
        'password': 'كلمة المرور',
        'email': 'البريد الإلكتروني',
        'phone': 'رقم الهاتف',
        'job_title': 'المسمى الوظيفي',
        'hire_date': 'تاريخ التعيين',
        'role': 'الدور',
        'department': 'القسم',
        'manager': 'مدير',
        'employee': 'موظف',
        'admin': 'مدير النظام',
        'hr': 'الموارد البشرية',
        'confirm': 'تأكيد',
        'close': 'إغلاق',
        'loading': 'جاري التحميل...',
        'no_data': 'لا توجد بيانات',
        'error': 'حدث خطأ',
        'success': 'تم بنجاح',
        'warning': 'تحذير',
        'info': 'معلومات',
        'view': 'عرض',
        'details': 'التفاصيل',

        // حالات الطلبات
        'pending': 'قيد الانتظار',
        'approved': 'معتمدة',
        'rejected': 'مرفوضة',

        // أنواع الإجازات
        'leave_type_annual': 'سنوية',
        'leave_type_sick': 'مرضية',
        'leave_type_emergency': 'عارضة',
        'leave_type_unpaid': 'غير مدفوعة',
        'annual_leave': 'إجازة سنوية',
        'sick_leave': 'إجازة مرضية',
        'emergency_leave': 'إجازة عارضة',
        'unpaid_leave': 'إجازة غير مدفوعة',

        // صفحات الموظفين
        'employee_page': 'صفحة الموظف',
        'my_attendance': 'حضوري',
        'my_leaves': 'إجازاتي',
        'my_overtime': 'أوفر تايمي',
        'my_permissions': 'إذوني',
        'my_corrections': 'تصحيح بصمتي',
        'leave_balance': 'رصيد الإجازات',
        'used': 'مستخدم',
        'remaining': 'المتبقي',
        'total': 'الإجمالي',
        'check_in': 'تسجيل حضور',
        'check_out': 'تسجيل انصراف',
        'location_status': 'حالة الموقع',
        'getting_location': 'جاري الحصول على الموقع...',
        'location_success': 'تم الحصول على الموقع بنجاح',
        'today_attendance': 'حضور اليوم',
        'attendance_history': 'سجل الحضور',
        'new_request': 'طلب جديد',
        'leave_type': 'نوع الإجازة',
        'start_date': 'تاريخ البداية',
        'end_date': 'تاريخ النهاية',
        'hours': 'عدد الساعات',
        'permission_type': 'نوع الإذن',
        'expected_check_in': 'وقت الحضور المفترض',
        'expected_check_out': 'وقت الانصراف المفترض',
        'submit_request': 'تقديم الطلب',
        'previous_requests': 'الطلبات السابقة',
        'correction_for': 'تصحيح ليوم',

        // صفحات المدير
        'manager_page': 'لوحة تحكم المدير',
        'employee_requests': 'طلبات الموظفين',
        'managed_departments': 'الأقسام التي تديرها',
        'approve': 'موافقة',
        'reject': 'رفض',
        'pending_requests': 'الطلبات المعلقة',
        'request_details': 'تفاصيل الطلب',

        // صفحات الأدمن
        'admin_page': 'لوحة تحكم الموارد البشرية',
        'total_employees': 'إجمالي الموظفين',
        'total_departments': 'إجمالي الأقسام',
        'bulk_upload': 'رفع ملف Excel',
        'upload_template': 'تحميل نموذج Excel',
        'choose_file': 'اختر ملف',
        'start_upload': 'بدء الرفع',
        'upload_results': 'نتائج الرفع',
        'success_count': 'عدد الناجحين',
        'failed_count': 'عدد الفاشلين',
        'errors': 'الأخطاء',
        'manage_departments': 'إدارة الأقسام',
        'add_department': 'إضافة قسم',
        'edit_department': 'تعديل قسم',
        'department_name': 'اسم القسم',
        'employees_count': 'عدد الموظفين',
        'managers': 'المدراء',
        'add_manager': 'إضافة مدير',
        'remove_manager': 'إزالة مدير',
        'all_requests': 'جميع الطلبات',
        'request_type': 'نوع الطلب',
        'filter_by_department': 'تصفية حسب القسم',
        'filter_by_type': 'تصفية حسب النوع',
        'filter_by_status': 'تصفية حسب الحالة',
        'export_report': 'تصدير التقرير',
        'attendance_report': 'تقرير الحضور',
        'absences_report': 'تقرير الغياب',
        'leaves_report': 'تقرير الإجازات',
        'view_report': 'عرض التقرير',
        'add_employee': 'إضافة موظف',

        // صفحة تسجيل الدخول
        'login': 'تسجيل الدخول',
        'remember_me': 'تذكرني',
        'login_button': 'دخول',
        'checking': 'جاري التحقق...',
        'invalid_credentials': 'بيانات الدخول غير صحيحة',

        // تغيير كلمة المرور
        'change_password': 'تغيير كلمة المرور',
        'current_password': 'كلمة المرور الحالية',
        'new_password': 'كلمة المرور الجديدة',
        'confirm_password': 'تأكيد كلمة المرور',
        'save_new_password': 'حفظ كلمة المرور الجديدة',
        'password_changed_success': 'تم تغيير كلمة المرور بنجاح',
        'all_fields_required': 'جميع الحقول مطلوبة',
        'passwords_not_match': 'كلمة المرور الجديدة غير متطابقة',
        'password_min_length': 'كلمة المرور يجب أن تكون ٣ أحرف على الأقل',
        'connection_error': 'خطأ في الاتصال',

        // الفوتر
        'footer': 'جميع الحقوق محفوظة',
        'developed_by': 'تم التطوير بواسطة',
    },
    en: {
        // General
        'dashboard': 'Dashboard',
        'employees': 'Employees',
        'departments': 'Departments',
        'requests': 'Requests',
        'reports': 'Reports',
        'attendance': 'Attendance',
        'settings': 'Settings',
        'logout': 'Logout',
        'add': 'Add',
        'edit': 'Edit',
        'delete': 'Delete',
        'save': 'Save',
        'cancel': 'Cancel',
        'search': 'Search',
        'filter': 'Filter',
        'all': 'All',
        'from': 'From',
        'to': 'To',
        'date': 'Date',
        'reason': 'Reason',
        'actions': 'Actions',
        'status': 'Status',
        'name': 'Name',
        'username': 'Username',
        'password': 'Password',
        'email': 'Email',
        'phone': 'Phone',
        'job_title': 'Job Title',
        'hire_date': 'Hire Date',
        'role': 'Role',
        'department': 'Department',
        'manager': 'Manager',
        'employee': 'Employee',
        'admin': 'Admin',
        'hr': 'HR',
        'confirm': 'Confirm',
        'close': 'Close',
        'loading': 'Loading...',
        'no_data': 'No data available',
        'error': 'An error occurred',
        'success': 'Success',
        'warning': 'Warning',
        'info': 'Info',
        'view': 'View',
        'details': 'Details',

        // Request status
        'pending': 'Pending',
        'approved': 'Approved',
        'rejected': 'Rejected',

        // Leave types
        'leave_type_annual': 'Annual',
        'leave_type_sick': 'Sick',
        'leave_type_emergency': 'Emergency',
        'leave_type_unpaid': 'Unpaid',
        'annual_leave': 'Annual Leave',
        'sick_leave': 'Sick Leave',
        'emergency_leave': 'Emergency Leave',
        'unpaid_leave': 'Unpaid Leave',

        // Employee pages
        'employee_page': 'Employee Page',
        'my_attendance': 'My Attendance',
        'my_leaves': 'My Leaves',
        'my_overtime': 'My Overtime',
        'my_permissions': 'My Permissions',
        'my_corrections': 'My Corrections',
        'leave_balance': 'Leave Balance',
        'used': 'Used',
        'remaining': 'Remaining',
        'total': 'Total',
        'check_in': 'Check In',
        'check_out': 'Check Out',
        'location_status': 'Location Status',
        'getting_location': 'Getting location...',
        'location_success': 'Location obtained successfully',
        'today_attendance': "Today's Attendance",
        'attendance_history': 'Attendance History',
        'new_request': 'New Request',
        'leave_type': 'Leave Type',
        'start_date': 'Start Date',
        'end_date': 'End Date',
        'hours': 'Hours',
        'permission_type': 'Permission Type',
        'expected_check_in': 'Expected Check In',
        'expected_check_out': 'Expected Check Out',
        'submit_request': 'Submit Request',
        'previous_requests': 'Previous Requests',
        'correction_for': 'Correction for',

        // Manager pages
        'manager_page': 'Manager Dashboard',
        'employee_requests': 'Employee Requests',
        'managed_departments': 'Managed Departments',
        'approve': 'Approve',
        'reject': 'Reject',
        'pending_requests': 'Pending Requests',
        'request_details': 'Request Details',

        // Admin pages
        'admin_page': 'HR Dashboard',
        'total_employees': 'Total Employees',
        'total_departments': 'Total Departments',
        'bulk_upload': 'Bulk Upload',
        'upload_template': 'Download Excel Template',
        'choose_file': 'Choose File',
        'start_upload': 'Start Upload',
        'upload_results': 'Upload Results',
        'success_count': 'Success Count',
        'failed_count': 'Failed Count',
        'errors': 'Errors',
        'manage_departments': 'Manage Departments',
        'add_department': 'Add Department',
        'edit_department': 'Edit Department',
        'department_name': 'Department Name',
        'employees_count': 'Employees Count',
        'managers': 'Managers',
        'add_manager': 'Add Manager',
        'remove_manager': 'Remove Manager',
        'all_requests': 'All Requests',
        'request_type': 'Request Type',
        'filter_by_department': 'Filter by Department',
        'filter_by_type': 'Filter by Type',
        'filter_by_status': 'Filter by Status',
        'export_report': 'Export Report',
        'attendance_report': 'Attendance Report',
        'absences_report': 'Absences Report',
        'leaves_report': 'Leaves Report',
        'view_report': 'View Report',
        'add_employee': 'Add Employee',

        // Login page
        'login': 'Login',
        'remember_me': 'Remember Me',
        'login_button': 'Login',
        'checking': 'Checking...',
        'invalid_credentials': 'Invalid credentials',

        // Password change
        'change_password': 'Change Password',
        'current_password': 'Current Password',
        'new_password': 'New Password',
        'confirm_password': 'Confirm Password',
        'save_new_password': 'Save New Password',
        'password_changed_success': 'Password changed successfully',
        'all_fields_required': 'All fields are required',
        'passwords_not_match': 'New passwords do not match',
        'password_min_length': 'Password must be at least 3 characters',
        'connection_error': 'Connection error',

        // Footer
        'footer': 'All rights reserved',
        'developed_by': 'Developed by',
    }
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>('ar')

    useEffect(() => {
        const savedLang = localStorage.getItem('language') as Language
        if (savedLang) {
            setLanguage(savedLang)
            document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr'
            document.documentElement.lang = savedLang
        }
    }, [])

    const handleSetLanguage = (lang: Language) => {
        setLanguage(lang)
        localStorage.setItem('language', lang)
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
        document.documentElement.lang = lang
    }

    const t = (key: string): string => {
        return translations[language][key as keyof typeof translations['ar']] || key
    }

    const dir = language === 'ar' ? 'rtl' : 'ltr'

    return (
        <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t, dir }}>
            {children}
        </LanguageContext.Provider>
    )
}

export const useLanguage = () => {
    const context = useContext(LanguageContext)
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider')
    }
    return context
}