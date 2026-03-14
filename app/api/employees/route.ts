import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: جلب كل الموظفين
export async function GET() {
    try {
        const { data, error } = await supabase
            .from("employees")
            .select("id, name, username, role, job_title, department_id, hire_date, current_year_leave_days, current_year_emergency_days, is_location_flexible")
            .order("name", { ascending: true })

        if (error) {
            console.error("خطأ في جلب الموظفين:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data || [])
    } catch (error) {
        console.error("خطأ غير متوقع:", error)
        return NextResponse.json({ error: "حدث خطأ أثناء جلب الموظفين" }, { status: 500 })
    }
}

// POST: إضافة موظف جديد
export async function POST(req: NextRequest) {
    try {
        const {
            name,
            username,
            password,
            role,
            job_title,
            department_id,
            hire_date,
            current_year_leave_days,
            current_year_emergency_days,
            is_location_flexible
        } = await req.json()

        if (!name || !username || !password || !role) {
            return NextResponse.json({ error: "املأ كل البيانات المطلوبة" }, { status: 400 })
        }

        // التحقق من وجود المستخدم مسبقاً
        const { data: existing, error: checkError } = await supabase
            .from("employees")
            .select("id")
            .eq("username", username)
            .maybeSingle()

        if (checkError) {
            console.error("خطأ في التحقق من وجود المستخدم:", checkError)
            return NextResponse.json({ error: checkError.message }, { status: 500 })
        }

        if (existing) {
            return NextResponse.json({ error: "المستخدم موجود مسبقاً" }, { status: 400 })
        }

        // الأماكن الافتراضية للموظف الجديد
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
                job_title: job_title || null,
                department_id: department_id || null,
                hire_date: hire_date || null,
                locations: defaultLocations,
                current_year_leave_days: current_year_leave_days || 21,
                current_year_emergency_days: current_year_emergency_days || 7,
                is_location_flexible: is_location_flexible || false
            }])
            .select()
            .single()

        if (error) {
            console.error("خطأ في إضافة الموظف:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            message: "تم إضافة الموظف بنجاح",
            employee: data
        })
    } catch (error) {
        console.error("خطأ غير متوقع:", error)
        return NextResponse.json({ error: "حدث خطأ أثناء إضافة الموظف" }, { status: 500 })
    }
}

// PUT: تحديث بيانات موظف كاملة
export async function PUT(req: NextRequest) {
    try {
        const {
            id,
            name,
            username,
            role,
            job_title,
            department_id,
            hire_date,
            current_year_leave_days,
            current_year_emergency_days,
            is_location_flexible
        } = await req.json()

        if (!id || !name || !username || !role) {
            return NextResponse.json({ error: "املأ كل البيانات المطلوبة" }, { status: 400 })
        }

        // التحقق من عدم وجود مستخدم آخر بنفس الاسم
        const { data: existing, error: checkError } = await supabase
            .from("employees")
            .select("id")
            .eq("username", username)
            .neq("id", id)
            .maybeSingle()

        if (checkError) {
            console.error("خطأ في التحقق من وجود المستخدم:", checkError)
            return NextResponse.json({ error: checkError.message }, { status: 500 })
        }

        if (existing) {
            return NextResponse.json({ error: "اسم المستخدم مستخدم من قبل" }, { status: 400 })
        }

        const { data, error } = await supabase
            .from("employees")
            .update({
                name,
                username,
                role,
                job_title: job_title || null,
                department_id: department_id || null,
                hire_date: hire_date || null,
                current_year_leave_days,
                current_year_emergency_days,
                is_location_flexible
            })
            .eq("id", id)
            .select()
            .single()

        if (error) {
            console.error("خطأ في تحديث الموظف:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            message: "تم تعديل الموظف بنجاح",
            employee: data
        })
    } catch (error) {
        console.error("خطأ غير متوقع:", error)
        return NextResponse.json({ error: "حدث خطأ أثناء تعديل الموظف" }, { status: 500 })
    }
}

