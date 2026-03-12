import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function calculateYearsOfService(hireDate: Date, targetDate: Date): number {
    const diffTime = Math.abs(targetDate.getTime() - hireDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays / 365
}

function calculateProportionalLeave(hireDate: Date, targetDate: Date, fullYearDays: number): number {
    const endOfYear = new Date(targetDate.getFullYear(), 11, 31)
    const daysWorked = Math.ceil((endOfYear.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24))
    const totalYearDays = 365
    const proportionalDays = (daysWorked / totalYearDays) * fullYearDays
    return Math.round(proportionalDays * 2) / 2
}

function getServiceMessage(years: number): { ar: string, en: string } {
    if (years < 1) {
        return {
            ar: "أقل من سنة - يتم احتساب الرصيد نسبياً حسب تاريخ التعيين",
            en: "Less than 1 year - Leave balance is calculated proportionally based on hire date"
        }
    } else if (years >= 1 && years < 10) {
        return {
            ar: "من سنة إلى 10 سنوات - رصيدك 14 يوم إجازة سنوية",
            en: "1 to 10 years - You have 14 days annual leave"
        }
    } else {
        return {
            ar: "أكثر من 10 سنوات - رصيدك 23 يوم إجازة سنوية",
            en: "More than 10 years - You have 23 days annual leave"
        }
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const employee_id = searchParams.get("employee_id")
        const target_date = searchParams.get("target_date") || new Date().toISOString().split('T')[0]

        if (!employee_id) {
            return NextResponse.json({
                error_ar: "معرف الموظف مطلوب",
                error_en: "Employee ID is required"
            }, { status: 400 })
        }

        const { data: employee, error: empError } = await supabase
            .from("employees")
            .select("hire_date, used_leave_days")
            .eq("id", employee_id)
            .single()

        if (empError || !employee) {
            return NextResponse.json({
                error_ar: "الموظف غير موجود",
                error_en: "Employee not found"
            }, { status: 404 })
        }

        if (!employee.hire_date) {
            return NextResponse.json({
                error_ar: "تاريخ التعيين غير مسجل لهذا الموظف",
                error_en: "Hire date not recorded for this employee",
                annual: 21,
                emergency: 7
            }, { status: 400 })
        }

        const hireDate = new Date(employee.hire_date)
        const targetDate = new Date(target_date)

        const yearsOfService = calculateYearsOfService(hireDate, targetDate)

        let annualLeave = 0
        const emergencyLeave = 7

        if (yearsOfService < 1) {
            annualLeave = calculateProportionalLeave(hireDate, targetDate, 8)
        } else if (yearsOfService >= 1 && yearsOfService < 10) {
            annualLeave = 14
        } else {
            annualLeave = 23
        }

        const usedDays = employee.used_leave_days || 0
        const remainingAnnual = Math.max(0, annualLeave - usedDays)
        const message = getServiceMessage(yearsOfService)

        return NextResponse.json({
            employee_id,
            hire_date: employee.hire_date,
            years_of_service: yearsOfService.toFixed(2),
            annual_leave_total: annualLeave,
            emergency_leave_total: emergencyLeave,
            used_days: usedDays,
            remaining_annual: remainingAnnual,
            remaining_emergency: emergencyLeave,
            message_ar: message.ar,
            message_en: message.en
        })

    } catch (error) {
        return NextResponse.json({
            error_ar: "حدث خطأ أثناء حساب الرصيد",
            error_en: "Error calculating balance"
        }, { status: 500 })
    }
}