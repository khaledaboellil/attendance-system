import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const employee_id = searchParams.get("employee_id")

        if (!employee_id) {
            return NextResponse.json({
                error_ar: "معرف الموظف مطلوب",
                error_en: "Employee ID is required"
            }, { status: 400 })
        }

        // جلب بيانات الموظف
        const { data: employee, error: empError } = await supabase
            .from("employees")
            .select("total_leave_days, used_leave_days, name")
            .eq("id", employee_id)
            .single()

        if (empError || !employee) {
            return NextResponse.json({
                error_ar: "الموظف غير موجود",
                error_en: "Employee not found"
            }, { status: 404 })
        }

        const total = employee.total_leave_days || 21
        const used = employee.used_leave_days || 0
        const remaining = total - used

        return NextResponse.json({
            employee_name: employee.name,
            total,
            used,
            remaining,
            message_ar: remaining > 0 ? `رصيدك المتبقي ${remaining} يوم` : `لقد استنفذت رصيد إجازاتك`,
            message_en: remaining > 0 ? `Your remaining balance is ${remaining} days` : `You have used all your leave balance`
        })

    } catch {
        return NextResponse.json({
            error_ar: "حدث خطأ أثناء جلب الرصيد",
            error_en: "Error fetching balance"
        }, { status: 500 })
    }
}