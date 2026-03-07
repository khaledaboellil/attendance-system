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
    const [managedDepts, setManagedDepts] = useState<number[]>([])
    const [managedDeptsNames, setManagedDeptsNames] = useState<string>("")

    // ==================== التبويبات ====================
    const [activeTab, setActiveTab] = useState<"requests" | "attendance" | "myRequests">("requests")

    // ==================== بيانات الطلبات (للموافقة) ====================
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
    const [selectedDepartment, setSelectedDepartment] = useState<string>("all")
    const [departments, setDepartments] = useState<Department[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending")

    // ==================== طلبات المدير الشخصية ====================
    const [myLeaveRequests, setMyLeaveRequests] = useState<LeaveRequest[]>([])
    const [showMyLeaveForm, setShowMyLeaveForm] = useState(false)
    const [myLeaveType, setMyLeaveType] = useState("سنوية")
    const [myLeaveStart, setMyLeaveStart] = useState("")
    const [myLeaveEnd, setMyLeaveEnd] = useState("")
    const [myLeaveReason, setMyLeaveReason] = useState("")

    // ==================== الحضور (للمدير نفسه) ====================
    const [todayAttendance, setTodayAttendance] = useState<any>(null)
    const [attendanceHistory, setAttendanceHistory] = useState<any[]>([])
    const [currentPos, setCurrentPos] = useState<{ lat: number, lng: number }>({ lat: 0, lng: 0 })
    const [loadingPos, setLoadingPos] = useState(true)
    const [attendanceFrom, setAttendanceFrom] = useState("")
    const [attendanceTo, setAttendanceTo] = useState("")

    // ==================== رصيد الإجازات ====================
    const [leaveBalance, setLeaveBalance] = useState({ total: 21, used: 0, remaining: 21 })

    // =============================================
    // useEffect لتحميل البيانات
    // =============================================
    useEffect(() => {
        const storedName = localStorage.getItem("name")
        const storedUsername = localStorage.getItem("username")
        const storedId = localStorage.getItem("employee_id")
        const storedRole = localStorage.getItem("role")

        if (!storedName || !storedId || storedRole !== "manager") {
            alert("غير مصرح بالدخول")
            router.push("/")
            return
        }

        setManagerName(storedName)
        setManagerUsername(storedUsername || "")
        setManagerId(storedId)

        fetchManagedDepartments(storedId)
        fetchMyLeaveRequests(storedId)
        fetchLeaveBalance(storedId)
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
    const fetchManagedDepartments = async (managerId: string) => {
        try {
            setLoading(true)

            // جلب الأقسام التي يديرها هذا المدير
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

                // جلب أسماء الأقسام
                const deptsRes = await fetch("/api/departments")
                if (deptsRes.ok) {
                    const allDepts = await deptsRes.json()
                    const myDepts = allDepts.filter((d: any) => deptIds.includes(d.id))
                    setDepartments(myDepts)

                    const deptNames = myDepts.map((d: any) => d.name).join("، ")
                    setManagedDeptsNames(deptNames)

                    // جلب الطلبات الخاصة بهذه الأقسام
                    fetchLeaveRequests(deptIds, "pending")
                }
            }
        } catch (err) {
            console.error(err)
            setLoading(false)
        }
    }

    const fetchLeaveRequests = async (deptIds: number[], statusFilter: string = "pending") => {
        try {
            let url = "/api/leave-requests?user_role=manager"

            // إضافة أقسام المدير
            if (deptIds.length > 0) {
                url += `&department_ids=${deptIds.join(',')}`
            }

            // إضافة فلتر الحالة
            if (statusFilter === "pending") {
                url += `&status=pending`
            } else if (statusFilter === "approved") {
                url += `&status=approved`
            } else if (statusFilter === "rejected") {
                url += `&status=rejected`
            }

            // إضافة فلتر القسم المحدد
            if (selectedDepartment && selectedDepartment !== "all") {
                url += `&department_id=${selectedDepartment}`
            }

            const res = await fetch(url)
            if (res.ok) {
                const data = await res.json()
                setLeaveRequests(data)
            }
        } catch (err) { console.error(err) }
        finally {
            setLoading(false)
        }
    }

    const fetchMyLeaveRequests = async (empId: string) => {
        try {
            const res = await fetch(`/api/leave-requests?employee_id=${empId}`)
            if (res.ok) {
                const data = await res.json()
                setMyLeaveRequests(data)
            }
        } catch (err) { console.error(err) }
    }

    const fetchLeaveBalance = async (empId: string) => {
        try {
            const res = await fetch(`/api/leave-balance?employee_id=${empId}`)
            if (res.ok) setLeaveBalance(await res.json())
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
                    approved_by: managerId,
                    user_role: "manager"
                })
            })
            const data = await res.json()
            alert(data.message || data.error)
            if (res.ok) {
                fetchLeaveRequests(managedDepts, filter)
            }
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
                    approved_by: managerId,
                    user_role: "manager"
                })
            })
            const data = await res.json()
            alert(data.message || data.error)
            if (res.ok) {
                fetchLeaveRequests(managedDepts, filter)
            }
        } catch (err) { console.error(err) }
    }

    // =============================================
    // دوال طلبات المدير الشخصية
    // =============================================
    const submitMyLeaveRequest = async () => {
        if (!myLeaveStart || !myLeaveEnd) return alert("حدد تاريخ البداية والنهاية")

        const res = await fetch("/api/leave-requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                employee_id: managerId,
                leave_type: myLeaveType,
                start_date: myLeaveStart,
                end_date: myLeaveEnd,
                reason: myLeaveReason
            })
        })

        const data = await res.json()
        alert(data.message || data.error)
        if (res.ok) {
            setShowMyLeaveForm(false)
            setMyLeaveStart("")
            setMyLeaveEnd("")
            setMyLeaveReason("")
            fetchMyLeaveRequests(managerId)
            fetchLeaveBalance(managerId)
        }
    }

    const deleteMyLeaveRequest = async (id: string) => {
        if (!confirm("هل أنت متأكد من حذف هذا الطلب؟")) return

        try {
            const res = await fetch(`/api/leave-requests?id=${id}&employee_id=${managerId}`, {
                method: "DELETE"
            })
            const data = await res.json()
            alert(data.message || data.error)
            if (res.ok) {
                fetchMyLeaveRequests(managerId)
                fetchLeaveBalance(managerId)
            }
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
        fetchLeaveRequests(managedDepts, newFilter)
    }

    const handleDepartmentChange = (deptId: string) => {
        setSelectedDepartment(deptId)
        if (deptId === "all") {
            fetchLeaveRequests(managedDepts, filter)
        } else {
            fetchLeaveRequests([Number(deptId)], filter)
        }
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

    // دوال مساعدة
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("ar-EG")
    }

    const formatTime = (dateString: string | null) => {
        if (!dateString) return "-"
        return new Date(dateString).toLocaleTimeString()
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

    if (loading && activeTab === "requests") {
        return (
            <div style={styles.page}>
                <div style={styles.container}>
                    <p style={{ textAlign: 'center', padding: 40 }}>جاري تحميل البيانات...</p>
                </div>
            </div>
        )
    }

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                {/* رأس الصفحة */}
                <div style={styles.header}>
                    <h2 style={styles.title}>لوحة تحكم المدير</h2>
                    <button onClick={handleLogout} style={styles.logoutButton}>تسجيل خروج</button>
                </div>

                {/* اسم المدير والأقسام التي يديرها */}
                <div style={styles.welcomeCard}>
                    <p style={styles.welcomeText}>مرحباً {managerName}</p>
                    <p style={styles.deptText}>
                        الأقسام التي تديرها: <strong>{managedDeptsNames || "لا يوجد أقسام"}</strong>
                    </p>
                </div>

                {/* شريط التبويبات */}
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
                        onClick={() => setActiveTab("myRequests")}
                        style={{
                            ...styles.tabButton,
                            backgroundColor: activeTab === "myRequests" ? '#1976d2' : '#e0e0e0',
                            color: activeTab === "myRequests" ? 'white' : '#333',
                        }}
                    >
                        🏖️ طلباتي
                    </button>
                </div>

                {/* ========================================= */}
                {/* تبويب طلبات الموظفين */}
                {/* ========================================= */}
                {activeTab === "requests" && (
                    <div style={styles.tabContent}>
                        <h3 style={styles.sectionTitle}>طلبات إجازات الموظفين</h3>

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

                        {/* فلتر الأقسام (إذا كان يدير أكثر من قسم) */}
                        {departments.length > 1 && (
                            <div style={styles.filterSection}>
                                <label>القسم: </label>
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
                            </div>
                        )}

                        {/* جدول الطلبات */}
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
                                    {leaveRequests.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} style={styles.emptyCell}>
                                                لا توجد طلبات في الأقسام التابعة لك
                                            </td>
                                        </tr>
                                    ) : (
                                        leaveRequests.map(req => {
                                            const status = getApprovalStatus(req)
                                            const deptName = departments.find(d => d.id === req.employees?.department_id)?.name || "-"
                                            const canApprove = !req.manager_approved && req.status === "قيد الانتظار"

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
                                                        {canApprove && (
                                                            <>
                                                                <button
                                                                    onClick={() => approveRequest(req.id)}
                                                                    style={styles.approveButton}
                                                                    title="موافقة"
                                                                >
                                                                    ✓
                                                                </button>
                                                                <button
                                                                    onClick={() => rejectRequest(req.id)}
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
                {/* تبويب طلبات المدير الشخصية */}
                {/* ========================================= */}
                {activeTab === "myRequests" && (
                    <div style={styles.tabContent}>
                        <div style={styles.sectionHeader}>
                            <h3 style={styles.sectionTitle}>طلباتي الشخصية</h3>
                            <button onClick={() => setShowMyLeaveForm(!showMyLeaveForm)} style={styles.addButton}>
                                {showMyLeaveForm ? '❌ إلغاء' : '➕ طلب إجازة'}
                            </button>
                        </div>

                        {/* كرت رصيد الإجازات */}
                        <div style={styles.balanceCard}>
                            <h4 style={styles.balanceTitle}>رصيد الإجازات السنوية</h4>
                            <div style={styles.balanceRow}>
                                <div style={styles.balanceItem}>
                                    <span style={styles.balanceLabel}>إجمالي الرصيد</span>
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
                        </div>

                        {/* نموذج إضافة طلب إجازة */}
                        {showMyLeaveForm && (
                            <div style={styles.formCard}>
                                <h4 style={styles.formTitle}>طلب إجازة جديد</h4>

                                <select value={myLeaveType} onChange={e => setMyLeaveType(e.target.value)} style={styles.select}>
                                    <option value="سنوية">إجازة سنوية</option>
                                    <option value="مرضية">إجازة مرضية</option>
                                    <option value="عارضة">إجازة عارضة</option>
                                    <option value="غير مدفوعة">إجازة غير مدفوعة</option>
                                </select>

                                <div style={styles.dateRow}>
                                    <div style={styles.dateField}>
                                        <label>من:</label>
                                        <input type="date" value={myLeaveStart} onChange={e => setMyLeaveStart(e.target.value)} style={styles.dateInput} />
                                    </div>
                                    <div style={styles.dateField}>
                                        <label>إلى:</label>
                                        <input type="date" value={myLeaveEnd} onChange={e => setMyLeaveEnd(e.target.value)} style={styles.dateInput} />
                                    </div>
                                </div>

                                <textarea
                                    placeholder="السبب (اختياري)"
                                    value={myLeaveReason}
                                    onChange={e => setMyLeaveReason(e.target.value)}
                                    style={styles.textarea}
                                    rows={3}
                                />

                                <button onClick={submitMyLeaveRequest} style={styles.submitButton}>
                                    ✅ تقديم الطلب
                                </button>
                            </div>
                        )}

                        {/* قائمة طلباتي السابقة */}
                        <h4 style={styles.subTitle}>الطلبات السابقة</h4>
                        <div style={styles.requestsList}>
                            {myLeaveRequests.length === 0 && !showMyLeaveForm && (
                                <p style={styles.noData}>لا توجد طلبات سابقة</p>
                            )}
                            {myLeaveRequests.map(req => {
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
                                                    onClick={() => deleteMyLeaveRequest(req.id)}
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
    deptText: {
        fontSize: 14,
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
        padding: '10px 20px',
        border: 'none',
        cursor: 'pointer',
        borderRadius: '10px 10px 0 0',
        fontWeight: 'bold',
        fontSize: 16,
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
        transition: 'all 0.3s'
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
        minWidth: 200
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
        fontSize: 16,
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    rejectButton: {
        padding: '5px 10px',
        margin: '0 2px',
        border: 'none',
        borderRadius: 4,
        backgroundColor: '#f44336',
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
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
        marginBottom: 10,
        borderRadius: 6,
        border: '1px solid #ccc',
        fontSize: 14
    },
    textarea: {
        width: '100%',
        padding: 10,
        marginBottom: 10,
        borderRadius: 6,
        border: '1px solid #ccc',
        fontSize: 14,
        fontFamily: 'inherit'
    },
    dateRow: {
        display: 'flex',
        gap: 10,
        marginBottom: 15
    },
    dateField: {
        flex: 1
    },
    formCard: {
        backgroundColor: '#f8f9fa',
        padding: 20,
        borderRadius: 10,
        marginBottom: 20,
        border: '1px solid #e0e0e0'
    },
    submitButton: {
        width: '100%',
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
    requestsList: {
        maxHeight: 400,
        overflowY: 'auto'
    },
    requestCard: {
        padding: 15,
        border: '1px solid #e0e0e0',
        borderRadius: 10,
        marginBottom: 10,
        backgroundColor: '#fff'
    },
    requestHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    requestType: {
        fontWeight: 'bold',
        fontSize: 16
    },
    requestDates: {
        margin: '5px 0',
        color: '#555'
    },
    requestReason: {
        margin: '5px 0',
        color: '#666',
        fontSize: 14
    },
    requestFooter: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8
    },
    requestDate: {
        fontSize: 12,
        color: '#999'
    },
    deleteButton: {
        padding: '5px 10px',
        border: 'none',
        borderRadius: 4,
        backgroundColor: '#ff4444',
        color: 'white',
        fontSize: 12,
        cursor: 'pointer'
    },
    noData: {
        textAlign: 'center',
        color: '#666',
        padding: 40
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
    footer: {
        marginTop: 25,
        textAlign: 'center',
        color: '#000',
        fontSize: 12,
        borderTop: '1px solid #ccc',
        paddingTop: 15
    }
}