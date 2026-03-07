import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getWorkingDays(from: string, to: string) {
    const days: string[] = []
    const start = new Date(from)
    const end = new Date(to)

    while (start <= end) {
        const day = start.getDay()
        // استثناء الجمعة (5) والسبت (6)
        if (day !== 5 && day !== 6) {
            days.push(start.toISOString().split("T")[0])
        }
        start.setDate(start.getDate() + 1)
    }
    return days
}

export async function GET(req: NextRequest) {
    try {
        const from = req.nextUrl.searchParams.get("from")
        const to = req.nextUrl.searchParams.get("to")
        const department_id = req.nextUrl.searchParams.get("department_id")
        const user_role = req.nextUrl.searchParams.get("user_role")
        const user_id = req.nextUrl.searchParams.get("user_id")
        const type = req.nextUrl.searchParams.get("type") // attendance or absence

        if (!from || !to)
            return NextResponse.json({ error: "يجب تحديد from و to" }, { status: 400 })

        const workingDays = getWorkingDays(from, to)

        // جلب الموظفين حسب الصلاحية
        let employeeQuery = supabase
            .from("employees")
            .select("id, name, username")
            .eq("role", "employee")

        // لو المدير، يجيب موظفي قسمه بس
        if (user_role === "manager" && user_id) {
            const { data: manager } = await supabase
                .from("employees")
                .select("department_id")
                .eq("id", user_id)
                .single()

            if (manager?.department_id) {
                employeeQuery = employeeQuery.eq("department_id", manager.department_id)
            } else {
                return NextResponse.json([])
            }
        }

        // فلترة حسب القسم (لله الـ HR)
        if (department_id && department_id !== "all") {
            employeeQuery = employeeQuery.eq("department_id", department_id)
        }

        const { data: employees } = await employeeQuery

        if (!employees?.length)
            return NextResponse.json([])

        // جلب الحضور فى الفترة
        const { data: attendance } = await supabase
            .from("attendance")
            .select("employee_id, day")
            .gte("day", from)
            .lte("day", to)

        // جلب الإجازات المعتمدة في الفترة
        const { data: leaves } = await supabase
            .from("leave_requests")
            .select("employee_id, start_date, end_date")
            .eq("status", "تمت الموافقة")
            .or(`and(start_date.lte.${to},end_date.gte.${from})`)

        const absences: any[] = []

        for (const emp of employees) {
            const empDays = attendance
                ?.filter(a => a.employee_id === emp.id)
                .map(a => a.day) || []

            // جلب أيام الإجازات للموظف
            const empLeaves = leaves
                ?.filter(l => l.employee_id === emp.id)
                .flatMap(l => {
                    const days = []
                    let d = new Date(l.start_date)
                    const end = new Date(l.end_date)
                    while (d <= end) {
                        days.push(d.toISOString().split("T")[0])
                        d.setDate(d.getDate() + 1)
                    }
                    return days
                }) || []

            // الأيام الغائبة = أيام العمل - (أيام الحضور + أيام الإجازات)
            const missedDays = workingDays.filter(d =>
                !empDays.includes(d) && !empLeaves.includes(d)
            )

            if (missedDays.length > 0) {
                absences.push({
                    employee: emp.name,
                    username: emp.username,
                    missedDays
                })
            }
        }

        // لو النوع attendance، نجيب تفاصيل الحضور
        if (type === "attendance") {
            const { data: attendanceDetails } = await supabase
                .from("attendance")
                .select(`
                    *,
                    employees:employee_id (name, username)
                `)
                .gte("day", from)
                .lte("day", to)
                .order("day", { ascending: false })

            return NextResponse.json(attendanceDetails || [])
        }

        return NextResponse.json(absences)
    } catch {
        return NextResponse.json({ error: "حدث خطأ أثناء إنشاء التقرير" }, { status: 500 })
    }
}