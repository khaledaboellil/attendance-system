"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

import "./login.css"

export default function LoginPage() {
    const router = useRouter()
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [remember, setRemember] = useState(false)
    const [error, setError] = useState("")
    const [checked, setChecked] = useState(false)

    useEffect(() => {
        const lastUser = localStorage.getItem("username")
        const role = localStorage.getItem("role")

        if (lastUser && role) {
            if (role === "admin") router.replace("/admin")
            else router.replace("/employee")
        }

        setChecked(true)
    }, [router])

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

        if (remember) {
            document.cookie = `username=${data.username}; path=/; max-age=${60 * 60 * 24 * 30}`
            document.cookie = `role=${data.role}; path=/; max-age=${60 * 60 * 24 * 30}`
        } else {
            document.cookie = `username=${data.username}; path=/`
            document.cookie = `role=${data.role}; path=/`
        }

        if (data.role === "admin") router.push("/admin")
        else router.push("/employee")
    }

    if (!checked) return null

    return (
        <div className="login-page">
            

            <div className="login-box">
                <h2>تسجيل الدخول</h2>

                {error && <p className="error">{error}</p>}

                <input
                    type="text"
                    placeholder="اسم المستخدم"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />

                <input
                    type="password"
                    placeholder="كلمة المرور"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <label>
                    <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                    />
                    تذكرني
                </label>

                <button onClick={handleLogin}>دخول</button>

                <div className="footer">
                    &copy; Khaled Aboellil 2026
                </div>
            </div>
        </div>
    )
}