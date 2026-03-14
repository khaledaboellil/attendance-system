"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from '@/context/LanguageContext'
import LanguageSwitcher from '@/components/LanguageSwitcher'

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

type OvertimeRequest = {
    id: string
    employee_id: string
    employees?: {
        id: string
        name: string
        username: string
        department_id?: number
    }
    date: string
    hours: number
    reason?: string
    hr_approved: boolean
    manager_approved: boolean
    status: string
    created_at: string
}

type PermissionRequest = {
    id: string
    employee_id: string
    employees?: {
        id: string
        name: string
        username: string
        department_id?: number
    }
    permission_type: string
    date: string
    start_time?: string
    end_time?: string
    reason: string
    hr_approved: boolean
    manager_approved: boolean
    status: string
    created_at: string
    deducted_from_leave?: boolean
}

type CorrectionRequest = {
    id: string
    employee_id: string
    employees?: {
        id: string
        name: string
        username: string
        department_id?: number
    }
    date: string
    expected_check_in?: string
    expected_check_out?: string
    reason: string
    hr_approved: boolean
    manager_approved: boolean
    status: string
    created_at: string
}

type Department = {
    id: number
    name: string
}

type AttendanceRecord = {
    id: string
    employee_id: string
    day: string
    check_in: string | null
    check_out: string | null
    location?: string
}

