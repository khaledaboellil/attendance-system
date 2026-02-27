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
        const type = req.nextUrl.searchParams.get("type") // 👈 جديد

        if (!from || !to)
            return NextResponse.json({ error: "يجب تحديد from و to" }, { status: 400 })

        ////////////////////////////////////////////////////////
        // 🔹 1️⃣ تقرير الغياب (القديم)
        ////////////////////////////////////////////////////////
        if (!type || type === "absences") {

            const workingDays = getWorkingDays(from, to)

            const { data: employees } = await supabase
                .from("employees")
                .select("id, name, username")
                //.eq("role", "employee") // 👈 يستبعد الأدمن

            if (!employees?.length)
                return NextResponse.json([])

            const { data: attendance } = await supabase
                .from("attendance")
                .select("employee_id, day")
                .gte("day", from)
                .lte("day", to)

            const absences: any[] = []

            for (const emp of employees) {
                const empDays =
                    attendance
                        ?.filter(a => a.employee_id === emp.id)
                        .map(a => a.day) || []

                const missedDays = workingDays.filter(d => !empDays.includes(d))

                if (missedDays.length > 0) {
                    absences.push({
                        employee: emp.name,
                        username: emp.username,
                        missedDays
                    })
                }
            }

            return NextResponse.json(absences)
        }

        ////////////////////////////////////////////////////////
        // 🔹 2️⃣ تقرير الحضور والانصراف الجديد
        ////////////////////////////////////////////////////////
        if (type === "attendance") {

            const { data } = await supabase
                .from("attendance")
                .select(`
                    day,
                    check_in,
                    check_out,
                    location,
                    employees (
                        name,
                        username,
                        role
                    )
                `)
                .gte("day", from)
                .lte("day", to)
                .order("day", { ascending: false })

            return NextResponse.json(data || [])
        }

        return NextResponse.json({ error: "type غير صحيح" }, { status: 400 })

    } catch {
        return NextResponse.json(
            { error: "حدث خطأ أثناء إنشاء التقرير" },
            { status: 500 }
        )
    }
}