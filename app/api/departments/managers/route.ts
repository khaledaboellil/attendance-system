import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const department_id = searchParams.get("department_id")
        const manager_id = searchParams.get("manager_id")

        let query = supabase
            .from("manager_departments")
            .select(`
                id,
                manager_id,
                department_id,
                employees:manager_id (id, name, username, email),
                departments:department_id (id, name)
            `)

        if (department_id) {
            query = query.eq("department_id", department_id)
        }
        if (manager_id) {
            query = query.eq("manager_id", manager_id)
        }

        const { data, error } = await query

        if (error) {
            console.error("خطأ في جلب مدراء الأقسام:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data || [])
    } catch (error) {
        console.error("خطأ غير متوقع:", error)
        return NextResponse.json({ error: "حدث خطأ أثناء جلب البيانات" }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const { manager_id, department_id } = await req.json()

        if (!manager_id || !department_id) {
            return NextResponse.json({ error: "معرف المدير والقسم مطلوب" }, { status: 400 })
        }

        // التحقق من أن الموظف فعلاً مدير
        const { data: employee, error: empError } = await supabase
            .from("employees")
            .select("role")
            .eq("id", manager_id)
            .single()

        if (empError || !employee) {
            return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 })
        }

        if (employee.role !== "manager") {
            return NextResponse.json({ error: "هذا الموظف ليس مديراً" }, { status: 400 })
        }

        // التحقق من عدم وجود العلاقة مسبقاً
        const { data: existing, error: checkError } = await supabase
            .from("manager_departments")
            .select("id")
            .eq("manager_id", manager_id)
            .eq("department_id", department_id)
            .maybeSingle()

        if (checkError) {
            return NextResponse.json({ error: checkError.message }, { status: 500 })
        }

        if (existing) {
            return NextResponse.json({ error: "هذا المدير مضاف للقسم بالفعل" }, { status: 400 })
        }

        const { data, error } = await supabase
            .from("manager_departments")
            .insert([{ manager_id, department_id }])
            .select(`
                id,
                manager_id,
                department_id,
                employees:manager_id (name, username),
                departments:department_id (name)
            `)
            .single()

        if (error) {
            console.error("خطأ في إضافة مدير للقسم:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            message: "تم إضافة المدير للقسم بنجاح",
            data
        })
    } catch (error) {
        console.error("خطأ غير متوقع:", error)
        return NextResponse.json({ error: "حدث خطأ أثناء إضافة المدير" }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get("id")

        if (!id) {
            return NextResponse.json({ error: "معرف العلاقة مطلوب" }, { status: 400 })
        }

        const { error } = await supabase
            .from("manager_departments")
            .delete()
            .eq("id", id)

        if (error) {
            console.error("خطأ في إزالة المدير:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ message: "تم إزالة المدير من القسم بنجاح" })
    } catch (error) {
        console.error("خطأ غير متوقع:", error)
        return NextResponse.json({ error: "حدث خطأ أثناء إزالة المدير" }, { status: 500 })
    }
}