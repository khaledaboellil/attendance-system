"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function EmployeePage() {
    const router = useRouter()

    // بيانات الموظف
    const [employeeName, setEmployeeName] = useState("")
    const [employeeUsername, setEmployeeUsername] = useState("")
    const [employeeId, setEmployeeId] = useState("")
    const [hireDate, setHireDate] = useState("")

    // الحضور
    const [todayAttendance, setTodayAttendance] = useState<any>(null)
    const [attendanceHistory, setAttendanceHistory] = useState<any[]>([])
    const [currentPos, setCurrentPos] = useState<{ lat: number, lng: number }>({ lat: 0, lng: 0 })
    const [loadingPos, setLoadingPos] = useState(true)
    const [from, setFrom] = useState("")
    const [to, setTo] = useState("")

    // طلبات الإجازات
    const [leaveRequests, setLeaveRequests] = useState<any[]>([])
    const [showLeaveForm, setShowLeaveForm] = useState(false)
    const [leaveType, setLeaveType] = useState("سنوية")
    const [leaveStart, setLeaveStart] = useState("")
    const [leaveEnd, setLeaveEnd] = useState("")
    const [leaveReason, setLeaveReason] = useState("")

    // رصيد الإجازات (مع العارضة)
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

    // طلبات الأوفر تايم
    const [overtimeRequests, setOvertimeRequests] = useState<any[]>([])
    const [showOvertimeForm, setShowOvertimeForm] = useState(false)
    const [overtimeDate, setOvertimeDate] = useState("")
    const [overtimeHours, setOvertimeHours] = useState("")
    const [overtimeReason, setOvertimeReason] = useState("")

    // طلبات تصحيح البصمة
    const [correctionRequests, setCorrectionRequests] = useState<any[]>([])
    const [showCorrectionForm, setShowCorrectionForm] = useState(false)
    const [correctionDate, setCorrectionDate] = useState("")
    const [expectedCheckIn, setExpectedCheckIn] = useState("")
    const [expectedCheckOut, setExpectedCheckOut] = useState("")
    const [correctionReason, setCorrectionReason] = useState("")

    // طلبات الإذن
    const [permissionRequests, setPermissionRequests] = useState<any[]>([])
    const [showPermissionForm, setShowPermissionForm] = useState(false)
    const [permissionType, setPermissionType] = useState("ساعة")
    const [permissionDate, setPermissionDate] = useState("")
    const [permissionStartTime, setPermissionStartTime] = useState("")
    const [permissionEndTime, setPermissionEndTime] = useState("")
    const [permissionReason, setPermissionReason] = useState("")

    // Active tab
    const [activeTab, setActiveTab] = useState<"attendance" | "leave" | "overtime" | "correction" | "permission">("attendance")

    // =============================================
    // useEffect لتحميل البيانات
    // =============================================
    useEffect(() => {
        const storedUsername = localStorage.getItem("username")
        const storedName = localStorage.getItem("name")
        const storedId = localStorage.getItem("employee_id")

        if (!storedUsername || !storedName) {
            alert("يجب تسجيل الدخول أولاً")
            router.push("/")
            return
        }

        setEmployeeUsername(storedUsername)
        setEmployeeName(storedName)
        setEmployeeId(storedId || "")

        fetchTodayAttendance(storedUsername)
        fetchLeaveBalance(storedId || "")
        fetchLeaveRequests(storedId || "")
        fetchOvertimeRequests(storedId || "")
        fetchCorrectionRequests(storedId || "")
        fetchPermissionRequests(storedId || "")

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
    // دوال الحضور والانصراف
    // =============================================
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
        if (!from || !to) return alert("حدد من وإلى")
        try {
            const res = await fetch(`/api/attendance?username=${employeeUsername}&from=${from}&to=${to}`)
            if (res.ok) setAttendanceHistory(await res.json())
        } catch (err) { console.error(err) }
    }

    const handleCheck = async (type: "check_in" | "check_out") => {
        if (loadingPos) { alert("جاري الحصول على الموقع، انتظر لحظة..."); return }
        if (!currentPos.lat || !currentPos.lng) { alert("الموقع غير متوفر"); return }

        try {
            const res = await fetch("/api/attendance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: employeeUsername, type, lat: currentPos.lat, lng: currentPos.lng })
            })
            const data = await res.json()
            alert(data.message || data.error)
            fetchTodayAttendance(employeeUsername)
            
        } catch (err) { console.error(err); alert("حدث خطأ أثناء الإرسال") }
    }

    // =============================================
    // دوال رصيد الإجازات
    // =============================================
    const fetchLeaveBalance = async (empId: string) => {
        if (!empId) return

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
            } else {
                console.error("خطأ في جلب الرصيد:", data.error)
            }
        } catch (err) { console.error(err) }
    }

    // =============================================
    // دوال طلبات الإجازات
    // =============================================
    const fetchLeaveRequests = async (empId: string) => {
        if (!empId) return
        try {
            const res = await fetch(`/api/leave-requests?employee_id=${empId}`)
            if (res.ok) {
                const data = await res.json()
                setLeaveRequests(data)
            }
        } catch (err) { console.error(err) }
    }

    const submitLeaveRequest = async () => {
        if (!leaveStart || !leaveEnd) return alert("حدد تاريخ البداية والنهاية")

        const start = new Date(leaveStart)
        const end = new Date(leaveEnd)
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

        // التحقق من الرصيد حسب نوع الإجازة
        if (leaveType === "سنوية" && days > leaveBalance.remaining) {
            return alert(`❌ لا يوجد رصيد كافٍ للإجازة السنوية. الرصيد المتبقي: ${leaveBalance.remaining} يوم`)
        }
        if (leaveType === "عارضة" && days > leaveBalance.emergency_remaining) {
            return alert(`❌ لا يوجد رصيد كافٍ للإجازة العارضة. الرصيد المتبقي: ${leaveBalance.emergency_remaining} يوم`)
        }

        const res = await fetch("/api/leave-requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                employee_id: employeeId,
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
            fetchLeaveRequests(employeeId)
            fetchLeaveBalance(employeeId)
        }
    }

    const deleteLeaveRequest = async (id: string) => {
        if (!confirm("هل أنت متأكد من حذف هذا الطلب؟")) return

        try {
            const res = await fetch(`/api/leave-requests?id=${id}&employee_id=${employeeId}`, {
                method: "DELETE"
            })
            const data = await res.json()
            alert(data.message || data.error)
            if (res.ok) {
                fetchLeaveRequests(employeeId)
                fetchLeaveBalance(employeeId)
            }
        } catch (err) { console.error(err) }
    }

    // =============================================
    // دوال طلبات الأوفر تايم
    // =============================================
    const fetchOvertimeRequests = async (empId: string) => {
        if (!empId) return
        try {
            const res = await fetch(`/api/overtime-requests?employee_id=${empId}`)
            if (res.ok) setOvertimeRequests(await res.json())
        } catch (err) { console.error(err) }
    }

    const submitOvertimeRequest = async () => {
        if (!overtimeDate || !overtimeHours) return alert("حدد التاريخ وعدد الساعات")

        const res = await fetch("/api/overtime-requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                employee_id: employeeId,
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
            fetchOvertimeRequests(employeeId)
        }
    }

    const deleteOvertimeRequest = async (id: string) => {
        if (!confirm("هل أنت متأكد من حذف هذا الطلب؟")) return

        try {
            const res = await fetch(`/api/overtime-requests?id=${id}&employee_id=${employeeId}`, {
                method: "DELETE"
            })
            const data = await res.json()
            alert(data.message || data.error)
            if (res.ok) fetchOvertimeRequests(employeeId)
        } catch (err) { console.error(err) }
    }

    // =============================================
    // دوال طلبات تصحيح البصمة
    // =============================================
    const fetchCorrectionRequests = async (empId: string) => {
        if (!empId) return
        try {
            const res = await fetch(`/api/attendance-correction?employee_id=${empId}`)
            if (res.ok) setCorrectionRequests(await res.json())
        } catch (err) { console.error(err) }
    }

    const submitCorrectionRequest = async () => {
        if (!correctionDate || !correctionReason) return alert("حدد التاريخ والسبب")

        const res = await fetch("/api/attendance-correction", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                employee_id: employeeId,
                date: correctionDate,
                expected_check_in: expectedCheckIn || null,
                expected_check_out: expectedCheckOut || null,
                reason: correctionReason
            })
        })

        const data = await res.json()
        alert(data.message || data.error)
        if (res.ok) {
            setShowCorrectionForm(false)
            setCorrectionDate("")
            setExpectedCheckIn("")
            setExpectedCheckOut("")
            setCorrectionReason("")
            fetchCorrectionRequests(employeeId)
        }
    }

    const deleteCorrectionRequest = async (id: string) => {
        if (!confirm("هل أنت متأكد من حذف هذا الطلب؟")) return

        try {
            const res = await fetch(`/api/attendance-correction?id=${id}&employee_id=${employeeId}`, {
                method: "DELETE"
            })
            const data = await res.json()
            alert(data.message || data.error)
            if (res.ok) fetchCorrectionRequests(employeeId)
        } catch (err) { console.error(err) }
    }

    // =============================================
    // دوال طلبات الإذن
    // =============================================
    const fetchPermissionRequests = async (empId: string) => {
        if (!empId) return
        try {
            const res = await fetch(`/api/permission-requests?employee_id=${empId}`)
            if (res.ok) setPermissionRequests(await res.json())
        } catch (err) { console.error(err) }
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
                employee_id: employeeId,
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
            fetchPermissionRequests(employeeId)
        }
    }

    const deletePermissionRequest = async (id: string) => {
        if (!confirm("هل أنت متأكد من حذف هذا الطلب؟")) return

        try {
            const res = await fetch(`/api/permission-requests?id=${id}&employee_id=${employeeId}`, {
                method: "DELETE"
            })
            const data = await res.json()
            alert(data.message || data.error)
            if (res.ok) fetchPermissionRequests(employeeId)
        } catch (err) { console.error(err) }
    }

    // =============================================
    // دالة تسجيل الخروج
    // =============================================
    const handleLogout = () => {
        localStorage.removeItem("username")
        localStorage.removeItem("role")
        localStorage.removeItem("name")
        localStorage.removeItem("employee_id")
        router.push("/")
    }

    // دوال مساعدة للتنسيق
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

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                {/* رأس الصفحة */}
                <div style={styles.header}>
                    <h2 style={styles.title}>صفحة الموظف</h2>
                    <button onClick={handleLogout} style={styles.logoutButton}>تسجيل خروج</button>
                </div>

                {/* اسم الموظف وتاريخ التعيين */}
                <div style={styles.welcomeCard}>
                    <p style={styles.welcomeText}>مرحباً {employeeName}</p>
                    {hireDate && (
                        <p style={styles.hireDateText}>
                            تاريخ التعيين: {formatDate(hireDate)} |
                            مدة الخدمة: {leaveBalance.yearsOfService} سنة
                        </p>
                    )}
                </div>

                {/* شريط التبويبات */}
                <div style={styles.tabBar}>
                    <button
                        onClick={() => setActiveTab("attendance")}
                        style={{
                            ...styles.tabButton,
                            backgroundColor: activeTab === "attendance" ? '#1976d2' : '#e0e0e0',
                            color: activeTab === "attendance" ? 'white' : '#333',
                        }}
                    >
                        📋 الحضور
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
                        onClick={() => setActiveTab("permission")}
                        style={{
                            ...styles.tabButton,
                            backgroundColor: activeTab === "permission" ? '#1976d2' : '#e0e0e0',
                            color: activeTab === "permission" ? 'white' : '#333',
                        }}
                    >
                        ⏳ إذن
                    </button>
                </div>

                {/* ========================================= */}
                {/* تبويب الحضور والانصراف */}
                {/* ========================================= */}
                {activeTab === "attendance" && (
                    <div style={styles.tabContent}>
                        <h3 style={styles.sectionTitle}>تسجيل الحضور والانصراف</h3>

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

                            {/* سجل الحضور بالتواريخ */}
                            <h4 style={{ ...styles.subTitle, marginTop: 20 }}>سجل الحضور السابق</h4>
                            <div style={styles.filterSection}>
                                <div style={styles.filterRow}>
                                    <label>من: </label>
                                    <input
                                        type="date"
                                        value={from}
                                        onChange={e => setFrom(e.target.value)}
                                        style={styles.dateInput}
                                    />
                                </div>
                                <div style={styles.filterRow}>
                                    <label>إلى: </label>
                                    <input
                                        type="date"
                                        value={to}
                                        onChange={e => setTo(e.target.value)}
                                        style={styles.dateInput}
                                    />
                                </div>
                                <button onClick={fetchAttendanceHistory} style={styles.viewButton}>
                                    عرض السجل
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
                {/* تبويب طلبات الإجازات (مع رصيد العارضة) */}
                {/* ========================================= */}
                {activeTab === "leave" && (
                    <div style={styles.tabContent}>
                        <div style={styles.sectionHeader}>
                            <h3 style={styles.sectionTitle}>طلبات الإجازات</h3>
                            <button onClick={() => setShowLeaveForm(!showLeaveForm)} style={styles.addButton}>
                                {showLeaveForm ? '❌ إلغاء' : '➕ طلب إجازة'}
                            </button>
                        </div>

                        {/* كرت رصيد الإجازات (سنوية + عارضة) */}
                        <div style={styles.balanceCard}>
                            <h4 style={styles.balanceTitle}>رصيد الإجازات</h4>
                            {leaveBalance.message && (
                                <p style={styles.balanceMessage}>{leaveBalance.message}</p>
                            )}

                            {/* رصيد الإجازة السنوية */}
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
                                        <label>من:</label>
                                        <input type="date" value={leaveStart} onChange={e => setLeaveStart(e.target.value)} style={styles.dateInput} />
                                    </div>
                                    <div style={styles.dateField}>
                                        <label>إلى:</label>
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
                                            <span style={{
                                                ...styles.statusBadge,
                                                backgroundColor: status.color
                                            }}>
                                                {status.text}
                                            </span>
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
                                    <label>التاريخ:</label>
                                    <input type="date" value={overtimeDate} onChange={e => setOvertimeDate(e.target.value)} style={styles.dateInput} />
                                </div>

                                <div style={styles.hoursField}>
                                    <label>عدد الساعات:</label>
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
                                            <span style={{
                                                ...styles.statusBadge,
                                                backgroundColor: status.color
                                            }}>
                                                {status.text}
                                            </span>
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
                                    <label>التاريخ المطلوب تصحيحه:</label>
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
                                        <label>وقت الحضور المفترض (اختياري):</label>
                                        <input
                                            type="time"
                                            value={expectedCheckIn}
                                            onChange={e => setExpectedCheckIn(e.target.value)}
                                            style={styles.input}
                                        />
                                    </div>
                                    <div style={styles.timeField}>
                                        <label>وقت الانصراف المفترض (اختياري):</label>
                                        <input
                                            type="time"
                                            value={expectedCheckOut}
                                            onChange={e => setExpectedCheckOut(e.target.value)}
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
                                            <span style={{
                                                ...styles.statusBadge,
                                                backgroundColor: status.color
                                            }}>
                                                {status.text}
                                            </span>
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
                                    <label>التاريخ:</label>
                                    <input
                                        type="date"
                                        value={permissionDate}
                                        onChange={e => setPermissionDate(e.target.value)}
                                        style={styles.dateInput}
                                    />
                                </div>

                                {(permissionType === "ساعة" || permissionType === "ساعتين") && (
                                    <div style={styles.timeField}>
                                        <label>وقت بداية الإذن:</label>
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
                                            <label>من:</label>
                                            <input
                                                type="time"
                                                value={permissionStartTime}
                                                onChange={e => setPermissionStartTime(e.target.value)}
                                                style={styles.input}
                                            />
                                        </div>
                                        <div style={styles.timeField}>
                                            <label>إلى:</label>
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
                                            <span style={{
                                                ...styles.statusBadge,
                                                backgroundColor: status.color
                                            }}>
                                                {status.text}
                                            </span>
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
        width: '90%',
        maxWidth: 800,
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
    hireDateText: {
        fontSize: 13,
        color: '#1976d2',
        marginTop: 5
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
        padding: '8px 12px',
        border: 'none',
        cursor: 'pointer',
        borderRadius: '10px 10px 0 0',
        fontWeight: 'bold',
        fontSize: 13,
        transition: 'all 0.3s'
    },
    tabContent: {
        minHeight: 400,
        padding: '10px 0'
    },
    sectionTitle: {
        color: '#0b3d91',
        fontSize: 20,
        margin: 0
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
    filterSection: {
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: 12,
        padding: 12,
        backgroundColor: '#f1f3f4',
        borderRadius: 8
    },
    filterRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 5
    },
    dateInput: {
        padding: 6,
        borderRadius: 6,
        border: '1px solid #ccc',
        fontSize: 13
    },
    viewButton: {
        padding: '6px 15px',
        border: 'none',
        borderRadius: 6,
        backgroundColor: '#1976d2',
        color: '#fff',
        fontSize: 13,
        cursor: 'pointer'
    },
    tableContainer: {
        maxHeight: 180,
        overflowY: 'auto',
        border: '1px solid #e0e0e0',
        borderRadius: 8
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: 13
    },
    tableHeader: {
        padding: 8,
        borderBottom: '2px solid #1976d2',
        fontWeight: 'bold',
        textAlign: 'center',
        backgroundColor: '#f5f5f5',
        position: 'sticky',
        top: 0
    },
    tableCell: {
        padding: 6,
        textAlign: 'center',
        borderBottom: '1px solid #eee'
    },
    emptyCell: {
        padding: 15,
        textAlign: 'center',
        color: '#666',
        fontSize: 13
    },
    addButton: {
        padding: '6px 12px',
        border: 'none',
        borderRadius: 6,
        backgroundColor: '#4caf50',
        color: '#fff',
        fontSize: 12,
        cursor: 'pointer'
    },
    formCard: {
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 12,
        marginBottom: 15,
        border: '1px solid #e0e0e0'
    },
    formTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1976d2',
        marginBottom: 15,
        textAlign: 'center'
    },
    select: {
        width: '100%',
        padding: 8,
        marginBottom: 12,
        borderRadius: 6,
        border: '1px solid #ccc',
        fontSize: 14
    },
    input: {
        width: '100%',
        padding: 8,
        marginBottom: 12,
        borderRadius: 6,
        border: '1px solid #ccc',
        fontSize: 14
    },
    textarea: {
        width: '100%',
        padding: 8,
        marginBottom: 12,
        borderRadius: 6,
        border: '1px solid #ccc',
        fontSize: 14,
        fontFamily: 'inherit'
    },
    dateRow: {
        display: 'flex',
        gap: 8,
        marginBottom: 12
    },
    dateField: {
        flex: 1
    },
    timeRow: {
        display: 'flex',
        gap: 8,
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
        padding: 10,
        border: 'none',
        borderRadius: 6,
        backgroundColor: '#1976d2',
        color: '#fff',
        fontSize: 14,
        cursor: 'pointer'
    },
    requestsList: {
        maxHeight: 350,
        overflowY: 'auto'
    },
    requestCard: {
        padding: 12,
        border: '1px solid #e0e0e0',
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: '#fff',
        fontSize: 13
    },
    requestHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6
    },
    requestType: {
        fontWeight: 'bold',
        fontSize: 14
    },
    statusBadge: {
        padding: '3px 6px',
        borderRadius: 4,
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold'
    },
    requestDates: {
        margin: '4px 0',
        color: '#555'
    },
    requestReason: {
        margin: '4px 0',
        color: '#666',
        fontSize: 12
    },
    requestFooter: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 6
    },
    requestDate: {
        fontSize: 11,
        color: '#999'
    },
    deleteButton: {
        padding: '4px 8px',
        border: 'none',
        borderRadius: 4,
        backgroundColor: '#ff4444',
        color: 'white',
        fontSize: 11,
        cursor: 'pointer'
    },
    noData: {
        textAlign: 'center',
        color: '#666',
        padding: 30,
        fontSize: 13
    },
    correctionTimes: {
        backgroundColor: '#f1f8e9',
        padding: 6,
        borderRadius: 4,
        margin: '4px 0',
        fontSize: 12,
        color: '#2e7d32'
    },
    balanceCard: {
        backgroundColor: '#e8f5e8',
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
        border: '1px solid #c8e6c9'
    },
    balanceTitle: {
        margin: 0,
        fontSize: 16,
        color: '#2e7d32',
        textAlign: 'center'
    },
    balanceMessage: {
        fontSize: 12,
        color: '#1976d2',
        textAlign: 'center',
        marginTop: 5,
        marginBottom: 10
    },
    balanceRow: {
        display: 'flex',
        justifyContent: 'space-around',
        marginTop: 10
    },
    balanceItem: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 5
    },
    balanceLabel: {
        fontSize: 12,
        color: '#666'
    },
    balanceValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333'
    },
    balanceDivider: {
        margin: '15px 0',
        border: '0',
        borderTop: '1px dashed #4caf50'
    },
    emergencyRow: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '5px 0'
    },
    emergencyItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    emergencyLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#ff9800'
    },
    emergencyValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ff9800'
    },
    emergencyProgress: {
        height: 8,
        backgroundColor: '#e0e0e0',
        borderRadius: 4,
        overflow: 'hidden'
    },
    emergencyProgressBar: {
        height: '100%',
        backgroundColor: '#ff9800',
        transition: 'width 0.3s ease'
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