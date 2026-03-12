import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
    try {
        const { data, error } = await supabase
            .from("employees")
            .select("id, name, username, role, email, phone, job_title, department_id, hire_date")
            .order("name", { ascending: true })

        if (error) {
            return NextResponse.json({
                error_ar: "خطأ في جلب الموظفين",
                error_en: "Error fetching employees"
            }, { status: 500 })
        }

        return NextResponse.json(data || [])

    } catch (error) {
        return NextResponse.json({
            error_ar: "حدث خطأ أثناء جلب الموظفين",
            error_en: "Error fetching employees"
        }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const { name, username, password, role, email, phone, job_title, department_id, hire_date } = await req.json()

        if (!name || !username || !password || !role) {
            return NextResponse.json({
                error_ar: "املأ كل البيانات المطلوبة",
                error_en: "Please fill all required fields"
            }, { status: 400 })
        }

        const { data: existing, error: checkError } = await supabase
            .from("employees")
            .select("id")
            .eq("username", username)
            .maybeSingle()

        if (existing) {
            return NextResponse.json({
                error_ar: "المستخدم موجود مسبقاً",
                error_en: "Username already exists"
            }, { status: 400 })
        }

        const defaultLocations = [
            "a89a4bbf-83db-403b-b66d-4cb40250bd3d",
            "e2b17a94-a54e-4cb1-905d-9f13d2df3e20",
            "5bfa4c9c-08f5-442d-8441-f2cdd7e624da",
            "4d6aaa7a-9315-47e4-9d58-a0d27bf0a97c"
        ]

        const { data, error } = await supabase
            .from("employees")
            .insert([{
                name,
                username,
                password,
                role,
                email: email || null,
                phone: phone || null,
                job_title: job_title || null,
                department_id: department_id || null,
                hire_date: hire_date || null,
                locations: defaultLocations,
                used_leave_days: 0,
                total_leave_days: 21
            }])
            .select()
            .single()

        if (error) {
            return NextResponse.json({
                error_ar: error.message,
                error_en: error.message
            }, { status: 500 })
        }

        return NextResponse.json({
            message_ar: "تم إضافة الموظف بنجاح",
            message_en: "Employee added successfully",
            employee: data
        })

    } catch (error) {
        return NextResponse.json({
            error_ar: "حدث خطأ أثناء إضافة الموظف",
            error_en: "Error adding employee"
        }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
    try {
        const { id, name, username, role, email, phone, job_title, department_id, hire_date } = await req.json()

        if (!id || !name || !username || !role) {
            return NextResponse.json({
                error_ar: "املأ كل البيانات المطلوبة",
                error_en: "Please fill all required fields"
            }, { status: 400 })
        }

        const { data: existing, error: checkError } = await supabase
            .from("employees")
            .select("id")
            .eq("username", username)
            .neq("id", id)
            .maybeSingle()

        if (existing) {
            return NextResponse.json({
                error_ar: "اسم المستخدم مستخدم من قبل",
                error_en: "Username is already taken"
            }, { status: 400 })
        }

        const { data, error } = await supabase
            .from("employees")
            .update({
                name,
                username,
                role,
                email: email || null,
                phone: phone || null,
                job_title: job_title || null,
                department_id: department_id || null,
                hire_date: hire_date || null
            })
            .eq("id", id)
            .select()
            .single()

        if (error) {
            return NextResponse.json({
                error_ar: error.message,
                error_en: error.message
            }, { status: 500 })
        }

        return NextResponse.json({
            message_ar: "تم تعديل الموظف بنجاح",
            message_en: "Employee updated successfully",
            employee: data
        })

    } catch (error) {
        return NextResponse.json({
            error_ar: "حدث خطأ أثناء تعديل الموظف",
            error_en: "Error updating employee"
        }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { id } = await req.json()

        if (!id) {
            return NextResponse.json({
                error_ar: "الرقم التعريفي مطلوب",
                error_en: "ID is required"
            }, { status: 400 })
        }

        await supabase.from("attendance").delete().eq("employee_id", id)
        await supabase.from("leave_requests").delete().eq("employee_id", id)
        await supabase.from("overtime_requests").delete().eq("employee_id", id)
        await supabase.from("permission_requests").delete().eq("employee_id", id)
        await supabase.from("attendance_correction_requests").delete().eq("employee_id", id)
        await supabase.from("manager_departments").delete().eq("manager_id", id)

        const { error } = await supabase
            .from("employees")
            .delete()
            .eq("id", id)

        if (error) {
            return NextResponse.json({
                error_ar: error.message,
                error_en: error.message
            }, { status: 500 })
        }

        return NextResponse.json({
            message_ar: "تم حذف الموظف وكل بياناته بنجاح",
            message_en: "Employee and all related data deleted successfully"
        })

    } catch (error) {
        return NextResponse.json({
            error_ar: "حدث خطأ أثناء حذف الموظف",
            error_en: "Error deleting employee"
        }, { status: 500 })
    }
}