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
        // ================ عام ================
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
        'hr_manager': 'مدير الموارد البشرية',
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
        'years': 'سنوات',
        'na': 'غير متوفر',

        // ================ حالات الطلبات ================
        'pending': 'قيد الانتظار',
        'approved': 'معتمدة',
        'rejected': 'مرفوضة',
        'hr_approved': 'تمت موافقة HR',
        'manager_approved': 'تمت موافقة المدير',
        'pending_approvals': 'في انتظار الموافقات',
        'one_approval': 'موافقة واحدة',
        'pending_from': 'في انتظار',

        // ================ أزرار الموافقة والرفض ================
        'approve': 'موافقة',
        'reject': 'رفض',
        'approve_as_manager_and_hr': 'موافقة كمدير و HR',
        'approve_as_hr': 'موافقة كـ HR',
        'approve_request': 'الموافقة على الطلب',
        'reject_request': 'رفض الطلب',

        // ================ أنواع الإجازات ================
        'leave_type_annual': 'سنوية',
        'leave_type_sick': 'مرضية',
        'leave_type_emergency': 'عارضة',
        'leave_type_unpaid': 'غير مدفوعة',
        'annual_leave': 'إجازة سنوية',
        'sick_leave': 'إجازة مرضية',
        'emergency_leave': 'إجازة عارضة',
        'unpaid_leave': 'إجازة غير مدفوعة',

        // ================ أنواع الإذن ================
        'permission_hour': 'ساعة',
        'permission_two_hours': 'ساعتين',
        'permission_half_day': 'نص يوم',
        'one_hour': 'ساعة واحدة',
        'two_hours': 'ساعتين',
        'half_day': 'نصف يوم',

        // ================ صفحات الموظفين ================
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
        'annual_total': 'الإجمالي السنوي',
        'emergency_total': 'إجمالي العارضة',
        'emergency_used': 'مستخدم عارضة',
        'emergency_remaining': 'متبقي عارضة',
        'years_of_service': 'سنوات الخدمة',
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
        'reason_optional': 'السبب (اختياري)',
        'reason_required': 'السبب (مطلوب)',
        'request_leave': 'طلب إجازة',
        'request_overtime': 'طلب أوفر تايم',
        'request_permission': 'طلب إذن',
        'request_correction': 'طلب تصحيح',
        'new_leave_request': 'طلب إجازة جديد',
        'new_overtime_request': 'طلب أوفر تايم جديد',
        'new_permission_request': 'طلب إذن جديد',
        'new_correction_request': 'طلب تصحيح جديد',
        'select_dates_to_view': 'اختر التواريخ للعرض',
        'no_attendance_today': 'لا يوجد حضور اليوم',
        'example_2_5': 'مثال: 2.5',

        // ================ صفحات المدير ================
        'manager_page': 'لوحة تحكم المدير',
        'employee_requests': 'طلبات الموظفين',
        'managed_departments': 'الأقسام التي تديرها',
        'pending_requests': 'الطلبات المعلقة',
        'request_details': 'تفاصيل الطلب',
        'no_departments_managed': 'لا تدير أي أقسام',
        'you_are_manager': 'أنت مدير على هذا القسم',

        // ================ صفحات الأدمن ================
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
        'current_managers': 'المدراء الحاليون',
        'select_manager': 'اختر مدير',
        'manage_managers_for': 'إدارة المدراء لقسم',
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
        'add_new_employee': 'إضافة موظف جديد',
        'full_name': 'الاسم الكامل',
        'select_department': 'اختر القسم',
        'no_department': 'بدون قسم',
        'click_to_sort': 'اضغط للترتيب',
        'upload_info': 'يمكنك رفع ملف Excel لاستيراد الموظفين',
        'required_columns': 'الأعمدة المطلوبة',
        'download_template': 'تحميل النموذج',
        'file': 'الملف',
        'records': 'السجلات',
        'no_data_period': 'لا توجد بيانات للفترة المحددة',
        'total_hours': 'إجمالي الساعات',
        'work_days': 'أيام العمل',
        'average': 'المتوسط',
        'hours_per_day': 'ساعة/يوم',

        // ================ صفحة تسجيل الدخول ================
        'login': 'تسجيل الدخول',
        'remember_me': 'تذكرني',
        'login_button': 'دخول',
        'checking': 'جاري التحقق...',
        'invalid_credentials': 'بيانات الدخول غير صحيحة',
        'login_required': 'يجب تسجيل الدخول أولاً',

        // ================ تغيير كلمة المرور ================
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

        // ================ أخطاء ورسائل ================
        'unauthorized': 'غير مصرح بالدخول',
        'location_error': 'فشل في الحصول على الموقع',
        'gps_not_supported': 'الـ GPS غير مدعوم في متصفحك',
        'location_not_available': 'الموقع غير متاح',
        'error_occurred': 'حدث خطأ',
        'no_data_to_upload': 'لا توجد بيانات للرفع',
        'missing_data': 'بيانات ناقصة',
        'error_processing': 'خطأ في المعالجة',
        'department_name_required': 'اسم القسم مطلوب',
        'select_dates': 'يرجى تحديد التواريخ',
        'select_date_and_hours': 'يرجى تحديد التاريخ وعدد الساعات',
        'select_date_and_reason': 'يرجى تحديد التاريخ والسبب',
        'select_start_time': 'يرجى تحديد وقت البداية',
        'fill_required_fields': 'يرجى ملء جميع الحقول المطلوبة',
        'insufficient_balance': 'رصيد غير كافٍ',
        'insufficient_emergency_balance': 'رصيد الإجازة العارضة غير كافٍ',

        // ================ رسائل تأكيد ================
        'confirm_delete': 'هل أنت متأكد من الحذف؟',
        'confirm_delete_employee': 'هل أنت متأكد من حذف الموظف؟',
        'confirm_delete_department': 'هل أنت متأكد من حذف القسم؟',
        'confirm_remove_manager': 'هل أنت متأكد من إزالة المدير؟',

        // ================ رسائل نجاح ================
        'employee_added': 'تم إضافة الموظف بنجاح',
        'employee_updated': 'تم تعديل الموظف بنجاح',
        'employee_deleted': 'تم حذف الموظف بنجاح',
        'department_added': 'تم إضافة القسم بنجاح',
        'department_updated': 'تم تعديل القسم بنجاح',
        'department_deleted': 'تم حذف القسم بنجاح',
        'manager_added': 'تم إضافة المدير بنجاح',
        'manager_removed': 'تم إزالة المدير بنجاح',

        // ================ أعمدة Excel ================
        'name_column': 'الاسم',
        'username_column': 'اسم المستخدم',
        'password_column': 'كلمة المرور',
        'email_column': 'البريد الإلكتروني',
        'phone_column': 'رقم الهاتف',
        'job_title_column': 'المسمى الوظيفي',
        'department_column': 'القسم',
        'hire_date_column': 'تاريخ التعيين',
        'role_column': 'الدور',
        'days': 'يوم',
        'save_all': 'حفظ الكل',
        'cancel_all': 'الغاء الكل',
        // ================ الفوتر ================
        'footer': 'جميع الحقوق محفوظة',
        'developed_by': 'تم التطوير بواسطة',
    },
    en: {
        // ================ General ================
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
        'hr_manager': 'HR Manager',
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
        'years': 'Years',
        'na': 'N/A',

        // ================ Request status ================
        'pending': 'Pending',
        'approved': 'Approved',
        'rejected': 'Rejected',
        'hr_approved': 'HR Approved',
        'manager_approved': 'Manager Approved',
        'pending_approvals': 'Pending Approvals',
        'one_approval': 'One Approval',
        'pending_from': 'Pending from',

        // ================ Approve/Reject Buttons ================
        'approve': 'Approve',
        'reject': 'Reject',
        'approve_as_manager_and_hr': 'Approve as Manager & HR',
        'approve_as_hr': 'Approve as HR',
        'approve_request': 'Approve Request',
        'reject_request': 'Reject Request',

        // ================ Leave types ================
        'leave_type_annual': 'Annual',
        'leave_type_sick': 'Sick',
        'leave_type_emergency': 'Emergency',
        'leave_type_unpaid': 'Unpaid',
        'annual_leave': 'Annual Leave',
        'sick_leave': 'Sick Leave',
        'emergency_leave': 'Emergency Leave',
        'unpaid_leave': 'Unpaid Leave',

        // ================ Permission types ================
        'permission_hour': 'Hour',
        'permission_two_hours': 'Two Hours',
        'permission_half_day': 'Half Day',
        'one_hour': 'One Hour',
        'two_hours': 'Two Hours',
        'half_day': 'Half Day',

        // ================ Employee pages ================
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
        'annual_total': 'Annual Total',
        'emergency_total': 'Emergency Total',
        'emergency_used': 'Emergency Used',
        'emergency_remaining': 'Emergency Remaining',
        'years_of_service': 'Years of Service',
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
        'reason_optional': 'Reason (Optional)',
        'reason_required': 'Reason (Required)',
        'request_leave': 'Request Leave',
        'request_overtime': 'Request Overtime',
        'request_permission': 'Request Permission',
        'request_correction': 'Request Correction',
        'new_leave_request': 'New Leave Request',
        'new_overtime_request': 'New Overtime Request',
        'new_permission_request': 'New Permission Request',
        'new_correction_request': 'New Correction Request',
        'select_dates_to_view': 'Select dates to view',
        'no_attendance_today': 'No attendance today',
        'example_2_5': 'Example: 2.5',

        // ================ Manager pages ================
        'manager_page': 'Manager Dashboard',
        'employee_requests': 'Employee Requests',
        'managed_departments': 'Managed Departments',
        'pending_requests': 'Pending Requests',
        'request_details': 'Request Details',
        'no_departments_managed': 'You do not manage any departments',
        'you_are_manager': 'You are manager for this department',

        // ================ Admin pages ================
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
        'current_managers': 'Current Managers',
        'select_manager': 'Select Manager',
        'manage_managers_for': 'Manage Managers for',
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
        'add_new_employee': 'Add New Employee',
        'full_name': 'Full Name',
        'select_department': 'Select Department',
        'no_department': 'No Department',
        'click_to_sort': 'Click to sort',
        'upload_info': 'You can upload an Excel file to import employees',
        'required_columns': 'Required columns',
        'download_template': 'Download Template',
        'file': 'File',
        'records': 'Records',
        'no_data_period': 'No data for selected period',
        'total_hours': 'Total Hours',
        'work_days': 'Work Days',
        'average': 'Average',
        'hours_per_day': 'Hours/Day',

        // ================ Login page ================
        'login': 'Login',
        'remember_me': 'Remember Me',
        'login_button': 'Login',
        'checking': 'Checking...',
        'invalid_credentials': 'Invalid credentials',
        'login_required': 'Login required',

        // ================ Password change ================
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

        // ================ Errors and Messages ================
        'unauthorized': 'Unauthorized access',
        'location_error': 'Failed to get location',
        'gps_not_supported': 'GPS not supported in your browser',
        'location_not_available': 'Location not available',
        'error_occurred': 'An error occurred',
        'no_data_to_upload': 'No data to upload',
        'missing_data': 'Missing data',
        'error_processing': 'Error processing',
        'department_name_required': 'Department name is required',
        'select_dates': 'Please select dates',
        'select_date_and_hours': 'Please select date and hours',
        'select_date_and_reason': 'Please select date and reason',
        'select_start_time': 'Please select start time',
        'fill_required_fields': 'Please fill all required fields',
        'insufficient_balance': 'Insufficient balance',
        'insufficient_emergency_balance': 'Insufficient emergency leave balance',

        // ================ Confirmation Messages ================
        'confirm_delete': 'Are you sure you want to delete?',
        'confirm_delete_employee': 'Are you sure you want to delete this employee?',
        'confirm_delete_department': 'Are you sure you want to delete this department?',
        'confirm_remove_manager': 'Are you sure you want to remove this manager?',

        // ================ Success Messages ================
        'employee_added': 'Employee added successfully',
        'employee_updated': 'Employee updated successfully',
        'employee_deleted': 'Employee deleted successfully',
        'department_added': 'Department added successfully',
        'department_updated': 'Department updated successfully',
        'department_deleted': 'Department deleted successfully',
        'manager_added': 'Manager added successfully',
        'manager_removed': 'Manager removed successfully',

        // ================ Excel Columns ================
        'name_column': 'Name',
        'username_column': 'Username',
        'password_column': 'Password',
        'email_column': 'Email',
        'phone_column': 'Phone',
        'job_title_column': 'Job Title',
        'department_column': 'Department',
        'hire_date_column': 'Hire Date',
        'role_column': 'Role',
        'days': 'days',
        'save_all': 'save_all',
        'cancel_all': 'cancel_all',
        // ================ Footer ================
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