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
            return NextResponse.json({ error: "معرف الموظف مطلوب" }, { status: 400 })
        }

        // جلب بيانات الموظف
        const { data: employee, error: empError } = await supabase
            .from("employees")
            .select("total_leave_days, used_leave_days, name")
            .eq("id", employee_id)
            .single()

        if (empError || !employee) {
            return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 })
        }

        const total = employee.total_leave_days || 21
        const used = employee.used_leave_days || 0
        const remaining = total - used

        return NextResponse.json({
            employee_name: employee.name,
            total,
            used,
            remaining
        })
    } catch {
        return NextResponse.json({ error: "حدث خطأ أثناء جلب الرصيد" }, { status: 500 })
    }
}