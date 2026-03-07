import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const from = searchParams.get("from")
        const to = searchParams.get("to")
        const employee_id = searchParams.get("employee_id")
        const department_id = searchParams.get("department_id")
        const user_role = searchParams.get("user_role")
        const user_id = searchParams.get("user_id")

        if (!from || !to) {
            return NextResponse.json({ error: "يجب تحديد تاريخ البداية والنهاية" }, { status: 400 })
        }

        let query = supabase
            .from("leave_requests")
            .select(`
                *,
                employees:employee_id (
                    id, 
                    name, 
                    department:departments(id, name)
                )
            `)
            .eq("status", "تمت الموافقة")
            .gte("start_date", from)
            .lte("end_date", to)

        // فلترة حسب الموظف
        if (employee_id && employee_id !== "all") {
            query = query.eq("employee_id", employee_id)
        }

        // فلترة حسب القسم
        if (department_id && department_id !== "all") {
            const { data: deptEmployees } = await supabase
                .from("employees")
                .select("id")
                .eq("department_id", department_id)

            const empIds = deptEmployees?.map(e => e.id) || []
            if (empIds.length > 0) {
                query = query.in("employee_id", empIds)
            } else {
                return NextResponse.json([])
            }
        }

        // لو المدير (manager) يشوف بس موظفي قسمه
        if (user_role === "manager" && user_id) {
            const { data: manager } = await supabase
                .from("employees")
                .select("department_id")
                .eq("id", user_id)
                .single()

            if (manager?.department_id) {
                const { data: deptEmployees } = await supabase
                    .from("employees")
                    .select("id")
                    .eq("department_id", manager.department_id)

                const empIds = deptEmployees?.map(e => e.id) || []
                if (empIds.length > 0) {
                    query = query.in("employee_id", empIds)
                } else {
                    return NextResponse.json([])
                }
            } else {
                return NextResponse.json([])
            }
        }

        const { data, error } = await query.order("start_date", { ascending: false })

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        // حساب عدد الأيام لكل طلب
        const formattedData = data?.map(item => {
            const start = new Date(item.start_date)
            const end = new Date(item.end_date)
            const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

            return {
                id: item.id,
                employee_id: item.employee_id,
                employee_name: item.employees?.name,
                department_id: item.employees?.department?.id,
                department_name: item.employees?.department?.name || "-",
                leave_type: item.leave_type,
                start_date: item.start_date,
                end_date: item.end_date,
                days,
                status: item.status,
                hr_approved: item.hr_approved,
                manager_approved: item.manager_approved
            }
        })

        return NextResponse.json(formattedData || [])
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: "حدث خطأ أثناء جلب التقرير" }, { status: 500 })
    }
}