export default function ManagerPage() {
    const router = useRouter()
    const { t, language, dir } = useLanguage()

    // دالة مساعدة لعرض الرسائل
    const showMessage = (data: any, isSuccess: boolean = true) => {
        const key = isSuccess ? 'message' : 'error'

        if (data[`${key}_ar`] && data[`${key}_en`]) {
            alert(language === 'ar' ? data[`${key}_ar`] : data[`${key}_en`])
        } else if (data[key]) {
            alert(data[key])
        }
    }

    // ==================== Manager Data ====================
    const [managerName, setManagerName] = useState("")
    const [managerUsername, setManagerUsername] = useState("")
    const [managerId, setManagerId] = useState("")
    const [hireDate, setHireDate] = useState("")
    const [jobTitle, setJobTitle] = useState("")
    const [managedDepts, setManagedDepts] = useState<number[]>([])
    const [managedDeptsNames, setManagedDeptsNames] = useState<string>("")
    const [departments, setDepartments] = useState<Department[]>([])
    const [yearsOfService, setYearsOfService] = useState<string>("0")
    // ==================== Tabs ====================
    const [activeTab, setActiveTab] = useState<"requests" | "attendance" | "leave" | "overtime" | "permission" | "correction" | "settings">("requests")

    // ==================== All Requests ====================
    const [allRequests, setAllRequests] = useState<any[]>([])
    const [selectedDepartment, setSelectedDepartment] = useState<string>("all")
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending")
    const [requestsType, setRequestsType] = useState<"all" | "leave" | "overtime" | "permission" | "correction">("all")

    // ==================== Manager's Personal Requests ====================
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
    const [showLeaveForm, setShowLeaveForm] = useState(false)
    const [leaveType, setLeaveType] = useState("سنوية")
    const [leaveStart, setLeaveStart] = useState("")
    const [leaveEnd, setLeaveEnd] = useState("")
    const [leaveReason, setLeaveReason] = useState("")
    const [leaveBalance, setLeaveBalance] = useState({
        annual_total: 0,
        emergency_total: 0,
        used_annual: 0,
        used_emergency: 0,
        remaining_annual: 0,
        remaining_emergency: 0,
        hire_date: "",
        message_ar: "",
        message_en: ""
    })

    const [overtimeRequests, setOvertimeRequests] = useState<OvertimeRequest[]>([])
    const [showOvertimeForm, setShowOvertimeForm] = useState(false)
    const [overtimeDate, setOvertimeDate] = useState("")
    const [overtimeHours, setOvertimeHours] = useState("")
    const [overtimeReason, setOvertimeReason] = useState("")

    const [permissionRequests, setPermissionRequests] = useState<PermissionRequest[]>([])
    const [showPermissionForm, setShowPermissionForm] = useState(false)
    const [permissionType, setPermissionType] = useState("ساعة")
    const [permissionDate, setPermissionDate] = useState("")
    const [permissionStartTime, setPermissionStartTime] = useState("")
    const [permissionEndTime, setPermissionEndTime] = useState("")
    const [permissionReason, setPermissionReason] = useState("")

    const [correctionRequests, setCorrectionRequests] = useState<CorrectionRequest[]>([])
    const [showCorrectionForm, setShowCorrectionForm] = useState(false)
    const [correctionDate, setCorrectionDate] = useState("")
    const [correctionCheckIn, setCorrectionCheckIn] = useState("")
    const [correctionCheckOut, setCorrectionCheckOut] = useState("")
    const [correctionReason, setCorrectionReason] = useState("")

    // ==================== Manager's Attendance ====================
    const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null)
    const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([])
    const [currentPos, setCurrentPos] = useState<{ lat: number, lng: number }>({ lat: 0, lng: 0 })
    const [loadingPos, setLoadingPos] = useState(true)
    const [attendanceFrom, setAttendanceFrom] = useState("")
    const [attendanceTo, setAttendanceTo] = useState("")

    // ==================== Permission Stats ====================
    const [permissionStats, setPermissionStats] = useState({
        totalHoursThisMonth: 0,
        maxHoursPerMonth: 2,
        halfDayCount: 0,
        halfDayFreeUsed: false
    })

    // ==================== Settings ====================
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [changingPassword, setChangingPassword] = useState(false)

    // =============================================
    // Fetch Permission Stats
    // =============================================
    const fetchPermissionStats = async (empId: string) => {
        if (!empId) return
        try {
            const res = await fetch(`/api/permission-stats?employee_id=${empId}`)
            if (res.ok) {
                const data = await res.json()
                setPermissionStats({
                    totalHoursThisMonth: data.totalHoursThisMonth || 0,
                    maxHoursPerMonth: data.maxHoursPerMonth || 2,
                    halfDayCount: data.halfDayCount || 0,
                    halfDayFreeUsed: data.halfDayFreeUsed || false
                })
            }
        } catch (err) {
            console.error(err)
        }
    }

    // =============================================
    // useEffect for loading data
    // =============================================
    useEffect(() => {
        const storedName = localStorage.getItem("name")
        const storedUsername = localStorage.getItem("username")
        const storedId = localStorage.getItem("employee_id")
        const storedRole = localStorage.getItem("role")
        const storedJobTitle = localStorage.getItem("job_title")

        if (!storedName || !storedId || storedRole !== "manager") {
            alert(t('unauthorized'))
            router.push("/")
            return
        }

        setManagerName(storedName)
        setManagerUsername(storedUsername || "")
        setManagerId(storedId)
        setJobTitle(storedJobTitle || t('manager'))

        fetchManagedDepartments(storedId)
        fetchLeaveRequests(storedId)
        fetchLeaveBalance(storedId)
        fetchOvertimeRequests(storedId)
        fetchPermissionRequests(storedId)
        fetchCorrectionRequests(storedId)
        fetchTodayAttendance(storedUsername || "")
        fetchPermissionStats(storedId)

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => {
                    setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    setLoadingPos(false)
                },
                () => {
                    alert(t('location_error'))
                    setLoadingPos(false)
                }
            )
        } else {
            alert(t('gps_not_supported'))
            setLoadingPos(false)
        }
    }, [])

    // =============================================
    // Fetch Functions
    // =============================================
    const fetchManagedDepartments = async (managerId: string) => {
        try {
            const res = await fetch(`/api/departments/managers?manager_id=${managerId}`)
            if (res.ok) {
                const data = await res.json()
                const deptIds = data.map((item: any) => item.department_id)
                setManagedDepts(deptIds)

                if (deptIds.length === 0) {
                    setManagedDeptsNames(t('no_departments_managed'))
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
            const leavesRes = await fetch(`/api/leave-requests?user_role=manager&department_ids=${deptIds.join(',')}${statusFilter !== "all" ? `&status=${statusFilter}` : ""}`)
            const leaves = leavesRes.ok ? await leavesRes.json() : []

            const overtimeRes = await fetch(`/api/overtime-requests?user_role=manager&department_ids=${deptIds.join(',')}${statusFilter !== "all" ? `&status=${statusFilter}` : ""}`)
            const overtime = overtimeRes.ok ? await overtimeRes.json() : []

            const permissionRes = await fetch(`/api/permission-requests?user_role=manager&department_ids=${deptIds.join(',')}${statusFilter !== "all" ? `&status=${statusFilter}` : ""}`)
            const permission = permissionRes.ok ? await permissionRes.json() : []

            const correctionRes = await fetch(`/api/attendance-correction?user_role=manager&department_ids=${deptIds.join(',')}${statusFilter !== "all" ? `&status=${statusFilter}` : ""}`)
            const correction = correctionRes.ok ? await correctionRes.json() : []

            const combined = [
                ...leaves.map((r: any) => ({ ...r, requestType: "leave", requestTypeText: t('leave') })),
                ...overtime.map((r: any) => ({ ...r, requestType: "overtime", requestTypeText: t('overtime') })),
                ...permission.map((r: any) => ({ ...r, requestType: "permission", requestTypeText: t('permission') })),
                ...correction.map((r: any) => ({ ...r, requestType: "correction", requestTypeText: t('correction') }))
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
                    annual_total: data.annual_total,
                    emergency_total: data.emergency_total,
                    used_annual: data.used_annual,
                    used_emergency: data.used_emergency,
                    remaining_annual: data.remaining_annual,
                    remaining_emergency: data.remaining_emergency,
                    hire_date: data.hire_date || "",
                    message_ar: data.message_ar || "",
                    message_en: data.message_en || ""
                })
                setHireDate(data.hire_date)
                setHireDate(data.hire_date)
                const hire = new Date(data.hire_date)
                const today = new Date()

                const diffMs = today.getTime() - hire.getTime()
                const years = diffMs / (1000 * 60 * 60 * 24 * 365)
                setYearsOfService(years.toFixed(2))
                console.log("✅ Leave balance fetched:", data)
            } else {
                console.error("❌ Error fetching leave balance:", data)
            }
        } catch (err) {
            console.error("❌ Exception in fetchLeaveBalance:", err)
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
        if (!attendanceFrom || !attendanceTo) {
            alert(t('select_dates'))
            return
        }
        try {
            const res = await fetch(`/api/attendance?username=${managerUsername}&from=${attendanceFrom}&to=${attendanceTo}`)
            if (res.ok) setAttendanceHistory(await res.json())
        } catch (err) { console.error(err) }
    }

    // =============================================
    // Approve/Reject Functions
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
            showMessage(data, res.ok)
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
            showMessage(data, res.ok)
            if (res.ok) {
                fetchAllRequests(managedDepts, filter)
            }
        } catch (err) { console.error(err) }
    }

    // =============================================
    // Manager's Personal Request Functions
    // =============================================
    const submitLeaveRequest = async () => {
        if (!leaveStart || !leaveEnd) {
            alert(t('select_dates'))
            return
        }

        const start = new Date(leaveStart)
        const end = new Date(leaveEnd)
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

        if (leaveType === "سنوية" && days > leaveBalance.remaining_annual) {
            return alert(`${t('insufficient_balance')} ${t('remaining')}: ${leaveBalance.remaining_annual} ${t('days')}`)
        }
        if (leaveType === "عارضة" && days > leaveBalance.emergency_remaining) {
            return alert(`${t('insufficient_emergency_balance')} ${t('remaining')}: ${leaveBalance.remaining_emergency} ${t('days')}`)
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
        showMessage(data, res.ok)
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
        if (!confirm(t('confirm_delete'))) return

        try {
            const res = await fetch(`/api/leave-requests?id=${id}&employee_id=${managerId}`, {
                method: "DELETE"
            })
            const data = await res.json()
            showMessage(data, res.ok)
            if (res.ok) {
                fetchLeaveRequests(managerId)
                fetchLeaveBalance(managerId)
            }
        } catch (err) { console.error(err) }
    }

    const submitOvertimeRequest = async () => {
        if (!overtimeDate || !overtimeHours) {
            alert(t('select_date_and_hours'))
            return
        }

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
        showMessage(data, res.ok)
        if (res.ok) {
            setShowOvertimeForm(false)
            setOvertimeDate("")
            setOvertimeHours("")
            setOvertimeReason("")
            fetchOvertimeRequests(managerId)
        }
    }

    const deleteOvertimeRequest = async (id: string) => {
        if (!confirm(t('confirm_delete'))) return

        try {
            const res = await fetch(`/api/overtime-requests?id=${id}&employee_id=${managerId}`, {
                method: "DELETE"
            })
            const data = await res.json()
            showMessage(data, res.ok)
            if (res.ok) fetchOvertimeRequests(managerId)
        } catch (err) { console.error(err) }
    }

    const submitPermissionRequest = async () => {
        if (!permissionDate || !permissionReason) {
            alert(t('select_date_and_reason'))
            return
        }

        if ((permissionType === "ساعة" || permissionType === "ساعتين") && !permissionStartTime) {
            alert(t('select_start_time'))
            return
        }

        setLoading(true)

        try {
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

            if (res.ok) {
                let successMessage = ""
                if (permissionType === "نص يوم") {
                    if (data.message_ar?.includes('خصم')) {
                        successMessage = language === 'ar' ? data.message_ar : data.message_en
                    } else {
                        successMessage = language === 'ar' ? data.message_ar : data.message_en
                    }
                } else {
                    successMessage = language === 'ar' ? data.message_ar : data.message_en
                }

                alert(successMessage || (language === 'ar' ? 'تم تقديم الطلب بنجاح' : 'Request submitted successfully'))

                setShowPermissionForm(false)
                setPermissionType("ساعة")
                setPermissionDate("")
                setPermissionStartTime("")
                setPermissionEndTime("")
                setPermissionReason("")
                fetchPermissionRequests(managerId)
                fetchLeaveBalance(managerId)
                fetchPermissionStats(managerId)
            } else {
                const errorMessage = language === 'ar' ? data.error_ar : data.error_en
                alert(errorMessage || (language === 'ar' ? 'حدث خطأ' : 'An error occurred'))
            }
        } catch (err) {
            console.error(err)
            alert(t('error_occurred'))
        } finally {
            setLoading(false)
        }
    }

    const deletePermissionRequest = async (id: string) => {
        if (!confirm(t('confirm_delete'))) return

        try {
            const res = await fetch(`/api/permission-requests?id=${id}&employee_id=${managerId}`, {
                method: "DELETE"
            })
            const data = await res.json()
            showMessage(data, res.ok)
            if (res.ok) {
                fetchPermissionRequests(managerId)
                fetchPermissionStats(managerId)
            }
        } catch (err) { console.error(err) }
    }

    const submitCorrectionRequest = async () => {
        if (!correctionDate || !correctionReason) {
            alert(t('select_date_and_reason'))
            return
        }

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
        showMessage(data, res.ok)
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
        if (!confirm(t('confirm_delete'))) return

        try {
            const res = await fetch(`/api/attendance-correction?id=${id}&employee_id=${managerId}`, {
                method: "DELETE"
            })
            const data = await res.json()
            showMessage(data, res.ok)
            if (res.ok) fetchCorrectionRequests(managerId)
        } catch (err) { console.error(err) }
    }

    // =============================================
    // Manager's Attendance Functions
    // =============================================
    const handleCheck = async (type: "check_in" | "check_out") => {
        if (loadingPos) {
            alert(t('getting_location'))
            return
        }
        if (!currentPos.lat || !currentPos.lng) {
            alert(t('location_not_available'))
            return
        }

        try {
            const res = await fetch("/api/attendance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: managerUsername,
                    type,
                    lat: currentPos.lat,
                    lng: currentPos.lng
                })
            })
            const data = await res.json()
            showMessage(data, res.ok)
            if (res.ok) {
                fetchTodayAttendance(managerUsername)
            }
        } catch (err) {
            console.error(err)
            alert(t('error_occurred'))
        }
    }

    // =============================================
    // Filter Functions
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
    // Change Password
    // =============================================
    const handleChangePassword = async () => {
        setPasswordMessage(null)

        if (!currentPassword || !newPassword || !confirmPassword) {
            setPasswordMessage({ type: 'error', text: t('all_fields_required') })
            return
        }

        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: 'error', text: t('passwords_not_match') })
            return
        }

        if (newPassword.length < 3) {
            setPasswordMessage({ type: 'error', text: t('password_min_length') })
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
                setPasswordMessage({ type: 'success', text: language === 'ar' ? data.message_ar : data.message_en })
                setCurrentPassword("")
                setNewPassword("")
                setConfirmPassword("")

                if (localStorage.getItem("remembered_username")) {
                    localStorage.setItem("remembered_password", newPassword)
                }
            } else {
                setPasswordMessage({ type: 'error', text: language === 'ar' ? data.error_ar : data.error_en })
            }
        } catch (err) {
            setPasswordMessage({ type: 'error', text: t('connection_error') })
        } finally {
            setChangingPassword(false)
        }
    }

    // =============================================
    // Logout Function
    // =============================================
    const handleLogout = () => {
        localStorage.clear()
        document.cookie = "role=; path=/; max-age=0"
        document.cookie = "employee_id=; path=/; max-age=0"
        document.cookie = "remembered=; path=/; max-age=0"
        router.push("/")
    }

    // =============================================
    // Helper Functions
    // =============================================
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')
    }

    const formatTime = (dateString: string | null) => {
        if (!dateString) return "-"
        return new Date(dateString).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US')
    }

    const getApprovalStatus = (req: any) => {
        if (req.status === "مرفوضة") return { text: t('rejected'), color: "#f44336" }
        if (req.status === "تمت الموافقة") return { text: t('approved'), color: "#4caf50" }
        if (req.hr_approved && req.manager_approved) return { text: t('approved'), color: "#4caf50" }
        if (req.hr_approved || req.manager_approved) return { text: t('one_approval'), color: "#ff9800" }
        return { text: t('pending_approvals'), color: "#9e9e9e" }
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
        <div style={styles.page} dir={dir}>
            <div style={styles.container}>
                {/* Header */}
                <div style={styles.header}>
                    <h2 style={styles.title}>{t('manager_page')}</h2>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <LanguageSwitcher />
                        <button onClick={handleLogout} style={styles.logoutButton}>
                            {t('logout')}
                        </button>
                    </div>
                </div>

                {/* Manager Profile Card */}
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
                                    {t('hire_date')}: {hireDate ? formatDate(hireDate) : t('na')}
                                </span>
                                <span style={styles.profileDetail}>
                                    <span style={styles.detailIcon}>⏳</span>
                                    {t('years_of_service')}: {yearsOfService} {t('years')}
                                </span>
                                <span style={styles.profileDetail}>
                                    <span style={styles.detailIcon}>👥</span>
                                    {t('managed_departments')}: {managedDeptsNames || t('none')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Bar */}
                <div style={styles.tabBar}>
                    <button
                        onClick={() => setActiveTab("requests")}
                        style={{
                            ...styles.tabButton,
                            backgroundColor: activeTab === "requests" ? '#1976d2' : '#e0e0e0',
                            color: activeTab === "requests" ? 'white' : '#333',
                        }}
                    >
                        📋 {t('employee_requests')}
                    </button>
                    <button
                        onClick={() => setActiveTab("attendance")}
                        style={{
                            ...styles.tabButton,
                            backgroundColor: activeTab === "attendance" ? '#1976d2' : '#e0e0e0',
                            color: activeTab === "attendance" ? 'white' : '#333',
                        }}
                    >
                        🕒 {t('my_attendance')}
                    </button>
                    <button
                        onClick={() => setActiveTab("leave")}
                        style={{
                            ...styles.tabButton,
                            backgroundColor: activeTab === "leave" ? '#1976d2' : '#e0e0e0',
                            color: activeTab === "leave" ? 'white' : '#333',
                        }}
                    >
                        🏖️ {t('my_leaves')}
                    </button>
                    <button
                        onClick={() => setActiveTab("overtime")}
                        style={{
                            ...styles.tabButton,
                            backgroundColor: activeTab === "overtime" ? '#1976d2' : '#e0e0e0',
                            color: activeTab === "overtime" ? 'white' : '#333',
                        }}
                    >
                        ⏰ {t('my_overtime')}
                    </button>
                    <button
                        onClick={() => setActiveTab("permission")}
                        style={{
                            ...styles.tabButton,
                            backgroundColor: activeTab === "permission" ? '#1976d2' : '#e0e0e0',
                            color: activeTab === "permission" ? 'white' : '#333',
                        }}
                    >
                        ⏳ {t('my_permissions')}
                    </button>
                    <button
                        onClick={() => setActiveTab("correction")}
                        style={{
                            ...styles.tabButton,
                            backgroundColor: activeTab === "correction" ? '#1976d2' : '#e0e0e0',
                            color: activeTab === "correction" ? 'white' : '#333',
                        }}
                    >
                        🔧 {t('my_corrections')}
                    </button>
                    <button
                        onClick={() => setActiveTab("settings")}
                        style={{
                            ...styles.tabButton,
                            backgroundColor: activeTab === "settings" ? '#1976d2' : '#e0e0e0',
                            color: activeTab === "settings" ? 'white' : '#333',
                        }}
                    >
                        ⚙️ {t('settings')}
                    </button>
                </div>

                {/* ========================================= */}
                {/* Employee Requests Tab */}
                {/* ========================================= */}
                {activeTab === "requests" && (
                    <div style={styles.tabContent}>
                        <h3 style={styles.sectionTitle}>{t('employee_requests')}</h3>

                        {/* Filter Tabs */}
                        <div style={styles.filterTabs}>
                            <button
                                onClick={() => handleFilterChange("pending")}
                                style={{
                                    ...styles.filterTab,
                                    backgroundColor: filter === "pending" ? '#ff9800' : '#e0e0e0',
                                    color: filter === "pending" ? 'white' : '#333'
                                }}
                            >
                                ⏳ {t('pending')}
                            </button>
                            <button
                                onClick={() => handleFilterChange("approved")}
                                style={{
                                    ...styles.filterTab,
                                    backgroundColor: filter === "approved" ? '#4caf50' : '#e0e0e0',
                                    color: filter === "approved" ? 'white' : '#333'
                                }}
                            >
                                ✅ {t('approved')}
                            </button>
                            <button
                                onClick={() => handleFilterChange("rejected")}
                                style={{
                                    ...styles.filterTab,
                                    backgroundColor: filter === "rejected" ? '#f44336' : '#e0e0e0',
                                    color: filter === "rejected" ? 'white' : '#333'
                                }}
                            >
                                ❌ {t('rejected')}
                            </button>
                            <button
                                onClick={() => handleFilterChange("all")}
                                style={{
                                    ...styles.filterTab,
                                    backgroundColor: filter === "all" ? '#1976d2' : '#e0e0e0',
                                    color: filter === "all" ? 'white' : '#333'
                                }}
                            >
                                📋 {t('all')}
                            </button>
                        </div>

                        {/* Additional Filters */}
                        <div style={styles.filterSection}>
                            {departments.length > 1 && (
                                <select
                                    value={selectedDepartment}
                                    onChange={e => handleDepartmentChange(e.target.value)}
                                    style={styles.select}
                                >
                                    <option value="all">{t('all_departments')}</option>
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
                                <option value="all">{t('all_types')}</option>
                                <option value="leave">{t('leave')}</option>
                                <option value="overtime">{t('overtime')}</option>
                                <option value="permission">{t('permission')}</option>
                                <option value="correction">{t('correction')}</option>
                            </select>
                        </div>

                        {/* Requests Table */}
                        <div style={styles.tableContainer}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.tableHeader}>{t('employee')}</th>
                                        <th style={styles.tableHeader}>{t('department')}</th>
                                        <th style={styles.tableHeader}>{t('request_type')}</th>
                                        <th style={styles.tableHeader}>{t('details')}</th>
                                        <th style={styles.tableHeader}>{t('status')}</th>
                                        <th style={styles.tableHeader}>{t('actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={6} style={styles.emptyCell}>{t('loading')}</td></tr>
                                    ) : allRequests.length === 0 ? (
                                        <tr><td colSpan={6} style={styles.emptyCell}>{t('no_requests')}</td></tr>
                                    ) : (
                                        allRequests.map(req => {
                                            const deptName = departments.find(d => d.id === req.employees?.department_id)?.name || "-"
                                            const canApprove = !req.manager_approved && req.status === "قيد الانتظار"

                                            let details = ""
                                            if (req.requestType === "leave") {
                                                details = `${req.leave_type} - ${t('from')} ${req.start_date} ${t('to')} ${req.end_date}`
                                            } else if (req.requestType === "overtime") {
                                                details = `${req.date} - ${req.hours} ${t('hours')}`
                                            } else if (req.requestType === "permission") {
                                                details = `${req.date} - ${req.permission_type}`
                                                if (req.start_time) details += ` ${t('from')} ${req.start_time}`
                                                if (req.end_time) details += ` ${t('to')} ${req.end_time}`
                                                if (req.deducted_from_leave) details += ` (${t('deducted_from_leave') || 'خصم من الإجازات'})`
                                            } else if (req.requestType === "correction") {
                                                details = `${req.date}`
                                                if (req.expected_check_in) details += ` - ${t('check_in')}: ${req.expected_check_in}`
                                                if (req.expected_check_out) details += ` - ${t('check_out')}: ${req.expected_check_out}`
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
                                                                ❌ {t('rejected')}
                                                            </span>
                                                        ) : req.status === "تمت الموافقة" || (req.hr_approved && req.manager_approved) ? (
                                                            <span style={{
                                                                ...styles.approvalBadge,
                                                                backgroundColor: '#e8f5e9',
                                                                color: '#2e7d32',
                                                                border: '1px solid #4caf50'
                                                            }}>
                                                                ✅ {t('approved')}
                                                            </span>
                                                        ) : (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                                <span style={{
                                                                    ...styles.approvalBadge,
                                                                    backgroundColor: req.hr_approved ? '#e8f5e9' : '#fff4e5',
                                                                    color: req.hr_approved ? '#2e7d32' : '#ed6c02',
                                                                    border: `1px solid ${req.hr_approved ? '#4caf50' : '#ed6c02'}`
                                                                }}>
                                                                    HR: {req.hr_approved ? '✅' : '⏳'}
                                                                </span>
                                                                <span style={{
                                                                    ...styles.approvalBadge,
                                                                    backgroundColor: req.manager_approved ? '#e8f5e9' : '#fff4e5',
                                                                    color: req.manager_approved ? '#2e7d32' : '#ed6c02',
                                                                    border: `1px solid ${req.manager_approved ? '#4caf50' : '#ed6c02'}`
                                                                }}>
                                                                    {t('manager')}: {req.manager_approved ? '✅' : '⏳'}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {req.pending_from && (
                                                            <div style={styles.pendingInfo}>{t('pending_from')}: {req.pending_from}</div>
                                                        )}
                                                    </td>
                                                    <td style={styles.tableCell}>
                                                        {canApprove && (
                                                            <>
                                                                <button
                                                                    onClick={() => approveAnyRequest(req)}
                                                                    style={styles.approveButton}
                                                                    title={t('approve')}
                                                                >
                                                                    ✓
                                                                </button>
                                                                <button
                                                                    onClick={() => rejectAnyRequest(req)}
                                                                    style={styles.rejectButton}
                                                                    title={t('reject')}
                                                                >
                                                                    ✗
                                                                </button>
                                                            </>
                                                        )}
                                                        {req.manager_approved && req.status === "قيد الانتظار" && (
                                                            <span style={styles.approvedBadge}>✅ {t('approved')}</span>
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
                {/* Manager's Attendance Tab */}
                {/* ========================================= */}
                {activeTab === "attendance" && (
                    <div style={styles.tabContent}>
                        <h3 style={styles.sectionTitle}>{t('my_attendance')}</h3>

                        <div style={styles.attendanceCard}>
                            {/* Location Status */}
                            <div style={styles.locationStatus}>
                                {loadingPos ? t('getting_location') : t('location_success')}
                            </div>

                            {/* Check In/Out Buttons */}
                            <div style={styles.buttonGroup}>
                                <button
                                    onClick={() => handleCheck("check_in")}
                                    style={styles.checkInButton}
                                    disabled={loadingPos}
                                >
                                    🟢 {t('check_in')}
                                </button>
                                <button
                                    onClick={() => handleCheck("check_out")}
                                    style={styles.checkOutButton}
                                    disabled={loadingPos}
                                >
                                    🔴 {t('check_out')}
                                </button>
                            </div>

                            {/* Today's Attendance */}
                            <h4 style={styles.subTitle}>{t('today_attendance')}</h4>
                            <div style={styles.tableContainer}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th style={styles.tableHeader}>{t('date')}</th>
                                            <th style={styles.tableHeader}>{t('check_in')}</th>
                                            <th style={styles.tableHeader}>{t('check_out')}</th>
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
                                                    {t('no_attendance_today')}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Attendance History */}
                            <h4 style={{ ...styles.subTitle, marginTop: 20 }}>{t('attendance_history')}</h4>
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
                                    {t('view')}
                                </button>
                            </div>

                            <div style={styles.tableContainer}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th style={styles.tableHeader}>{t('date')}</th>
                                            <th style={styles.tableHeader}>{t('check_in')}</th>
                                            <th style={styles.tableHeader}>{t('check_out')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attendanceHistory.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} style={styles.emptyCell}>
                                                    {t('select_dates_to_view')}
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
                {/* Manager's Leave Tab */}
                {/* ========================================= */}
                {activeTab === "leave" && (
                    <div style={styles.tabContent}>
                        <div style={styles.sectionHeader}>
                            <h3 style={styles.sectionTitle}>{t('my_leaves')}</h3>
                            <button onClick={() => setShowLeaveForm(!showLeaveForm)} style={styles.addButton}>
                                {showLeaveForm ? `❌ ${t('cancel')}` : `➕ ${t('request_leave')}`}
                            </button>
                        </div>

                        <div style={styles.balanceCard}>
                            <h4 style={styles.balanceTitle}>{t('leave_balance')}</h4>

                            {/* رسالة الرصيد (اختياري) */}
                            {leaveBalance.message_ar && (
                                <p style={styles.balanceMessage}>
                                    {language === 'ar' ? leaveBalance.message_ar : leaveBalance.message_en}
                                </p>
                            )}

                            {/* عرض الرصيد مباشرة من قاعدة البيانات - بدون أي حسابات */}
                            <div style={styles.balanceRow}>
                                <div style={styles.balanceItem}>
                                    <span style={styles.balanceLabel}>{t('annual_leave')}</span>
                                    <span style={styles.balanceValue}>
                                        {leaveBalance.annual_total} {t('days')}
                                    </span>
                                </div>
                                <div style={styles.balanceItem}>
                                    <span style={styles.balanceLabel}>{t('emergency_leave')}</span>
                                    <span style={styles.balanceValue}>
                                        {leaveBalance.emergency_total} {t('days')}
                                    </span>
                                </div>
                            </div>


                        </div>

                        {/* نموذج طلب إجازة جديد */}
                        {showLeaveForm && (
                            <div style={styles.formCard}>
                                <h4 style={styles.formTitle}>{t('new_leave_request')}</h4>
                                <select value={leaveType} onChange={e => setLeaveType(e.target.value)} style={styles.select}>
                                    <option value="سنوية">{t('annual_leave')}</option>
                                    <option value="مرضية">{t('sick_leave')}</option>
                                    <option value="عارضة">{t('emergency_leave')}</option>
                                    <option value="غير مدفوعة">{t('unpaid_leave')}</option>
                                </select>
                                <div style={styles.dateRow}>
                                    {/* تاريخ البداية */}
                                    <div style={styles.dateField}>
                                        <label style={styles.label}>{t('from')}:</label>
                                        <input
                                            type="date"
                                            value={leaveStart}
                                            onChange={e => {
                                                setLeaveStart(e.target.value)

                                            }}
                                            style={styles.dateInput}
                                        />
                                    </div>
                                    {/* تاريخ النهاية */}
                                    <div style={styles.dateField}>
                                        <label style={styles.label}>{t('to')}:</label>
                                        <input
                                            type="date"
                                            value={leaveEnd}
                                            onChange={e => setLeaveEnd(e.target.value)}
                                            style={styles.dateInput}
                                            min={leaveStart || new Date().toISOString().split('T')[0]} // ✅ مش أقل من تاريخ البداية
                                        />
                                    </div>
                                </div>
                                <textarea placeholder={t('reason_optional')} value={leaveReason} onChange={e => setLeaveReason(e.target.value)} style={styles.textarea} rows={3} />
                                <button onClick={submitLeaveRequest} style={styles.submitButton}>✅ {t('submit_request')}</button>
                            </div>
                        )}

                        {/* الطلبات السابقة */}
                        <h4 style={styles.subTitle}>{t('previous_requests')}</h4>
                        <div style={styles.requestsList}>
                            {leaveRequests.length === 0 && !showLeaveForm && <p style={styles.noData}>{t('no_requests')}</p>}
                            {leaveRequests.map(req => (
                                <div key={req.id} style={styles.requestCard}>
                                    <div style={styles.requestHeader}>
                                        <span style={styles.requestType}>{req.leave_type}</span>
                                        {req.status === "مرفوضة" ? (
                                            <span style={{ ...styles.approvalBadge, backgroundColor: '#ffebee', color: '#f44336', border: '1px solid #f44336' }}>❌ {t('rejected')}</span>
                                        ) : req.status === "تمت الموافقة" || (req.hr_approved && req.manager_approved) ? (
                                            <span style={{ ...styles.approvalBadge, backgroundColor: '#e8f5e9', color: '#2e7d32', border: '1px solid #4caf50' }}>✅ {t('approved')}</span>
                                        ) : (
                                            <div style={styles.approvalContainer}>
                                                <div style={{ ...styles.approvalRow, backgroundColor: req.hr_approved ? '#e8f5e9' : '#fff4e5', border: `1px solid ${req.hr_approved ? '#4caf50' : '#ed6c02'}` }}>
                                                    <span style={styles.approvalLabel}>HR</span>
                                                    <span style={{ color: req.hr_approved ? '#2e7d32' : '#ed6c02', fontWeight: 'bold' }}>{req.hr_approved ? '✅' : '⏳'}</span>
                                                </div>
                                                <div style={{ ...styles.approvalRow, backgroundColor: req.manager_approved ? '#e8f5e9' : '#fff4e5', border: `1px solid ${req.manager_approved ? '#4caf50' : '#ed6c02'}` }}>
                                                    <span style={styles.approvalLabel}>{t('manager')}</span>
                                                    <span style={{ color: req.manager_approved ? '#2e7d32' : '#ed6c02', fontWeight: 'bold' }}>{req.manager_approved ? '✅' : '⏳'}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <p style={styles.requestDates}>{t('from')} {formatDate(req.start_date)} {t('to')} {formatDate(req.end_date)}</p>
                                    {req.reason && <p style={styles.requestReason}>{t('reason')}: {req.reason}</p>}
                                    <div style={styles.requestFooter}>
                                        <span style={styles.requestDate}>{t('submitted')}: {new Date(req.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</span>
                                        {req.status === "قيد الانتظار" && <button onClick={() => deleteLeaveRequest(req.id)} style={styles.deleteButton}>🗑️ {t('delete')}</button>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ========================================= */}
                {/* Manager's Overtime Tab */}
                {/* ========================================= */}
                {activeTab === "overtime" && (
                    <div style={styles.tabContent}>
                        <div style={styles.sectionHeader}>
                            <h3 style={styles.sectionTitle}>{t('my_overtime')}</h3>
                            <button onClick={() => setShowOvertimeForm(!showOvertimeForm)} style={styles.addButton}>
                                {showOvertimeForm ? `❌ ${t('cancel')}` : `➕ ${t('request_overtime')}`}
                            </button>
                        </div>

                        {showOvertimeForm && (
                            <div style={styles.formCard}>
                                <h4 style={styles.formTitle}>{t('new_overtime_request')}</h4>

                                <div style={styles.dateField}>
                                    <label style={styles.label}>{t('date')}:</label>
                                    <input type="date" value={overtimeDate} onChange={e => setOvertimeDate(e.target.value)} style={styles.dateInput} />
                                </div>

                                <div style={styles.hoursField}>
                                    <label style={styles.label}>{t('hours')}:</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        min="0.5"
                                        max="12"
                                        value={overtimeHours}
                                        onChange={e => setOvertimeHours(e.target.value)}
                                        style={styles.input}
                                        placeholder={t('example_2_5')}
                                    />
                                </div>

                                <textarea
                                    placeholder={t('reason_optional')}
                                    value={overtimeReason}
                                    onChange={e => setOvertimeReason(e.target.value)}
                                    style={styles.textarea}
                                    rows={3}
                                />

                                <button onClick={submitOvertimeRequest} style={styles.submitButton}>
                                    ✅ {t('submit_request')}
                                </button>
                            </div>
                        )}

                        <h4 style={styles.subTitle}>{t('previous_requests')}</h4>
                        <div style={styles.requestsList}>
                            {overtimeRequests.length === 0 && !showOvertimeForm && (
                                <p style={styles.noData}>{t('no_requests')}</p>
                            )}
                            {overtimeRequests.map(req => {
                                const status = getApprovalStatus(req)
                                return (
                                    <div key={req.id} style={styles.requestCard}>
                                        <div style={styles.requestHeader}>
                                            <span style={styles.requestType}>{t('overtime')}</span>
                                            {req.status === "مرفوضة" ? (
                                                <span style={{
                                                    ...styles.approvalBadge,
                                                    backgroundColor: '#ffebee',
                                                    color: '#f44336',
                                                    border: '1px solid #f44336'
                                                }}>
                                                    ❌ {t('rejected')}
                                                </span>
                                            ) : req.status === "تمت الموافقة" || (req.hr_approved && req.manager_approved) ? (
                                                <span style={{
                                                    ...styles.approvalBadge,
                                                    backgroundColor: '#e8f5e9',
                                                    color: '#2e7d32',
                                                    border: '1px solid #4caf50'
                                                }}>
                                                    ✅ {t('approved')}
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
                                                        <span style={styles.approvalLabel}>{t('manager')}</span>
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

                                        <p style={styles.requestDates}>{t('date')}: {req.date}</p>
                                        <p style={styles.requestReason}>{t('hours')}: {req.hours} {t('hours')}</p>
                                        {req.reason && <p style={styles.requestReason}>{t('reason')}: {req.reason}</p>}

                                        <div style={styles.requestFooter}>
                                            <span style={styles.requestDate}>
                                                {t('submitted')}: {new Date(req.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                                            </span>
                                            {req.status === "قيد الانتظار" && (
                                                <button
                                                    onClick={() => deleteOvertimeRequest(req.id)}
                                                    style={styles.deleteButton}
                                                >
                                                    🗑️ {t('delete')}
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
                {/* Manager's Permission Tab */}
                {/* ========================================= */}
                {activeTab === "permission" && (
                    <div style={styles.tabContent}>
                        <div style={styles.sectionHeader}>
                            <h3 style={styles.sectionTitle}>{t('my_permissions')}</h3>
                            <button onClick={() => setShowPermissionForm(!showPermissionForm)} style={styles.addButton}>
                                {showPermissionForm ? `❌ ${t('cancel')}` : `➕ ${t('request_permission')}`}
                            </button>
                        </div>

                       

                        {showPermissionForm && (
                            <div style={styles.formCard}>
                                <h4 style={styles.formTitle}>{t('new_permission_request')}</h4>

                                <select
                                    value={permissionType}
                                    onChange={e => setPermissionType(e.target.value)}
                                    style={styles.select}
                                >
                                    <option value="ساعة">{t('one_hour')}</option>
                                    <option value="ساعتين">{t('two_hours')}</option>
                                    <option value="نص يوم">{t('half_day')}</option>
                                </select>

                                <div style={styles.dateField}>
                                    <label style={styles.label}>{t('date')}:</label>
                                    <input
                                        type="date"
                                        value={permissionDate}
                                        onChange={e => setPermissionDate(e.target.value)}
                                        style={styles.dateInput}
                                    />
                                </div>

                                {(permissionType === "ساعة" || permissionType === "ساعتين") && (
                                    <div style={styles.timeField}>
                                        <label style={styles.label}>{t('start_time')}:</label>
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
                                            <label style={styles.label}>{t('from')}:</label>
                                            <input
                                                type="time"
                                                value={permissionStartTime}
                                                onChange={e => setPermissionStartTime(e.target.value)}
                                                style={styles.input}
                                            />
                                        </div>
                                        <div style={styles.timeField}>
                                            <label style={styles.label}>{t('to')}:</label>
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
                                    placeholder={t('reason_required')}
                                    value={permissionReason}
                                    onChange={e => setPermissionReason(e.target.value)}
                                    style={styles.textarea}
                                    rows={3}
                                    required
                                />

                                <button onClick={submitPermissionRequest} style={styles.submitButton} disabled={loading}>
                                    {loading ? t('loading') : `✅ ${t('submit_request')}`}
                                </button>
                            </div>
                        )}

                        <h4 style={styles.subTitle}>{t('previous_requests')}</h4>
                        <div style={styles.requestsList}>
                            {permissionRequests.length === 0 && !showPermissionForm && (
                                <p style={styles.noData}>{t('no_requests')}</p>
                            )}
                            {permissionRequests.map(req => {
                                const status = getApprovalStatus(req)
                                return (
                                    <div key={req.id} style={styles.requestCard}>
                                        <div style={styles.requestHeader}>
                                            <span style={styles.requestType}>{t('permission')} {req.permission_type}</span>
                                            {req.status === "مرفوضة" ? (
                                                <span style={{
                                                    ...styles.approvalBadge,
                                                    backgroundColor: '#ffebee',
                                                    color: '#f44336',
                                                    border: '1px solid #f44336'
                                                }}>
                                                    ❌ {t('rejected')}
                                                </span>
                                            ) : req.status === "تمت الموافقة" || (req.hr_approved && req.manager_approved) ? (
                                                <span style={{
                                                    ...styles.approvalBadge,
                                                    backgroundColor: '#e8f5e9',
                                                    color: '#2e7d32',
                                                    border: '1px solid #4caf50'
                                                }}>
                                                    ✅ {t('approved')}
                                                    {req.deducted_from_leave && ` (${t('deducted_from_leave') || 'خصم من الإجازات'})`}
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
                                                        <span style={styles.approvalLabel}>{t('manager')}</span>
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

                                        <p style={styles.requestDates}>{t('date')}: {req.date}</p>

                                        {req.start_time && (
                                            <p style={styles.requestReason}>
                                                {req.permission_type === "نص يوم"
                                                    ? `${t('from')} ${req.start_time} ${t('to')} ${req.end_time || "?"}`
                                                    : `${t('from')} ${req.start_time}`}
                                            </p>
                                        )}

                                        <p style={styles.requestReason}>{t('reason')}: {req.reason}</p>

                                        {req.deducted_from_leave && (
                                            <p style={{ ...styles.requestReason, color: '#f44336', fontWeight: 'bold' }}>
                                                ⚠️ {t('deducted_from_leave') || 'تم الخصم من الإجازات'}
                                            </p>
                                        )}

                                        <div style={styles.requestFooter}>
                                            <span style={styles.requestDate}>
                                                {t('submitted')}: {new Date(req.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                                            </span>
                                            {req.status === "قيد الانتظار" && (
                                                <button
                                                    onClick={() => deletePermissionRequest(req.id)}
                                                    style={styles.deleteButton}
                                                >
                                                    🗑️ {t('delete')}
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
                {/* Manager's Correction Tab */}
                {/* ========================================= */}
                {activeTab === "correction" && (
                    <div style={styles.tabContent}>
                        <div style={styles.sectionHeader}>
                            <h3 style={styles.sectionTitle}>{t('my_corrections')}</h3>
                            <button onClick={() => setShowCorrectionForm(!showCorrectionForm)} style={styles.addButton}>
                                {showCorrectionForm ? `❌ ${t('cancel')}` : `➕ ${t('request_correction')}`}
                            </button>
                        </div>

                        {showCorrectionForm && (
                            <div style={styles.formCard}>
                                <h4 style={styles.formTitle}>{t('new_correction_request')}</h4>

                                <div style={styles.dateField}>
                                    <label style={styles.label}>{t('date_to_correct')}:</label>
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
                                        <label style={styles.label}>{t('expected_check_in')}:</label>
                                        <input
                                            type="time"
                                            value={correctionCheckIn}
                                            onChange={e => setCorrectionCheckIn(e.target.value)}
                                            style={styles.input}
                                        />
                                    </div>
                                    <div style={styles.timeField}>
                                        <label style={styles.label}>{t('expected_check_out')}:</label>
                                        <input
                                            type="time"
                                            value={correctionCheckOut}
                                            onChange={e => setCorrectionCheckOut(e.target.value)}
                                            style={styles.input}
                                        />
                                    </div>
                                </div>

                                <textarea
                                    placeholder={t('reason_required')}
                                    value={correctionReason}
                                    onChange={e => setCorrectionReason(e.target.value)}
                                    style={styles.textarea}
                                    rows={3}
                                    required
                                />

                                <button onClick={submitCorrectionRequest} style={styles.submitButton}>
                                    ✅ {t('submit_request')}
                                </button>
                            </div>
                        )}

                        <h4 style={styles.subTitle}>{t('previous_requests')}</h4>
                        <div style={styles.requestsList}>
                            {correctionRequests.length === 0 && !showCorrectionForm && (
                                <p style={styles.noData}>{t('no_requests')}</p>
                            )}
                            {correctionRequests.map(req => {
                                const status = getApprovalStatus(req)
                                return (
                                    <div key={req.id} style={styles.requestCard}>
                                        <div style={styles.requestHeader}>
                                            <span style={styles.requestType}>{t('correction_for')} {req.date}</span>
                                            {req.status === "مرفوضة" ? (
                                                <span style={{
                                                    ...styles.approvalBadge,
                                                    backgroundColor: '#ffebee',
                                                    color: '#f44336',
                                                    border: '1px solid #f44336'
                                                }}>
                                                    ❌ {t('rejected')}
                                                </span>
                                            ) : req.status === "تمت الموافقة" || (req.hr_approved && req.manager_approved) ? (
                                                <span style={{
                                                    ...styles.approvalBadge,
                                                    backgroundColor: '#e8f5e9',
                                                    color: '#2e7d32',
                                                    border: '1px solid #4caf50'
                                                }}>
                                                    ✅ {t('approved')}
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
                                                        <span style={styles.approvalLabel}>{t('manager')}</span>
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
                                                    <p>⏰ {t('expected_check_in')}: {req.expected_check_in}</p>
                                                )}
                                                {req.expected_check_out && (
                                                    <p>⌛ {t('expected_check_out')}: {req.expected_check_out}</p>
                                                )}
                                            </div>
                                        )}

                                        <p style={styles.requestReason}>{t('reason')}: {req.reason}</p>

                                        <div style={styles.requestFooter}>
                                            <span style={styles.requestDate}>
                                                {t('submitted')}: {new Date(req.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                                            </span>
                                            {req.status === "قيد الانتظار" && (
                                                <button
                                                    onClick={() => deleteCorrectionRequest(req.id)}
                                                    style={styles.deleteButton}
                                                >
                                                    🗑️ {t('delete')}
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
                {/* Settings Tab */}
                {/* ========================================= */}
                {activeTab === "settings" && (
                    <div style={styles.tabContent}>
                        <h3 style={styles.sectionTitle}>{t('settings')}</h3>

                        <div style={styles.settingsCard}>
                            <h4 style={styles.settingsTitle}>{t('change_password')}</h4>

                            <div style={styles.inputGroup}>
                                <label style={styles.inputLabel}>{t('current_password')}</label>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="********"
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.inputLabel}>{t('new_password')}</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="********"
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.inputLabel}>{t('confirm_password')}</label>
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
                                {changingPassword ? t('loading') : `💾 ${t('save_new_password')}`}
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div style={styles.footer}>
                    &copy; 2026 Khaled Aboellil. {t('footer')}
                </div>
            </div>
        </div>
    )
}

// ==================== Styles ====================
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
    statsCard: {
        backgroundColor: '#f8f9fa',
        borderRadius: 10,
        padding: 16,
        marginBottom: 20,
        border: '1px solid #e0e0e0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    },
    statsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1976d2',
        marginBottom: 12,
        borderBottom: '1px solid #e0e0e0',
        paddingBottom: 8
    },
    statsRow: {
        display: 'flex',
        justifyContent: 'space-around',
        flexWrap: 'wrap' as 'wrap',
        gap: 15
    },
    statItem: {
        textAlign: 'center' as 'center',
        minWidth: 150
    },
    statItemLabel: {
        display: 'block',
        fontSize: 13,
        color: '#666',
        marginBottom: 5
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