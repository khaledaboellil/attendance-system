"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

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

type Department = {
    id: number
    name: string
}

export default function ManagerPage() {
    const router = useRouter()

    // ==================== بيانات المدير ====================
    const [managerName, setManagerName] = useState("")
    const [managerUsername, setManagerUsername] = useState("")
    const [managerId, setManagerId] = useState("")
    const [hireDate, setHireDate] = useState("")
    const [jobTitle, setJobTitle] = useState("")
    const [managedDepts, setManagedDepts] = useState<number[]>([])
    const [managedDeptsNames, setManagedDeptsNames] = useState<string>("")

    // ==================== التبويبات الرئيسية ====================
    const [activeTab, setActiveTab] = useState<"requests" | "attendance" | "leave" | "overtime" | "permission" | "correction" | "settings">("requests")

    // ==================== جميع الطلبات (للموافقة) ====================
    const [allRequests, setAllRequests] = useState<any[]>([])
    const [selectedDepartment, setSelectedDepartment] = useState<string>("all")
    const [departments, setDepartments] = useState<Department[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending")
    const [requestsType, setRequestsType] = useState<"all" | "leave" | "overtime" | "permission" | "correction">("all")

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

    // ==================== الحضور (للمدير نفسه) ====================
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

    // =============================================
    // useEffect لتحميل البيانات
    // =============================================
    useEffect(() => {
        const storedName = localStorage.getItem("name")
        const storedUsername = localStorage.getItem("username")
        const storedId = localStorage.getItem("employee_id")
        const storedRole = localStorage.getItem("role")
        const storedJobTitle = localStorage.getItem("job_title")

        if (!storedName || !storedId || storedRole !== "manager") {
            alert("غير مصرح بالدخول")
            router.push("/")
            return
        }

        setManagerName(storedName)
        setManagerUsername(storedUsername || "")
        setManagerId(storedId)
        setJobTitle(storedJobTitle || "مدير")

        // تحميل البيانات
        fetchManagedDepartments(storedId)
        fetchLeaveRequests(storedId)
        fetchLeaveBalance(storedId)
        fetchOvertimeRequests(storedId)
        fetchPermissionRequests(storedId)
        fetchCorrectionRequests(storedId)
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
                    employee_id: managerId,
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
    // دوال جلب البيانات
    // =============================================
    const fetchManagedDepartments = async (managerId: string) => {
        try {
            const res = await fetch(`/api/departments/managers?manager_id=${managerId}`)
            if (res.ok) {
                const data = await res.json()
                const deptIds = data.map((item: any) => item.department_id)
                setManagedDepts(deptIds)

                if (deptIds.length === 0) {
                    setManagedDeptsNames("لا تدير أي أقسام")
                    setLoading(false)
                    return
                }

                const deptsRes = await fetch("/api/departments")
                if (deptsRes.ok) {
                    const allDepts = await deptsRes.json()
                    const myDepts = allDepts.filter((d: any) => deptIds.includes(d.id))
                    setDepartments(myDepts)

                    const deptNames = myDepts.map((d: any) => d.name).join("، ")
                    setManagedDeptsNames(deptNames)

                    // جلب جميع الطلبات
                    await fetchAllRequests(deptIds, "pending")
                }
            }
        } catch (err) {
            console.error(err)
            setLoading(false)
        }
    }

    const fetchAllRequests = async (deptIds: number[], statusFilter: string = "pending") => {
        try {
            // جلب طلبات الإجازات
            const leavesRes = await fetch(`/api/leave-requests?user_role=manager&department_ids=${deptIds.join(',')}${statusFilter !== "all" ? `&status=${statusFilter}` : ""}`)
            const leaves = leavesRes.ok ? await leavesRes.json() : []

            // جلب طلبات الأوفر تايم
            const overtimeRes = await fetch(`/api/overtime-requests?user_role=manager&department_ids=${deptIds.join(',')}${statusFilter !== "all" ? `&status=${statusFilter}` : ""}`)
            const overtime = overtimeRes.ok ? await overtimeRes.json() : []

            // جلب طلبات الإذن
            const permissionRes = await fetch(`/api/permission-requests?user_role=manager&department_ids=${deptIds.join(',')}${statusFilter !== "all" ? `&status=${statusFilter}` : ""}`)
            const permission = permissionRes.ok ? await permissionRes.json() : []

            // جلب طلبات تصحيح البصمة
            const correctionRes = await fetch(`/api/attendance-correction?user_role=manager&department_ids=${deptIds.join(',')}${statusFilter !== "all" ? `&status=${statusFilter}` : ""}`)
            const correction = correctionRes.ok ? await correctionRes.json() : []

            // دمج كل الطلبات
            const combined = [
                ...leaves.map((r: any) => ({ ...r, requestType: "leave", requestTypeText: "إجازة" })),
                ...overtime.map((r: any) => ({ ...r, requestType: "overtime", requestTypeText: "أوفر تايم" })),
                ...permission.map((r: any) => ({ ...r, requestType: "permission", requestTypeText: "إذن" })),
                ...correction.map((r: any) => ({ ...r, requestType: "correction", requestTypeText: "تصحيح بصمة" }))
            ]

            combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

            let filtered = combined
            if (selectedDepartment && selectedDepartment !== "all") {
                filtered = filtered.filter(r => r.employees?.department_id === Number(selectedDepartment))
            }
            if (requestsType !== "all") {
                filtered = filtered.filter(r => r.requestType === requestsType)
            }

            setAllRequests(filtered)
            setLoading(false)
        } catch (err) {
            console.error(err)
            setLoading(false)
        }
    }

    // دوال جلب طلبات المدير الشخصية
    const fetchLeaveRequests = async (empId: string) => {
        try {
            const res = await fetch(`/api/leave-requests?employee_id=${empId}`)
            if (res.ok) {
                const data = await res.json()
                setLeaveRequests(data)
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
                setHireDate(data.hire_date || "")
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
            const res = await fetch(`/api/attendance?username=${managerUsername}&from=${attendanceFrom}&to=${attendanceTo}`)
            if (res.ok) setAttendanceHistory(await res.json())
        } catch (err) { console.error(err) }
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

            const res = await fetch(endpoint, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: req.id,
                    action: "approve",
                    approved_by: managerId,
                    user_role: "manager"
                })
            })
            const data = await res.json()
            alert(data.message || data.error)
            if (res.ok) {
                fetchAllRequests(managedDepts, filter)
            }
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

            const res = await fetch(endpoint, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: req.id,
                    action: "reject",
                    approved_by: managerId,
                    user_role: "manager"
                })
            })
            const data = await res.json()
            alert(data.message || data.error)
            if (res.ok) {
                fetchAllRequests(managedDepts, filter)
            }
        } catch (err) { console.error(err) }
    }

    // =============================================
    // دوال طلبات الإجازات
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
                employee_id: managerId,
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
            fetchLeaveRequests(managerId)
            fetchLeaveBalance(managerId)
        }
    }

    const deleteLeaveRequest = async (id: string) => {
        if (!confirm("هل أنت متأكد من حذف هذا الطلب؟")) return

        try {
            const res = await fetch(`/api/leave-requests?id=${id}&employee_id=${managerId}`, {
                method: "DELETE"
            })
            const data = await res.json()
            alert(data.message || data.error)
            if (res.ok) {
                fetchLeaveRequests(managerId)
                fetchLeaveBalance(managerId)
            }
        } catch (err) { console.error(err) }
    }

    // =============================================
    // دوال طلبات الأوفر تايم
    // =============================================
    const submitOvertimeRequest = async () => {
        if (!overtimeDate || !overtimeHours) return alert("حدد التاريخ وعدد الساعات")

        const res = await fetch("/api/overtime-requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                employee_id: managerId,
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
            fetchOvertimeRequests(managerId)
        }
    }

    const deleteOvertimeRequest = async (id: string) => {
        if (!confirm("هل أنت متأكد من حذف هذا الطلب؟")) return

        try {
            const res = await fetch(`/api/overtime-requests?id=${id}&employee_id=${managerId}`, {
                method: "DELETE"
            })
            const data = await res.json()
            alert(data.message || data.error)
            if (res.ok) fetchOvertimeRequests(managerId)
        } catch (err) { console.error(err) }
    }

    // =============================================
    // دوال طلبات الإذن
    // =============================================
    const submitPermissionRequest = async () => {
        if (!permissionDate || !permissionReason) return alert("حدد التاريخ والسبب")

        if ((permissionType === "ساعة" || permissionType === "ساعتين") && !permissionStartTime) {
            return alert("حدد وقت بداية الإذن")
        }

        const res = await fetch("/api/permission-requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                employee_id: managerId,
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
            fetchPermissionRequests(managerId)
        }
    }

    const deletePermissionRequest = async (id: string) => {
        if (!confirm("هل أنت متأكد من حذف هذا الطلب؟")) return

        try {
            const res = await fetch(`/api/permission-requests?id=${id}&employee_id=${managerId}`, {
                method: "DELETE"
            })
            const data = await res.json()
            alert(data.message || data.error)
            if (res.ok) fetchPermissionRequests(managerId)
        } catch (err) { console.error(err) }
    }

    // =============================================
    // دوال طلبات تصحيح البصمة
    // =============================================
    const submitCorrectionRequest = async () => {
        if (!correctionDate || !correctionReason) return alert("حدد التاريخ والسبب")

        const res = await fetch("/api/attendance-correction", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                employee_id: managerId,
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
            fetchCorrectionRequests(managerId)
        }
    }

    const deleteCorrectionRequest = async (id: string) => {
        if (!confirm("هل أنت متأكد من حذف هذا الطلب؟")) return

        try {
            const res = await fetch(`/api/attendance-correction?id=${id}&employee_id=${managerId}`, {
                method: "DELETE"
            })
            const data = await res.json()
            alert(data.message || data.error)
            if (res.ok) fetchCorrectionRequests(managerId)
        } catch (err) { console.error(err) }
    }

    // =============================================
    // دوال تسجيل حضور المدير
    // =============================================
    const handleCheck = async (type: "check_in" | "check_out") => {
        if (loadingPos) { alert("جاري الحصول على الموقع، انتظر لحظة..."); return }
        if (!currentPos.lat || !currentPos.lng) { alert("الموقع غير متوفر"); return }

        try {
            const res = await fetch("/api/attendance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: managerUsername, type, lat: currentPos.lat, lng: currentPos.lng })
            })
            const data = await res.json()
            alert(data.message || data.error)
            fetchTodayAttendance(managerUsername)
        } catch (err) { console.error(err); alert("حدث خطأ أثناء الإرسال") }
    }

    // =============================================
    // دوال تغيير الفلتر
    // =============================================
    const handleFilterChange = (newFilter: "all" | "pending" | "approved" | "rejected") => {
        setFilter(newFilter)
        fetchAllRequests(managedDepts, newFilter)
    }

    const handleDepartmentChange = (deptId: string) => {
        setSelectedDepartment(deptId)
        fetchAllRequests(managedDepts, filter)
    }

    const handleTypeChange = (type: "all" | "leave" | "overtime" | "permission" | "correction") => {
        setRequestsType(type)
        fetchAllRequests(managedDepts, filter)
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

    // دوال مساعدة
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("ar-EG")
    }

    const formatTime = (dateString: string | null) => {
        if (!dateString) return "-"
        return new Date(dateString).toLocaleTimeString()
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

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                {/* رأس الصفحة */}
                <div style={styles.header}>
                    <h2 style={styles.title}>لوحة تحكم المدير</h2>
                    <button onClick={handleLogout} style={styles.logoutButton}>تسجيل خروج</button>
                </div>

                {/* بطاقة معلومات المدير */}
                <div style={styles.profileCard}>
                    <div style={styles.profileHeader}>
                        <div style={styles.profileAvatar}>
                            {managerName.charAt(0)}
                        </div>
                        <div style={styles.profileInfo}>
                            <h3 style={styles.profileName}>{managerName}</h3>
                            <p style={styles.profileJob}>{jobTitle}</p>
                            <div style={styles.profileDetails}>
                                <span style={styles.profileDetail}>
                                    <span style={styles.detailIcon}>📅</span>
                                    تعيين: {hireDate ? formatDate(hireDate) : "غير محدد"}
                                </span>
                                <span style={styles.profileDetail}>
                                    <span style={styles.detailIcon}>⏳</span>
                                    مدة الخدمة: {leaveBalance.yearsOfService} سنة
                                </span>
                                <span style={styles.profileDetail}>
                                    <span style={styles.detailIcon}>👥</span>
                                    الأقسام: {managedDeptsNames || "لا يوجد"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* شريط التبويبات الرئيسية */}
                <div style={styles.tabBar}>
                    <button
                        onClick={() => setActiveTab("requests")}
                        style={{
                            ...styles.tabButton,
                            backgroundColor: activeTab === "requests" ? '#1976d2' : '#e0e0e0',
                            color: activeTab === "requests" ? 'white' : '#333',
                        }}
                    >
                        📋 طلبات الموظفين
                    </button>
                    <button
                        onClick={() => setActiveTab("attendance")}
                        style={{
                            ...styles.tabButton,
                            backgroundColor: activeTab === "attendance" ? '#1976d2' : '#e0e0e0',
                            color: activeTab === "attendance" ? 'white' : '#333',
                        }}
                    >
                        🕒 تسجيل حضوري
                    </button>
                    <button
                        onClick={() => setActiveTab("leave")}
                        style={{
                            ...styles.tabButton,
                            backgroundColor: activeTab === "leave" ? '#1976d2' : '#e0e0e0',
                            color: activeTab === "leave" ? 'white' : '#333',
                        }}
                    >
                        🏖️ إجازات
                    </button>
                    <button
                        onClick={() => setActiveTab("overtime")}
                        style={{
                            ...styles.tabButton,
                            backgroundColor: activeTab === "overtime" ? '#1976d2' : '#e0e0e0',
                            color: activeTab === "overtime" ? 'white' : '#333',
                        }}
                    >
                        ⏰ أوفر تايم
                    </button>
                    <button
                        onClick={() => setActiveTab("permission")}
                        style={{
                            ...styles.tabButton,
                            backgroundColor: activeTab === "permission" ? '#1976d2' : '#e0e0e0',
                            color: activeTab === "permission" ? 'white' : '#333',
                        }}
                    >
                        ⏳ إذن
                    </button>
                    <button
                        onClick={() => setActiveTab("correction")}
                        style={{
                            ...styles.tabButton,
                            backgroundColor: activeTab === "correction" ? '#1976d2' : '#e0e0e0',
                            color: activeTab === "correction" ? 'white' : '#333',
                        }}
                    >
                        🔧 تصحيح بصمة
                    </button>
                    <button
                        onClick={() => setActiveTab("settings")}
                        style={{
                            ...styles.tabButton,
                            backgroundColor: activeTab === "settings" ? '#1976d2' : '#e0e0e0',
                            color: activeTab === "settings" ? 'white' : '#333',
                        }}
                    >
                        ⚙️ إعدادات
                    </button>
                </div>

                {/* ========================================= */}
                {/* تبويب طلبات الموظفين */}
                {/* ========================================= */}
                {activeTab === "requests" && (
                    <div style={styles.tabContent}>
                        <h3 style={styles.sectionTitle}>طلبات الموظفين</h3>

                        {/* شريط الفلاتر */}
                        <div style={styles.filterTabs}>
                            <button
                                onClick={() => handleFilterChange("pending")}
                                style={{
                                    ...styles.filterTab,
                                    backgroundColor: filter === "pending" ? '#ff9800' : '#e0e0e0',
                                    color: filter === "pending" ? 'white' : '#333'
                                }}
                            >
                                ⏳ في انتظار الرد
                            </button>
                            <button
                                onClick={() => handleFilterChange("approved")}
                                style={{
                                    ...styles.filterTab,
                                    backgroundColor: filter === "approved" ? '#4caf50' : '#e0e0e0',
                                    color: filter === "approved" ? 'white' : '#333'
                                }}
                            >
                                ✅ معتمدة
                            </button>
                            <button
                                onClick={() => handleFilterChange("rejected")}
                                style={{
                                    ...styles.filterTab,
                                    backgroundColor: filter === "rejected" ? '#f44336' : '#e0e0e0',
                                    color: filter === "rejected" ? 'white' : '#333'
                                }}
                            >
                                ❌ مرفوضة
                            </button>
                            <button
                                onClick={() => handleFilterChange("all")}
                                style={{
                                    ...styles.filterTab,
                                    backgroundColor: filter === "all" ? '#1976d2' : '#e0e0e0',
                                    color: filter === "all" ? 'white' : '#333'
                                }}
                            >
                                📋 الكل
                            </button>
                        </div>

                        {/* فلاتر إضافية */}
                        <div style={styles.filterSection}>
                            {departments.length > 1 && (
                                <select
                                    value={selectedDepartment}
                                    onChange={e => handleDepartmentChange(e.target.value)}
                                    style={styles.select}
                                >
                                    <option value="all">كل الأقسام</option>
                                    {departments.map(dept => (
                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                    ))}
                                </select>
                            )}

                            <select
                                value={requestsType}
                                onChange={e => handleTypeChange(e.target.value as any)}
                                style={styles.select}
                            >
                                <option value="all">كل الأنواع</option>
                                <option value="leave">🏖️ إجازات</option>
                                <option value="overtime">⏰ أوفر تايم</option>
                                <option value="permission">⏳ إذون</option>
                                <option value="correction">🔧 تصحيح بصمة</option>
                            </select>
                        </div>

                        {/* جدول الطلبات */}
                        <div style={styles.tableContainer}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.tableHeader}>الموظف</th>
                                        <th style={styles.tableHeader}>القسم</th>
                                        <th style={styles.tableHeader}>نوع الطلب</th>
                                        <th style={styles.tableHeader}>التفاصيل</th>
                                        <th style={styles.tableHeader}>حالة الموافقات</th>
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
                                            const canApprove = !req.manager_approved && req.status === "قيد الانتظار"

                                            let details = ""
                                            if (req.requestType === "leave") {
                                                details = `${req.leave_type} - من ${req.start_date} إلى ${req.end_date}`
                                            } else if (req.requestType === "overtime") {
                                                details = `${req.date} - ${req.hours} ساعة`
                                            } else if (req.requestType === "permission") {
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
                                                        <span style={{ ...styles.typeBadge, backgroundColor: getRequestTypeColor(req.requestType) }}>
                                                            {req.requestTypeText}
                                                        </span>
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
                                                                    HR : {req.hr_approved ? '✅ موافق' : '⏳ في انتظار'}
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
                                                        {req.pending_from && (
                                                            <div style={styles.pendingInfo}>في انتظار: {req.pending_from}</div>
                                                        )}
                                                    </td>
                                                    <td style={styles.tableCell}>
                                                        {canApprove && (
                                                            <>
                                                                <button
                                                                    onClick={() => approveAnyRequest(req)}
                                                                    style={styles.approveButton}
                                                                    title="موافقة"
                                                                >
                                                                    ✓
                                                                </button>
                                                                <button
                                                                    onClick={() => rejectAnyRequest(req)}
                                                                    style={styles.rejectButton}
                                                                    title="رفض"
                                                                >
                                                                    ✗
                                                                </button>
                                                            </>
                                                        )}
                                                        {req.manager_approved && req.status === "قيد الانتظار" && (
                                                            <span style={styles.approvedBadge}>✅ وافقت</span>
                                                        )}
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
                {/* تبويب تسجيل حضور المدير */}
                {/* ========================================= */}
                {activeTab === "attendance" && (
                    <div style={styles.tabContent}>
                        <h3 style={styles.sectionTitle}>تسجيل حضور وانصراف</h3>

                        <div style={styles.attendanceCard}>
                            {/* حالة الموقع */}
                            <div style={styles.locationStatus}>
                                {loadingPos ? (
                                    "⏳ جاري الحصول على الموقع..."
                                ) : (
                                    "📍 تم الحصول على الموقع بنجاح"
                                )}
                            </div>

                            {/* أزرار تسجيل الحضور والانصراف */}
                            <div style={styles.buttonGroup}>
                                <button
                                    onClick={() => handleCheck("check_in")}
                                    style={styles.checkInButton}
                                    disabled={loadingPos}
                                >
                                    🟢 تسجيل حضور
                                </button>
                                <button
                                    onClick={() => handleCheck("check_out")}
                                    style={styles.checkOutButton}
                                    disabled={loadingPos}
                                >
                                    🔴 تسجيل انصراف
                                </button>
                            </div>

                            {/* جدول حضور اليوم */}
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
                                                <td colSpan={3} style={styles.emptyCell}>
                                                    لم يتم تسجيل حضور اليوم بعد
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* سجل الحضور السابق */}
                            <h4 style={{ ...styles.subTitle, marginTop: 20 }}>سجل الحضور السابق</h4>
                            <div style={styles.filterRow}>
                                <input
                                    type="date"
                                    value={attendanceFrom}
                                    onChange={e => setAttendanceFrom(e.target.value)}
                                    style={styles.dateInput}
                                />
                                <input
                                    type="date"
                                    value={attendanceTo}
                                    onChange={e => setAttendanceTo(e.target.value)}
                                    style={styles.dateInput}
                                />
                                <button onClick={fetchAttendanceHistory} style={styles.viewButton}>
                                    عرض
                                </button>
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
                                                <td colSpan={3} style={styles.emptyCell}>
                                                    اختر الفترة لعرض السجل
                                                </td>
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
                                    <span style={styles.balanceLabel}>السنوية</span>
                                    <span style={styles.balanceValue}>{leaveBalance.remaining} / {leaveBalance.total}</span>
                                </div>
                                <div style={styles.balanceItem}>
                                    <span style={styles.balanceLabel}>العارضة</span>
                                    <span style={styles.balanceValue}>{leaveBalance.emergency_remaining} / {leaveBalance.emergency_total}</span>
                                </div>
                            </div>
                            <div style={styles.progressBar}>
                                <div style={{ ...styles.progressFill, width: `${(leaveBalance.used / leaveBalance.total) * 100}%` }} />
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
                                            {req.status === "قيد الانتظار" && !req.manager_approved && (
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

                                <select value={permissionType} onChange={e => setPermissionType(e.target.value)} style={styles.select}>
                                    <option value="ساعة">إذن ساعة</option>
                                    <option value="ساعتين">إذن ساعتين</option>
                                    <option value="نص يوم">إذن نص يوم</option>
                                </select>

                                <div style={styles.dateField}>
                                    <label style={styles.label}>التاريخ:</label>
                                    <input type="date" value={permissionDate} onChange={e => setPermissionDate(e.target.value)} style={styles.dateInput} />
                                </div>

                                {(permissionType === "ساعة" || permissionType === "ساعتين") && (
                                    <div style={styles.timeField}>
                                        <label style={styles.label}>وقت بداية الإذن:</label>
                                        <input type="time" value={permissionStartTime} onChange={e => setPermissionStartTime(e.target.value)} style={styles.input} />
                                    </div>
                                )}

                                {permissionType === "نص يوم" && (
                                    <div style={styles.timeRow}>
                                        <div style={styles.timeField}>
                                            <label style={styles.label}>من:</label>
                                            <input type="time" value={permissionStartTime} onChange={e => setPermissionStartTime(e.target.value)} style={styles.input} />
                                        </div>
                                        <div style={styles.timeField}>
                                            <label style={styles.label}>إلى:</label>
                                            <input type="time" value={permissionEndTime} onChange={e => setPermissionEndTime(e.target.value)} style={styles.input} />
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
                                                {req.permission_type === "نص يوم" ? `من ${req.start_time} إلى ${req.end_time || "?"}` : `بداية من ${req.start_time}`}
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
                                        <input type="time" value={correctionCheckIn} onChange={e => setCorrectionCheckIn(e.target.value)} style={styles.input} />
                                    </div>
                                    <div style={styles.timeField}>
                                        <label style={styles.label}>وقت الانصراف المفترض (اختياري):</label>
                                        <input type="time" value={correctionCheckOut} onChange={e => setCorrectionCheckOut(e.target.value)} style={styles.input} />
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
                                                {req.expected_check_in && <p>⏰ الحضور المفترض: {req.expected_check_in}</p>}
                                                {req.expected_check_out && <p>⌛ الانصراف المفترض: {req.expected_check_out}</p>}
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
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="********"
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.inputLabel}>كلمة المرور الجديدة</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="********"
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.inputLabel}>تأكيد كلمة المرور الجديدة</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="********"
                                    style={styles.input}
                                />
                            </div>

                            {passwordMessage && (
                                <div style={{
                                    ...styles.messageBox,
                                    backgroundColor: passwordMessage.type === 'success' ? '#d1fae5' : '#fee2e2',
                                    color: passwordMessage.type === 'success' ? '#065f46' : '#991b1b',
                                    border: `1px solid ${passwordMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`
                                }}>
                                    {passwordMessage.text}
                                </div>
                            )}

                            <button
                                onClick={handleChangePassword}
                                disabled={changingPassword}
                                style={{
                                    ...styles.saveButton,
                                    opacity: changingPassword ? 0.7 : 1,
                                    cursor: changingPassword ? 'not-allowed' : 'pointer'
                                }}
                            >
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

// ==================== الأنماط المحسنة (مع أزرار حذف واضحة) ====================
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
        color: '#ffffff',
        fontWeight: '500',
        cursor: 'pointer',
        fontSize: 14
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
        color: '#1e293b',
        transition: 'all 0.2s'
    },
    filterTabs: {
        display: 'flex',
        gap: 5,
        marginBottom: 15,
        flexWrap: 'wrap'
    },
    filterTab: {
        padding: '8px 15px',
        border: 'none',
        borderRadius: 6,
        fontWeight: 'bold',
        fontSize: 14,
        cursor: 'pointer',
        transition: 'all 0.2s'
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
        fontSize: 14,
        transition: 'all 0.2s'
    },
    checkOutButton: {
        padding: '10px 24px',
        border: 'none',
        borderRadius: 8,
        backgroundColor: '#ef4444',
        color: '#ffffff',
        fontWeight: '500',
        cursor: 'pointer',
        fontSize: 14,
        transition: 'all 0.2s'
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
        color: '#1e293b',
        outline: 'none'
    },
    dateInput: {
        padding: '8px 12px',
        borderRadius: 6,
        border: '1px solid #cbd5e1',
        fontSize: 14,
        backgroundColor: '#ffffff',
        color: '#1e293b',
        outline: 'none'
    },
    viewButton: {
        padding: '8px 16px',
        border: 'none',
        borderRadius: 6,
        backgroundColor: '#3b82f6',
        color: '#ffffff',
        cursor: 'pointer',
        fontWeight: '500',
        fontSize: 14,
        transition: 'all 0.2s'
    },
    addButton: {
        padding: '8px 16px',
        border: 'none',
        borderRadius: 6,
        backgroundColor: '#22c55e',
        color: '#ffffff',
        cursor: 'pointer',
        fontWeight: '500',
        fontSize: 14,
        transition: 'all 0.2s'
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
        top: 0
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
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    rejectButton: {
        padding: '5px 10px',
        margin: '0 2px',
        border: 'none',
        borderRadius: 4,
        backgroundColor: '#f44336',
        color: 'white',
        fontSize: 14,
        cursor: 'pointer',
        transition: 'all 0.2s'
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
    progressBar: {
        height: 8,
        background: '#e0e0e0',
        borderRadius: 4,
        overflow: 'hidden'
    },
    progressFill: {
        height: '100%',
        background: 'linear-gradient(90deg, #4caf50 0%, #8bc34a 100%)',
        transition: 'width 0.3s ease'
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
    input: {
        width: '100%',
        padding: 10,
        marginBottom: 12,
        borderRadius: 6,
        border: '1px solid #cbd5e1',
        fontSize: 14,
        backgroundColor: '#ffffff',
        color: '#1e293b',
        outline: 'none'
    },
    label: {
        color: '#1e293b',
        fontWeight: '600',
        fontSize: 14,
        marginBottom: 4,
        display: 'block'
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
    submitButton: {
        width: '100%',
        padding: 12,
        border: 'none',
        borderRadius: 8,
        backgroundColor: '#3b82f6',
        color: '#ffffff',
        fontWeight: '600',
        cursor: 'pointer',
        fontSize: 14,
        transition: 'all 0.2s'
    },
    requestsList: {
        maxHeight: 400,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 8
    },
    requestCard: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        padding: 16,
        border: '1px solid #e2e8f0',
        transition: 'all 0.2s'
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
        fontSize: 12,
        color: '#64748b',
        backgroundColor: '#f1f5f9',
        padding: '4px 10px',
        borderRadius: 16,
        display: 'inline-block'
    },
    deleteButton: {
        padding: '6px 12px',
        border: 'none',
        borderRadius: 6,
        backgroundColor: '#ef4444',
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '500',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)',
        transition: 'all 0.2s'
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
        transition: 'all 0.2s'
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
    },
    approvalBadge: {
        padding: '4px 8px',
        borderRadius: 16,
        fontSize: 11,
        fontWeight: 'bold',
        display: 'inline-block'
    },
    footer: {
        marginTop: 30,
        textAlign: 'center',
        color: '#64748b',
        fontSize: 13,
        borderTop: '1px solid #e2e8f0',
        paddingTop: 20
    }
}