import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// دالة حساب الرصيد بناءً على تاريخ التعيين
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const employee_id = searchParams.get("employee_id")
        const target_date = searchParams.get("target_date") || new Date().toISOString().split('T')[0]

        if (!employee_id) {
            return NextResponse.json({ error: "معرف الموظف مطلوب" }, { status: 400 })
        }

        // جلب بيانات الموظف
        const { data: employee, error: empError } = await supabase
            .from("employees")
            .select("hire_date, used_leave_days")
            .eq("id", employee_id)
            .single()

        if (empError || !employee) {
            return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 })
        }

        if (!employee.hire_date) {
            return NextResponse.json({
                error: "تاريخ التعيين غير مسجل لهذا الموظف",
                annual: 21, // قيمة افتراضية
                emergency: 7
            }, { status: 400 })
        }

        // حساب مدة الخدمة بالسنوات
        const hireDate = new Date(employee.hire_date)
        const targetDate = new Date(target_date)

        const yearsOfService = calculateYearsOfService(hireDate, targetDate)

        // حساب رصيد الإجازات حسب مدة الخدمة
        let annualLeave = 0
        let emergencyLeave = 7 // الإجازة العارضة ثابتة 7 أيام للكل

        if (yearsOfService < 1) {
            // أقل من سنة: يحسب بالأشهر
            annualLeave = calculateProportionalLeave(hireDate, targetDate, 8)
        } else if (yearsOfService >= 1 && yearsOfService < 10) {
            annualLeave = 14
        } else {
            annualLeave = 23
        }

        // حساب الرصيد المتبقي
        const usedDays = employee.used_leave_days || 0
        const remainingAnnual = Math.max(0, annualLeave - usedDays)

        return NextResponse.json({
            employee_id,
            hire_date: employee.hire_date,
            years_of_service: yearsOfService.toFixed(2),
            annual_leave_total: annualLeave,
            emergency_leave_total: emergencyLeave,
            used_days: usedDays,
            remaining_annual: remainingAnnual,
            remaining_emergency: emergencyLeave, // الإجازة العارضة لسه مش متتبعة
            message: getServiceMessage(yearsOfService)
        })

    } catch (error) {
        console.error("خطأ في حساب الرصيد:", error)
        return NextResponse.json({ error: "حدث خطأ أثناء حساب الرصيد" }, { status: 500 })
    }
}

// حساب عدد سنوات الخدمة
function calculateYearsOfService(hireDate: Date, targetDate: Date): number {
    const diffTime = Math.abs(targetDate.getTime() - hireDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays / 365
}

// حساب الرصيد النسبي (لمن لم يكمل سنة)
function calculateProportionalLeave(hireDate: Date, targetDate: Date, fullYearDays: number): number {
    // حساب عدد الأيام من تاريخ التعيين حتى نهاية السنة أو التاريخ المستهدف
    const endOfYear = new Date(targetDate.getFullYear(), 11, 31)
    const daysWorked = Math.ceil((endOfYear.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24))
    const totalYearDays = 365

    // الرصيد = (أيام العمل / 365) * الرصيد الكامل
    const proportionalDays = (daysWorked / totalYearDays) * fullYearDays

    // تقريب لأقرب 0.5 يوم
    return Math.round(proportionalDays * 2) / 2
}

// رسالة توضيحية حسب مدة الخدمة
function getServiceMessage(years: number): string {
    if (years < 1) {
        return "أقل من سنة - يتم احتساب الرصيد نسبياً حسب تاريخ التعيين"
    } else if (years >= 1 && years < 10) {
        return "من سنة إلى 10 سنوات - رصيدك 14 يوم إجازة سنوية"
    } else {
        return "أكثر من 10 سنوات - رصيدك 23 يوم إجازة سنوية"
    }
}