"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import "./login.css"

export default function Login() {
    const router = useRouter()
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [rememberMe, setRememberMe] = useState(false)
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    // تحميل البيانات المحفوظة عند فتح الصفحة
    useEffect(() => {
        const savedUsername = localStorage.getItem("remembered_username")
        const savedPassword = localStorage.getItem("remembered_password")

        if (savedUsername && savedPassword) {
            setUsername(savedUsername)
            setPassword(savedPassword)
            setRememberMe(true)
        }
    }, [])

    const handleLogin = async () => {
        if (!username || !password) {
            setError("املأ كل البيانات")
            return
        }

        setLoading(true)
        setError("")

        const { data, error: fetchError } = await supabase
            .from("employees")
            .select("*")
            .eq("username", username)
            .eq("password", password)
            .single()

        if (fetchError || !data) {
            setError("بيانات الدخول غير صحيحة")
            setLoading(false)
            return
        }

        // حفظ بيانات الجلسة الحالية
        localStorage.setItem("username", data.username)
        localStorage.setItem("role", data.role)
        localStorage.setItem("name", data.name)
        localStorage.setItem("employee_id", data.id)

        // حفظ بيانات "تذكرني" إذا تم الاختيار
        if (rememberMe) {
            localStorage.setItem("remembered_username", username)
            localStorage.setItem("remembered_password", password)
        } else {
            // مسح البيانات المحفوظة إذا لم يتم اختيار تذكرني
            localStorage.removeItem("remembered_username")
            localStorage.removeItem("remembered_password")
        }

        if (data.role === "admin") router.push("/admin")
        else if (data.role === "manager") router.push("/manager")
        else router.push("/employee")
    }

    return (
        <div className="login-page">
            <div className="login-box">
                <h2>تسجيل الدخول</h2>

                <input
                    type="text"
                    placeholder="اسم المستخدم"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    disabled={loading}
                />

                <input
                    type="password"
                    placeholder="كلمة المرور"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={loading}
                />

                <div style={styles.rememberContainer}>
                    <label style={styles.rememberLabel}>
                        <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={e => setRememberMe(e.target.checked)}
                            style={styles.checkbox}
                        />
                        <span style={styles.rememberText}>تذكرني</span>
                    </label>
                </div>

                <button onClick={handleLogin} disabled={loading}>
                    {loading ? "جاري تسجيل الدخول..." : "دخول"}
                </button>

                {error && <p className="error">{error}</p>}

                <div className="footer">
                    &copy; 2026 Khaled Aboellil. جميع الحقوق محفوظة.
                </div>
            </div>
        </div>
    )
}

// أنماط إضافية للتذكرني
const styles = {
    rememberContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        margin: '10px 0',
        direction: 'rtl' as const
    },
    rememberLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer'
    },
    checkbox: {
        width: '18px',
        height: '18px',
        cursor: 'pointer'
    },
    rememberText: {
        fontSize: '14px',
        color: '#333'
    }
}