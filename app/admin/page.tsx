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
    const [hireDate, setHireDate] = useState("")
    const [jobTitle, setJobTitle] = useState("مدير الموارد البشرية")
    const [yearsOfService, setYearsOfService] = useState(0)
    // الأقسام التي يديرها الـ Admin (كمدير)
    const [adminManagedDepts, setAdminManagedDepts] = useState<number[]>([])

    // ==================== التبويبات ====================
    const [activeTab, setActiveTab] = useState<"dashboard" | "employees" | "departments" | "allRequests" | "reports" | "attendance" | "bulkUpload" | "settings" | "leave" | "overtime" | "permission" | "correction">("dashboard")

    // ==================== بيانات الموظفين ====================
    const [employees, setEmployees] = useState<Employee[]>([])
    const [departments, setDepartments] = useState<Department[]>([])
    const [loading, setLoading] = useState(false)

    // ==================== خاصية الترتيب ====================
    const [sortConfig, setSortConfig] = useState<{
        key: keyof Employee | 'department_name'
        direction: 'asc' | 'desc'
    } | null>(null)

    // ==================== إضافة موظف ====================
    const [showAddForm, setShowAddForm] = useState(false)
    const [name, setName] = useState("")
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [role, setRole] = useState("employee")
    const [email, setEmail] = useState("")
    const [phone, setPhone] = useState("")
    const [jobTitleInput, setJobTitleInput] = useState("")
    const [departmentId, setDepartmentId] = useState<number | "">("")
    const [hireDateInput, setHireDateInput] = useState("")

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

    // ==================== جميع الطلبات ====================
    const [allRequests, setAllRequests] = useState<any[]>([])
    const [requestsFilter, setRequestsFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending")
    const [requestsType, setRequestsType] = useState<"all" | "leave" | "overtime" | "permission" | "correction">("all")
    const [requestsDept, setRequestsDept] = useState<string>("all")
    const [requestsDateFromAll, setRequestsDateFromAll] = useState("")
    const [requestsDateToAll, setRequestsDateToAll] = useState("")

    // ==================== التقارير (موحدة) ====================
    const [reportType, setReportType] = useState<"leaves" | "absences" | "attendance">("leaves")
    const [reportDepartment, setReportDepartment] = useState<string>("all")
    const [reportFrom, setReportFrom] = useState("")
    const [reportTo, setReportTo] = useState("")
    const [reportData, setReportData] = useState<any[]>([])
    const [expandedUser, setExpandedUser] = useState<string | null>(null)

    // ==================== الحضور (للأدمن نفسه) ====================
    const [todayAttendance, setTodayAttendance] = useState<any>(null)
    const [attendanceHistory, setAttendanceHistory] = useState<any[]>([])
    const [currentPos, setCurrentPos] = useState<{ lat: number, lng: number }>({ lat: 0, lng: 0 })
    const [loadingPos, setLoadingPos] = useState(true)
    const [attendanceFrom, setAttendanceFrom] = useState("")
    const [attendanceTo, setAttendanceTo] = useState("")

    // ==================== إعدادات الحساب ====================
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [changingPassword, setChangingPassword] = useState(false)

    // ==================== طلبات الإجازات ====================
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
    const [showLeaveForm, setShowLeaveForm] = useState(false)
    const [leaveType, setLeaveType] = useState("سنوية")
    const [leaveStart, setLeaveStart] = useState("")
    const [leaveEnd, setLeaveEnd] = useState("")
    const [leaveReason, setLeaveReason] = useState("")
    const [leaveBalance, setLeaveBalance] = useState({
        total: 0,
        used: 0,
        remaining: 0,
        emergency_total: 7,
        emergency_used: 0,
        emergency_remaining: 7,
        yearsOfService: 0,
        hire_date: "",
        message: ""
    })

    // ==================== طلبات الأوفر تايم ====================
    const [overtimeRequests, setOvertimeRequests] = useState<any[]>([])
    const [showOvertimeForm, setShowOvertimeForm] = useState(false)
    const [overtimeDate, setOvertimeDate] = useState("")
    const [overtimeHours, setOvertimeHours] = useState("")
    const [overtimeReason, setOvertimeReason] = useState("")

    // ==================== طلبات الإذن ====================
    const [permissionRequests, setPermissionRequests] = useState<any[]>([])
    const [showPermissionForm, setShowPermissionForm] = useState(false)
    const [permissionType, setPermissionType] = useState("ساعة")
    const [permissionDate, setPermissionDate] = useState("")
    const [permissionStartTime, setPermissionStartTime] = useState("")
    const [permissionEndTime, setPermissionEndTime] = useState("")
    const [permissionReason, setPermissionReason] = useState("")

    // ==================== طلبات تصحيح البصمة ====================
    const [correctionRequests, setCorrectionRequests] = useState<any[]>([])
    const [showCorrectionForm, setShowCorrectionForm] = useState(false)
    const [correctionDate, setCorrectionDate] = useState("")
    const [correctionCheckIn, setCorrectionCheckIn] = useState("")
    const [correctionCheckOut, setCorrectionCheckOut] = useState("")
    const [correctionReason, setCorrectionReason] = useState("")

    // =============================================
    // دوال الترتيب
    // =============================================
    const sortEmployees = (employees: Employee[]) => {
        if (!sortConfig) return employees

        return [...employees].sort((a, b) => {
            if (sortConfig.key === 'department_name') {
                const deptA = departments.find(d => d.id === a.department_id)?.name || ''
                const deptB = departments.find(d => d.id === b.department_id)?.name || ''

                if (deptA < deptB) return sortConfig.direction === 'asc' ? -1 : 1
                if (deptA > deptB) return sortConfig.direction === 'asc' ? 1 : -1
                return 0
            }

            const aValue = a[sortConfig.key as keyof Employee] || ''
            const bValue = b[sortConfig.key as keyof Employee] || ''

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
            return 0
        })
    }

    const requestSort = (key: keyof Employee | 'department_name') => {
        let direction: 'asc' | 'desc' = 'asc'

        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }

        setSortConfig({ key, direction })
    }

    const getSortIcon = (key: keyof Employee | 'department_name') => {
        if (!sortConfig || sortConfig.key !== key) {
            return '↕️'
        }
        return sortConfig.direction === 'asc' ? '↑' : '↓'
    }

    // =============================================
    // useEffect لتحميل البيانات
    // =============================================
    useEffect(() => {
        const storedName = localStorage.getItem("name")
        const storedUsername = localStorage.getItem("username")
        const storedId = localStorage.getItem("employee_id")
        const storedRole = localStorage.getItem("role")
        const storedJobTitle = localStorage.getItem("job_title")

        if (!storedName || !storedId || storedRole !== "admin") {
            alert("غير مصرح بالدخول")
            router.push("/")
            return
        }

        setAdminName(storedName)
        setAdminUsername(storedUsername || "")
        setAdminId(storedId)
        if (storedJobTitle) setJobTitle(storedJobTitle)

        fetchEmployees()
        fetchDepartments()
        fetchAllRequests()
        fetchTodayAttendance(storedUsername || "")
        fetchAdminLeaveBalance(storedId)
        fetchAdminManagedDepts(storedId)

        // جلب طلبات الأدمن الشخصية
        fetchLeaveRequests(storedId)
        fetchLeaveBalance(storedId)
        fetchOvertimeRequests(storedId)
        fetchPermissionRequests(storedId)
        fetchCorrectionRequests(storedId)

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
    // دالة جديدة: جلب الأقسام التي يديرها الـ Admin
    // =============================================
    const fetchAdminManagedDepts = async (managerId: string) => {
        try {
            const res = await fetch(`/api/departments/managers?manager_id=${managerId}`)
            if (res.ok) {
                const data = await res.json()
                const deptIds = data.map((item: any) => item.department_id)
                setAdminManagedDepts(deptIds)
                console.log("📋 الأقسام التي يديرها الـ Admin:", deptIds)
            }
        } catch (err) { console.error(err) }
    }

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

    const fetchAdminLeaveBalance = async (empId: string) => {
        try {
            const res = await fetch(`/api/leave-calculator?employee_id=${empId}`)
            const data = await res.json()
            if (res.ok) {
                setYearsOfService(data.years_of_service || 0)
                setHireDate(data.hire_date || "")
            }
        } catch (err) { console.error(err) }
    }

    // =============================================
    // دوال جلب جميع الطلبات
    // =============================================
    const fetchAllRequests = async () => {
        try {
            setLoading(true)

            const leavesRes = await fetch(`/api/leave-requests?user_role=hr${requestsDept !== "all" ? `&department_id=${requestsDept}` : ""}`)
            const leaves = leavesRes.ok ? await leavesRes.json() : []

            const overtimeRes = await fetch(`/api/overtime-requests?user_role=hr${requestsDept !== "all" ? `&department_id=${requestsDept}` : ""}`)
            const overtime = overtimeRes.ok ? await overtimeRes.json() : []

            const permissionRes = await fetch(`/api/permission-requests?user_role=hr${requestsDept !== "all" ? `&department_id=${requestsDept}` : ""}`)
            const permission = permissionRes.ok ? await permissionRes.json() : []

            const correctionRes = await fetch(`/api/attendance-correction?user_role=hr${requestsDept !== "all" ? `&department_id=${requestsDept}` : ""}`)
            const correction = correctionRes.ok ? await correctionRes.json() : []

            const combined = [
                ...leaves.map((r: any) => ({ ...r, requestType: "leave", requestTypeText: "إجازة" })),
                ...overtime.map((r: any) => ({ ...r, requestType: "overtime", requestTypeText: "أوفر تايم" })),
                ...permission.map((r: any) => ({ ...r, requestType: "permission", requestTypeText: "إذن" })),
                ...correction.map((r: any) => ({ ...r, requestType: "correction", requestTypeText: "تصحيح بصمة" }))
            ]

            combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

            let filtered = combined
            if (requestsFilter === "pending") {
                filtered = combined.filter(r => r.status === "قيد الانتظار" && !(r.hr_approved && r.manager_approved))
            } else if (requestsFilter === "approved") {
                filtered = combined.filter(r => r.status === "تمت الموافقة")
            } else if (requestsFilter === "rejected") {
                filtered = combined.filter(r => r.status === "مرفوضة")
            }

            if (requestsType !== "all") {
                filtered = filtered.filter(r => r.requestType === requestsType)
            }

            if (requestsDateFromAll) {
                filtered = filtered.filter(r => r.start_date >= requestsDateFromAll || r.date >= requestsDateFromAll)
            }
            if (requestsDateToAll) {
                filtered = filtered.filter(r => r.end_date <= requestsDateToAll || r.date <= requestsDateToAll)
            }

            setAllRequests(filtered)
            setLoading(false)
        } catch (err) {
            console.error(err)
            setLoading(false)
        }
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

    // =============================================
    // دوال جلب التقارير الموحدة
    // =============================================
    const fetchReport = async () => {
        if (!reportFrom || !reportTo) {
            alert("حدد تاريخ البداية والنهاية")
            return
        }

        setLoading(true)

        try {
            let url = ""

            if (reportType === "leaves") {
                url = `/api/reports/leaves?from=${reportFrom}&to=${reportTo}`
            } else if (reportType === "absences") {
                url = `/api/reports/absences?from=${reportFrom}&to=${reportTo}`
            } else if (reportType === "attendance") {
                url = `/api/reports/absences?type=attendance&from=${reportFrom}&to=${reportTo}`
            }

            if (reportDepartment && reportDepartment !== "all") {
                url += `&department_id=${reportDepartment}`
            }

            const res = await fetch(url)
            if (res.ok) {
                const data = await res.json()
                setReportData(data)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
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
            const managers = employees.filter(emp => emp.role === "manager" || emp.role === "admin")
            setAvailableManagers(managers)
        } catch (err) { console.error(err) }
    }

    // =============================================
    // دوال طلبات الأدمن الشخصية
    // =============================================
    const fetchLeaveRequests = async (empId: string) => {
        try {
            const res = await fetch(`/api/leave-requests?employee_id=${empId}`)
            if (res.ok) {
                const data = await res.json()
                setLeaveRequests(data)
            }
        } catch (err) { console.error(err) }
    }

    const fetchLeaveBalance = async (empId: string) => {
        try {
            const res = await fetch(`/api/leave-calculator?employee_id=${empId}`)
            const data = await res.json()
            if (res.ok) {
                setLeaveBalance({
                    total: data.annual_leave_total || 0,
                    used: data.used_days || 0,
                    remaining: data.remaining_annual || 0,
                    emergency_total: data.emergency_leave_total || 7,
                    emergency_used: data.used_emergency_days || 0,
                    emergency_remaining: data.remaining_emergency || 7,
                    yearsOfService: data.years_of_service || 0,
                    hire_date: data.hire_date || "",
                    message: data.message || ""
                })
            }
        } catch (err) { console.error(err) }
    }

    const fetchOvertimeRequests = async (empId: string) => {
        try {
            const res = await fetch(`/api/overtime-requests?employee_id=${empId}`)
            if (res.ok) {
                const data = await res.json()
                setOvertimeRequests(data)
            }
        } catch (err) { console.error(err) }
    }

    const fetchPermissionRequests = async (empId: string) => {
        try {
            const res = await fetch(`/api/permission-requests?employee_id=${empId}`)
            if (res.ok) {
                const data = await res.json()
                setPermissionRequests(data)
            }
        } catch (err) { console.error(err) }
    }

    const fetchCorrectionRequests = async (empId: string) => {
        try {
            const res = await fetch(`/api/attendance-correction?employee_id=${empId}`)
            if (res.ok) {
                const data = await res.json()
                setCorrectionRequests(data)
            }
        } catch (err) { console.error(err) }
    }

    // =============================================
    // دوال تقديم طلبات الأدمن
    // =============================================
    const submitLeaveRequest = async () => {
        if (!leaveStart || !leaveEnd) return alert("حدد تاريخ البداية والنهاية")

        const start = new Date(leaveStart)
        const end = new Date(leaveEnd)
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

        if (leaveType === "سنوية" && days > leaveBalance.remaining) {
            return alert(`❌ لا يوجد رصيد كافٍ. المتبقي: ${leaveBalance.remaining} يوم`)
        }
        if (leaveType === "عارضة" && days > leaveBalance.emergency_remaining) {
            return alert(`❌ لا يوجد رصيد كافٍ للعارضة. المتبقي: ${leaveBalance.emergency_remaining} يوم`)
        }

        const res = await fetch("/api/leave-requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                employee_id: adminId,
                leave_type: leaveType,
                start_date: leaveStart,
                end_date: leaveEnd,
                reason: leaveReason
            })
        })

        const data = await res.json()
        alert(data.message || data.error)
        if (res.ok) {
            setShowLeaveForm(false)
            setLeaveStart("")
            setLeaveEnd("")
            setLeaveReason("")
            fetchLeaveRequests(adminId)
            fetchLeaveBalance(adminId)
        }
    }

    const submitOvertimeRequest = async () => {
        if (!overtimeDate || !overtimeHours) return alert("حدد التاريخ وعدد الساعات")

        const res = await fetch("/api/overtime-requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                employee_id: adminId,
                date: overtimeDate,
                hours: parseFloat(overtimeHours),
                reason: overtimeReason
            })
        })

        const data = await res.json()
        alert(data.message || data.error)
        if (res.ok) {
            setShowOvertimeForm(false)
            setOvertimeDate("")
            setOvertimeHours("")
            setOvertimeReason("")
            fetchOvertimeRequests(adminId)
        }
    }

    const submitPermissionRequest = async () => {
        if (!permissionDate || !permissionReason) return alert("حدد التاريخ والسبب")

        if ((permissionType === "ساعة" || permissionType === "ساعتين") && !permissionStartTime) {
            return alert("حدد وقت بداية الإذن")
        }

        const res = await fetch("/api/permission-requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                employee_id: adminId,
                permission_type: permissionType,
                date: permissionDate,
                start_time: permissionStartTime || null,
                end_time: permissionEndTime || null,
                reason: permissionReason
            })
        })

        const data = await res.json()
        alert(data.message || data.error)
        if (res.ok) {
            setShowPermissionForm(false)
            setPermissionType("ساعة")
            setPermissionDate("")
            setPermissionStartTime("")
            setPermissionEndTime("")
            setPermissionReason("")
            fetchPermissionRequests(adminId)
        }
    }

    const submitCorrectionRequest = async () => {
        if (!correctionDate || !correctionReason) return alert("حدد التاريخ والسبب")

        const res = await fetch("/api/attendance-correction", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                employee_id: adminId,
                date: correctionDate,
                expected_check_in: correctionCheckIn || null,
                expected_check_out: correctionCheckOut || null,
                reason: correctionReason
            })
        })

        const data = await res.json()
        alert(data.message || data.error)
        if (res.ok) {
            setShowCorrectionForm(false)
            setCorrectionDate("")
            setCorrectionCheckIn("")
            setCorrectionCheckOut("")
            setCorrectionReason("")
            fetchCorrectionRequests(adminId)
        }
    }

    // =============================================
    // دوال حذف طلبات الأدمن
    // =============================================
    const deleteLeaveRequest = async (id: string) => {
        if (!confirm("هل أنت متأكد من حذف هذا الطلب؟")) return

        try {
            const res = await fetch(`/api/leave-requests?id=${id}&employee_id=${adminId}`, {
                method: "DELETE"
            })
            const data = await res.json()
            alert(data.message || data.error)
            if (res.ok) {
                fetchLeaveRequests(adminId)
                fetchLeaveBalance(adminId)
            }
        } catch (err) { console.error(err) }
    }

    const deleteOvertimeRequest = async (id: string) => {
        if (!confirm("هل أنت متأكد من حذف هذا الطلب؟")) return

        try {
            const res = await fetch(`/api/overtime-requests?id=${id}&employee_id=${adminId}`, {
                method: "DELETE"
            })
            const data = await res.json()
            alert(data.message || data.error)
            if (res.ok) fetchOvertimeRequests(adminId)
        } catch (err) { console.error(err) }
    }

    const deletePermissionRequest = async (id: string) => {
        if (!confirm("هل أنت متأكد من حذف هذا الطلب؟")) return

        try {
            const res = await fetch(`/api/permission-requests?id=${id}&employee_id=${adminId}`, {
                method: "DELETE"
            })
            const data = await res.json()
            alert(data.message || data.error)
            if (res.ok) fetchPermissionRequests(adminId)
        } catch (err) { console.error(err) }
    }

    const deleteCorrectionRequest = async (id: string) => {
        if (!confirm("هل أنت متأكد من حذف هذا الطلب؟")) return

        try {
            const res = await fetch(`/api/attendance-correction?id=${id}&employee_id=${adminId}`, {
                method: "DELETE"
            })
            const data = await res.json()
            alert(data.message || data.error)
            if (res.ok) fetchCorrectionRequests(adminId)
        } catch (err) { console.error(err) }
    }

    // =============================================
    // دوال تغيير كلمة المرور
    // =============================================
    const handleChangePassword = async () => {
        setPasswordMessage(null)

        if (!currentPassword || !newPassword || !confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'جميع الحقول مطلوبة' })
            return
        }

        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'كلمة المرور الجديدة غير متطابقة' })
            return
        }

        if (newPassword.length < 3) {
            setPasswordMessage({ type: 'error', text: 'كلمة المرور يجب أن تكون 3 أحرف على الأقل' })
            return
        }

        setChangingPassword(true)

        try {
            const res = await fetch("/api/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    employee_id: adminId,
                    current_password: currentPassword,
                    new_password: newPassword,
                    confirm_password: confirmPassword
                })
            })

            const data = await res.json()

            if (res.ok) {
                setPasswordMessage({ type: 'success', text: data.message })
                setCurrentPassword("")
                setNewPassword("")
                setConfirmPassword("")

                if (localStorage.getItem("remembered_username")) {
                    localStorage.setItem("remembered_password", newPassword)
                }
            } else {
                setPasswordMessage({ type: 'error', text: data.error })
            }
        } catch (err) {
            setPasswordMessage({ type: 'error', text: 'حدث خطأ في الاتصال' })
        } finally {
            setChangingPassword(false)
        }
    }

    // =============================================
    // دوال الموظفين (فردي)
    // =============================================
    const addEmployee = async () => {
        if (!name || !username || !password || !hireDateInput) return alert("املأ كل البيانات المطلوبة")

        const employeeData: any = {
            name,
            username,
            password,
            role,
            email,
            phone,
            job_title: jobTitleInput,
            department_id: departmentId || null,
            hire_date: hireDateInput
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
            setEmail(""); setPhone(""); setJobTitleInput(""); setDepartmentId(""); setHireDateInput("")
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
                const employeeData = {
                    name: row['الاسم'] || row['name'] || '',
                    username: row['اسم المستخدم'] || row['username'] || '',
                    password: row['كلمة المرور'] || row['password'] || '123456',
                    role: row['الدور'] || row['role'] || 'employee',
                    email: row['البريد'] || row['email'] || '',
                    phone: row['الهاتف'] || row['phone'] || '',
                    job_title: row['الوظيفة'] || row['job_title'] || '',
                    department_id: findDepartmentId(row['القسم'] || row['department']),
                    hire_date: formatExcelDate(row['تاريخ التعيين'] || row['hire_date'])
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

    const formatExcelDate = (dateValue: any): string => {
        if (!dateValue) return new Date().toISOString().split('T')[0]
        if (typeof dateValue === 'number') {
            const date = new Date((dateValue - 25569) * 86400 * 1000)
            return date.toISOString().split('T')[0]
        }
        return dateValue.toString()
    }

    const downloadTemplate = () => {
        const template = [
            {
                'الاسم': "أحمد محمد",
                'اسم المستخدم': 'ahmed123',
                'كلمة المرور': '123456',
                'البريد': 'ahmed@example.com',
                'الهاتف': '0123456789',
                'الوظيفة': 'مهندس',
                'القسم': 'الهندسة',
                'تاريخ التعيين': '2024-01-01',
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
    // دوال الموافقة على جميع أنواع الطلبات
    // =============================================
    const approveAnyRequest = async (req: any) => {
        try {
            let endpoint = ""
            if (req.requestType === "leave") endpoint = "/api/leave-requests"
            else if (req.requestType === "overtime") endpoint = "/api/overtime-requests"
            else if (req.requestType === "permission") endpoint = "/api/permission-requests"
            else if (req.requestType === "correction") endpoint = "/api/attendance-correction"
            else return

            const employeeDeptId = req.employees?.department_id
            const isManagerForThisEmployee = adminManagedDepts.includes(employeeDeptId)

            console.log("🔍 Admin كمدير؟", {
                employeeDeptId,
                adminManagedDepts,
                isManagerForThisEmployee
            })

            const res = await fetch(endpoint, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: req.id,
                    action: "approve",
                    approved_by: adminId,
                    user_role: "hr",
                    is_admin_as_manager: isManagerForThisEmployee
                })
            })
            const data = await res.json()
            alert(data.message || data.error)
            if (res.ok) fetchAllRequests()
        } catch (err) { console.error(err) }
    }

    const rejectAnyRequest = async (req: any) => {
        try {
            let endpoint = ""
            if (req.requestType === "leave") endpoint = "/api/leave-requests"
            else if (req.requestType === "overtime") endpoint = "/api/overtime-requests"
            else if (req.requestType === "permission") endpoint = "/api/permission-requests"
            else if (req.requestType === "correction") endpoint = "/api/attendance-correction"
            else return

            const employeeDeptId = req.employees?.department_id
            const isManagerForThisEmployee = adminManagedDepts.includes(employeeDeptId)

            const res = await fetch(endpoint, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: req.id,
                    action: "reject",
                    approved_by: adminId,
                    user_role: "hr",
                    is_admin_as_manager: isManagerForThisEmployee
                })
            })
            const data = await res.json()
            alert(data.message || data.error)
            if (res.ok) fetchAllRequests()
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
        localStorage.clear()
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

    const getApprovalStatus = (req: any) => {
        if (req.status === "مرفوضة") return { text: "❌ مرفوضة", color: "#f44336" }
        if (req.status === "تمت الموافقة") return { text: "✅ معتمدة", color: "#4caf50" }
        if (req.hr_approved && req.manager_approved) return { text: "✅ معتمدة", color: "#4caf50" }
        if (req.hr_approved || req.manager_approved) return { text: "⏳ موافقة واحدة", color: "#ff9800" }
        return { text: "🕒 في انتظار الموافقات", color: "#9e9e9e" }
    }

    const getRequestTypeColor = (type: string) => {
        switch (type) {
            case "leave": return "#2196f3"
            case "overtime": return "#ff9800"
            case "permission": return "#9c27b0"
            case "correction": return "#f44336"
            default: return "#757575"
        }
    }

    const groupedAttendance = reportType === "attendance" && reportData.length > 0
        ? reportData.reduce((acc: any, record) => {
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
        : {}

    const sortedEmployees = sortEmployees(employees)

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                {/* رأس الصفحة */}
                <div style={styles.header}>
                    <h2 style={styles.title}>لوحة تحكم الموارد البشرية</h2>
                    <button onClick={handleLogout} style={styles.logoutButton}>تسجيل خروج</button>
                </div>

                {/* بطاقة معلومات الأدمن */}
                <div style={styles.profileCard}>
                    <div style={styles.profileHeader}>
                        <div style={styles.profileAvatar}>
                            {adminName.charAt(0)}
                        </div>
                        <div style={styles.profileInfo}>
                            <h3 style={styles.profileName}>{adminName}</h3>
                            <p style={styles.profileJob}>{jobTitle}</p>
                            <div style={styles.profileDetails}>
                                <span style={styles.profileDetail}>
                                    <span style={styles.detailIcon}>📅</span>
                                    تعيين: {hireDate ? formatDate(hireDate) : "غير محدد"}
                                </span>
                                <span style={styles.profileDetail}>
                                    <span style={styles.detailIcon}>⏳</span>
                                    مدة الخدمة: {yearsOfService} سنة
                                </span>
                                <span style={styles.profileDetail}>
                                    <span style={styles.detailIcon}>👤</span>
                                    {adminUsername}
                                </span>
                                {adminManagedDepts.length > 0 && (
                                    <span style={{ ...styles.profileDetail, backgroundColor: '#ff9800' }}>
                                        <span style={styles.detailIcon}>👥</span>
                                        مدير على {adminManagedDepts.length} قسم
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
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
                        onClick={() => setActiveTab("allRequests")}
                        style={{ ...styles.tabButton, backgroundColor: activeTab === "allRequests" ? '#1976d2' : '#e0e0e0', color: activeTab === "allRequests" ? 'white' : '#333' }}
                    >
                        📋 طلبات الموظفين
                    </button>
                    <button
                        onClick={() => setActiveTab("reports")}
                        style={{ ...styles.tabButton, backgroundColor: activeTab === "reports" ? '#1976d2' : '#e0e0e0', color: activeTab === "reports" ? 'white' : '#333' }}
                    >
                        📈 التقارير
                    </button>
                    <button
                        onClick={() => setActiveTab("attendance")}
                        style={{ ...styles.tabButton, backgroundColor: activeTab === "attendance" ? '#1976d2' : '#e0e0e0', color: activeTab === "attendance" ? 'white' : '#333' }}
                    >
                        🕒 تسجيل حضوري
                    </button>
                    <button
                        onClick={() => setActiveTab("leave")}
                        style={{ ...styles.tabButton, backgroundColor: activeTab === "leave" ? '#1976d2' : '#e0e0e0', color: activeTab === "leave" ? 'white' : '#333' }}
                    >
                        🏖️ إجازاتي
                    </button>
                    <button
                        onClick={() => setActiveTab("overtime")}
                        style={{ ...styles.tabButton, backgroundColor: activeTab === "overtime" ? '#1976d2' : '#e0e0e0', color: activeTab === "overtime" ? 'white' : '#333' }}
                    >
                        ⏰ أوفر تايمي
                    </button>
                    <button
                        onClick={() => setActiveTab("permission")}
                        style={{ ...styles.tabButton, backgroundColor: activeTab === "permission" ? '#1976d2' : '#e0e0e0', color: activeTab === "permission" ? 'white' : '#333' }}
                    >
                        ⏳ إذوني
                    </button>
                    <button
                        onClick={() => setActiveTab("correction")}
                        style={{ ...styles.tabButton, backgroundColor: activeTab === "correction" ? '#1976d2' : '#e0e0e0', color: activeTab === "correction" ? 'white' : '#333' }}
                    >
                        🔧 تصحيح بصمتي
                    </button>
                    <button
                        onClick={() => setActiveTab("settings")}
                        style={{ ...styles.tabButton, backgroundColor: activeTab === "settings" ? '#1976d2' : '#e0e0e0', color: activeTab === "settings" ? 'white' : '#333' }}
                    >
                        ⚙️ إعدادات
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
                                <span style={styles.statValue}>{adminManagedDepts.length}</span>
                                <span style={styles.statLabel}>أقسام تديرها</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ========================================= */}
                {/* تبويب الموظفين (مع خاصية الترتيب) */}
                {/* ========================================= */}
                {activeTab === "employees" && (
                    <div style={styles.tabContent}>
                        <div style={styles.sectionHeader}>
                            <h3 style={styles.sectionTitle}>إدارة الموظفين</h3>
                            <button onClick={() => setShowAddForm(!showAddForm)} style={styles.addButton}>
                                {showAddForm ? '❌ إلغاء' : '➕ إضافة موظف'}
                            </button>
                        </div>

                        {showAddForm && (
                            <div style={styles.formCard}>
                                <h4 style={styles.formTitle}>إضافة موظف جديد</h4>
                                <input type="text" placeholder="الاسم الكامل *" value={name} onChange={e => setName(e.target.value)} style={styles.input} />
                                <input type="text" placeholder="اسم المستخدم *" value={username} onChange={e => setUsername(e.target.value)} style={styles.input} />
                                <input type="password" placeholder="كلمة المرور *" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} />
                                <input type="email" placeholder="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} />
                                <input type="text" placeholder="رقم الموبايل" value={phone} onChange={e => setPhone(e.target.value)} style={styles.input} />
                                <input type="text" placeholder="المسمى الوظيفي" value={jobTitleInput} onChange={e => setJobTitleInput(e.target.value)} style={styles.input} />
                                <input type="date" placeholder="تاريخ التعيين *" value={hireDateInput} onChange={e => setHireDateInput(e.target.value)} style={styles.input} required />
                                <select value={departmentId} onChange={e => setDepartmentId(e.target.value ? Number(e.target.value) : "")} style={styles.select}>
                                    <option value="">اختر القسم</option>
                                    {departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                                </select>
                                <select value={role} onChange={e => setRole(e.target.value)} style={styles.select}>
                                    <option value="employee">موظف</option>
                                    <option value="admin">Admin</option>
                                    <option value="manager">مدير</option>
                                </select>
                                <button onClick={addEmployee} style={styles.submitButton}>✅ إضافة الموظف</button>
                            </div>
                        )}

                        <div style={styles.sortInfo}>
                            <span style={styles.sortHint}>👆 اضغط على رأس العمود للترتيب</span>
                        </div>

                        <div style={styles.tableContainer}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.tableHeader} onClick={() => requestSort('name')}>
                                            الاسم {getSortIcon('name')}
                                        </th>
                                        <th style={styles.tableHeader} onClick={() => requestSort('username')}>
                                            اسم المستخدم {getSortIcon('username')}
                                        </th>
                                        <th style={styles.tableHeader} onClick={() => requestSort('department_name')}>
                                            القسم {getSortIcon('department_name')}
                                        </th>
                                        <th style={styles.tableHeader} onClick={() => requestSort('job_title')}>
                                            الوظيفة {getSortIcon('job_title')}
                                        </th>
                                        <th style={styles.tableHeader} onClick={() => requestSort('hire_date')}>
                                            تاريخ التعيين {getSortIcon('hire_date')}
                                        </th>
                                        <th style={styles.tableHeader} onClick={() => requestSort('role')}>
                                            الدور {getSortIcon('role')}
                                        </th>
                                        <th style={styles.tableHeader}>الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedEmployees.map(emp => (
                                        <tr key={emp.id}>
                                            <td style={styles.tableCell}>
                                                <input type="text" value={emp.name} onChange={e => {
                                                    const newEmployees = employees.map(item => item.id === emp.id ? { ...item, name: e.target.value } : item)
                                                    setEmployees(newEmployees)
                                                }} style={styles.tableInput} />
                                            </td>
                                            <td style={styles.tableCell}>
                                                <input type="text" value={emp.username} onChange={e => {
                                                    const newEmployees = employees.map(item => item.id === emp.id ? { ...item, username: e.target.value } : item)
                                                    setEmployees(newEmployees)
                                                }} style={styles.tableInput} />
                                            </td>
                                            <td style={styles.tableCell}>
                                                <select value={emp.department_id || ""} onChange={e => {
                                                    const newDeptId = e.target.value ? Number(e.target.value) : undefined
                                                    const newEmployees = employees.map(item => item.id === emp.id ? { ...item, department_id: newDeptId } : item)
                                                    setEmployees(newEmployees)
                                                }} style={styles.tableSelect}>
                                                    <option value="">بدون قسم</option>
                                                    {departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                                                </select>
                                            </td>
                                            <td style={styles.tableCell}>
                                                <input type="text" value={emp.job_title || ""} onChange={e => {
                                                    const newEmployees = employees.map(item => item.id === emp.id ? { ...item, job_title: e.target.value } : item)
                                                    setEmployees(newEmployees)
                                                }} style={styles.tableInput} />
                                            </td>
                                            <td style={styles.tableCell}>
                                                <input type="date" value={emp.hire_date || ""} onChange={e => {
                                                    const newEmployees = employees.map(item => item.id === emp.id ? { ...item, hire_date: e.target.value } : item)
                                                    setEmployees(newEmployees)
                                                }} style={styles.tableInput} />
                                            </td>
                                            <td style={styles.tableCell}>
                                                <select value={emp.role} onChange={e => {
                                                    const newEmployees = employees.map(item => item.id === emp.id ? { ...item, role: e.target.value } : item)
                                                    setEmployees(newEmployees)
                                                }} style={styles.tableSelect}>
                                                    <option value="employee">موظف</option>
                                                    <option value="admin">Admin</option>
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
                                <button onClick={downloadTemplate} style={styles.templateButton}>📥 تحميل نموذج Excel</button>
                                <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} style={styles.fileInput} id="excel-upload" />
                                <label htmlFor="excel-upload" style={styles.fileLabel}>📂 اختر ملف</label>
                            </div>
                            {excelFile && (
                                <div style={styles.fileInfo}>
                                    <p>الملف: {excelFile.name}</p>
                                    <p>عدد السجلات: {excelData.length}</p>
                                    <button onClick={processBulkUpload} style={styles.uploadButton} disabled={uploadLoading}>
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
                                            {uploadResults.errors.map((err, idx) => <p key={idx} style={styles.errorItem}>{err}</p>)}
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

                        {showDeptForm && (
                            <div style={styles.formCard}>
                                <h4 style={styles.formTitle}>{editingDept ? 'تعديل قسم' : 'إضافة قسم جديد'}</h4>
                                <input type="text" placeholder="اسم القسم" value={deptName} onChange={e => setDeptName(e.target.value)} style={styles.input} />
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button onClick={editingDept ? updateDepartment : addDepartment} style={styles.submitButton}>
                                        {editingDept ? '✅ حفظ التعديلات' : '✅ إضافة القسم'}
                                    </button>
                                    <button onClick={cancelDeptForm} style={{ ...styles.submitButton, backgroundColor: '#9e9e9e' }}>❌ إلغاء</button>
                                </div>
                            </div>
                        )}

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
                                        <tr><td colSpan={5} style={styles.emptyCell}>لا توجد أقسام بعد</td></tr>
                                    ) : (
                                        departments.map((dept, index) => (
                                            <tr key={dept.id}>
                                                <td style={styles.tableCell}>{index + 1}</td>
                                                <td style={styles.tableCell}>{dept.name}</td>
                                                <td style={styles.tableCell}>
                                                    <span style={{ ...styles.roleBadge, backgroundColor: (dept.employees_count || 0) > 0 ? '#4caf50' : '#9e9e9e' }}>
                                                        {dept.employees_count || 0} موظف
                                                    </span>
                                                </td>
                                                <td style={styles.tableCell}>
                                                    {dept.managers && dept.managers.length > 0 ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                            {dept.managers.map(manager => (
                                                                <span key={manager.id} style={{
                                                                    ...styles.managerBadge,
                                                                    backgroundColor: manager.id === adminId ? '#1976d2' : '#ff9800'
                                                                }}>
                                                                    {manager.name} {manager.id === adminId ? '(أنت)' : ''}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : <span style={{ color: '#999' }}>لا يوجد مدراء</span>}
                                                </td>
                                                <td style={styles.tableCell}>
                                                    <button onClick={() => startEditDept(dept)} style={styles.editButton} title="تعديل">✏️</button>
                                                    <button onClick={() => openManageManagers(dept)} style={styles.managerButton} title="إدارة المدراء">👥</button>
                                                    <button onClick={() => deleteDepartment(dept.id)} style={styles.deleteButton} title="حذف" disabled={(dept.employees_count || 0) > 0}>🗑️</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {showManageManagers && selectedDept && (
                            <div style={styles.modalOverlay}>
                                <div style={styles.modal}>
                                    <h3 style={styles.modalTitle}>إدارة مدراء قسم: {selectedDept.name}</h3>
                                    <div style={styles.modalContent}>
                                        <div style={styles.modalSection}>
                                            <h4 style={styles.modalSubTitle}>المدراء الحاليون</h4>
                                            {deptManagers.length === 0 ? <p style={styles.emptyText}>لا يوجد مدراء</p> : deptManagers.map(rel => (
                                                <div key={rel.id} style={styles.managerRow}>
                                                    <span>
                                                        {rel.employees?.name} ({rel.employees?.username})
                                                        {rel.employees?.id === adminId && ' (أنت)'}
                                                    </span>
                                                    <button onClick={() => removeManagerFromDept(rel.id)} style={styles.smallDeleteButton}>❌</button>
                                                </div>
                                            ))}
                                        </div>
                                        <div style={styles.modalSection}>
                                            <h4 style={styles.modalSubTitle}>إضافة مدير</h4>
                                            <select onChange={(e) => addManagerToDept(e.target.value)} style={styles.select} value="">
                                                <option value="">اختر مدير...</option>
                                                {availableManagers.filter(m => !deptManagers.some((rel: any) => rel.manager_id === m.id)).map(manager => (
                                                    <option key={manager.id} value={manager.id}>
                                                        {manager.name} ({manager.username}) {manager.role === 'admin' ? '⭐' : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div style={styles.modalFooter}>
                                        <button onClick={() => setShowManageManagers(false)} style={styles.closeButton}>إغلاق</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ========================================= */}
                {/* تبويب جميع طلبات الموظفين */}
                {/* ========================================= */}
                {activeTab === "allRequests" && (
                    <div style={styles.tabContent}>
                        <h3 style={styles.sectionTitle}>جميع طلبات الموظفين</h3>

                        <div style={styles.filterSection}>
                            <select value={requestsFilter} onChange={e => setRequestsFilter(e.target.value as any)} style={styles.select}>
                                <option value="all">كل الحالات</option>
                                <option value="pending">⏳ قيد الانتظار</option>
                                <option value="approved">✅ معتمدة</option>
                                <option value="rejected">❌ مرفوضة</option>
                            </select>
                            <select value={requestsType} onChange={e => setRequestsType(e.target.value as any)} style={styles.select}>
                                <option value="all">كل الأنواع</option>
                                <option value="leave">🏖️ إجازات</option>
                                <option value="overtime">⏰ أوفر تايم</option>
                                <option value="permission">⏳ إذون</option>
                                <option value="correction">🔧 تصحيح بصمة</option>
                            </select>
                            <select value={requestsDept} onChange={e => setRequestsDept(e.target.value)} style={styles.select}>
                                <option value="all">كل الأقسام</option>
                                {departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                            </select>
                            <input type="date" value={requestsDateFromAll} onChange={e => setRequestsDateFromAll(e.target.value)} style={styles.dateInput} placeholder="من" />
                            <input type="date" value={requestsDateToAll} onChange={e => setRequestsDateToAll(e.target.value)} style={styles.dateInput} placeholder="إلى" />
                            <button onClick={fetchAllRequests} style={styles.viewButton}>بحث</button>
                        </div>

                        <div style={styles.tableContainer}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.tableHeader}>الموظف</th>
                                        <th style={styles.tableHeader}>القسم</th>
                                        <th style={styles.tableHeader}>نوع الطلب</th>
                                        <th style={styles.tableHeader}>التفاصيل</th>
                                        <th style={styles.tableHeader}>الحالة</th>
                                        <th style={styles.tableHeader}>الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={6} style={styles.emptyCell}>جاري التحميل...</td></tr>
                                    ) : allRequests.length === 0 ? (
                                        <tr><td colSpan={6} style={styles.emptyCell}>لا توجد طلبات</td></tr>
                                    ) : (
                                        allRequests.map(req => {
                                            const deptName = departments.find(d => d.id === req.employees?.department_id)?.name || "-"
                                            const status = getApprovalStatus(req)
                                            const canApprove = !req.hr_approved && req.status !== "مرفوضة"
                                            const isAdminManagerForThisDept = adminManagedDepts.includes(req.employees?.department_id)

                                            let details = ""
                                            if (req.requestType === "leave") details = `${req.leave_type} - من ${req.start_date} إلى ${req.end_date}`
                                            else if (req.requestType === "overtime") details = `${req.date} - ${req.hours} ساعة`
                                            else if (req.requestType === "permission") {
                                                details = `${req.date} - ${req.permission_type}`
                                                if (req.start_time) details += ` من ${req.start_time}`
                                                if (req.end_time) details += ` إلى ${req.end_time}`
                                            } else if (req.requestType === "correction") {
                                                details = `${req.date}`
                                                if (req.expected_check_in) details += ` - حضور: ${req.expected_check_in}`
                                                if (req.expected_check_out) details += ` - انصراف: ${req.expected_check_out}`
                                            }

                                            return (
                                                <tr key={req.id}>
                                                    <td style={styles.tableCell}>{req.employees?.name}</td>
                                                    <td style={styles.tableCell}>{deptName}</td>
                                                    <td style={styles.tableCell}>
                                                        <span style={{ ...styles.typeBadge, backgroundColor: getRequestTypeColor(req.requestType) }}>{req.requestTypeText}</span>
                                                    </td>
                                                    <td style={styles.tableCell}>{details}</td>
                                                    <td style={styles.tableCell}>
                                                        {req.status === "مرفوضة" ? (
                                                            <span style={{
                                                                ...styles.approvalBadge,
                                                                backgroundColor: '#ffebee',
                                                                color: '#f44336',
                                                                border: '1px solid #f44336'
                                                            }}>
                                                                ❌ مرفوضة
                                                            </span>
                                                        ) : req.status === "تمت الموافقة" || (req.hr_approved && req.manager_approved) ? (
                                                            <span style={{
                                                                ...styles.approvalBadge,
                                                                backgroundColor: '#e8f5e9',
                                                                color: '#2e7d32',
                                                                border: '1px solid #4caf50'
                                                            }}>
                                                                ✅ معتمدة
                                                            </span>
                                                        ) : (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                                <span style={{
                                                                    ...styles.approvalBadge,
                                                                    backgroundColor: req.hr_approved ? '#e8f5e9' : '#fff4e5',
                                                                    color: req.hr_approved ? '#2e7d32' : '#ed6c02',
                                                                    border: `1px solid ${req.hr_approved ? '#4caf50' : '#ed6c02'}`
                                                                }}>
                                                                    HR: {req.hr_approved ? '✅ موافق' : '⏳ في انتظار'}
                                                                </span>
                                                                <span style={{
                                                                    ...styles.approvalBadge,
                                                                    backgroundColor: req.manager_approved ? '#e8f5e9' : '#fff4e5',
                                                                    color: req.manager_approved ? '#2e7d32' : '#ed6c02',
                                                                    border: `1px solid ${req.manager_approved ? '#4caf50' : '#ed6c02'}`
                                                                }}>
                                                                    Manager: {req.manager_approved ? '✅ موافق' : '⏳ في انتظار'}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {req.pending_from && <div style={styles.pendingInfo}>في انتظار: {req.pending_from}</div>}
                                                        {isAdminManagerForThisDept && !req.hr_approved && req.status === "قيد الانتظار" && (
                                                            <div style={{ ...styles.pendingInfo, color: '#1976d2' }}>⭐ أنت مدير لهذا القسم</div>
                                                        )}
                                                    </td>
                                                    <td style={styles.tableCell}>
                                                        {canApprove && (
                                                            <>
                                                                <button onClick={() => approveAnyRequest(req)} style={styles.approveButton} title={isAdminManagerForThisDept ? "موافقة كاملة (كمدير وHR)" : "موافقة كـ HR"}>
                                                                    ✓
                                                                </button>
                                                                <button onClick={() => rejectAnyRequest(req)} style={styles.rejectButton} title="رفض">
                                                                    ✗
                                                                </button>
                                                            </>
                                                        )}
                                                        {req.hr_approved && req.status === "قيد الانتظار" && <span style={styles.approvedBadge}>✅ وافقت HR</span>}
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ========================================= */}
                {/* تبويب التقارير الموحد */}
                {/* ========================================= */}
                {activeTab === "reports" && (
                    <div style={styles.tabContent}>
                        <h3 style={styles.sectionTitle}>التقارير</h3>

                        <div style={styles.filterSection}>
                            <select value={reportType} onChange={e => setReportType(e.target.value as "leaves" | "absences" | "attendance")} style={styles.select}>
                                <option value="leaves">تقرير الإجازات</option>
                                <option value="absences">تقرير الغياب</option>
                                <option value="attendance">تقرير الحضور والانصراف</option>
                            </select>

                            <select value={reportDepartment} onChange={e => setReportDepartment(e.target.value)} style={styles.select}>
                                <option value="all">كل الأقسام</option>
                                {departments.map(dept => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                            </select>

                            <input type="date" value={reportFrom} onChange={e => setReportFrom(e.target.value)} style={styles.dateInput} placeholder="من" />
                            <input type="date" value={reportTo} onChange={e => setReportTo(e.target.value)} style={styles.dateInput} placeholder="إلى" />
                            <button onClick={fetchReport} style={styles.viewButton}>عرض التقرير</button>
                        </div>

                        {reportType !== "attendance" && (
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
                                                    <th style={styles.tableHeader}>القسم</th>
                                                    <th style={styles.tableHeader}>أيام الغياب</th>
                                                </>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan={6} style={styles.emptyCell}>جاري التحميل...</td></tr>
                                        ) : reportData.length === 0 ? (
                                            <tr><td colSpan={6} style={styles.emptyCell}>لا توجد بيانات في هذه الفترة</td></tr>
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
                                                            <td style={styles.tableCell}>{item.department_name || "-"}</td>
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
                        )}

                        {reportType === "attendance" && Object.keys(groupedAttendance).length > 0 && (
                            <div style={styles.reportSummary}>
                                <div style={styles.summaryStats}>
                                    <div style={styles.statCard}>
                                        <span style={styles.statValue}>{Object.keys(groupedAttendance).length}</span>
                                        <span style={styles.statLabel}>موظفين</span>
                                    </div>
                                    <div style={styles.statCard}>
                                        <span style={styles.statValue}>{reportData.length}</span>
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
                                                        متوسط: {(user.totalHours / user.totalDays).toFixed(2)} ساعة/يوم
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

                        {reportType === "attendance" && reportData.length === 0 && reportFrom && reportTo && (
                            <p style={styles.emptyCell}>لا توجد بيانات حضور في هذه الفترة</p>
                        )}
                    </div>
                )}

                {/* ========================================= */}
                {/* تبويب تسجيل حضور الأدمن */}
                {/* ========================================= */}
                {activeTab === "attendance" && (
                    <div style={styles.tabContent}>
                        <h3 style={styles.sectionTitle}>تسجيل حضوري</h3>
                        <div style={styles.attendanceCard}>
                            <div style={styles.locationStatus}>{loadingPos ? "⏳ جاري الحصول على الموقع..." : "📍 تم الحصول على الموقع بنجاح"}</div>
                            <div style={styles.buttonGroup}>
                                <button onClick={() => handleCheck("check_in")} style={styles.checkInButton} disabled={loadingPos}>🟢 تسجيل حضور</button>
                                <button onClick={() => handleCheck("check_out")} style={styles.checkOutButton} disabled={loadingPos}>🔴 تسجيل انصراف</button>
                            </div>
                            <h4 style={styles.subTitle}>حضور اليوم</h4>
                            <div style={styles.tableContainer}>
                                <table style={styles.table}>
                                    <thead><tr><th style={styles.tableHeader}>اليوم</th><th style={styles.tableHeader}>الحضور</th><th style={styles.tableHeader}>الانصراف</th></tr></thead>
                                    <tbody>
                                        {todayAttendance ? (
                                            <tr><td style={styles.tableCell}>{todayAttendance.day}</td><td style={styles.tableCell}>{formatTime(todayAttendance.check_in)}</td><td style={styles.tableCell}>{formatTime(todayAttendance.check_out)}</td></tr>
                                        ) : <tr><td colSpan={3} style={styles.emptyCell}>لم يتم تسجيل حضور اليوم بعد</td></tr>}
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
                                    <thead><tr><th style={styles.tableHeader}>اليوم</th><th style={styles.tableHeader}>الحضور</th><th style={styles.tableHeader}>الانصراف</th></tr></thead>
                                    <tbody>
                                        {attendanceHistory.length === 0 ? (
                                            <tr><td colSpan={3} style={styles.emptyCell}>اختر الفترة لعرض السجل</td></tr>
                                        ) : (
                                            attendanceHistory.map(att => (
                                                <tr key={att.id}><td style={styles.tableCell}>{att.day}</td><td style={styles.tableCell}>{formatTime(att.check_in)}</td><td style={styles.tableCell}>{formatTime(att.check_out)}</td></tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ========================================= */}
                {/* تبويب طلبات الإجازات */}
                {/* ========================================= */}
                {activeTab === "leave" && (
                    <div style={styles.tabContent}>
                        <div style={styles.sectionHeader}>
                            <h3 style={styles.sectionTitle}>طلبات الإجازات</h3>
                            <button onClick={() => setShowLeaveForm(!showLeaveForm)} style={styles.addButton}>
                                {showLeaveForm ? '❌ إلغاء' : '➕ طلب إجازة'}
                            </button>
                        </div>

                        {/* كرت رصيد الإجازات */}
                        <div style={styles.balanceCard}>
                            <h4 style={styles.balanceTitle}>رصيد الإجازات</h4>
                            {leaveBalance.message && (
                                <p style={styles.balanceMessage}>{leaveBalance.message}</p>
                            )}

                            <div style={styles.balanceRow}>
                                <div style={styles.balanceItem}>
                                    <span style={styles.balanceLabel}>السنوية (إجمالي)</span>
                                    <span style={styles.balanceValue}>{leaveBalance.total} يوم</span>
                                </div>
                                <div style={styles.balanceItem}>
                                    <span style={styles.balanceLabel}>مستخدم</span>
                                    <span style={styles.balanceValue}>{leaveBalance.used} يوم</span>
                                </div>
                                <div style={styles.balanceItem}>
                                    <span style={styles.balanceLabel}>المتبقي</span>
                                    <span style={{
                                        ...styles.balanceValue,
                                        color: leaveBalance.remaining > 0 ? '#4caf50' : '#f44336',
                                        fontWeight: 'bold'
                                    }}>
                                        {leaveBalance.remaining} يوم
                                    </span>
                                </div>
                            </div>

                            {/* خط فاصل */}
                            <hr style={styles.balanceDivider} />

                            {/* رصيد الإجازة العارضة */}
                            <div style={styles.emergencyRow}>
                                <div style={styles.emergencyItem}>
                                    <span style={styles.emergencyLabel}>إجازة عارضة</span>
                                    <span style={styles.emergencyValue}>
                                        {leaveBalance.emergency_remaining} / {leaveBalance.emergency_total} يوم
                                    </span>
                                </div>
                                <div style={styles.emergencyProgress}>
                                    <div style={{
                                        ...styles.emergencyProgressBar,
                                        width: `${(leaveBalance.emergency_used / leaveBalance.emergency_total) * 100}%`
                                    }} />
                                </div>
                            </div>
                        </div>

                        {/* نموذج إضافة طلب إجازة */}
                        {showLeaveForm && (
                            <div style={styles.formCard}>
                                <h4 style={styles.formTitle}>طلب إجازة جديد</h4>

                                <select value={leaveType} onChange={e => setLeaveType(e.target.value)} style={styles.select}>
                                    <option value="سنوية">إجازة سنوية</option>
                                    <option value="مرضية">إجازة مرضية</option>
                                    <option value="عارضة">إجازة عارضة</option>
                                    <option value="غير مدفوعة">إجازة غير مدفوعة</option>
                                </select>

                                <div style={styles.dateRow}>
                                    <div style={styles.dateField}>
                                        <label style={styles.label}>من:</label>
                                        <input type="date" value={leaveStart} onChange={e => setLeaveStart(e.target.value)} style={styles.dateInput} />
                                    </div>
                                    <div style={styles.dateField}>
                                        <label style={styles.label}>إلى:</label>
                                        <input type="date" value={leaveEnd} onChange={e => setLeaveEnd(e.target.value)} style={styles.dateInput} />
                                    </div>
                                </div>

                                <textarea
                                    placeholder="السبب (اختياري)"
                                    value={leaveReason}
                                    onChange={e => setLeaveReason(e.target.value)}
                                    style={styles.textarea}
                                    rows={3}
                                />

                                <button onClick={submitLeaveRequest} style={styles.submitButton}>
                                    ✅ تقديم الطلب
                                </button>
                            </div>
                        )}

                        {/* قائمة طلبات الإجازات السابقة */}
                        <h4 style={styles.subTitle}>الطلبات السابقة</h4>
                        <div style={styles.requestsList}>
                            {leaveRequests.length === 0 && !showLeaveForm && (
                                <p style={styles.noData}>لا توجد طلبات سابقة</p>
                            )}
                            {leaveRequests.map(req => {
                                const status = getApprovalStatus(req)
                                return (
                                    <div key={req.id} style={styles.requestCard}>
                                        <div style={styles.requestHeader}>
                                            <span style={styles.requestType}>{req.leave_type}</span>
                                            {req.status === "مرفوضة" ? (
                                                <span style={{
                                                    ...styles.approvalBadge,
                                                    backgroundColor: '#ffebee',
                                                    color: '#f44336',
                                                    border: '1px solid #f44336'
                                                }}>
                                                    ❌ مرفوضة
                                                </span>
                                            ) : req.status === "تمت الموافقة" || (req.hr_approved && req.manager_approved) ? (
                                                <span style={{
                                                    ...styles.approvalBadge,
                                                    backgroundColor: '#e8f5e9',
                                                    color: '#2e7d32',
                                                    border: '1px solid #4caf50'
                                                }}>
                                                    ✅ معتمدة
                                                </span>
                                            ) : (
                                                <div style={styles.approvalContainer}>
                                                    <div style={{
                                                        ...styles.approvalRow,
                                                        backgroundColor: req.hr_approved ? '#e8f5e9' : '#fff4e5',
                                                        border: `1px solid ${req.hr_approved ? '#4caf50' : '#ed6c02'}`
                                                    }}>
                                                        <span style={styles.approvalLabel}>HR</span>
                                                        <span style={{
                                                            color: req.hr_approved ? '#2e7d32' : '#ed6c02',
                                                            fontWeight: 'bold'
                                                        }}>
                                                            {req.hr_approved ? '✅' : '⏳'}
                                                        </span>
                                                    </div>
                                                    <div style={{
                                                        ...styles.approvalRow,
                                                        backgroundColor: req.manager_approved ? '#e8f5e9' : '#fff4e5',
                                                        border: `1px solid ${req.manager_approved ? '#4caf50' : '#ed6c02'}`
                                                    }}>
                                                        <span style={styles.approvalLabel}>Manager</span>
                                                        <span style={{
                                                            color: req.manager_approved ? '#2e7d32' : '#ed6c02',
                                                            fontWeight: 'bold'
                                                        }}>
                                                            {req.manager_approved ? '✅' : '⏳'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <p style={styles.requestDates}>
                                            من {formatDate(req.start_date)} إلى {formatDate(req.end_date)}
                                        </p>

                                        {req.reason && <p style={styles.requestReason}>السبب: {req.reason}</p>}

                                        <div style={styles.requestFooter}>
                                            <span style={styles.requestDate}>
                                                تقديم: {new Date(req.created_at).toLocaleDateString()}
                                            </span>
                                            {req.status === "قيد الانتظار" && (
                                                <button
                                                    onClick={() => deleteLeaveRequest(req.id)}
                                                    style={styles.deleteButton}
                                                >
                                                    🗑️ حذف
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* ========================================= */}
                {/* تبويب طلبات الأوفر تايم */}
                {/* ========================================= */}
                {activeTab === "overtime" && (
                    <div style={styles.tabContent}>
                        <div style={styles.sectionHeader}>
                            <h3 style={styles.sectionTitle}>طلبات الأوفر تايم</h3>
                            <button onClick={() => setShowOvertimeForm(!showOvertimeForm)} style={styles.addButton}>
                                {showOvertimeForm ? '❌ إلغاء' : '➕ طلب أوفر تايم'}
                            </button>
                        </div>

                        {showOvertimeForm && (
                            <div style={styles.formCard}>
                                <h4 style={styles.formTitle}>طلب أوفر تايم جديد</h4>

                                <div style={styles.dateField}>
                                    <label style={styles.label}>التاريخ:</label>
                                    <input type="date" value={overtimeDate} onChange={e => setOvertimeDate(e.target.value)} style={styles.dateInput} />
                                </div>

                                <div style={styles.hoursField}>
                                    <label style={styles.label}>عدد الساعات:</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        min="0.5"
                                        max="12"
                                        value={overtimeHours}
                                        onChange={e => setOvertimeHours(e.target.value)}
                                        style={styles.input}
                                        placeholder="مثال: 2.5"
                                    />
                                </div>

                                <textarea
                                    placeholder="السبب (اختياري)"
                                    value={overtimeReason}
                                    onChange={e => setOvertimeReason(e.target.value)}
                                    style={styles.textarea}
                                    rows={3}
                                />

                                <button onClick={submitOvertimeRequest} style={styles.submitButton}>
                                    ✅ تقديم الطلب
                                </button>
                            </div>
                        )}

                        <h4 style={styles.subTitle}>الطلبات السابقة</h4>
                        <div style={styles.requestsList}>
                            {overtimeRequests.length === 0 && !showOvertimeForm && (
                                <p style={styles.noData}>لا توجد طلبات سابقة</p>
                            )}
                            {overtimeRequests.map(req => {
                                const status = getApprovalStatus(req)
                                return (
                                    <div key={req.id} style={styles.requestCard}>
                                        <div style={styles.requestHeader}>
                                            <span style={styles.requestType}>أوفر تايم</span>
                                            {req.status === "مرفوضة" ? (
                                                <span style={{
                                                    ...styles.approvalBadge,
                                                    backgroundColor: '#ffebee',
                                                    color: '#f44336',
                                                    border: '1px solid #f44336'
                                                }}>
                                                    ❌ مرفوضة
                                                </span>
                                            ) : req.status === "تمت الموافقة" || (req.hr_approved && req.manager_approved) ? (
                                                <span style={{
                                                    ...styles.approvalBadge,
                                                    backgroundColor: '#e8f5e9',
                                                    color: '#2e7d32',
                                                    border: '1px solid #4caf50'
                                                }}>
                                                    ✅ معتمدة
                                                </span>
                                            ) : (
                                                <div style={styles.approvalContainer}>
                                                    <div style={{
                                                        ...styles.approvalRow,
                                                        backgroundColor: req.hr_approved ? '#e8f5e9' : '#fff4e5',
                                                        border: `1px solid ${req.hr_approved ? '#4caf50' : '#ed6c02'}`
                                                    }}>
                                                        <span style={styles.approvalLabel}>HR</span>
                                                        <span style={{
                                                            color: req.hr_approved ? '#2e7d32' : '#ed6c02',
                                                            fontWeight: 'bold'
                                                        }}>
                                                            {req.hr_approved ? '✅' : '⏳'}
                                                        </span>
                                                    </div>
                                                    <div style={{
                                                        ...styles.approvalRow,
                                                        backgroundColor: req.manager_approved ? '#e8f5e9' : '#fff4e5',
                                                        border: `1px solid ${req.manager_approved ? '#4caf50' : '#ed6c02'}`
                                                    }}>
                                                        <span style={styles.approvalLabel}>Manager</span>
                                                        <span style={{
                                                            color: req.manager_approved ? '#2e7d32' : '#ed6c02',
                                                            fontWeight: 'bold'
                                                        }}>
                                                            {req.manager_approved ? '✅' : '⏳'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <p style={styles.requestDates}>التاريخ: {req.date}</p>
                                        <p style={styles.requestReason}>عدد الساعات: {req.hours} ساعة</p>
                                        {req.reason && <p style={styles.requestReason}>السبب: {req.reason}</p>}

                                        <div style={styles.requestFooter}>
                                            <span style={styles.requestDate}>
                                                تقديم: {new Date(req.created_at).toLocaleDateString()}
                                            </span>
                                            {req.status === "قيد الانتظار" && (
                                                <button
                                                    onClick={() => deleteOvertimeRequest(req.id)}
                                                    style={styles.deleteButton}
                                                >
                                                    🗑️ حذف
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* ========================================= */}
                {/* تبويب طلبات الإذن */}
                {/* ========================================= */}
                {activeTab === "permission" && (
                    <div style={styles.tabContent}>
                        <div style={styles.sectionHeader}>
                            <h3 style={styles.sectionTitle}>طلبات الإذن</h3>
                            <button onClick={() => setShowPermissionForm(!showPermissionForm)} style={styles.addButton}>
                                {showPermissionForm ? '❌ إلغاء' : '➕ طلب إذن'}
                            </button>
                        </div>

                        {showPermissionForm && (
                            <div style={styles.formCard}>
                                <h4 style={styles.formTitle}>طلب إذن</h4>

                                <select
                                    value={permissionType}
                                    onChange={e => setPermissionType(e.target.value)}
                                    style={styles.select}
                                >
                                    <option value="ساعة">إذن ساعة</option>
                                    <option value="ساعتين">إذن ساعتين</option>
                                    <option value="نص يوم">إذن نص يوم</option>
                                </select>

                                <div style={styles.dateField}>
                                    <label style={styles.label}>التاريخ:</label>
                                    <input
                                        type="date"
                                        value={permissionDate}
                                        onChange={e => setPermissionDate(e.target.value)}
                                        style={styles.dateInput}
                                    />
                                </div>

                                {(permissionType === "ساعة" || permissionType === "ساعتين") && (
                                    <div style={styles.timeField}>
                                        <label style={styles.label}>وقت بداية الإذن:</label>
                                        <input
                                            type="time"
                                            value={permissionStartTime}
                                            onChange={e => setPermissionStartTime(e.target.value)}
                                            style={styles.input}
                                        />
                                    </div>
                                )}

                                {permissionType === "نص يوم" && (
                                    <div style={styles.timeRow}>
                                        <div style={styles.timeField}>
                                            <label style={styles.label}>من:</label>
                                            <input
                                                type="time"
                                                value={permissionStartTime}
                                                onChange={e => setPermissionStartTime(e.target.value)}
                                                style={styles.input}
                                            />
                                        </div>
                                        <div style={styles.timeField}>
                                            <label style={styles.label}>إلى:</label>
                                            <input
                                                type="time"
                                                value={permissionEndTime}
                                                onChange={e => setPermissionEndTime(e.target.value)}
                                                style={styles.input}
                                            />
                                        </div>
                                    </div>
                                )}

                                <textarea
                                    placeholder="سبب طلب الإذن"
                                    value={permissionReason}
                                    onChange={e => setPermissionReason(e.target.value)}
                                    style={styles.textarea}
                                    rows={3}
                                    required
                                />

                                <button onClick={submitPermissionRequest} style={styles.submitButton}>
                                    ✅ تقديم الطلب
                                </button>
                            </div>
                        )}

                        <h4 style={styles.subTitle}>الطلبات السابقة</h4>
                        <div style={styles.requestsList}>
                            {permissionRequests.length === 0 && !showPermissionForm && (
                                <p style={styles.noData}>لا توجد طلبات سابقة</p>
                            )}
                            {permissionRequests.map(req => {
                                const status = getApprovalStatus(req)
                                return (
                                    <div key={req.id} style={styles.requestCard}>
                                        <div style={styles.requestHeader}>
                                            <span style={styles.requestType}>إذن {req.permission_type}</span>
                                            {req.status === "مرفوضة" ? (
                                                <span style={{
                                                    ...styles.approvalBadge,
                                                    backgroundColor: '#ffebee',
                                                    color: '#f44336',
                                                    border: '1px solid #f44336'
                                                }}>
                                                    ❌ مرفوضة
                                                </span>
                                            ) : req.status === "تمت الموافقة" || (req.hr_approved && req.manager_approved) ? (
                                                <span style={{
                                                    ...styles.approvalBadge,
                                                    backgroundColor: '#e8f5e9',
                                                    color: '#2e7d32',
                                                    border: '1px solid #4caf50'
                                                }}>
                                                    ✅ معتمدة
                                                </span>
                                            ) : (
                                                <div style={styles.approvalContainer}>
                                                    <div style={{
                                                        ...styles.approvalRow,
                                                        backgroundColor: req.hr_approved ? '#e8f5e9' : '#fff4e5',
                                                        border: `1px solid ${req.hr_approved ? '#4caf50' : '#ed6c02'}`
                                                    }}>
                                                        <span style={styles.approvalLabel}>HR</span>
                                                        <span style={{
                                                            color: req.hr_approved ? '#2e7d32' : '#ed6c02',
                                                            fontWeight: 'bold'
                                                        }}>
                                                            {req.hr_approved ? '✅' : '⏳'}
                                                        </span>
                                                    </div>
                                                    <div style={{
                                                        ...styles.approvalRow,
                                                        backgroundColor: req.manager_approved ? '#e8f5e9' : '#fff4e5',
                                                        border: `1px solid ${req.manager_approved ? '#4caf50' : '#ed6c02'}`
                                                    }}>
                                                        <span style={styles.approvalLabel}>Manager</span>
                                                        <span style={{
                                                            color: req.manager_approved ? '#2e7d32' : '#ed6c02',
                                                            fontWeight: 'bold'
                                                        }}>
                                                            {req.manager_approved ? '✅' : '⏳'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <p style={styles.requestDates}>التاريخ: {req.date}</p>

                                        {req.start_time && (
                                            <p style={styles.requestReason}>
                                                {req.permission_type === "نص يوم"
                                                    ? `من ${req.start_time} إلى ${req.end_time || "?"}`
                                                    : `بداية من ${req.start_time}`}
                                            </p>
                                        )}

                                        <p style={styles.requestReason}>السبب: {req.reason}</p>

                                        <div style={styles.requestFooter}>
                                            <span style={styles.requestDate}>
                                                تقديم: {new Date(req.created_at).toLocaleDateString()}
                                            </span>
                                            {req.status === "قيد الانتظار" && (
                                                <button
                                                    onClick={() => deletePermissionRequest(req.id)}
                                                    style={styles.deleteButton}
                                                >
                                                    🗑️ حذف
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* ========================================= */}
                {/* تبويب طلبات تصحيح البصمة */}
                {/* ========================================= */}
                {activeTab === "correction" && (
                    <div style={styles.tabContent}>
                        <div style={styles.sectionHeader}>
                            <h3 style={styles.sectionTitle}>طلبات تصحيح البصمة</h3>
                            <button onClick={() => setShowCorrectionForm(!showCorrectionForm)} style={styles.addButton}>
                                {showCorrectionForm ? '❌ إلغاء' : '➕ طلب تصحيح'}
                            </button>
                        </div>

                        {showCorrectionForm && (
                            <div style={styles.formCard}>
                                <h4 style={styles.formTitle}>طلب تصحيح بصمة</h4>

                                <div style={styles.dateField}>
                                    <label style={styles.label}>التاريخ المطلوب تصحيحه:</label>
                                    <input
                                        type="date"
                                        value={correctionDate}
                                        onChange={e => setCorrectionDate(e.target.value)}
                                        style={styles.input}
                                        max={new Date().toISOString().split('T')[0]}
                                    />
                                </div>

                                <div style={styles.timeRow}>
                                    <div style={styles.timeField}>
                                        <label style={styles.label}>وقت الحضور المفترض (اختياري):</label>
                                        <input
                                            type="time"
                                            value={correctionCheckIn}
                                            onChange={e => setCorrectionCheckIn(e.target.value)}
                                            style={styles.input}
                                        />
                                    </div>
                                    <div style={styles.timeField}>
                                        <label style={styles.label}>وقت الانصراف المفترض (اختياري):</label>
                                        <input
                                            type="time"
                                            value={correctionCheckOut}
                                            onChange={e => setCorrectionCheckOut(e.target.value)}
                                            style={styles.input}
                                        />
                                    </div>
                                </div>

                                <textarea
                                    placeholder="سبب طلب التصحيح"
                                    value={correctionReason}
                                    onChange={e => setCorrectionReason(e.target.value)}
                                    style={styles.textarea}
                                    rows={3}
                                    required
                                />

                                <button onClick={submitCorrectionRequest} style={styles.submitButton}>
                                    ✅ تقديم الطلب
                                </button>
                            </div>
                        )}

                        <h4 style={styles.subTitle}>الطلبات السابقة</h4>
                        <div style={styles.requestsList}>
                            {correctionRequests.length === 0 && !showCorrectionForm && (
                                <p style={styles.noData}>لا توجد طلبات سابقة</p>
                            )}
                            {correctionRequests.map(req => {
                                const status = getApprovalStatus(req)
                                return (
                                    <div key={req.id} style={styles.requestCard}>
                                        <div style={styles.requestHeader}>
                                            <span style={styles.requestType}>تصحيح يوم {req.date}</span>
                                            {req.status === "مرفوضة" ? (
                                                <span style={{
                                                    ...styles.approvalBadge,
                                                    backgroundColor: '#ffebee',
                                                    color: '#f44336',
                                                    border: '1px solid #f44336'
                                                }}>
                                                    ❌ مرفوضة
                                                </span>
                                            ) : req.status === "تمت الموافقة" || (req.hr_approved && req.manager_approved) ? (
                                                <span style={{
                                                    ...styles.approvalBadge,
                                                    backgroundColor: '#e8f5e9',
                                                    color: '#2e7d32',
                                                    border: '1px solid #4caf50'
                                                }}>
                                                    ✅ معتمدة
                                                </span>
                                            ) : (
                                                <div style={styles.approvalContainer}>
                                                    <div style={{
                                                        ...styles.approvalRow,
                                                        backgroundColor: req.hr_approved ? '#e8f5e9' : '#fff4e5',
                                                        border: `1px solid ${req.hr_approved ? '#4caf50' : '#ed6c02'}`
                                                    }}>
                                                        <span style={styles.approvalLabel}>HR</span>
                                                        <span style={{
                                                            color: req.hr_approved ? '#2e7d32' : '#ed6c02',
                                                            fontWeight: 'bold'
                                                        }}>
                                                            {req.hr_approved ? '✅' : '⏳'}
                                                        </span>
                                                    </div>
                                                    <div style={{
                                                        ...styles.approvalRow,
                                                        backgroundColor: req.manager_approved ? '#e8f5e9' : '#fff4e5',
                                                        border: `1px solid ${req.manager_approved ? '#4caf50' : '#ed6c02'}`
                                                    }}>
                                                        <span style={styles.approvalLabel}>Manager</span>
                                                        <span style={{
                                                            color: req.manager_approved ? '#2e7d32' : '#ed6c02',
                                                            fontWeight: 'bold'
                                                        }}>
                                                            {req.manager_approved ? '✅' : '⏳'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {(req.expected_check_in || req.expected_check_out) && (
                                            <div style={styles.correctionTimes}>
                                                {req.expected_check_in && (
                                                    <p>⏰ الحضور المفترض: {req.expected_check_in}</p>
                                                )}
                                                {req.expected_check_out && (
                                                    <p>⌛ الانصراف المفترض: {req.expected_check_out}</p>
                                                )}
                                            </div>
                                        )}

                                        <p style={styles.requestReason}>السبب: {req.reason}</p>

                                        <div style={styles.requestFooter}>
                                            <span style={styles.requestDate}>
                                                تقديم: {new Date(req.created_at).toLocaleDateString()}
                                            </span>
                                            {req.status === "قيد الانتظار" && (
                                                <button
                                                    onClick={() => deleteCorrectionRequest(req.id)}
                                                    style={styles.deleteButton}
                                                >
                                                    🗑️ حذف
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* ========================================= */}
                {/* تبويب الإعدادات */}
                {/* ========================================= */}
                {activeTab === "settings" && (
                    <div style={styles.tabContent}>
                        <h3 style={styles.sectionTitle}>إعدادات الحساب</h3>
                        <div style={styles.settingsCard}>
                            <h4 style={styles.settingsTitle}>تغيير كلمة المرور</h4>
                            <div style={styles.inputGroup}>
                                <label style={styles.inputLabel}>كلمة المرور الحالية</label>
                                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="********" style={styles.input} />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.inputLabel}>كلمة المرور الجديدة</label>
                                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="********" style={styles.input} />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.inputLabel}>تأكيد كلمة المرور الجديدة</label>
                                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="********" style={styles.input} />
                            </div>
                            {passwordMessage && (
                                <div style={{ ...styles.messageBox, backgroundColor: passwordMessage.type === 'success' ? '#d1fae5' : '#fee2e2', color: passwordMessage.type === 'success' ? '#065f46' : '#991b1b', border: `1px solid ${passwordMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}` }}>
                                    {passwordMessage.text}
                                </div>
                            )}
                            <button onClick={handleChangePassword} disabled={changingPassword} style={{ ...styles.saveButton, opacity: changingPassword ? 0.7 : 1, cursor: changingPassword ? 'not-allowed' : 'pointer' }}>
                                {changingPassword ? 'جاري الحفظ...' : '💾 حفظ كلمة المرور الجديدة'}
                            </button>
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

// ==================== الأنماط الموحدة ====================
const styles: { [key: string]: React.CSSProperties } = {
    page: {
        fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
        background: '#f0f2f5',
        minHeight: '100vh',
        padding: 20,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start'
    },
    container: {
        background: '#ffffff',
        borderRadius: 16,
        padding: 24,
        width: '95%',
        maxWidth: 1200,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    title: {
        fontSize: 24,
        fontWeight: '600',
        color: '#1e293b',
        margin: 0
    },
    logoutButton: {
        padding: '8px 16px',
        border: 'none',
        borderRadius: 8,
        backgroundColor: '#ef4444',
        color: '#fff',
        fontWeight: '500',
        cursor: 'pointer'
    },
    profileCard: {
        backgroundColor: '#3b82f6',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
        boxShadow: '0 4px 8px rgba(59, 130, 246, 0.3)'
    },
    profileHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: 20
    },
    profileAvatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#ffffff',
        color: '#1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 28,
        fontWeight: 'bold'
    },
    profileInfo: {
        flex: 1
    },
    profileName: {
        fontSize: 22,
        fontWeight: '600',
        margin: 0,
        marginBottom: 4,
        color: '#ffffff'
    },
    profileJob: {
        fontSize: 15,
        margin: 0,
        marginBottom: 8,
        color: '#1e293b',
        fontWeight: '500'
    },
    profileDetails: {
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap'
    },
    profileDetail: {
        fontSize: 13,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.15)',
        padding: '4px 10px',
        borderRadius: 16,
        color: '#ffffff'
    },
    detailIcon: {
        fontSize: 14,
        color: '#ffffff'
    },
    tabBar: {
        display: 'flex',
        gap: 8,
        marginBottom: 24,
        flexWrap: 'wrap',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: 8
    },
    tabButton: {
        padding: '10px 16px',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        fontWeight: '500',
        fontSize: 14,
        backgroundColor: '#f1f5f9',
        color: '#1e293b'
    },
    tabContent: {
        minHeight: 400,
        padding: '8px 0'
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 16
    },
    sectionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    subTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1e293b',
        marginBottom: 12,
        marginTop: 16
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 24
    },
    statCard: {
        backgroundColor: '#f8fafc',
        padding: 20,
        borderRadius: 12,
        textAlign: 'center',
        border: '1px solid #e2e8f0'
    },
    statValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#3b82f6',
        display: 'block'
    },
    statLabel: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 5,
        display: 'block'
    },
    filterSection: {
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: 16,
        padding: 16,
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        border: '1px solid #e2e8f0'
    },
    filterRow: {
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        flexWrap: 'wrap'
    },
    select: {
        padding: '8px 12px',
        borderRadius: 6,
        border: '1px solid #cbd5e1',
        fontSize: 14,
        minWidth: 140,
        backgroundColor: '#ffffff',
        color: '#1e293b'
    },
    dateInput: {
        padding: '8px 12px',
        borderRadius: 6,
        border: '1px solid #cbd5e1',
        fontSize: 14,
        backgroundColor: '#ffffff',
        color: '#1e293b'
    },
    viewButton: {
        padding: '8px 16px',
        border: 'none',
        borderRadius: 6,
        backgroundColor: '#3b82f6',
        color: '#ffffff',
        cursor: 'pointer',
        fontWeight: '500',
        fontSize: 14
    },
    addButton: {
        padding: '8px 16px',
        border: 'none',
        borderRadius: 6,
        backgroundColor: '#22c55e',
        color: '#ffffff',
        cursor: 'pointer',
        fontWeight: '500',
        fontSize: 14
    },
    tableContainer: {
        maxHeight: 400,
        overflowY: 'auto',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        backgroundColor: '#ffffff'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: 14
    },
    tableHeader: {
        padding: 12,
        backgroundColor: '#f8fafc',
        fontWeight: '600',
        textAlign: 'center',
        color: '#1e293b',
        borderBottom: '2px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        cursor: 'pointer',
        userSelect: 'none'
    },
    tableCell: {
        padding: 10,
        textAlign: 'center',
        borderBottom: '1px solid #e2e8f0',
        color: '#1e293b'
    },
    emptyCell: {
        padding: 30,
        textAlign: 'center',
        color: '#64748b'
    },
    tableInput: {
        width: '100%',
        padding: '6px',
        borderRadius: 4,
        border: '1px solid #cbd5e1',
        fontSize: 13
    },
    tableSelect: {
        width: '100%',
        padding: '6px',
        borderRadius: 4,
        border: '1px solid #cbd5e1',
        fontSize: 13,
        backgroundColor: '#ffffff'
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
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '500'
    },
    typeBadge: {
        padding: '4px 8px',
        borderRadius: 4,
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
        display: 'inline-block'
    },
    pendingInfo: {
        fontSize: 11,
        color: '#ff9800',
        marginTop: 4
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
        backgroundColor: '#ef4444',
        color: 'white',
        fontSize: 14,
        cursor: 'pointer'
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
    approvedBadge: {
        padding: '4px 8px',
        borderRadius: 4,
        backgroundColor: '#e8f5e8',
        color: '#2e7d32',
        fontSize: 12,
        fontWeight: 'bold',
        display: 'inline-block'
    },
    input: {
        width: '100%',
        padding: 10,
        marginBottom: 12,
        borderRadius: 6,
        border: '1px solid #cbd5e1',
        fontSize: 14,
        backgroundColor: '#ffffff',
        color: '#1e293b'
    },
    formCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        border: '1px solid #e2e8f0'
    },
    formTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 16,
        textAlign: 'center'
    },
    submitButton: {
        width: '100%',
        padding: 12,
        border: 'none',
        borderRadius: 8,
        backgroundColor: '#3b82f6',
        color: '#ffffff',
        fontWeight: '600',
        cursor: 'pointer',
        fontSize: 14
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
        backgroundColor: '#f8fafc',
        padding: 24,
        borderRadius: 12,
        border: '1px solid #e2e8f0'
    },
    uploadInfo: {
        fontSize: 14,
        color: '#475569',
        marginBottom: 20,
        lineHeight: 1.6
    },
    uploadButtons: {
        display: 'flex',
        gap: 16,
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: 20
    },
    templateButton: {
        padding: '10px 20px',
        border: 'none',
        borderRadius: 8,
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
        borderRadius: 8,
        backgroundColor: '#22c55e',
        color: '#fff',
        fontSize: 14,
        cursor: 'pointer',
        display: 'inline-block'
    },
    fileInfo: {
        backgroundColor: '#e0f2fe',
        padding: 16,
        borderRadius: 8,
        marginBottom: 16
    },
    uploadButton: {
        padding: '10px 20px',
        border: 'none',
        borderRadius: 8,
        backgroundColor: '#ff9800',
        color: '#fff',
        fontSize: 14,
        cursor: 'pointer',
        marginTop: 10
    },
    resultsCard: {
        backgroundColor: '#f8fafc',
        padding: 16,
        borderRadius: 8,
        marginTop: 16
    },
    resultsTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12
    },
    errorsList: {
        maxHeight: 200,
        overflowY: 'auto',
        marginTop: 12,
        padding: 12,
        backgroundColor: '#fee2e2',
        borderRadius: 6
    },
    errorItem: {
        fontSize: 12,
        color: '#b91c1c',
        marginBottom: 4
    },
    attendanceCard: {
        background: '#ffffff',
        borderRadius: 12,
        padding: 20,
        border: '1px solid #e2e8f0'
    },
    locationStatus: {
        padding: 12,
        backgroundColor: '#e0f2fe',
        borderRadius: 8,
        marginBottom: 16,
        color: '#1e293b',
        fontWeight: '500',
        textAlign: 'center',
        fontSize: 14,
        border: '1px solid #bae6fd'
    },
    buttonGroup: {
        display: 'flex',
        gap: 12,
        marginBottom: 24,
        justifyContent: 'center'
    },
    checkInButton: {
        padding: '10px 24px',
        border: 'none',
        borderRadius: 8,
        backgroundColor: '#22c55e',
        color: '#ffffff',
        fontWeight: '500',
        cursor: 'pointer',
        fontSize: 14
    },
    checkOutButton: {
        padding: '10px 24px',
        border: 'none',
        borderRadius: 8,
        backgroundColor: '#ef4444',
        color: '#ffffff',
        fontWeight: '500',
        cursor: 'pointer',
        fontSize: 14
    },
    reportSummary: {
        marginTop: 20
    },
    summaryStats: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 16,
        marginBottom: 20
    },
    requestsList: {
        maxHeight: 500,
        overflowY: 'auto'
    },
    resultCard: {
        padding: 16,
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: '#ffffff'
    },
    settingsCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 24,
        maxWidth: 500,
        margin: '0 auto',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
    },
    settingsTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 20,
        textAlign: 'center'
    },
    inputGroup: {
        marginBottom: 20
    },
    inputLabel: {
        display: 'block',
        fontSize: 14,
        fontWeight: '500',
        color: '#334155',
        marginBottom: 6
    },
    messageBox: {
        padding: 12,
        borderRadius: 6,
        marginBottom: 20,
        fontSize: 14,
        textAlign: 'center'
    },
    saveButton: {
        width: '100%',
        padding: 12,
        border: 'none',
        borderRadius: 8,
        backgroundColor: '#3b82f6',
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
        cursor: 'pointer',
        transition: 'background-color 0.2s'
    },
    approvalBadge: {
        padding: '4px 8px',
        borderRadius: 16,
        fontSize: 11,
        fontWeight: 'bold',
        display: 'inline-block'
    },
    sortInfo: {
        marginBottom: 10,
        textAlign: 'left',
        fontSize: 12,
        color: '#666'
    },
    sortHint: {
        backgroundColor: '#e3f2fd',
        padding: '4px 12px',
        borderRadius: 16,
        display: 'inline-block'
    },
    footer: {
        marginTop: 30,
        textAlign: 'center',
        color: '#64748b',
        fontSize: 13,
        borderTop: '1px solid #e2e8f0',
        paddingTop: 20
    },
    label: {
        color: '#1e293b',
        fontWeight: '600',
        fontSize: 14,
        marginBottom: 4,
        display: 'block'
    },
    dateRow: {
        display: 'flex',
        gap: 12,
        marginBottom: 16
    },
    dateField: {
        flex: 1
    },
    timeRow: {
        display: 'flex',
        gap: 12,
        marginBottom: 12
    },
    timeField: {
        flex: 1
    },
    hoursField: {
        marginBottom: 12
    },
    textarea: {
        width: '100%',
        padding: 10,
        marginBottom: 16,
        borderRadius: 6,
        border: '1px solid #cbd5e1',
        fontSize: 14,
        fontFamily: 'inherit',
        backgroundColor: '#ffffff',
        color: '#1e293b',
        outline: 'none',
        resize: 'vertical'
    },
    requestCard: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        padding: 16,
        marginBottom: 8,
        border: '1px solid #e2e8f0'
    },
    requestHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    requestType: {
        fontWeight: '600',
        fontSize: 14,
        color: '#1e293b'
    },
    requestDates: {
        fontSize: 13,
        color: '#475569',
        marginBottom: 4
    },
    requestReason: {
        fontSize: 12,
        color: '#64748b',
        marginBottom: 8
    },
    requestFooter: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 8,
        borderTop: '1px dashed #e2e8f0'
    },
    requestDate: {
        fontSize: 11,
        color: '#94a3b8'
    },
    noData: {
        textAlign: 'center',
        color: '#94a3b8',
        padding: 40,
        fontSize: 14
    },
    correctionTimes: {
        backgroundColor: '#f1f5f9',
        padding: 8,
        borderRadius: 4,
        margin: '8px 0',
        fontSize: 12,
        color: '#1e293b'
    },
    balanceCard: {
        backgroundColor: '#f0fdf4',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        border: '1px solid #bbf7d0'
    },
    balanceTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 16,
        textAlign: 'center'
    },
    balanceMessage: {
        fontSize: 13,
        color: '#3b82f6',
        textAlign: 'center',
        marginBottom: 12
    },
    balanceRow: {
        display: 'flex',
        justifyContent: 'space-around',
        marginBottom: 16
    },
    balanceItem: {
        textAlign: 'center'
    },
    balanceLabel: {
        fontSize: 13,
        color: '#475569',
        display: 'block',
        marginBottom: 4
    },
    balanceValue: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1e293b'
    },
    balanceDivider: {
        margin: '16px 0',
        border: 'none',
        borderTop: '1px dashed #86efac'
    },
    emergencyRow: {
        display: 'flex',
        flexDirection: 'column' as 'column',
        gap: 8
    },
    emergencyItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    emergencyLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#b45309'
    },
    emergencyValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#b45309'
    },
    emergencyProgress: {
        height: 6,
        backgroundColor: '#fed7aa',
        borderRadius: 3,
        overflow: 'hidden'
    },
    emergencyProgressBar: {
        height: '100%',
        backgroundColor: '#f97316',
        transition: 'width 0.2s ease'
    },
    approvalContainer: {
        display: 'flex',
        flexDirection: 'column' as 'column',
        gap: 8,
        minWidth: 180
    },
    approvalRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 12px',
        borderRadius: 6,
        fontSize: 12
    },
    approvalLabel: {
        color: '#1e293b',
        fontWeight: '500'
    }
}