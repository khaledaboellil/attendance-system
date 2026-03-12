import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const manager_id = searchParams.get("manager_id")

        let query = supabase
            .from("departments")
            .select(`
                id, 
                name
            `)
            .order("name", { ascending: true })

        if (manager_id) {
            const { data: managedDepts } = await supabase
                .from("manager_departments")
                .select("department_id")
                .eq("manager_id", manager_id)

            const deptIds = managedDepts?.map(d => d.department_id) || []
            if (deptIds.length > 0) {
                query = query.in("id", deptIds)
            } else {
                return NextResponse.json([])
            }
        }

        const { data, error } = await query

        if (error) {
            return NextResponse.json({
                error_ar: "خطأ في جلب الأقسام",
                error_en: "Error fetching departments"
            }, { status: 500 })
        }

        const departmentsWithCount = await Promise.all(
            (data || []).map(async (dept) => {
                const { count } = await supabase
                    .from("employees")
                    .select("*", { count: "exact", head: true })
                    .eq("department_id", dept.id)

                const { data: managers } = await supabase
                    .from("manager_departments")
                    .select(`
                        manager_id,
                        employees:manager_id (name, username)
                    `)
                    .eq("department_id", dept.id)

                const managersList = managers?.map(m => {
                    const empData = Array.isArray(m.employees) ? m.employees[0] : m.employees
                    return {
                        id: m.manager_id,
                        name: empData?.name || "",
                        username: empData?.username || ""
                    }
                }) || []

                return {
                    id: dept.id,
                    name: dept.name,
                    employees_count: count || 0,
                    managers: managersList
                }
            })
        )

        return NextResponse.json(departmentsWithCount || [])

    } catch (error) {
        return NextResponse.json({
            error_ar: "حدث خطأ أثناء جلب الأقسام",
            error_en: "Error fetching departments"
        }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const { name } = await req.json()

        if (!name) {
            return NextResponse.json({
                error_ar: "اسم القسم مطلوب",
                error_en: "Department name is required"
            }, { status: 400 })
        }

        const { data: existing, error: checkError } = await supabase
            .from("departments")
            .select("id")
            .eq("name", name)
            .maybeSingle()

        if (existing) {
            return NextResponse.json({
                error_ar: "يوجد قسم بنفس الاسم بالفعل",
                error_en: "Department with this name already exists"
            }, { status: 400 })
        }

        const { data, error } = await supabase
            .from("departments")
            .insert([{ name }])
            .select()
            .single()

        if (error) {
            return NextResponse.json({
                error_ar: error.message,
                error_en: error.message
            }, { status: 500 })
        }

        return NextResponse.json({
            message_ar: "تم إضافة القسم بنجاح",
            message_en: "Department added successfully",
            department: {
                id: data.id,
                name: data.name,
                employees_count: 0,
                managers: []
            }
        })

    } catch (error) {
        return NextResponse.json({
            error_ar: "حدث خطأ أثناء إضافة القسم",
            error_en: "Error adding department"
        }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
    try {
        const { id, name } = await req.json()

        if (!id || !name) {
            return NextResponse.json({
                error_ar: "معرف القسم واسمه مطلوب",
                error_en: "Department ID and name are required"
            }, { status: 400 })
        }

        const { data: existing, error: checkError } = await supabase
            .from("departments")
            .select("id")
            .eq("name", name)
            .neq("id", id)
            .maybeSingle()

        if (existing) {
            return NextResponse.json({
                error_ar: "يوجد قسم بنفس الاسم بالفعل",
                error_en: "Department with this name already exists"
            }, { status: 400 })
        }

        const { data, error } = await supabase
            .from("departments")
            .update({ name })
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
            message_ar: "تم تعديل القسم بنجاح",
            message_en: "Department updated successfully",
            department: data
        })

    } catch (error) {
        return NextResponse.json({
            error_ar: "حدث خطأ أثناء تعديل القسم",
            error_en: "Error updating department"
        }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get("id")

        if (!id) {
            return NextResponse.json({
                error_ar: "معرف القسم مطلوب",
                error_en: "Department ID is required"
            }, { status: 400 })
        }

        const { data: employees, error: empError } = await supabase
            .from("employees")
            .select("id")
            .eq("department_id", id)
            .limit(1)

        if (employees && employees.length > 0) {
            return NextResponse.json({
                error_ar: "لا يمكن حذف القسم لأنه يوجد موظفين تابعين له",
                error_en: "Cannot delete department because it has employees"
            }, { status: 400 })
        }

        await supabase
            .from("manager_departments")
            .delete()
            .eq("department_id", id)

        const { error } = await supabase
            .from("departments")
            .delete()
            .eq("id", id)

        if (error) {
            return NextResponse.json({
                error_ar: error.message,
                error_en: error.message
            }, { status: 500 })
        }

        return NextResponse.json({
            message_ar: "تم حذف القسم بنجاح",
            message_en: "Department deleted successfully"
        })

    } catch (error) {
        return NextResponse.json({
            error_ar: "حدث خطأ أثناء حذف القسم",
            error_en: "Error deleting department"
        }, { status: 500 })
    }
}