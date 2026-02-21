"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import "./login.css" // لو حبيت تعمل ملف خارجي

export default function Login() {
    const router = useRouter()
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")

    const handleLogin = async () => {
        if (!username || !password) {
            setError("املأ كل البيانات")
            return
        }

        const { data, error: fetchError } = await supabase
            .from("employees")
            .select("*")
            .eq("username", username)
            .eq("password", password)
            .single()

        if (fetchError || !data) {
            setError("بيانات الدخول غير صحيحة")
            return
        }

        localStorage.setItem("username", data.username)
        localStorage.setItem("role", data.role)
        localStorage.setItem("name", data.name)
        if (data.role === "admin") router.push("/admin")
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
                />

                <input
                    type="password"
                    placeholder="كلمة المرور"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />

                <button onClick={handleLogin}>دخول</button>

                {error && <p className="error">{error}</p>}

                <div className="footer">
                    &copy; 2026 Khaled Aboellil. جميع الحقوق محفوظة.
                </div>
            </div>
        </div>
    )
}