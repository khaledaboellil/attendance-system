import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
    try {
        const { employee_id, current_password, new_password, confirm_password } = await req.json()

        if (!employee_id || !current_password || !new_password || !confirm_password) {
            return NextResponse.json({
                error_ar: "جميع الحقول مطلوبة",
                error_en: "All fields are required"
            }, { status: 400 })
        }

        if (new_password !== confirm_password) {
            return NextResponse.json({
                error_ar: "كلمة المرور الجديدة غير متطابقة",
                error_en: "New passwords do not match"
            }, { status: 400 })
        }

        if (new_password.length < 3) {
            return NextResponse.json({
                error_ar: "كلمة المرور يجب أن تكون 3 أحرف على الأقل",
                error_en: "Password must be at least 3 characters"
            }, { status: 400 })
        }

        const { data: employee, error: fetchError } = await supabase
            .from("employees")
            .select("password")
            .eq("id", employee_id)
            .single()

        if (fetchError || !employee) {
            return NextResponse.json({
                error_ar: "الموظف غير موجود",
                error_en: "Employee not found"
            }, { status: 404 })
        }

        if (employee.password !== current_password) {
            return NextResponse.json({
                error_ar: "كلمة المرور الحالية غير صحيحة",
                error_en: "Current password is incorrect"
            }, { status: 400 })
        }

        const { error: updateError } = await supabase
            .from("employees")
            .update({ password: new_password })
            .eq("id", employee_id)

        if (updateError) {
            return NextResponse.json({
                error_ar: "حدث خطأ أثناء تحديث كلمة المرور",
                error_en: "Error updating password"
            }, { status: 500 })
        }

        return NextResponse.json({
            message_ar: "تم تغيير كلمة المرور بنجاح",
            message_en: "Password changed successfully"
        })

    } catch (error) {
        return NextResponse.json({
            error_ar: "حدث خطأ في الخادم",
            error_en: "Server error"
        }, { status: 500 })
    }
}