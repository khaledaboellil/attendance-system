"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useLanguage } from "@/context/LanguageContext"
import LanguageSwitcher from "@/components/LanguageSwitcher"
import "./login.css"

export default function Login() {
    const router = useRouter()
    const { t, dir } = useLanguage()
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [rememberMe, setRememberMe] = useState(false)
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const [checking, setChecking] = useState(true)

    // التحقق من وجود مستخدم متذكر عند تحميل الصفحة
    useEffect(() => {
        const checkRememberedUser = async () => {
            const rememberedUsername = localStorage.getItem("remembered_username")
            const rememberedPassword = localStorage.getItem("remembered_password")

            if (rememberedUsername && rememberedPassword) {
                setUsername(rememberedUsername)
                setPassword(rememberedPassword)
                setRememberMe(true)
                await autoLogin(rememberedUsername, rememberedPassword)
            }

            setChecking(false)
        }

        checkRememberedUser()
    }, [])

    // دالة تسجيل الدخول التلقائي
    const autoLogin = async (user: string, pass: string) => {
        setLoading(true)

        try {
            const { data, error: fetchError } = await supabase
                .from("employees")
                .select("*")
                .eq("username", user)
                .eq("password", pass)

            if (!fetchError && data && data.length === 1) {
                const userData = data[0]
                await completeLogin(userData, true)
            }
        } catch (err) {
            console.error("Auto login error:", err)
        } finally {
            setLoading(false)
        }
    }

    // دالة استكمال تسجيل الدخول
    const completeLogin = async (user: any, isAuto = false) => {
        // حفظ في localStorage
        localStorage.setItem("username", user.username)
        localStorage.setItem("role", user.role)
        localStorage.setItem("name", user.name)
        localStorage.setItem("employee_id", user.id)
        localStorage.setItem("job_title", user.job_title || t('employee'))

        // حفظ في cookies
        const maxAge = rememberMe ? 2592000 : 86400
        document.cookie = `role=${user.role}; path=/; max-age=${maxAge}`
        document.cookie = `employee_id=${user.id}; path=/; max-age=${maxAge}`

        // حفظ بيانات التذكر
        if (rememberMe) {
            localStorage.setItem("remembered_username", user.username)
            localStorage.setItem("remembered_password", password)
            document.cookie = `remembered=true; path=/; max-age=${maxAge}`
        }

        // التوجيه
        if (user.role === "admin") router.push("/admin")
        else if (user.role === "manager") router.push("/manager")
        else router.push("/employee")
    }

    // دالة تسجيل الدخول اليدوي
    const handleLogin = async () => {
        if (!username || !password) {
            setError(t('error'))
            return
        }

        setLoading(true)
        setError("")

        try {
            const { data, error: fetchError } = await supabase
                .from("employees")
                .select("*")
                .eq("username", username)
                .eq("password", password)

            if (fetchError) {
                setError(t('error'))
                setLoading(false)
                return
            }

            if (!data || data.length === 0) {
                setError(t('invalid_credentials'))
                setLoading(false)
                return
            }

            await completeLogin(data[0], false)

        } catch (err) {
            console.error("Login error:", err)
            setError(t('error'))
            setLoading(false)
        }
    }

    if (checking) {
        return (
            <div className="login-page" dir={dir}>
                <div className="login-box">
                    <h2>{t('login')}</h2>
                    <p style={{ textAlign: "center" }}>{t('checking')}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="login-page" dir={dir}>
            <div className="login-box">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                    <LanguageSwitcher />
                </div>

                <h2>{t('login')}</h2>

                <input
                    type="text"
                    placeholder={t('username')}
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    disabled={loading}
                />

                <input
                    type="password"
                    placeholder={t('password')}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={loading}
                />

                <div className="remember-container">
                    <label className="remember-label">
                        <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={e => setRememberMe(e.target.checked)}
                        />
                        <span>{t('remember_me')}</span>
                    </label>
                </div>

                <button onClick={handleLogin} disabled={loading}>
                    {loading ? t('loading') : t('login_button')}
                </button>

                {error && <p className="error">{error}</p>}

                <div className="footer">
                    &copy; 2026 Khaled Aboellil. {t('footer')}
                </div>
            </div>
        </div>
    )
}