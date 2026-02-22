"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function EmployeePage() {
    const router = useRouter()
    const [employeeName, setEmployeeName] = useState("")
    const [employeeUsername, setEmployeeUsername] = useState("")
    const [todayAttendance, setTodayAttendance] = useState<any>(null)
    const [attendanceHistory, setAttendanceHistory] = useState<any[]>([])
    const [currentPos, setCurrentPos] = useState<{ lat: number, lng: number }>({ lat: 0, lng: 0 })
    const [loadingPos, setLoadingPos] = useState(true)

    const [from, setFrom] = useState("")
    const [to, setTo] = useState("")

    useEffect(() => {
        const storedUsername = localStorage.getItem("username")
        if (!storedUsername) {
            alert("يجب تسجيل الدخول أولاً")
            router.push("/")
            return
        }
        setEmployeeUsername(storedUsername)
        const storedName = localStorage.getItem("name")
        if (!storedName) {
            alert("يجب تسجيل الدخول أولاً")
            router.push("/")
            return
        }
        setEmployeeName(storedName)
        fetchTodayAttendance(storedUsername)

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => { setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLoadingPos(false) },
                () => { alert("لم نتمكن من الحصول على موقعك، تأكد من تفعيل GPS"); setLoadingPos(false) }
            )
        } else {
            alert("المتصفح لا يدعم GPS")
            setLoadingPos(false)
        }
    }, [])

    // جلب حضور اليوم
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

    // جلب سجل من-إلى (يتم فقط لو اخترت التواريخ)
    const fetchAttendanceHistory = async () => {
        if (!from || !to) return
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
            fetchAttendanceHistory()
        } catch (err) { console.error(err); alert("حدث خطأ أثناء الإرسال") }
    }

    const handleLogout = () => {
        document.cookie = "username=; path=/; max-age=0"
        document.cookie = "role=; path=/; max-age=0"
        localStorage.removeItem("username")
        localStorage.removeItem("role")
        localStorage.removeItem("name")
        router.push("/")
    }

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={styles.title}>صفحة الموظف</h2>
                    <button onClick={handleLogout} style={styles.logoutButton}>تسجيل خروج</button>
                </div>

                <p>مرحبا {employeeName}</p>

                {/* جدول اليوم */}
                <div style={styles.section}>
                    <h3>الحضور اليومي</h3>
                    <div style={{ marginBottom: 10 }}>
                        <button onClick={() => handleCheck("check_in")} style={styles.button}>تسجيل حضور</button>
                        <button onClick={() => handleCheck("check_out")} style={styles.button}>تسجيل انصراف</button>
                    </div>
                    <div style={{ maxHeight: 100, overflowY: 'auto', border: '1px solid #ccc', borderRadius: 10 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f0f0f0' }}>
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
                                        <td style={styles.tableCell}>{todayAttendance.check_in ? new Date(todayAttendance.check_in).toLocaleTimeString() : "-"}</td>
                                        <td style={styles.tableCell}>{todayAttendance.check_out ? new Date(todayAttendance.check_out).toLocaleTimeString() : "-"}</td>
                                    </tr>
                                ) : (
                                    <tr>
                                        <td colSpan={3} style={{ padding: 10, textAlign: 'center' }}>لم يتم تسجيل حضور اليوم بعد</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <hr style={styles.hr} />

                {/* جدول الفترة (يظهر بعد اختيار التواريخ) */}
                <div style={styles.section}>
                    <h3>سجل الحضور بالتواريخ</h3>
                    <div style={{ marginBottom: 15 }}>
                        <label>من: </label>
                        <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={styles.dateInput} />
                        <label> إلى: </label>
                        <input type="date" value={to} onChange={e => setTo(e.target.value)} style={styles.dateInput} />
                        <button onClick={fetchAttendanceHistory} style={{ ...styles.button, marginLeft: 10 }}>عرض</button>
                    </div>

                    {from && to && (
                        <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #ccc', borderRadius: 10 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f0f0f0' }}>
                                    <tr>
                                        <th style={styles.tableHeader}>اليوم</th>
                                        <th style={styles.tableHeader}>الحضور</th>
                                        <th style={styles.tableHeader}>الانصراف</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attendanceHistory.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} style={{ padding: 10, textAlign: 'center' }}>لا يوجد سجل</td>
                                        </tr>
                                    ) : (
                                        attendanceHistory.map(att => (
                                            <tr key={att.id} style={{ borderBottom: '1px solid #ccc' }}>
                                                <td style={styles.tableCell}>{att.day}</td>
                                                <td style={styles.tableCell}>{att.check_in ? new Date(att.check_in).toLocaleTimeString() : "-"}</td>
                                                <td style={styles.tableCell}>{att.check_out ? new Date(att.check_out).toLocaleTimeString() : "-"}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div style={styles.footer}>
                    &copy; 2026 Khaled Aboellil. جميع الحقوق محفوظة.
                </div>
            </div>
        </div>
    )
}

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
    title: { textAlign: 'center', color: '#0b3d91' },
    logoutButton: {
        padding: '8px 15px',
        border: 'none',
        borderRadius: 10,
        backgroundColor: '#d32f2f',
        color: '#fff',
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    button: {
        padding: 12,
        margin: 5,
        border: 'none',
        borderRadius: 10,
        backgroundColor: '#0b3d91',
        color: '#fff',
        fontSize: 16,
        cursor: 'pointer'
    },
    hr: { margin: '30px 0', border: '0', borderTop: '1px solid #ccc' },
    dateInput: {
        padding: 8,
        borderRadius: 10,
        border: '1px solid #ccc',
        fontSize: 16,
        margin: '0 5px'
    },
    tableHeader: {
        padding: 8,
        borderBottom: '1px solid #ccc',
        fontWeight: 'bold',
        textAlign: 'left'
    },
    tableCell: {
        padding: 8,
        textAlign: 'left'
    },
    section: { marginBottom: 30 },
    absenceBox: { padding: 10, border: '1px solid #ccc', borderRadius: 10, marginTop: 10, backgroundColor: '#f7f7f7' },
    footer: {
        marginTop: 20,
        textAlign: 'center',
        color: '#000',
        fontSize: 14
    }
}