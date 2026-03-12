import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const employee_id = searchParams.get("employee_id")
        const department_id = searchParams.get("department_id")
        const department_ids = searchParams.get("department_ids")
        const status = searchParams.get("status")
        const user_role = searchParams.get("user_role")
        const user_id = searchParams.get("user_id")

        let query = supabase
            .from("overtime_requests")
            .select(`
                *,
                employees:employee_id (id, name, username, department_id),
                hr_approver:hr_approved_by (name, username),
                manager_approver:manager_approved_by (name, username)
            `)
            .order("created_at", { ascending: false })

        if (employee_id) query = query.eq("employee_id", employee_id)

        if (department_ids) {
            const deptIds = department_ids.split(',').map(Number)
            const { data: deptEmployees } = await supabase
                .from("employees")
                .select("id")
                .in("department_id", deptIds)

            const empIds = deptEmployees?.map(e => e.id) || []
            if (empIds.length > 0) {
                query = query.in("employee_id", empIds)
            } else {
                return NextResponse.json([])
            }
        }

        if (user_role === "manager" && user_id && !department_ids) {
            const { data: managedDepts } = await supabase
                .from("manager_departments")
                .select("department_id")
                .eq("manager_id", user_id)

            const deptIds = managedDepts?.map(d => d.department_id) || []

            if (deptIds.length > 0) {
                const { data: deptEmployees } = await supabase
                    .from("employees")
                    .select("id")
                    .in("department_id", deptIds)

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

        if (department_id && department_id !== "all") {
            const { data: deptEmployees } = await supabase
                .from("employees")
                .select("id")
                .eq("department_id", department_id)

            const empIds = deptEmployees?.map(e => e.id) || []
            if (empIds.length > 0) {
                query = query.in("employee_id", empIds)
            }
        }

        if (status) {
            if (status === "pending") {
                query = query.neq("status", "مرفوضة").neq("status", "تمت الموافقة")
            } else if (status === "approved") {
                query = query.eq("status", "تمت الموافقة")
            } else if (status === "rejected") {
                query = query.eq("status", "مرفوضة")
            }
        }

        const { data, error } = await query

        if (error) {
            return NextResponse.json({
                error_ar: "خطأ في جلب الطلبات",
                error_en: "Error fetching requests"
            }, { status: 500 })
        }

        return NextResponse.json(data || [])

    } catch {
        return NextResponse.json({
            error_ar: "حدث خطأ أثناء جلب الطلبات",
            error_en: "Error fetching requests"
        }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const { employee_id, date, hours, reason } = await req.json()

        if (!employee_id || !date || !hours) {
            return NextResponse.json({
                error_ar: "جميع الحقول المطلوبة يجب إدخالها",
                error_en: "All required fields must be filled"
            }, { status: 400 })
        }

        const { error } = await supabase
            .from("overtime_requests")
            .insert([{
                employee_id,
                date,
                hours,
                reason,
                hr_approved: false,
                manager_approved: false,
                status: "قيد الانتظار"
            }])

        if (error) {
            return NextResponse.json({
                error_ar: error.message,
                error_en: error.message
            }, { status: 500 })
        }

        return NextResponse.json({
            message_ar: "تم تقديم طلب الساعات الإضافية بنجاح",
            message_en: "Overtime request submitted successfully"
        })

    } catch {
        return NextResponse.json({
            error_ar: "حدث خطأ أثناء إنشاء الطلب",
            error_en: "Error creating request"
        }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const { id, action, approved_by, user_role, is_admin_as_manager } = await req.json()

        if (!id || !action || !approved_by || !user_role) {
            return NextResponse.json({
                error_ar: "البيانات غير كاملة",
                error_en: "Incomplete data"
            }, { status: 400 })
        }

        const { data: request, error: fetchError } = await supabase
            .from("overtime_requests")
            .select("*")
            .eq("id", id)
            .single()

        if (fetchError || !request) {
            return NextResponse.json({
                error_ar: "الطلب غير موجود",
                error_en: "Request not found"
            }, { status: 404 })
        }

        if (request.status === "مرفوضة" || request.status === "تمت الموافقة") {
            return NextResponse.json({
                error_ar: "لا يمكن تعديل طلب منتهي",
                error_en: "Cannot modify a completed request"
            }, { status: 400 })
        }

        if (action === "reject") {
            const { error } = await supabase
                .from("overtime_requests")
                .update({
                    status: "مرفوضة",
                    updated_at: new Date()
                })
                .eq("id", id)

            if (error) {
                return NextResponse.json({
                    error_ar: error.message,
                    error_en: error.message
                }, { status: 500 })
            }

            return NextResponse.json({
                message_ar: "تم رفض الطلب",
                message_en: "Request rejected"
            })
        }

        let updateData: any = { updated_at: new Date() }

        if (is_admin_as_manager && user_role === "hr") {
            updateData.hr_approved = true
            updateData.hr_approved_by = approved_by
            updateData.manager_approved = true
            updateData.manager_approved_by = approved_by
            updateData.status = "تمت الموافقة"
        }
        else if (user_role === "hr") {
            updateData.hr_approved = true
            updateData.hr_approved_by = approved_by

            if (request.manager_approved) {
                updateData.status = "تمت الموافقة"
            }
        }
        else if (user_role === "manager") {
            updateData.manager_approved = true
            updateData.manager_approved_by = approved_by

            if (request.hr_approved) {
                updateData.status = "تمت الموافقة"
            }
        }
        else {
            return NextResponse.json({
                error_ar: "صلاحية غير صحيحة",
                error_en: "Invalid role"
            }, { status: 400 })
        }

        const { error } = await supabase
            .from("overtime_requests")
            .update(updateData)
            .eq("id", id)

        if (error) {
            return NextResponse.json({
                error_ar: error.message,
                error_en: error.message
            }, { status: 500 })
        }

        let message_ar = "", message_en = ""
        if (is_admin_as_manager) {
            message_ar = "تمت الموافقة على الطلب بنجاح"
            message_en = "Request approved successfully"
        } else if (user_role === "hr") {
            if (request.manager_approved) {
                message_ar = "تمت الموافقة على الطلب بنجاح"
                message_en = "Request approved successfully"
            } else {
                message_ar = "تمت موافقة HR، في انتظار موافقة المدير"
                message_en = "HR approved, waiting for manager"
            }
        } else {
            if (request.hr_approved) {
                message_ar = "تمت الموافقة على الطلب بنجاح"
                message_en = "Request approved successfully"
            } else {
                message_ar = "تمت موافقة المدير، في انتظار موافقة HR"
                message_en = "Manager approved, waiting for HR"
            }
        }

        return NextResponse.json({ message_ar, message_en })

    } catch {
        return NextResponse.json({
            error_ar: "حدث خطأ أثناء تحديث الطلب",
            error_en: "Error updating request"
        }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get("id")
        const employee_id = searchParams.get("employee_id")

        if (!id || !employee_id) {
            return NextResponse.json({
                error_ar: "معرف الطلب والموظف مطلوب",
                error_en: "Request ID and employee ID are required"
            }, { status: 400 })
        }

        const { data: request, error: fetchError } = await supabase
            .from("overtime_requests")
            .select("*")
            .eq("id", id)
            .eq("employee_id", employee_id)
            .eq("status", "قيد الانتظار")
            .single()

        if (fetchError || !request) {
            return NextResponse.json({
                error_ar: "لا يمكن حذف هذا الطلب",
                error_en: "Cannot delete this request"
            }, { status: 404 })
        }

        const { error } = await supabase
            .from("overtime_requests")
            .delete()
            .eq("id", id)

        if (error) {
            return NextResponse.json({
                error_ar: error.message,
                error_en: error.message
            }, { status: 500 })
        }

        return NextResponse.json({
            message_ar: "تم حذف الطلب بنجاح",
            message_en: "Request deleted successfully"
        })

    } catch {
        return NextResponse.json({
            error_ar: "حدث خطأ أثناء حذف الطلب",
            error_en: "Error deleting request"
        }, { status: 500 })
    }
}