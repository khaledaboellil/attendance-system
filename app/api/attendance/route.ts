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

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const username = searchParams.get("username")
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    let type = searchParams.get("type")

    if (!type && username) type = "employee"
    if (!type) {
        return NextResponse.json({
            error_ar: "نوع الطلب مطلوب",
            error_en: "Request type is required"
        }, { status: 400 })
    }

    const fromDate = from ? new Date(from) : null
    const toDate = to ? new Date(to) : null

    if (type === "employee") {
        if (!username) {
            return NextResponse.json({
                error_ar: "اسم المستخدم مطلوب",
                error_en: "Username is required"
            }, { status: 400 })
        }

        const { data: emp } = await supabase
            .from("employees")
            .select("id")
            .eq("username", username)
            .single()

        if (!emp) {
            return NextResponse.json({
                error_ar: "الموظف غير موجود",
                error_en: "Employee not found"
            }, { status: 404 })
        }

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
        if (!fromDate || !toDate) {
            return NextResponse.json({
                error_ar: "حدد تاريخ البداية والنهاية",
                error_en: "Please select from and to dates"
            }, { status: 400 })
        }

        const { data: employees } = await supabase
            .from("employees")
            .select("id, name, username")

        if (!employees) return NextResponse.json([], { status: 200 })

        const results = []
        for (const emp of employees) {
            const days: string[] = []
            let d = new Date(fromDate)
            while (d <= toDate) {
                const day = d.getDay()
                if (day !== 5 && day !== 6) {
                    days.push(d.toISOString().split("T")[0])
                }
                d.setDate(d.getDate() + 1)
            }

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

    return NextResponse.json({
        error_ar: "نوع الطلب غير صحيح",
        error_en: "Invalid request type"
    }, { status: 400 })
}

export async function POST(req: NextRequest) {
    try {
        const { username, type, lat, lng } = await req.json()

        if (!username || !type || lat == null || lng == null) {
            return NextResponse.json({
                error_ar: "جميع الحقول مطلوبة",
                error_en: "All fields are required"
            }, { status: 400 })
        }

        const { data: emp } = await supabase
            .from("employees")
            .select("id, locations")
            .eq("username", username)
            .single()

        if (!emp) {
            return NextResponse.json({
                error_ar: "الموظف غير موجود",
                error_en: "Employee not found"
            }, { status: 404 })
        }

        const { data: allowedLocations } = await supabase
            .from("locations")
            .select("id, name, lat, lng")
            .in("id", emp.locations)

        if (!allowedLocations?.length) {
            return NextResponse.json({
                error_ar: "لا توجد أماكن مسموحة لهذا الموظف",
                error_en: "No allowed locations for this employee"
            }, { status: 400 })
        }

        const matchedLocation = allowedLocations.find(loc => getDistance(lat, lng, loc.lat, loc.lng) <= 100)
        if (!matchedLocation) {
            return NextResponse.json({
                error_ar: "أنت خارج النطاق المسموح به",
                error_en: "You are outside the allowed range"
            }, { status: 403 })
        }

        const today = new Date().toISOString().split("T")[0]
        const locationText = `${matchedLocation.name} - (${lat}, ${lng})`

        if (type === "check_in") {
            const { data: existing } = await supabase
                .from("attendance")
                .select("*")
                .eq("employee_id", emp.id)
                .eq("day", today)
                .single()

            if (existing) {
                return NextResponse.json({
                    message_ar: "تم تسجيل الحضور مسبقاً",
                    message_en: "Check-in already recorded"
                })
            }

            await supabase.from("attendance").insert([{
                employee_id: emp.id,
                day: today,
                check_in: new Date(),
                location: locationText
            }])

            return NextResponse.json({
                message_ar: "تم تسجيل الحضور بنجاح",
                message_en: "Check-in recorded successfully"
            })
        }

        if (type === "check_out") {
            const { data: existing } = await supabase
                .from("attendance")
                .select("*")
                .eq("employee_id", emp.id)
                .eq("day", today)
                .single()

            if (!existing) {
                return NextResponse.json({
                    error_ar: "لم يتم تسجيل حضور اليوم",
                    error_en: "No check-in recorded for today"
                }, { status: 400 })
            }

            if (existing.check_out) {
                return NextResponse.json({
                    message_ar: "تم تسجيل الانصراف مسبقاً",
                    message_en: "Check-out already recorded"
                })
            }

            await supabase
                .from("attendance")
                .update({ check_out: new Date(), location: locationText })
                .eq("id", existing.id)

            return NextResponse.json({
                message_ar: "تم تسجيل الانصراف بنجاح",
                message_en: "Check-out recorded successfully"
            })
        }

        return NextResponse.json({
            error_ar: "نوع العملية غير صحيح",
            error_en: "Invalid operation type"
        }, { status: 400 })

    } catch {
        return NextResponse.json({
            error_ar: "حدث خطأ في الخادم",
            error_en: "Server error occurred"
        }, { status: 500 })
    }
}