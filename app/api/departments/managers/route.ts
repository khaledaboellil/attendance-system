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
                employees:manager_id (id, name, username, email, role),
                departments:department_id (id, name)
            `)

        if (department_id) query = query.eq("department_id", department_id)
        if (manager_id) query = query.eq("manager_id", manager_id)

        const { data, error } = await query

        if (error) {
            return NextResponse.json({
                error_ar: "خطأ في جلب مدراء الأقسام",
                error_en: "Error fetching department managers"
            }, { status: 500 })
        }

        return NextResponse.json(data || [])

    } catch (error) {
        return NextResponse.json({
            error_ar: "حدث خطأ أثناء جلب البيانات",
            error_en: "Error fetching data"
        }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const { manager_id, department_id } = await req.json()

        if (!manager_id || !department_id) {
            return NextResponse.json({
                error_ar: "معرف المدير والقسم مطلوب",
                error_en: "Manager ID and department ID are required"
            }, { status: 400 })
        }

        const { data: employee, error: empError } = await supabase
            .from("employees")
            .select("role, name")
            .eq("id", manager_id)
            .single()

        if (empError || !employee) {
            return NextResponse.json({
                error_ar: "الموظف غير موجود",
                error_en: "Employee not found"
            }, { status: 404 })
        }

        if (employee.role !== "manager" && employee.role !== "admin") {
            return NextResponse.json({
                error_ar: `هذا الموظف ليس مديراً (دوره: ${employee.role})`,
                error_en: `This employee is not a manager (role: ${employee.role})`
            }, { status: 400 })
        }

        const { data: existing, error: checkError } = await supabase
            .from("manager_departments")
            .select("id")
            .eq("manager_id", manager_id)
            .eq("department_id", department_id)
            .maybeSingle()

        if (existing) {
            return NextResponse.json({
                error_ar: "هذا المدير مضاف للقسم بالفعل",
                error_en: "This manager is already assigned to this department"
            }, { status: 400 })
        }

        const { data, error } = await supabase
            .from("manager_departments")
            .insert([{ manager_id, department_id }])
            .select(`
                id,
                manager_id,
                department_id,
                employees:manager_id (name, username, role),
                departments:department_id (name)
            `)
            .single()

        if (error) {
            return NextResponse.json({
                error_ar: error.message,
                error_en: error.message
            }, { status: 500 })
        }

        return NextResponse.json({
            message_ar: `تم إضافة ${employee.role === 'admin' ? 'الأدمن' : 'المدير'} للقسم بنجاح`,
            message_en: `${employee.role === 'admin' ? 'Admin' : 'Manager'} added to department successfully`,
            data
        })

    } catch (error) {
        return NextResponse.json({
            error_ar: "حدث خطأ أثناء إضافة المدير",
            error_en: "Error adding manager"
        }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get("id")

        if (!id) {
            return NextResponse.json({
                error_ar: "معرف العلاقة مطلوب",
                error_en: "Relation ID is required"
            }, { status: 400 })
        }

        const { error } = await supabase
            .from("manager_departments")
            .delete()
            .eq("id", id)

        if (error) {
            return NextResponse.json({
                error_ar: error.message,
                error_en: error.message
            }, { status: 500 })
        }

        return NextResponse.json({
            message_ar: "تم إزالة المدير من القسم بنجاح",
            message_en: "Manager removed from department successfully"
        })

    } catch (error) {
        return NextResponse.json({
            error_ar: "حدث خطأ أثناء إزالة المدير",
            error_en: "Error removing manager"
        }, { status: 500 })
    }
}