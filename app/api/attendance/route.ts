import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371000
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

//////////////////////////////////////////////////////
// GET - سجل الموظف أو تقرير الغياب للأدمن
//////////////////////////////////////////////////////

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const username = searchParams.get("username")
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    let type = searchParams.get("type")

    // دعم الروابط القديمة: إذا في username ومافي type → employee
    if (!type && username) type = "employee"
    if (!type) return NextResponse.json({ error: "type مطلوب" }, { status: 400 })

    const fromDate = from ? new Date(from) : null
    const toDate = to ? new Date(to) : null

    if (type === "employee") {
        if (!username) return NextResponse.json({ error: "username مطلوب" }, { status: 400 })

        const { data: emp } = await supabase
            .from("employees")
            .select("id")
            .eq("username", username)
            .single()
        if (!emp) return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 })

        let query = supabase
            .from("attendance")
            .select("*")
            .eq("employee_id", emp.id)

        if (fromDate) query = query.gte("day", fromDate.toISOString().split("T")[0])
        if (toDate) query = query.lte("day", toDate.toISOString().split("T")[0])

        const { data } = await query.order("day", { ascending: false })
        return NextResponse.json(data || [], { status: 200 })
    }

    if (type === "admin") {
        if (!fromDate || !toDate) return NextResponse.json({ error: "حدد from و to" }, { status: 400 })

        const { data: employees } = await supabase
            .from("employees")
            .select("id, name, username")
        if (!employees) return NextResponse.json([], { status: 200 })

        const results = []

        for (const emp of employees) {
            // كل الأيام بين from و to
            const days: string[] = []
            let d = new Date(fromDate)
            while (d <= toDate) {
                const day = d.getDay()
                // استثناء الجمعة (5) والسبت (6)
                if (day !== 5 && day !== 6) {
                    days.push(d.toISOString().split("T")[0])
                }
                d.setDate(d.getDate() + 1)
            }

            // جلب حضور الموظف في الفترة
            const { data: attendance } = await supabase
                .from("attendance")
                .select("day")
                .eq("employee_id", emp.id)
                .gte("day", fromDate.toISOString().split("T")[0])
                .lte("day", toDate.toISOString().split("T")[0])

            const attendedDays = attendance?.map(a => a.day) || []
            const missedDays = days.filter(d => !attendedDays.includes(d))

            results.push({
                employee: emp.name,
                username: emp.username,
                missedDays
            })
        }

        return NextResponse.json(results, { status: 200 })
    }

    return NextResponse.json({ error: "type غير صحيح" }, { status: 400 })
}

//////////////////////////////////////////////////////
// POST - تسجيل الحضور والانصراف
//////////////////////////////////////////////////////

export async function POST(req: NextRequest) {
    try {
        const { username, type, lat, lng } = await req.json()
        if (!username || !type || lat == null || lng == null)
            return NextResponse.json({ error: "املأ كل البيانات" }, { status: 400 })

        const { data: emp } = await supabase
            .from("employees")
            .select("id, locations")
            .eq("username", username)
            .single()
        if (!emp) return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 })

        const { data: allowedLocations } = await supabase
            .from("locations")
            .select("id, name, lat, lng")
            .in("id", emp.locations)
        if (!allowedLocations?.length)
            return NextResponse.json({ error: "لا توجد أماكن مسموحة" }, { status: 400 })

        const matchedLocation = allowedLocations.find(loc => getDistance(lat, lng, loc.lat, loc.lng) <= 100)
        if (!matchedLocation)
            return NextResponse.json({ error: "أنت خارج النطاق المسموح به" }, { status: 403 })

        const today = new Date().toISOString().split("T")[0]
        const locationText = `${matchedLocation.name} - (${lat}, ${lng})`

        if (type === "check_in") {
            const { data: existing } = await supabase
                .from("attendance")
                .select("*")
                .eq("employee_id", emp.id)
                .eq("day", today)
                .single()

            if (existing) return NextResponse.json({ message: "الحضور مسجل مسبقاً" })

            await supabase.from("attendance").insert([{
                employee_id: emp.id,
                day: today,
                check_in: new Date(),
                location: locationText
            }])
            return NextResponse.json({ message: "تم تسجيل الحضور" })
        }

        if (type === "check_out") {
            const { data: existing } = await supabase
                .from("attendance")
                .select("*")
                .eq("employee_id", emp.id)
                .eq("day", today)
                .single()

            if (!existing) return NextResponse.json({ error: "لم يتم تسجيل حضور اليوم" })
            if (existing.check_out) return NextResponse.json({ message: "الانصراف مسجل مسبقاً" })

            await supabase
                .from("attendance")
                .update({ check_out: new Date(), location: locationText })
                .eq("id", existing.id)
            return NextResponse.json({ message: "تم تسجيل الانصراف" })
        }

        return NextResponse.json({ error: "نوع غير صحيح" }, { status: 400 })
    } catch {
        return NextResponse.json({ error: "حدث خطأ" }, { status: 500 })
    }
}