import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// دالة لجلب أيام العمل من الإعدادات
async function getWorkingDays() {
    const { data } = await supabase
        .from("system_settings")
        .select("working_days")
        .eq("id", 1)
        .single()

    return data?.working_days || ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']
}

// دالة لتحويل اسم اليوم إلى رقم (0 = Sunday, 1 = Monday, ...)
function getDayNumber(dayName: string): number {
    const days: { [key: string]: number } = {
        'Sunday': 0,
        'Monday': 1,
        'Tuesday': 2,
        'Wednesday': 3,
        'Thursday': 4,
        'Friday': 5,
        'Saturday': 6
    }
    return days[dayName] || 0
}

function getWorkingDaysList(from: string, to: string, workingDaysList: string[]) {
    const days: string[] = []
    const start = new Date(from)
    const end = new Date(to)

    // تحويل أسماء أيام العمل إلى أرقام
    const workingDayNumbers = workingDaysList.map(day => getDayNumber(day))

    while (start <= end) {
        const dayOfWeek = start.getDay() // 0 = Sunday, 1 = Monday, ...

        // إذا كان اليوم من ضمن أيام العمل المحددة
        if (workingDayNumbers.includes(dayOfWeek)) {
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

        if (!from || !to) {
            return NextResponse.json({
                error_ar: "يجب تحديد تاريخ البداية والنهاية",
                error_en: "From and to dates are required"
            }, { status: 400 })
        }

        // جلب أيام العمل من الإعدادات
        const workingDaysList = await getWorkingDays()
        const workingDays = getWorkingDaysList(from, to, workingDaysList)

        // جلب الموظفين حسب الصلاحية
        let employeeQuery = supabase
            .from("employees")
            .select("id, name, username, department_id")
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
        if (department_id && department_id !== "all" && department_id !== "null") {
            employeeQuery = employeeQuery.eq("department_id", department_id)
        }

        const { data: employees } = await employeeQuery

        if (!employees?.length) {
            return NextResponse.json([])
        }

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
                // جلب اسم القسم
                const { data: dept } = await supabase
                    .from("departments")
                    .select("name")
                    .eq("id", emp.department_id)
                    .single()

                absences.push({
                    employee: emp.name,
                    username: emp.username,
                    department_name: dept?.name || "-",
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
                    employees:employee_id (name, username, department_id)
                `)
                .gte("day", from)
                .lte("day", to)
                .order("day", { ascending: false })

            return NextResponse.json(attendanceDetails || [])
        }

        return NextResponse.json(absences)
    } catch (error) {
        console.error(error)
        return NextResponse.json({
            error_ar: "حدث خطأ أثناء إنشاء التقرير",
            error_en: "Error generating report"
        }, { status: 500 })
    }
}