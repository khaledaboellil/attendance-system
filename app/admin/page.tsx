"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import * as XLSX from 'xlsx'

type Employee = {
    id: string
    name: string
    username: string
    role: string
    email?: string
    phone?: string
    job_title?: string
    department_id?: number
    department_name?: string
    hire_date?: string
}

type Department = {
    id: number
    name: string
    manager_id?: string
    employees_count?: number
    managers?: { id: string; name: string; username: string }[]
}

type LeaveRequest = {
    id: string
    employee_id: string
    employees?: {
        id: string
        name: string
        username: string
        department_id?: number
    }
    leave_type: string
    start_date: string
    end_date: string
    reason?: string
    hr_approved: boolean
    manager_approved: boolean
    status: string
    created_at: string
    approval_status?: string
    pending_from?: string
}

type AttendanceRecord = {
    id: string
    employee_id: string
    day: string
    check_in: string | null
    check_out: string | null
    location?: string
    employees?: {
        name: string
        username: string
        department_id?: number
    }
    total_hours?: number
}

export default function AdminPage() {
    const router = useRouter()

    // ==================== بيانات المستخدم ====================
    const [adminName, setAdminName] = useState("")
    const [adminUsername, setAdminUsername] = useState("")
    const [adminId, setAdminId] = useState("")

    // ==================== التبويبات ====================
    const [activeTab, setActiveTab] = useState<"dashboard" | "employees" | "departments" | "leaveRequests" | "attendanceReport" | "reports" | "attendance" | "bulkUpload">("dashboard")

    // ==================== بيانات الموظفين ====================
    const [employees, setEmployees] = useState<Employee[]>([])
    const [departments, setDepartments] = useState<Department[]>([])

    // ==================== إضافة موظف ====================
    const [showAddForm, setShowAddForm] = useState(false)
    const [name, setName] = useState("")
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [role, setRole] = useState("employee")
    const [email, setEmail] = useState("")
    const [phone, setPhone] = useState("")
    const [jobTitle, setJobTitle] = useState("")
    const [departmentId, setDepartmentId] = useState<number | "">("")
    const [hireDate, setHireDate] = useState("")

    // ==================== رفع Excel ====================
    const [excelFile, setExcelFile] = useState<File | null>(null)
    const [excelData, setExcelData] = useState<any[]>([])
    const [uploadLoading, setUploadLoading] = useState(false)
    const [uploadResults, setUploadResults] = useState<{ success: number, failed: number, errors: string[] }>({
        success: 0,
        failed: 0,
        errors: []
    })

    // ==================== إدارة الأقسام ====================
    const [showDeptForm, setShowDeptForm] = useState(false)
    const [deptName, setDeptName] = useState("")
    const [editingDept, setEditingDept] = useState<Department | null>(null)
    const [showManageManagers, setShowManageManagers] = useState(false)
    const [selectedDept, setSelectedDept] = useState<Department | null>(null)
    const [availableManagers, setAvailableManagers] = useState<Employee[]>([])
    const [deptManagers, setDeptManagers] = useState<any[]>([])

    // ==================== طلبات الإجازات ====================
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
    const [selectedDepartment, setSelectedDepartment] = useState<string>("all")
    const [requestsDateFrom, setRequestsDateFrom] = useState("")
    const [requestsDateTo, setRequestsDateTo] = useState("")

    // ==================== تقرير الحضور (الشامل) ====================
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
    const [attendanceReportFrom, setAttendanceReportFrom] = useState("")
    const [attendanceReportTo, setAttendanceReportTo] = useState("")
    const [attendanceReportDept, setAttendanceReportDept] = useState<string>("all")
    const [expandedUser, setExpandedUser] = useState<string | null>(null)

    // ==================== التقارير ====================
    const [reportType, setReportType] = useState<"leaves" | "absences">("leaves")
    const [reportDepartment, setReportDepartment] = useState<string>("all")
    const [reportFrom, setReportFrom] = useState("")
    const [reportTo, setReportTo] = useState("")
    const [reportData, setReportData] = useState<any[]>([])

    // ==================== الحضور (للأدمن نفسه) ====================
    const [todayAttendance, setTodayAttendance] = useState<any>(null)
    const [attendanceHistory, setAttendanceHistory] = useState<any[]>([])
    const [currentPos, setCurrentPos] = useState<{ lat: number, lng: number }>({ lat: 0, lng: 0 })
    const [loadingPos, setLoadingPos] = useState(true)
    const [attendanceFrom, setAttendanceFrom] = useState("")
    const [attendanceTo, setAttendanceTo] = useState("")

    // =============================================
    // useEffect لتحميل البيانات
    // =============================================
    useEffect(() => {
        const storedName = localStorage.getItem("name")
        const storedUsername = localStorage.getItem("username")
        const storedId = localStorage.getItem("employee_id")
        const storedRole = localStorage.getItem("role")

        if (!storedName || !storedId || storedRole !== "admin") {
            alert("غير مصرح بالدخول")
            router.push("/")
            return
        }

        setAdminName(storedName)
        setAdminUsername(storedUsername || "")
        setAdminId(storedId)

        fetchEmployees()
        fetchDepartments()
        fetchLeaveRequests()
        fetchTodayAttendance(storedUsername || "")

        // الحصول على الموقع الجغرافي
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => {
                    setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    setLoadingPos(false)
                },
                () => {
                    alert("لم نتمكن من الحصول على موقعك، تأكد من تفعيل GPS");
                    setLoadingPos(false)
                }
            )
        } else {
            alert("المتصفح لا يدعم GPS")
            setLoadingPos(false)
        }
    }, [])

    // =============================================
    // دوال جلب البيانات
    // =============================================
    const fetchEmployees = async () => {
        try {
            const res = await fetch("/api/employees")
            if (res.ok) {
                const data = await res.json()
                setEmployees(data)
            }
        } catch (err) { console.error(err) }
    }

    const fetchDepartments = async () => {
        try {
            const res = await fetch("/api/departments")
            if (res.ok) {
                const data = await res.json()
                setDepartments(data)
            }
        } catch (err) { console.error(err) }
    }

    const fetchLeaveRequests = async () => {
        try {
            let url = "/api/leave-requests?user_role=hr"

            if (selectedDepartment && selectedDepartment !== "all") {
                url += `&department_id=${selectedDepartment}`
            }
            if (requestsDateFrom) {
                url += `&from=${requestsDateFrom}`
            }
            if (requestsDateTo) {
                url += `&to=${requestsDateTo}`
            }

            const res = await fetch(url)
            if (res.ok) {
                const data = await res.json()
                setLeaveRequests(data)
            }
        } catch (err) { console.error(err) }
    }

    const fetchAttendanceReport = async () => {
        if (!attendanceReportFrom || !attendanceReportTo) {
            alert("حدد تاريخ البداية والنهاية")
            return
        }

        try {
            let url = `/api/reports/absences?type=attendance&from=${attendanceReportFrom}&to=${attendanceReportTo}`

            if (attendanceReportDept && attendanceReportDept !== "all") {
                url += `&department_id=${attendanceReportDept}`
            }

            const res = await fetch(url)
            if (res.ok) {
                const data = await res.json()
                setAttendanceRecords(data)
            }
        } catch (err) { console.error(err) }
    }

    const fetchTodayAttendance = async (username: string) => {
        const today = new Date().toISOString().split("T")[0]
        try {
            const res = await fetch(`/api/attendance?username=${username}&from=${today}&to=${today}`)
            if (res.ok) {
                const data = await res.json()
                setTodayAttendance(data[0] || null)
            }
        } catch (err) { console.error(err) }
    }

    const fetchAttendanceHistory = async () => {
        if (!attendanceFrom || !attendanceTo) return alert("حدد من وإلى")
        try {
            const res = await fetch(`/api/attendance?username=${adminUsername}&from=${attendanceFrom}&to=${attendanceTo}`)
            if (res.ok) setAttendanceHistory(await res.json())
        } catch (err) { console.error(err) }
    }

    const fetchReport = async () => {
        if (!reportFrom || !reportTo) return alert("حدد تاريخ البداية والنهاية")

        try {
            let url = reportType === "leaves"
                ? `/api/reports/leaves?from=${reportFrom}&to=${reportTo}`
                : `/api/reports/absences?from=${reportFrom}&to=${reportTo}`

            if (reportDepartment && reportDepartment !== "all") {
                url += `&department_id=${reportDepartment}`
            }

            const res = await fetch(url)
            if (res.ok) setReportData(await res.json())
        } catch (err) { console.error(err) }
    }

    const fetchDeptManagers = async (deptId: number) => {
        try {
            const res = await fetch(`/api/departments/managers?department_id=${deptId}`)
            if (res.ok) {
                const data = await res.json()
                setDeptManagers(data)
            }
        } catch (err) { console.error(err) }
    }

    const fetchAvailableManagers = async () => {
        try {
            const managers = employees.filter(emp => emp.role === "manager")
            setAvailableManagers(managers)
        } catch (err) { console.error(err) }
    }

    // =============================================
    // دوال الموظفين (فردي)
    // =============================================
    const addEmployee = async () => {
        if (!name || !username || !password || !hireDate) return alert("املأ كل البيانات المطلوبة")

        const employeeData: any = {
            name,
            username,
            password,
            role,
            email,
            phone,
            job_title: jobTitle,
            department_id: departmentId || null,
            hire_date: hireDate
        }

        const res = await fetch("/api/employees", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(employeeData)
        })

        const data = await res.json()
        if (res.ok) {
            alert("تم إضافة الموظف بنجاح")
            setName(""); setUsername(""); setPassword(""); setRole("employee")
            setEmail(""); setPhone(""); setJobTitle(""); setDepartmentId(""); setHireDate("")
            setShowAddForm(false)
            fetchEmployees()
        } else alert(data.error)
    }

    const updateEmployee = async (emp: Employee) => {
        const res = await fetch("/api/employees", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: emp.id,
                name: emp.name,
                username: emp.username,
                role: emp.role,
                email: emp.email,
                phone: emp.phone,
                job_title: emp.job_title,
                department_id: emp.department_id,
                hire_date: emp.hire_date
            })
        })
        const data = await res.json()
        if (res.ok) {
            alert("تم تعديل الموظف بنجاح")
            fetchEmployees()
        } else alert(data.error)
    }

    const deleteEmployee = async (id: string) => {
        if (!confirm("⚠️ هل أنت متأكد من حذف الموظف؟\n\nسيتم حذف كل البيانات المرتبطة به")) return

        const res = await fetch("/api/employees", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id })
        })
        const data = await res.json()
        if (res.ok) {
            alert("✅ تم حذف الموظف وكل بياناته بنجاح")
            fetchEmployees()
        } else alert(data.error)
    }

    // =============================================
    // دوال رفع Excel
    // =============================================
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setExcelFile(file)

            const reader = new FileReader()
            reader.onload = (evt) => {
                const bstr = evt.target?.result
                const wb = XLSX.read(bstr, { type: 'binary' })
                const wsname = wb.SheetNames[0]
                const ws = wb.Sheets[wsname]
                const data = XLSX.utils.sheet_to_json(ws)
                setExcelData(data)
            }
            reader.readAsBinaryString(file)
        }
    }

    const processBulkUpload = async () => {
        if (excelData.length === 0) {
            alert("لا توجد بيانات للرفع")
            return
        }

        setUploadLoading(true)
        setUploadResults({ success: 0, failed: 0, errors: [] })

        const results = { success: 0, failed: 0, errors: [] as string[] }

        for (const row of excelData) {
            try {
                // تنسيق البيانات من Excel
                const employeeData = {
                    name: row['الاسم'] || row['name'] || '',
                    username: row['اسم المستخدم'] || row['username'] || '',
                    password: row['كلمة المرور'] || row['password'] || '123456', // قيمة افتراضية
                    role: row['الدور'] || row['role'] || 'employee',
                    email: row['البريد'] || row['email'] || '',
                    phone: row['الهاتف'] || row['phone'] || '',
                    job_title: row['الوظيفة'] || row['job_title'] || '',
                    department_id: findDepartmentId(row['القسم'] || row['department']),
                    hire_date: formatDate(row['تاريخ التعيين'] || row['hire_date'])
                }

                if (!employeeData.name || !employeeData.username) {
                    results.failed++
                    results.errors.push(`بيانات ناقصة: ${JSON.stringify(row)}`)
                    continue
                }

                const res = await fetch("/api/employees", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(employeeData)
                })

                if (res.ok) {
                    results.success++
                } else {
                    const error = await res.json()
                    results.failed++
                    results.errors.push(`${employeeData.name}: ${error.error}`)
                }
            } catch (error) {
                results.failed++
                results.errors.push(`خطأ في معالجة السطر: ${error}`)
            }
        }

        setUploadResults(results)
        setUploadLoading(false)
        fetchEmployees()
    }

    const findDepartmentId = (deptName: string): number | null => {
        if (!deptName) return null
        const dept = departments.find(d =>
            d.name.toLowerCase() === deptName.toString().toLowerCase()
        )
        return dept?.id || null
    }

  

    const downloadTemplate = () => {
        const template = [
            {
                'الاسم':"Ahmed",
                'اسم المستخدم': '204058',
                'كلمة المرور': '123',
                'البريد': 'ahmed@example.com',
                'الهاتف': '0123456789',
                'الوظيفة': 'Senior Design Engineer',
                'القسم': 'Design',
                'تاريخ التعيين': '2024-05-07',
                'الدور': 'employee'
            }
        ]

        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.json_to_sheet(template)
        XLSX.utils.book_append_sheet(wb, ws, "الموظفين")
        XLSX.writeFile(wb, "employees_template.xlsx")
    }

    // =============================================
    // دوال إدارة الأقسام
    // =============================================
    const addDepartment = async () => {
        if (!deptName) return alert("اسم القسم مطلوب")

        const res = await fetch("/api/departments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: deptName })
        })
        const data = await res.json()

        if (res.ok) {
            alert("✅ تم إضافة القسم بنجاح")
            setDeptName("")
            setShowDeptForm(false)
            fetchDepartments()
        } else {
            alert(data.error)
        }
    }

    const updateDepartment = async () => {
        if (!editingDept || !deptName) return alert("اسم القسم مطلوب")

        const res = await fetch("/api/departments", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editingDept.id, name: deptName })
        })
        const data = await res.json()

        if (res.ok) {
            alert("✅ تم تعديل القسم بنجاح")
            setDeptName("")
            setEditingDept(null)
            setShowDeptForm(false)
            fetchDepartments()
        } else {
            alert(data.error)
        }
    }

    const deleteDepartment = async (id: number) => {
        if (!confirm("⚠️ هل أنت متأكد من حذف هذا القسم؟\n\nلن تتمكن من حذف قسم به موظفين")) return

        const res = await fetch(`/api/departments?id=${id}`, {
            method: "DELETE"
        })
        const data = await res.json()

        if (res.ok) {
            alert("✅ تم حذف القسم بنجاح")
            fetchDepartments()
        } else {
            alert(data.error)
        }
    }

    const startEditDept = (dept: Department) => {
        setEditingDept(dept)
        setDeptName(dept.name)
        setShowDeptForm(true)
    }

    const cancelDeptForm = () => {
        setShowDeptForm(false)
        setDeptName("")
        setEditingDept(null)
    }

    const openManageManagers = async (dept: Department) => {
        setSelectedDept(dept)
        await fetchDeptManagers(dept.id)
        await fetchAvailableManagers()
        setShowManageManagers(true)
    }

    const addManagerToDept = async (managerId: string) => {
        if (!selectedDept) return

        const res = await fetch("/api/departments/managers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                manager_id: managerId,
                department_id: selectedDept.id
            })
        })

        const data = await res.json()
        if (res.ok) {
            alert("✅ تم إضافة المدير للقسم")
            fetchDeptManagers(selectedDept.id)
            fetchDepartments()
        } else {
            alert(data.error)
        }
    }

    const removeManagerFromDept = async (relationId: string) => {
        if (!confirm("هل أنت متأكد من إزالة هذا المدير من القسم؟")) return

        const res = await fetch(`/api/departments/managers?id=${relationId}`, {
            method: "DELETE"
        })

        const data = await res.json()
        if (res.ok) {
            alert("✅ تم إزالة المدير من القسم")
            if (selectedDept) {
                fetchDeptManagers(selectedDept.id)
                fetchDepartments()
            }
        } else {
            alert(data.error)
        }
    }

    // =============================================
    // دوال الموافقة على الطلبات
    // =============================================
    const approveRequest = async (id: string) => {
        try {
            const res = await fetch("/api/leave-requests", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id,
                    action: "approve",
                    approved_by: adminId,
                    user_role: "hr"
                })
            })
            const data = await res.json()
            alert(data.message || data.error)
            if (res.ok) fetchLeaveRequests()
        } catch (err) { console.error(err) }
    }

    const rejectRequest = async (id: string) => {
        try {
            const res = await fetch("/api/leave-requests", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id,
                    action: "reject",
                    approved_by: adminId,
                    user_role: "hr"
                })
            })
            const data = await res.json()
            alert(data.message || data.error)
            if (res.ok) fetchLeaveRequests()
        } catch (err) { console.error(err) }
    }

    // =============================================
    // دوال تسجيل حضور الأدمن
    // =============================================
    const handleCheck = async (type: "check_in" | "check_out") => {
        if (loadingPos) { alert("جاري الحصول على الموقع، انتظر لحظة..."); return }
        if (!currentPos.lat || !currentPos.lng) { alert("الموقع غير متوفر"); return }

        try {
            const res = await fetch("/api/attendance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: adminUsername, type, lat: currentPos.lat, lng: currentPos.lng })
            })
            const data = await res.json()
            alert(data.message || data.error)
            fetchTodayAttendance(adminUsername)
            
        } catch (err) { console.error(err); alert("حدث خطأ أثناء الإرسال") }
    }

    // =============================================
    // دالة تسجيل الخروج
    // =============================================
    const handleLogout = () => {
        // مسح localStorage
        localStorage.clear()

        // مسح cookies
        document.cookie = "role=; path=/; max-age=0"
        document.cookie = "employee_id=; path=/; max-age=0"
        document.cookie = "remembered=; path=/; max-age=0"
        router.push("/")
    }

    // =============================================
    // دوال مساعدة
    // =============================================
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("ar-EG")
    }

    const formatTime = (dateString: string | null) => {
        if (!dateString) return "-"
        return new Date(dateString).toLocaleTimeString()
    }

    const calculateHours = (checkIn: string | null, checkOut: string | null) => {
        if (!checkIn || !checkOut) return 0
        const start = new Date(checkIn)
        const end = new Date(checkOut)
        return Number(((end.getTime() - start.getTime()) / 1000 / 60 / 60).toFixed(2))
    }

    const getApprovalStatus = (req: LeaveRequest) => {
        if (req.status === "مرفوضة") return { text: "❌ مرفوضة", color: "#f44336" }
        if (req.status === "تمت الموافقة") return { text: "✅ معتمدة", color: "#4caf50" }

        if (!req.hr_approved && !req.manager_approved) {
            return { text: "🕒 في انتظار HR ومدير", color: "#9e9e9e" }
        }
        if (!req.hr_approved) {
            return { text: "⏳ في انتظار HR", color: "#ff9800" }
        }
        if (!req.manager_approved) {
            return { text: "⏳ في انتظار مدير", color: "#ff9800" }
        }

        return { text: "🕒 في انتظار الموافقات", color: "#9e9e9e" }
    }

    // تجميع سجلات الحضور لكل موظف
    const groupedAttendance = attendanceRecords.reduce((acc: any, record) => {
        const employeeId = record.employee_id
        const empName = record.employees?.name || "موظف"
        const deptId = record.employees?.department_id

        if (!acc[employeeId]) {
            acc[employeeId] = {
                employee_id: employeeId,
                name: empName,
                department_id: deptId,
                records: [],
                totalHours: 0,
                totalDays: 0
            }
        }

        const hours = calculateHours(record.check_in, record.check_out)
        acc[employeeId].records.push({
            day: record.day,
            check_in: record.check_in,
            check_out: record.check_out,
            hours,
            location: record.location
        })

        acc[employeeId].totalHours += hours
        acc[employeeId].totalDays += 1

        return acc
    }, {})

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                {/* رأس الصفحة */}
                <div style={styles.header}>
                    <h2 style={styles.title}>لوحة تحكم الموارد البشرية</h2>
                    <button onClick={handleLogout} style={styles.logoutButton}>تسجيل خروج</button>
                </div>

                {/* اسم الأدمن */}
                <div style={styles.welcomeCard}>
                    <p style={styles.welcomeText}>مرحباً {adminName}</p>
                </div>

                {/* شريط التبويبات */}
                <div style={styles.tabBar}>
                    <button
                        onClick={() => setActiveTab("dashboard")}
                        style={{ ...styles.tabButton, backgroundColor: activeTab === "dashboard" ? '#1976d2' : '#e0e0e0', color: activeTab === "dashboard" ? 'white' : '#333' }}
                    >
                        📊 لوحة المعلومات
                    </button>
                    <button
                        onClick={() => setActiveTab("employees")}
                        style={{ ...styles.tabButton, backgroundColor: activeTab === "employees" ? '#1976d2' : '#e0e0e0', color: activeTab === "employees" ? 'white' : '#333' }}
                    >
                        👥 الموظفين
                    </button>
                    <button
                        onClick={() => setActiveTab("bulkUpload")}
                        style={{ ...styles.tabButton, backgroundColor: activeTab === "bulkUpload" ? '#1976d2' : '#e0e0e0', color: activeTab === "bulkUpload" ? 'white' : '#333' }}
                    >
                        📤 رفع Excel
                    </button>
                    <button
                        onClick={() => setActiveTab("departments")}
                        style={{ ...styles.tabButton, backgroundColor: activeTab === "departments" ? '#1976d2' : '#e0e0e0', color: activeTab === "departments" ? 'white' : '#333' }}
                    >
                        🏢 الأقسام
                    </button>
                    <button
                        onClick={() => setActiveTab("leaveRequests")}
                        style={{ ...styles.tabButton, backgroundColor: activeTab === "leaveRequests" ? '#1976d2' : '#e0e0e0', color: activeTab === "leaveRequests" ? 'white' : '#333' }}
                    >
                        📋 طلبات الإجازات
                    </button>
                    <button
                        onClick={() => setActiveTab("attendanceReport")}
                        style={{ ...styles.tabButton, backgroundColor: activeTab === "attendanceReport" ? '#1976d2' : '#e0e0e0', color: activeTab === "attendanceReport" ? 'white' : '#333' }}
                    >
                        ⏱️ تقرير الحضور
                    </button>
                    <button
                        onClick={() => setActiveTab("reports")}
                        style={{ ...styles.tabButton, backgroundColor: activeTab === "reports" ? '#1976d2' : '#e0e0e0', color: activeTab === "reports" ? 'white' : '#333' }}
                    >
                        📈 تقارير
                    </button>
                    <button
                        onClick={() => setActiveTab("attendance")}
                        style={{ ...styles.tabButton, backgroundColor: activeTab === "attendance" ? '#1976d2' : '#e0e0e0', color: activeTab === "attendance" ? 'white' : '#333' }}
                    >
                        🕒 تسجيل حضوري
                    </button>
                </div>

                {/* ========================================= */}
                {/* تبويب لوحة المعلومات */}
                {/* ========================================= */}
                {activeTab === "dashboard" && (
                    <div style={styles.tabContent}>
                        <h3 style={styles.sectionTitle}>لوحة المعلومات</h3>

                        <div style={styles.statsGrid}>
                            <div style={styles.statCard}>
                                <span style={styles.statValue}>{employees.length}</span>
                                <span style={styles.statLabel}>إجمالي الموظفين</span>
                            </div>
                            <div style={styles.statCard}>
                                <span style={styles.statValue}>{departments.length}</span>
                                <span style={styles.statLabel}>الأقسام</span>
                            </div>
                            <div style={styles.statCard}>
                                <span style={styles.statValue}>
                                    {leaveRequests.filter(r => r.status === "قيد الانتظار" && !(r.hr_approved && r.manager_approved)).length}
                                </span>
                                <span style={styles.statLabel}>طلبات pending</span>
                            </div>
                            <div style={styles.statCard}>
                                <span style={styles.statValue}>
                                    {leaveRequests.filter(r => r.hr_approved && r.manager_approved).length}
                                </span>
                                <span style={styles.statLabel}>إجازات معتمدة</span>
                            </div>
                        </div>

                        {/* آخر 5 طلبات */}
                        <h4 style={styles.subTitle}>آخر الطلبات</h4>
                        <div style={styles.tableContainer}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.tableHeader}>الموظف</th>
                                        <th style={styles.tableHeader}>النوع</th>
                                        <th style={styles.tableHeader}>المدة</th>
                                        <th style={styles.tableHeader}>الحالة</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leaveRequests.slice(0, 5).map(req => {
                                        const status = getApprovalStatus(req)
                                        return (
                                            <tr key={req.id}>
                                                <td style={styles.tableCell}>{req.employees?.name}</td>
                                                <td style={styles.tableCell}>{req.leave_type}</td>
                                                <td style={styles.tableCell}>
                                                    من {formatDate(req.start_date)} إلى {formatDate(req.end_date)}
                                                </td>
                                                <td style={styles.tableCell}>
                                                    <span style={{ ...styles.statusBadge, backgroundColor: status.color }}>
                                                        {status.text}
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ========================================= */}
                {/* تبويب الموظفين (إضافة فردية) */}
                {/* ========================================= */}
                {activeTab === "employees" && (
                    <div style={styles.tabContent}>
                        <div style={styles.sectionHeader}>
                            <h3 style={styles.sectionTitle}>إدارة الموظفين</h3>
                            <button onClick={() => setShowAddForm(!showAddForm)} style={styles.addButton}>
                                {showAddForm ? '❌ إلغاء' : '➕ إضافة موظف'}
                            </button>
                        </div>

                        {/* نموذج إضافة موظف جديد */}
                        {showAddForm && (
                            <div style={styles.formCard}>
                                <h4 style={styles.formTitle}>إضافة موظف جديد</h4>

                                <input
                                    type="text"
                                    placeholder="الاسم الكامل *"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    style={styles.input}
                                />

                                <input
                                    type="text"
                                    placeholder="اسم المستخدم *"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    style={styles.input}
                                />

                                <input
                                    type="password"
                                    placeholder="كلمة المرور *"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    style={styles.input}
                                />

                                <input
                                    type="email"
                                    placeholder="البريد الإلكتروني"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    style={styles.input}
                                />

                                <input
                                    type="text"
                                    placeholder="رقم الموبايل"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    style={styles.input}
                                />

                                <input
                                    type="text"
                                    placeholder="المسمى الوظيفي"
                                    value={jobTitle}
                                    onChange={e => setJobTitle(e.target.value)}
                                    style={styles.input}
                                />

                                <input
                                    type="date"
                                    placeholder="تاريخ التعيين *"
                                    value={hireDate}
                                    onChange={e => setHireDate(e.target.value)}
                                    style={styles.input}
                                    required
                                />

                                <select
                                    value={departmentId}
                                    onChange={e => setDepartmentId(e.target.value ? Number(e.target.value) : "")}
                                    style={styles.select}
                                >
                                    <option value="">اختر القسم</option>
                                    {departments.map(dept => (
                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                    ))}
                                </select>

                                <select
                                    value={role}
                                    onChange={e => setRole(e.target.value)}
                                    style={styles.select}
                                >
                                    <option value="employee">موظف</option>
                                    <option value="admin">HR</option>
                                    <option value="manager">مدير</option>
                                </select>

                                <button onClick={addEmployee} style={styles.submitButton}>
                                    ✅ إضافة الموظف
                                </button>
                            </div>
                        )}

                        {/* جدول الموظفين */}
                        <div style={styles.tableContainer}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.tableHeader}>الاسم</th>
                                        <th style={styles.tableHeader}>Username</th>
                                        <th style={styles.tableHeader}>القسم</th>
                                        <th style={styles.tableHeader}>الوظيفة</th>
                                        <th style={styles.tableHeader}>تاريخ التعيين</th>
                                        <th style={styles.tableHeader}>الدور</th>
                                        <th style={styles.tableHeader}>الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {employees.map(emp => (
                                        <tr key={emp.id}>
                                            <td style={styles.tableCell}>
                                                <input
                                                    type="text"
                                                    value={emp.name}
                                                    onChange={e => {
                                                        const newEmployees = employees.map(item =>
                                                            item.id === emp.id ? { ...item, name: e.target.value } : item
                                                        )
                                                        setEmployees(newEmployees)
                                                    }}
                                                    style={styles.tableInput}
                                                />
                                            </td>
                                            <td style={styles.tableCell}>
                                                <input
                                                    type="text"
                                                    value={emp.username}
                                                    onChange={e => {
                                                        const newEmployees = employees.map(item =>
                                                            item.id === emp.id ? { ...item, username: e.target.value } : item
                                                        )
                                                        setEmployees(newEmployees)
                                                    }}
                                                    style={styles.tableInput}
                                                />
                                            </td>
                                            <td style={styles.tableCell}>
                                                <select
                                                    value={emp.department_id || ""}
                                                    onChange={e => {
                                                        const newDeptId = e.target.value ? Number(e.target.value) : undefined
                                                        const newEmployees = employees.map(item =>
                                                            item.id === emp.id ? { ...item, department_id: newDeptId } : item
                                                        )
                                                        setEmployees(newEmployees)
                                                    }}
                                                    style={styles.tableSelect}
                                                >
                                                    <option value="">بدون قسم</option>
                                                    {departments.map(dept => (
                                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td style={styles.tableCell}>
                                                <input
                                                    type="text"
                                                    value={emp.job_title || ""}
                                                    onChange={e => {
                                                        const newEmployees = employees.map(item =>
                                                            item.id === emp.id ? { ...item, job_title: e.target.value } : item
                                                        )
                                                        setEmployees(newEmployees)
                                                    }}
                                                    style={styles.tableInput}
                                                    placeholder="المسمى الوظيفي"
                                                />
                                            </td>
                                            <td style={styles.tableCell}>
                                                <input
                                                    type="date"
                                                    value={emp.hire_date || ""}
                                                    onChange={e => {
                                                        const newEmployees = employees.map(item =>
                                                            item.id === emp.id ? { ...item, hire_date: e.target.value } : item
                                                        )
                                                        setEmployees(newEmployees)
                                                    }}
                                                    style={styles.tableInput}
                                                />
                                            </td>
                                            <td style={styles.tableCell}>
                                                <select
                                                    value={emp.role}
                                                    onChange={e => {
                                                        const newEmployees = employees.map(item =>
                                                            item.id === emp.id ? { ...item, role: e.target.value } : item
                                                        )
                                                        setEmployees(newEmployees)
                                                    }}
                                                    style={styles.tableSelect}
                                                >
                                                    <option value="employee">موظف</option>
                                                    <option value="admin">HR</option>
                                                    <option value="manager">مدير</option>
                                                </select>
                                            </td>
                                            <td style={styles.tableCell}>
                                                <button onClick={() => updateEmployee(emp)} style={styles.editButton}>💾 حفظ</button>
                                                <button onClick={() => deleteEmployee(emp.id)} style={styles.deleteButton}>🗑️ حذف</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ========================================= */}
                {/* تبويب رفع Excel */}
                {/* ========================================= */}
                {activeTab === "bulkUpload" && (
                    <div style={styles.tabContent}>
                        <h3 style={styles.sectionTitle}>رفع موظفين من Excel</h3>

                        <div style={styles.uploadCard}>
                            <p style={styles.uploadInfo}>
                                يمكنك رفع ملف Excel يحتوي على بيانات الموظفين دفعة واحدة.
                                <br />
                                الأعمدة المطلوبة: الاسم، اسم المستخدم، كلمة المرور (اختياري)، البريد، الهاتف، الوظيفة، القسم، تاريخ التعيين، الدور
                            </p>

                            <div style={styles.uploadButtons}>
                                <button onClick={downloadTemplate} style={styles.templateButton}>
                                    📥 تحميل نموذج Excel
                                </button>

                                <input
                                    type="file"
                                    accept=".xlsx, .xls, .csv"
                                    onChange={handleFileUpload}
                                    style={styles.fileInput}
                                    id="excel-upload"
                                />
                                <label htmlFor="excel-upload" style={styles.fileLabel}>
                                    📂 اختر ملف
                                </label>
                            </div>

                            {excelFile && (
                                <div style={styles.fileInfo}>
                                    <p>الملف: {excelFile.name}</p>
                                    <p>عدد السجلات: {excelData.length}</p>

                                    <button
                                        onClick={processBulkUpload}
                                        style={styles.uploadButton}
                                        disabled={uploadLoading}
                                    >
                                        {uploadLoading ? 'جاري الرفع...' : '🚀 بدء الرفع'}
                                    </button>
                                </div>
                            )}

                            {uploadResults.success > 0 && (
                                <div style={styles.resultsCard}>
                                    <h4 style={styles.resultsTitle}>نتائج الرفع:</h4>
                                    <p style={{ color: '#4caf50' }}>✅ تم بنجاح: {uploadResults.success}</p>
                                    <p style={{ color: '#f44336' }}>❌ فشل: {uploadResults.failed}</p>

                                    {uploadResults.errors.length > 0 && (
                                        <div style={styles.errorsList}>
                                            <p style={{ fontWeight: 'bold' }}>الأخطاء:</p>
                                            {uploadResults.errors.map((err, idx) => (
                                                <p key={idx} style={styles.errorItem}>{err}</p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ========================================= */}
                {/* تبويب إدارة الأقسام */}
                {/* ========================================= */}
                {activeTab === "departments" && (
                    <div style={styles.tabContent}>
                        <div style={styles.sectionHeader}>
                            <h3 style={styles.sectionTitle}>إدارة الأقسام</h3>
                            <button onClick={() => setShowDeptForm(!showDeptForm)} style={styles.addButton}>
                                {showDeptForm ? '❌ إلغاء' : '➕ إضافة قسم'}
                            </button>
                        </div>

                        {/* نموذج إضافة/تعديل قسم */}
                        {showDeptForm && (
                            <div style={styles.formCard}>
                                <h4 style={styles.formTitle}>
                                    {editingDept ? 'تعديل قسم' : 'إضافة قسم جديد'}
                                </h4>

                                <input
                                    type="text"
                                    placeholder="اسم القسم"
                                    value={deptName}
                                    onChange={e => setDeptName(e.target.value)}
                                    style={styles.input}
                                />

                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button
                                        onClick={editingDept ? updateDepartment : addDepartment}
                                        style={styles.submitButton}
                                    >
                                        {editingDept ? '✅ حفظ التعديلات' : '✅ إضافة القسم'}
                                    </button>
                                    <button
                                        onClick={cancelDeptForm}
                                        style={{ ...styles.submitButton, backgroundColor: '#9e9e9e' }}
                                    >
                                        ❌ إلغاء
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* جدول الأقسام */}
                        <div style={styles.tableContainer}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.tableHeader}>#</th>
                                        <th style={styles.tableHeader}>اسم القسم</th>
                                        <th style={styles.tableHeader}>عدد الموظفين</th>
                                        <th style={styles.tableHeader}>المدراء</th>
                                        <th style={styles.tableHeader}>الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {departments.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} style={styles.emptyCell}>
                                                لا توجد أقسام بعد
                                            </td>
                                        </tr>
                                    ) : (
                                        departments.map((dept, index) => (
                                            <tr key={dept.id}>
                                                <td style={styles.tableCell}>{index + 1}</td>
                                                <td style={styles.tableCell}>{dept.name}</td>
                                                <td style={styles.tableCell}>
                                                    <span style={{
                                                        ...styles.roleBadge,
                                                        backgroundColor: (dept.employees_count || 0) > 0 ? '#4caf50' : '#9e9e9e'
                                                    }}>
                                                        {dept.employees_count || 0} موظف
                                                    </span>
                                                </td>
                                                <td style={styles.tableCell}>
                                                    {dept.managers && dept.managers.length > 0 ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                            {dept.managers.map(manager => (
                                                                <span key={manager.id} style={styles.managerBadge}>
                                                                    {manager.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: '#999' }}>لا يوجد مدراء</span>
                                                    )}
                                                </td>
                                                <td style={styles.tableCell}>
                                                    <button
                                                        onClick={() => startEditDept(dept)}
                                                        style={styles.editButton}
                                                        title="تعديل"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => openManageManagers(dept)}
                                                        style={styles.managerButton}
                                                        title="إدارة المدراء"
                                                    >
                                                        👥
                                                    </button>
                                                    <button
                                                        onClick={() => deleteDepartment(dept.id)}
                                                        style={styles.deleteButton}
                                                        title="حذف"
                                                        disabled={(dept.employees_count || 0) > 0}
                                                    >
                                                        🗑️
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* نافذة إدارة مدراء القسم */}
                        {showManageManagers && selectedDept && (
                            <div style={styles.modalOverlay}>
                                <div style={styles.modal}>
                                    <h3 style={styles.modalTitle}>إدارة مدراء قسم: {selectedDept.name}</h3>

                                    <div style={styles.modalContent}>
                                        <div style={styles.modalSection}>
                                            <h4 style={styles.modalSubTitle}>المدراء الحاليون</h4>
                                            {deptManagers.length === 0 ? (
                                                <p style={styles.emptyText}>لا يوجد مدراء لهذا القسم</p>
                                            ) : (
                                                deptManagers.map(rel => (
                                                    <div key={rel.id} style={styles.managerRow}>
                                                        <span>{rel.employees?.name} ({rel.employees?.username})</span>
                                                        <button
                                                            onClick={() => removeManagerFromDept(rel.id)}
                                                            style={styles.smallDeleteButton}
                                                        >
                                                            ❌
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        <div style={styles.modalSection}>
                                            <h4 style={styles.modalSubTitle}>إضافة مدير</h4>
                                            <select
                                                onChange={(e) => addManagerToDept(e.target.value)}
                                                style={styles.select}
                                                value=""
                                            >
                                                <option value="">اختر مدير...</option>
                                                {availableManagers
                                                    .filter(m => !deptManagers.some((rel: any) => rel.manager_id === m.id))
                                                    .map(manager => (
                                                        <option key={manager.id} value={manager.id}>
                                                            {manager.name} ({manager.username})
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div style={styles.modalFooter}>
                                        <button onClick={() => setShowManageManagers(false)} style={styles.closeButton}>
                                            إغلاق
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ========================================= */}
                {/* تبويب طلبات الإجازات */}
                {/* ========================================= */}
                {activeTab === "leaveRequests" && (
                    <div style={styles.tabContent}>
                        <h3 style={styles.sectionTitle}>طلبات الإجازات</h3>

                        <div style={styles.filterSection}>
                            <select
                                value={selectedDepartment}
                                onChange={e => {
                                    setSelectedDepartment(e.target.value)
                                    setTimeout(fetchLeaveRequests, 100)
                                }}
                                style={styles.select}
                            >
                                <option value="all">كل الأقسام</option>
                                {departments.map(dept => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                            </select>

                            <input
                                type="date"
                                value={requestsDateFrom}
                                onChange={e => setRequestsDateFrom(e.target.value)}
                                style={styles.dateInput}
                                placeholder="من"
                            />
                            <input
                                type="date"
                                value={requestsDateTo}
                                onChange={e => setRequestsDateTo(e.target.value)}
                                style={styles.dateInput}
                                placeholder="إلى"
                            />
                            <button onClick={fetchLeaveRequests} style={styles.viewButton}>بحث</button>
                        </div>

                        <div style={styles.tableContainer}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.tableHeader}>الموظف</th>
                                        <th style={styles.tableHeader}>القسم</th>
                                        <th style={styles.tableHeader}>النوع</th>
                                        <th style={styles.tableHeader}>المدة</th>
                                        <th style={styles.tableHeader}>السبب</th>
                                        <th style={styles.tableHeader}>حالة الموافقات</th>
                                        <th style={styles.tableHeader}>الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leaveRequests.map(req => {
                                        const status = getApprovalStatus(req)
                                        const deptName = departments.find(d => d.id === req.employees?.department_id)?.name || "-"
                                        return (
                                            <tr key={req.id}>
                                                <td style={styles.tableCell}>{req.employees?.name}</td>
                                                <td style={styles.tableCell}>{deptName}</td>
                                                <td style={styles.tableCell}>{req.leave_type}</td>
                                                <td style={styles.tableCell}>
                                                    من {formatDate(req.start_date)} إلى {formatDate(req.end_date)}
                                                </td>
                                                <td style={styles.tableCell}>{req.reason || "-"}</td>
                                                <td style={styles.tableCell}>
                                                    <span style={{ ...styles.statusBadge, backgroundColor: status.color }}>
                                                        {status.text}
                                                    </span>
                                                </td>
                                                <td style={styles.tableCell}>
                                                    {!req.hr_approved && req.status !== "مرفوضة" && (
                                                        <>
                                                            <button onClick={() => approveRequest(req.id)} style={styles.approveButton}>✓</button>
                                                            <button onClick={() => rejectRequest(req.id)} style={styles.rejectButton}>✗</button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ========================================= */}
                {/* تبويب تقرير الحضور */}
                {/* ========================================= */}
                {activeTab === "attendanceReport" && (
                    <div style={styles.tabContent}>
                        <h3 style={styles.sectionTitle}>تقرير الحضور والانصراف</h3>

                        <div style={styles.filterSection}>
                            <select
                                value={attendanceReportDept}
                                onChange={e => setAttendanceReportDept(e.target.value)}
                                style={styles.select}
                            >
                                <option value="all">كل الأقسام</option>
                                {departments.map(dept => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                            </select>

                            <input
                                type="date"
                                value={attendanceReportFrom}
                                onChange={e => setAttendanceReportFrom(e.target.value)}
                                style={styles.dateInput}
                                placeholder="من"
                            />
                            <input
                                type="date"
                                value={attendanceReportTo}
                                onChange={e => setAttendanceReportTo(e.target.value)}
                                style={styles.dateInput}
                                placeholder="إلى"
                            />
                            <button onClick={fetchAttendanceReport} style={styles.viewButton}>عرض التقرير</button>
                        </div>

                        {Object.keys(groupedAttendance).length > 0 && (
                            <div style={styles.reportSummary}>
                                <div style={styles.summaryStats}>
                                    <div style={styles.statCard}>
                                        <span style={styles.statValue}>{Object.keys(groupedAttendance).length}</span>
                                        <span style={styles.statLabel}>موظفين</span>
                                    </div>
                                    <div style={styles.statCard}>
                                        <span style={styles.statValue}>
                                            {attendanceRecords.length}
                                        </span>
                                        <span style={styles.statLabel}>أيام عمل</span>
                                    </div>
                                </div>

                                <div style={styles.requestsList}>
                                    {Object.values(groupedAttendance).map((user: any) => {
                                        const deptName = departments.find(d => d.id === user.department_id)?.name || "-"
                                        return (
                                            <div key={user.employee_id} style={styles.resultCard}>
                                                <div
                                                    style={{ cursor: "pointer", fontWeight: "bold", fontSize: 16 }}
                                                    onClick={() => setExpandedUser(expandedUser === user.employee_id ? null : user.employee_id)}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span>{user.name}</span>
                                                        <span style={{ color: "#1976d2" }}>{deptName}</span>
                                                    </div>
                                                    <div style={{ fontSize: 14, color: '#666', marginTop: 5 }}>
                                                        إجمالي الساعات: {user.totalHours.toFixed(2)} ساعة |
                                                        أيام العمل: {user.totalDays} يوم |
                                                        متوسط الساعات: {(user.totalHours / user.totalDays).toFixed(2)} ساعة/يوم
                                                    </div>
                                                </div>

                                                {expandedUser === user.employee_id && (
                                                    <div style={{ marginTop: 15 }}>
                                                        <table style={{ width: '100%', fontSize: 13 }}>
                                                            <thead>
                                                                <tr style={{ backgroundColor: '#f0f0f0' }}>
                                                                    <th style={{ padding: 8, textAlign: 'center' }}>اليوم</th>
                                                                    <th style={{ padding: 8, textAlign: 'center' }}>الحضور</th>
                                                                    <th style={{ padding: 8, textAlign: 'center' }}>الانصراف</th>
                                                                    <th style={{ padding: 8, textAlign: 'center' }}>الساعات</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {user.records.map((rec: any, i: number) => (
                                                                    <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                                                                        <td style={{ padding: 6, textAlign: 'center' }}>{rec.day}</td>
                                                                        <td style={{ padding: 6, textAlign: 'center' }}>{formatTime(rec.check_in)}</td>
                                                                        <td style={{ padding: 6, textAlign: 'center' }}>{formatTime(rec.check_out)}</td>
                                                                        <td style={{ padding: 6, textAlign: 'center' }}>{rec.hours} ساعة</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {attendanceRecords.length === 0 && attendanceReportFrom && attendanceReportTo && (
                            <p style={styles.emptyCell}>لا توجد بيانات في هذه الفترة</p>
                        )}
                    </div>
                )}

                {/* ========================================= */}
                {/* تبويب التقارير */}
                {/* ========================================= */}
                {activeTab === "reports" && (
                    <div style={styles.tabContent}>
                        <h3 style={styles.sectionTitle}>التقارير</h3>

                        <div style={styles.filterSection}>
                            <select value={reportType} onChange={e => setReportType(e.target.value as "leaves" | "absences")} style={styles.select}>
                                <option value="leaves">تقرير الإجازات</option>
                                <option value="absences">تقرير الغياب</option>
                            </select>

                            <select value={reportDepartment} onChange={e => setReportDepartment(e.target.value)} style={styles.select}>
                                <option value="all">كل الأقسام</option>
                                {departments.map(dept => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                            </select>

                            <input type="date" value={reportFrom} onChange={e => setReportFrom(e.target.value)} style={styles.dateInput} />
                            <input type="date" value={reportTo} onChange={e => setReportTo(e.target.value)} style={styles.dateInput} />
                            <button onClick={fetchReport} style={styles.viewButton}>عرض</button>
                        </div>

                        <div style={styles.tableContainer}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        {reportType === "leaves" ? (
                                            <>
                                                <th style={styles.tableHeader}>الموظف</th>
                                                <th style={styles.tableHeader}>القسم</th>
                                                <th style={styles.tableHeader}>نوع الإجازة</th>
                                                <th style={styles.tableHeader}>من</th>
                                                <th style={styles.tableHeader}>إلى</th>
                                                <th style={styles.tableHeader}>عدد الأيام</th>
                                            </>
                                        ) : (
                                            <>
                                                <th style={styles.tableHeader}>الموظف</th>
                                                <th style={styles.tableHeader}>أيام الغياب</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} style={styles.emptyCell}>اختر الفترة لعرض التقرير</td>
                                        </tr>
                                    ) : (
                                        reportData.map((item, index) => (
                                            <tr key={index}>
                                                {reportType === "leaves" ? (
                                                    <>
                                                        <td style={styles.tableCell}>{item.employee_name}</td>
                                                        <td style={styles.tableCell}>{item.department_name}</td>
                                                        <td style={styles.tableCell}>{item.leave_type}</td>
                                                        <td style={styles.tableCell}>{item.start_date}</td>
                                                        <td style={styles.tableCell}>{item.end_date}</td>
                                                        <td style={styles.tableCell}>{item.days}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td style={styles.tableCell}>{item.employee}</td>
                                                        <td style={styles.tableCell}>
                                                            {item.missedDays?.length > 0 ? item.missedDays.join(" - ") : "-"}
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ========================================= */}
                {/* تبويب تسجيل حضور الأدمن */}
                {/* ========================================= */}
                {activeTab === "attendance" && (
                    <div style={styles.tabContent}>
                        <h3 style={styles.sectionTitle}>تسجيل حضوري</h3>

                        <div style={styles.attendanceCard}>
                            <div style={styles.locationStatus}>
                                {loadingPos ? "⏳ جاري الحصول على الموقع..." : "📍 تم الحصول على الموقع بنجاح"}
                            </div>

                            <div style={styles.buttonGroup}>
                                <button onClick={() => handleCheck("check_in")} style={styles.checkInButton} disabled={loadingPos}>
                                    🟢 تسجيل حضور
                                </button>
                                <button onClick={() => handleCheck("check_out")} style={styles.checkOutButton} disabled={loadingPos}>
                                    🔴 تسجيل انصراف
                                </button>
                            </div>

                            <h4 style={styles.subTitle}>حضور اليوم</h4>
                            <div style={styles.tableContainer}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th style={styles.tableHeader}>اليوم</th>
                                            <th style={styles.tableHeader}>الحضور</th>
                                            <th style={styles.tableHeader}>الانصراف</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {todayAttendance ? (
                                            <tr>
                                                <td style={styles.tableCell}>{todayAttendance.day}</td>
                                                <td style={styles.tableCell}>{formatTime(todayAttendance.check_in)}</td>
                                                <td style={styles.tableCell}>{formatTime(todayAttendance.check_out)}</td>
                                            </tr>
                                        ) : (
                                            <tr>
                                                <td colSpan={3} style={styles.emptyCell}>لم يتم تسجيل حضور اليوم بعد</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <h4 style={{ ...styles.subTitle, marginTop: 20 }}>سجل الحضور السابق</h4>
                            <div style={styles.filterRow}>
                                <input type="date" value={attendanceFrom} onChange={e => setAttendanceFrom(e.target.value)} style={styles.dateInput} />
                                <input type="date" value={attendanceTo} onChange={e => setAttendanceTo(e.target.value)} style={styles.dateInput} />
                                <button onClick={fetchAttendanceHistory} style={styles.viewButton}>عرض</button>
                            </div>

                            <div style={styles.tableContainer}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th style={styles.tableHeader}>اليوم</th>
                                            <th style={styles.tableHeader}>الحضور</th>
                                            <th style={styles.tableHeader}>الانصراف</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attendanceHistory.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} style={styles.emptyCell}>اختر الفترة لعرض السجل</td>
                                            </tr>
                                        ) : (
                                            attendanceHistory.map(att => (
                                                <tr key={att.id}>
                                                    <td style={styles.tableCell}>{att.day}</td>
                                                    <td style={styles.tableCell}>{formatTime(att.check_in)}</td>
                                                    <td style={styles.tableCell}>{formatTime(att.check_out)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* الفوتر */}
                <div style={styles.footer}>
                    &copy; 2026 Khaled Aboellil. جميع الحقوق محفوظة.
                </div>
            </div>
        </div>
    )
}

// ==================== الأنماط ====================
const styles: { [key: string]: React.CSSProperties } = {
    page: {
        fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
        color: '#000',
        background: 'linear-gradient(to right, #0b3d91, #1976d2)',
        minHeight: '100vh',
        padding: 20,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start'
    },
    container: {
        background: '#fff',
        borderRadius: 20,
        padding: 30,
        width: '95%',
        maxWidth: 1200,
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    title: {
        textAlign: 'center',
        color: '#0b3d91',
        margin: 0,
        fontSize: 24
    },
    logoutButton: {
        padding: '8px 15px',
        border: 'none',
        borderRadius: 10,
        backgroundColor: '#d32f2f',
        color: '#fff',
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    welcomeCard: {
        backgroundColor: '#e3f2fd',
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
        textAlign: 'center'
    },
    welcomeText: {
        fontSize: 18,
        color: '#0b3d91',
        margin: 0,
        fontWeight: 'bold'
    },
    tabBar: {
        display: 'flex',
        gap: 5,
        marginBottom: 25,
        borderBottom: '2px solid #1976d2',
        paddingBottom: 5,
        flexWrap: 'wrap'
    },
    tabButton: {
        padding: '10px 15px',
        border: 'none',
        cursor: 'pointer',
        borderRadius: '10px 10px 0 0',
        fontWeight: 'bold',
        fontSize: 14,
        transition: 'all 0.3s'
    },
    tabContent: {
        minHeight: 400,
        padding: '10px 0'
    },
    sectionTitle: {
        color: '#0b3d91',
        fontSize: 20,
        marginBottom: 15
    },
    sectionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15
    },
    subTitle: {
        color: '#333',
        fontSize: 16,
        marginBottom: 10,
        marginTop: 10
    },
    formTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1976d2',
        marginBottom: 15,
        textAlign: 'center'
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 15,
        marginBottom: 25
    },
    statCard: {
        backgroundColor: '#f5f5f5',
        padding: 20,
        borderRadius: 10,
        textAlign: 'center',
        border: '1px solid #e0e0e0'
    },
    statValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1976d2',
        display: 'block'
    },
    statLabel: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
        display: 'block'
    },
    filterSection: {
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: 20,
        padding: 15,
        backgroundColor: '#f5f5f5',
        borderRadius: 10
    },
    filterRow: {
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: 15
    },
    select: {
        padding: 8,
        borderRadius: 6,
        border: '1px solid #ccc',
        fontSize: 14,
        minWidth: 150
    },
    dateInput: {
        padding: 8,
        borderRadius: 6,
        border: '1px solid #ccc',
        fontSize: 14
    },
    viewButton: {
        padding: '8px 20px',
        border: 'none',
        borderRadius: 6,
        backgroundColor: '#1976d2',
        color: '#fff',
        fontSize: 14,
        cursor: 'pointer'
    },
    addButton: {
        padding: '8px 15px',
        border: 'none',
        borderRadius: 6,
        backgroundColor: '#4caf50',
        color: '#fff',
        fontSize: 14,
        cursor: 'pointer'
    },
    tableContainer: {
        maxHeight: 400,
        overflowY: 'auto',
        border: '1px solid #e0e0e0',
        borderRadius: 10
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: 14
    },
    tableHeader: {
        padding: 12,
        borderBottom: '2px solid #1976d2',
        fontWeight: 'bold',
        textAlign: 'center',
        backgroundColor: '#f5f5f5',
        position: 'sticky',
        top: 0
    },
    tableCell: {
        padding: 8,
        textAlign: 'center',
        borderBottom: '1px solid #eee'
    },
    emptyCell: {
        padding: 30,
        textAlign: 'center',
        color: '#666'
    },
    roleBadge: {
        padding: '4px 8px',
        borderRadius: 4,
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
        display: 'inline-block'
    },
    statusBadge: {
        padding: '4px 8px',
        borderRadius: 4,
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
        display: 'inline-block'
    },
    approveButton: {
        padding: '5px 10px',
        margin: '0 2px',
        border: 'none',
        borderRadius: 4,
        backgroundColor: '#4caf50',
        color: 'white',
        fontSize: 14,
        cursor: 'pointer'
    },
    rejectButton: {
        padding: '5px 10px',
        margin: '0 2px',
        border: 'none',
        borderRadius: 4,
        backgroundColor: '#f44336',
        color: 'white',
        fontSize: 14,
        cursor: 'pointer'
    },
    editButton: {
        padding: '5px 8px',
        margin: '0 2px',
        border: 'none',
        borderRadius: 4,
        backgroundColor: '#ff9800',
        color: 'white',
        fontSize: 14,
        cursor: 'pointer'
    },
    deleteButton: {
        padding: '5px 8px',
        margin: '0 2px',
        border: 'none',
        borderRadius: 4,
        backgroundColor: '#f44336',
        color: 'white',
        fontSize: 14,
        cursor: 'pointer',
        opacity: 1
    },
    managerButton: {
        padding: '5px 8px',
        margin: '0 2px',
        border: 'none',
        borderRadius: 4,
        backgroundColor: '#9c27b0',
        color: 'white',
        fontSize: 14,
        cursor: 'pointer'
    },
    tableInput: {
        width: '100%',
        padding: '6px',
        borderRadius: 4,
        border: '1px solid #ccc',
        fontSize: 13
    },
    tableSelect: {
        width: '100%',
        padding: '6px',
        borderRadius: 4,
        border: '1px solid #ccc',
        fontSize: 13,
        backgroundColor: 'white'
    },
    input: {
        width: '100%',
        padding: 10,
        marginBottom: 10,
        borderRadius: 6,
        border: '1px solid #ccc',
        fontSize: 14
    },
    formCard: {
        backgroundColor: '#f8f9fa',
        padding: 20,
        borderRadius: 10,
        marginBottom: 20,
        border: '1px solid #e0e0e0'
    },
    submitButton: {
        flex: 1,
        padding: 12,
        border: 'none',
        borderRadius: 6,
        backgroundColor: '#1976d2',
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        cursor: 'pointer',
        marginTop: 10
    },
    managerBadge: {
        backgroundColor: '#ff9800',
        color: 'white',
        padding: '2px 8px',
        borderRadius: 12,
        fontSize: 12,
        display: 'inline-block',
        margin: '2px'
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
    },
    modal: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        width: '90%',
        maxWidth: 500,
        maxHeight: '80vh',
        overflowY: 'auto'
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1976d2',
        marginBottom: 15,
        textAlign: 'center'
    },
    modalContent: {
        marginBottom: 20
    },
    modalSection: {
        marginBottom: 20
    },
    modalSubTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10
    },
    emptyText: {
        color: '#999',
        textAlign: 'center',
        padding: 10
    },
    managerRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 8,
        backgroundColor: '#f5f5f5',
        borderRadius: 4,
        marginBottom: 5
    },
    smallDeleteButton: {
        padding: '2px 6px',
        border: 'none',
        borderRadius: 4,
        backgroundColor: '#f44336',
        color: 'white',
        fontSize: 12,
        cursor: 'pointer'
    },
    modalFooter: {
        display: 'flex',
        justifyContent: 'center',
        marginTop: 10
    },
    closeButton: {
        padding: '8px 20px',
        border: 'none',
        borderRadius: 6,
        backgroundColor: '#9e9e9e',
        color: 'white',
        fontSize: 14,
        cursor: 'pointer'
    },
    uploadCard: {
        backgroundColor: '#f8f9fa',
        padding: 25,
        borderRadius: 10,
        border: '1px solid #e0e0e0'
    },
    uploadInfo: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
        lineHeight: 1.6
    },
    uploadButtons: {
        display: 'flex',
        gap: 15,
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: 20
    },
    templateButton: {
        padding: '10px 20px',
        border: 'none',
        borderRadius: 6,
        backgroundColor: '#2196f3',
        color: '#fff',
        fontSize: 14,
        cursor: 'pointer'
    },
    fileInput: {
        display: 'none'
    },
    fileLabel: {
        padding: '10px 20px',
        border: 'none',
        borderRadius: 6,
        backgroundColor: '#4caf50',
        color: '#fff',
        fontSize: 14,
        cursor: 'pointer',
        display: 'inline-block'
    },
    fileInfo: {
        backgroundColor: '#e3f2fd',
        padding: 15,
        borderRadius: 6,
        marginBottom: 15
    },
    uploadButton: {
        padding: '10px 20px',
        border: 'none',
        borderRadius: 6,
        backgroundColor: '#ff9800',
        color: '#fff',
        fontSize: 14,
        cursor: 'pointer',
        marginTop: 10
    },
    resultsCard: {
        backgroundColor: '#f5f5f5',
        padding: 15,
        borderRadius: 6,
        marginTop: 15
    },
    resultsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10
    },
    errorsList: {
        maxHeight: 200,
        overflowY: 'auto',
        marginTop: 10,
        padding: 10,
        backgroundColor: '#ffebee',
        borderRadius: 4
    },
    errorItem: {
        fontSize: 12,
        color: '#f44336',
        marginBottom: 5
    },
    attendanceCard: {
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 12,
        border: '1px solid #e0e0e0'
    },
    locationStatus: {
        padding: 10,
        backgroundColor: '#e3f2fd',
        borderRadius: 8,
        marginBottom: 15,
        color: '#0b3d91',
        fontWeight: 'bold',
        textAlign: 'center',
        fontSize: 14
    },
    buttonGroup: {
        display: 'flex',
        gap: 10,
        marginBottom: 20,
        justifyContent: 'center'
    },
    checkInButton: {
        padding: '12px 20px',
        border: 'none',
        borderRadius: 8,
        backgroundColor: '#4caf50',
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        cursor: 'pointer',
        flex: 1,
        maxWidth: 150
    },
    checkOutButton: {
        padding: '12px 20px',
        border: 'none',
        borderRadius: 8,
        backgroundColor: '#f44336',
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        cursor: 'pointer',
        flex: 1,
        maxWidth: 150
    },
    reportSummary: {
        marginTop: 20
    },
    summaryStats: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 15,
        marginBottom: 20
    },
    requestsList: {
        maxHeight: 500,
        overflowY: 'auto'
    },
    resultCard: {
        padding: 15,
        border: '1px solid #e0e0e0',
        borderRadius: 10,
        marginBottom: 10,
        backgroundColor: '#fafafa'
    },
    footer: {
        marginTop: 25,
        textAlign: 'center',
        color: '#000',
        fontSize: 12,
        borderTop: '1px solid #ccc',
        paddingTop: 15
    }
}