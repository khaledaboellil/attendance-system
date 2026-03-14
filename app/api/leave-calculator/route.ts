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
            .select("current_year_leave_days, current_year_emergency_days, name, hire_date")
            .eq("id", employee_id)
            .single()

        if (empError || !employee) {
            return NextResponse.json({
                error_ar: "الموظف غير موجود",
                error_en: "Employee not found"
            }, { status: 404 })
        }

        // حساب الإجازات السنوية المستخدمة من الطلبات المعتمدة
        const { data: annualRequests } = await supabase
            .from("leave_requests")
            .select("start_date, end_date")
            .eq("employee_id", employee_id)
            .eq("leave_type", "سنوية")
            .eq("status", "تمت الموافقة")

        let usedAnnual = 0
        annualRequests?.forEach(req => {
            const s = new Date(req.start_date)
            const e = new Date(req.end_date)
            const d = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1
            usedAnnual += d
        })

        // حساب الإجازات العارضة المستخدمة من الطلبات المعتمدة
        const { data: emergencyRequests } = await supabase
            .from("leave_requests")
            .select("start_date, end_date")
            .eq("employee_id", employee_id)
            .eq("leave_type", "عارضة")
            .eq("status", "تمت الموافقة")

        let usedEmergency = 0
        emergencyRequests?.forEach(req => {
            const s = new Date(req.start_date)
            const e = new Date(req.end_date)
            const d = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1
            usedEmergency += d
        })

        const annualTotal = employee.current_year_leave_days
        const emergencyTotal = employee.current_year_emergency_days

        const remainingAnnual = employee.current_year_leave_days
        const remainingEmergency = employee.current_year_emergency_days

        return NextResponse.json({
            employee_id,
            employee_name: employee.name,
            hire_date: employee.hire_date || "",
            annual_total: annualTotal,
            emergency_total: emergencyTotal,
            used_annual: usedAnnual,
            used_emergency: usedEmergency,
            remaining_annual: remainingAnnual,
            remaining_emergency: remainingEmergency,
            message_ar: `رصيدك ${remainingAnnual} يوم إجازة سنوية و ${remainingEmergency} يوم إجازة عارضة`,
            message_en: `Your balance is ${remainingAnnual} annual leave days and ${remainingEmergency} emergency leave days`
        })

    } catch (error) {
        console.error("Error in leave-calculator:", error)
        return NextResponse.json({
            error_ar: "حدث خطأ أثناء حساب الرصيد",
            error_en: "Error calculating balance"
        }, { status: 500 })
    }
}