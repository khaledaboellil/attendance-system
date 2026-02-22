"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

type Employee = {
    id: string
    name: string
    username: string
    role: string
}

type AbsenceReport = {
    employee: string
    username: string
    missedDays: string[]
}

export default function AdminPage() {
    const router = useRouter()
    const [employees, setEmployees] = useState<Employee[]>([])
    const [name, setName] = useState("")
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [role, setRole] = useState("employee")
    const [from, setFrom] = useState("")
    const [to, setTo] = useState("")
    const [absences, setAbsences] = useState<AbsenceReport[]>([])

    const fetchEmployees = async () => {
        const res = await fetch("/api/employees")
        if (res.ok) setEmployees(await res.json())
    }

    useEffect(() => { fetchEmployees() }, [])

    const addEmployee = async () => {
        if (!name || !username || !password) return alert("املأ كل البيانات")
        const res = await fetch("/api/employees", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, username, password, role })
        })
        const data = await res.json()
        if (res.ok) {
            alert("تم إضافة الموظف بنجاح")
            setName(""); setUsername(""); setPassword(""); setRole("employee")
            fetchEmployees()
        } else alert(data.error)
    }

    const updateEmployee = async (emp: Employee) => {
        const res = await fetch("/api/employees", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(emp)
        })
        const data = await res.json()
        if (res.ok) {
            alert("تم تعديل الموظف بنجاح")
            fetchEmployees()
        } else alert(data.error)
    }

    const deleteEmployee = async (id: string) => {
        if (!confirm("هل أنت متأكد من حذف الموظف؟")) return
        const res = await fetch("/api/employees", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id })
        })
        const data = await res.json()
        if (res.ok) {
            alert("تم حذف الموظف بنجاح")
            fetchEmployees()
        } else alert(data.error)
    }

    const fetchAbsences = async () => {
        if (!from || !to) return alert("حدد من وإلى")
        try {
            const res = await fetch(`/api/reports/absences?from=${from}&to=${to}`)
            if (res.ok) setAbsences(await res.json())
        } catch (err) { console.error(err) }
    }

    const handleLogout = () => {
        document.cookie = "username=; path=/; max-age=0"
        document.cookie = "role=; path=/; max-age=0"
        localStorage.removeItem("username")
        localStorage.removeItem("role")
        router.push("/")
    }

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={styles.title}>صفحة الأدمن</h2>
                    <button onClick={handleLogout} style={styles.logoutButton}>تسجيل خروج</button>
                </div>

                {/* إضافة موظف */}
                <div style={styles.section}>
                    <h3>إضافة موظف</h3>
                    <input placeholder="الاسم" value={name} onChange={e => setName(e.target.value)} style={styles.input} />
                    <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} style={styles.input} />
                    <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} />
                    <select value={role} onChange={e => setRole(e.target.value)} style={styles.select}>
                        <option value="employee">موظف</option>
                        <option value="admin">أدمن</option>
                    </select>
                    <button onClick={addEmployee} style={styles.button}>إضافة موظف</button>
                </div>

                <hr style={styles.hr} />

                {/* قائمة الموظفين */}
                <div style={styles.section}>
                    <h3>قائمة الموظفين</h3>
                    {employees.length === 0 && <p>لا يوجد موظفين</p>}
                    <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #ccc', borderRadius: 10 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f0f0f0' }}>
                                <tr>
                                    <th style={styles.tableHeader}>الاسم</th>
                                    <th style={styles.tableHeader}>Username</th>
                                    <th style={styles.tableHeader}>الدور</th>
                                    <th style={styles.tableHeader}>أوامر</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map(emp => (
                                    <tr key={emp.id} style={{ borderBottom: '1px solid #ccc' }}>
                                        <td style={styles.tableCell}>
                                            <input
                                                value={emp.name}
                                                onChange={e => setEmployees(employees.map(el => el.id === emp.id ? { ...el, name: e.target.value } : el))}
                                                style={{ width: '90%', padding: 4 }}
                                            />
                                        </td>
                                        <td style={styles.tableCell}>
                                            <input
                                                value={emp.username}
                                                onChange={e => setEmployees(employees.map(el => el.id === emp.id ? { ...el, username: e.target.value } : el))}
                                                style={{ width: '90%', padding: 4 }}
                                            />
                                        </td>
                                        <td style={styles.tableCell}>
                                            <select
                                                value={emp.role}
                                                onChange={e => setEmployees(employees.map(el => el.id === emp.id ? { ...el, role: e.target.value } : el))}
                                                style={{ width: '90%', padding: 4 }}
                                            >
                                                <option value="employee">موظف</option>
                                                <option value="admin">أدمن</option>
                                            </select>
                                        </td>
                                        <td style={styles.tableCell}>
                                            <button
                                                onClick={() => updateEmployee(emp)}
                                                style={{ ...styles.button, padding: '6px 10px', marginRight: 5, fontSize: 14 }}
                                            >
                                                تعديل
                                            </button>
                                            <button
                                                onClick={() => deleteEmployee(emp.id)}
                                                style={{ ...styles.button, padding: '6px 10px', backgroundColor: '#d32f2f', fontSize: 14 }}
                                            >
                                                حذف
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <hr style={styles.hr} />

                {/* تقرير الغياب */}
                <div style={styles.section}>
                    <h3>تقرير الغياب</h3>
                    <div style={{ marginBottom: 15 }}>
                        <label>من: </label>
                        <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={styles.dateInput} />
                        <label> إلى: </label>
                        <input type="date" value={to} onChange={e => setTo(e.target.value)} style={styles.dateInput} />
                        <button onClick={fetchAbsences} style={{ ...styles.button, marginLeft: 10 }}>عرض الغياب</button>
                    </div>
                    {absences.length === 0 && <p>لا توجد غيابات</p>}
                    {absences.map(rep => (
                        <div key={rep.username} style={styles.absenceBox}>
                            <b>{rep.employee} ({rep.username})</b>
                            <p>الأيام الغائبة: {rep.missedDays.join(", ")}</p>
                        </div>
                    ))}
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
        maxWidth: 900,
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
    section: { marginBottom: 30 },
    input: {
        width: 'calc(100% - 20px)',
        padding: 10,
        margin: '5px 0',
        borderRadius: 10,
        border: '1px solid #ccc',
        fontSize: 16,
        color: '#000'
    },
    select: {
        width: '100%',
        padding: 10,
        margin: '5px 0',
        borderRadius: 10,
        border: '1px solid #ccc',
        fontSize: 16,
        color: '#000'
    },
    button: {
        padding: 12,
        marginTop: 10,
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
    absenceBox: {
        padding: 10,
        border: '1px solid #ccc',
        borderRadius: 10,
        marginBottom: 10,
        backgroundColor: '#f7f7f7'
    },
    footer: {
        marginTop: 20,
        textAlign: 'center',
        color: '#000',
        fontSize: 14
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
    }
}