// PATCH: تحديث جزئي لبيانات الموظف
export async function PATCH(req: NextRequest) {
    try {
        const updates = await req.json()
        const { id, ...fields } = updates

        if (!id) {
            return NextResponse.json({ error: "الرقم التعريفي مطلوب" }, { status: 400 })
        }

        // إذا كان في تحديث لاسم المستخدم، نتحقق من عدم التكرار
        if (fields.username) {
            const { data: existing, error: checkError } = await supabase
                .from("employees")
                .select("id")
                .eq("username", fields.username)
                .neq("id", id)
                .maybeSingle()

            if (checkError) {
                console.error("خطأ في التحقق من وجود المستخدم:", checkError)
                return NextResponse.json({ error: checkError.message }, { status: 500 })
            }

            if (existing) {
                return NextResponse.json({ error: "اسم المستخدم مستخدم من قبل" }, { status: 400 })
            }
        }

        const { data, error } = await supabase
            .from("employees")
            .update(fields)
            .eq("id", id)
            .select()
            .single()

        if (error) {
            console.error("خطأ في تحديث الموظف:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            message: "تم تحديث الموظف بنجاح",
            employee: data
        })
    } catch (error) {
        console.error("خطأ غير متوقع:", error)
        return NextResponse.json({ error: "حدث خطأ أثناء تحديث الموظف" }, { status: 500 })
    }
}

// DELETE: حذف موظف (مع كل بياناته المرتبطة)
export async function DELETE(req: NextRequest) {
    try {
        const { id } = await req.json()

        if (!id) {
            return NextResponse.json({ error: "الرقم التعريفي مطلوب" }, { status: 400 })
        }

        // 1. حذف سجلات الحضور
        const { error: attendanceError } = await supabase
            .from("attendance")
            .delete()
            .eq("employee_id", id)

        if (attendanceError) {
            console.error("خطأ في حذف سجلات الحضور:", attendanceError)
        }

        // 2. حذف طلبات الإجازات
        const { error: leaveError } = await supabase
            .from("leave_requests")
            .delete()
            .eq("employee_id", id)

        if (leaveError) {
            console.error("خطأ في حذف طلبات الإجازات:", leaveError)
        }

        // 3. حذف طلبات الأوفر تايم
        const { error: overtimeError } = await supabase
            .from("overtime_requests")
            .delete()
            .eq("employee_id", id)

        if (overtimeError) {
            console.error("خطأ في حذف طلبات الأوفر تايم:", overtimeError)
        }

        // 4. حذف طلبات الإذن
        const { error: permissionError } = await supabase
            .from("permission_requests")
            .delete()
            .eq("employee_id", id)

        if (permissionError) {
            console.error("خطأ في حذف طلبات الإذن:", permissionError)
        }

        // 5. حذف طلبات تصحيح البصمة
        const { error: correctionError } = await supabase
            .from("attendance_correction_requests")
            .delete()
            .eq("employee_id", id)

        if (correctionError) {
            console.error("خطأ في حذف طلبات التصحيح:", correctionError)
        }

        // 6. حذف علاقات المدراء (لو كان مدير)
        const { error: managerError } = await supabase
            .from("manager_departments")
            .delete()
            .eq("manager_id", id)

        if (managerError) {
            console.error("خطأ في حذف علاقات المدراء:", managerError)
        }

        // 7. أخيراً حذف الموظف نفسه
        const { error } = await supabase
            .from("employees")
            .delete()
            .eq("id", id)

        if (error) {
            console.error("خطأ في حذف الموظف:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            message: "✅ تم حذف الموظف وكل بياناته بنجاح"
        })
    } catch (error) {
        console.error("خطأ غير متوقع:", error)
        return NextResponse.json({ error: "حدث خطأ أثناء حذف الموظف" }, { status: 500 })
    }
}