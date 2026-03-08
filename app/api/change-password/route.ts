import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
    try {
        const { employee_id, current_password, new_password, confirm_password } = await req.json()

        // التحقق من المدخلات
        if (!employee_id || !current_password || !new_password || !confirm_password) {
            return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 })
        }

        if (new_password !== confirm_password) {
            return NextResponse.json({ error: "كلمة المرور الجديدة غير متطابقة" }, { status: 400 })
        }

        if (new_password.length < 3) {
            return NextResponse.json({ error: "كلمة المرور يجب أن تكون 3 أحرف على الأقل" }, { status: 400 })
        }

        // جلب بيانات الموظف
        const { data: employee, error: fetchError } = await supabase
            .from("employees")
            .select("password")
            .eq("id", employee_id)
            .single()

        if (fetchError || !employee) {
            return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 })
        }

        // التحقق من كلمة المرور الحالية
        if (employee.password !== current_password) {
            return NextResponse.json({ error: "كلمة المرور الحالية غير صحيحة" }, { status: 400 })
        }

        // تحديث كلمة المرور
        const { error: updateError } = await supabase
            .from("employees")
            .update({ password: new_password })
            .eq("id", employee_id)

        if (updateError) {
            console.error("خطأ في تحديث كلمة المرور:", updateError)
            return NextResponse.json({ error: "حدث خطأ أثناء تحديث كلمة المرور" }, { status: 500 })
        }

        // لو المستخدم مختار "تذكرني"، نحدث الباسورد في localStorage كمان
        // (ده هيتعمل في الصفحة نفسها مش هنا)

        return NextResponse.json({
            message: "✅ تم تغيير كلمة المرور بنجاح"
        })

    } catch (error) {
        console.error("خطأ غير متوقع:", error)
        return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 })
    }
}