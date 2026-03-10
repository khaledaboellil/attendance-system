import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: جلب طلبات الإجازات
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const employee_id = searchParams.get("employee_id")
        const department_id = searchParams.get("department_id")
        const department_ids = searchParams.get("department_ids")
        const status = searchParams.get("status")
        const user_role = searchParams.get("user_role")
        const user_id = searchParams.get("user_id")
        const from = searchParams.get("from")
        const to = searchParams.get("to")

        let query = supabase
            .from("leave_requests")
            .select(`
                *,
                employees:employee_id (id, name, username, department_id),
                hr_approver:hr_approved_by (name, username),
                manager_approver:manager_approved_by (name, username)
            `)
            .order("created_at", { ascending: false })

        if (employee_id) {
            query = query.eq("employee_id", employee_id)
        }

        if (from) {
            query = query.gte("start_date", from)
        }
        if (to) {
            query = query.lte("end_date", to)
        }

        if (department_ids) {
            const deptIds = department_ids.split(',').map(Number)
            const { data: deptEmployees, error: empError } = await supabase
                .from("employees")
                .select("id")
                .in("department_id", deptIds)

            if (empError) {
                console.error("خطأ في جلب موظفي الأقسام:", empError)
            } else {
                const empIds = deptEmployees?.map(e => e.id) || []
                if (empIds.length > 0) {
                    query = query.in("employee_id", empIds)
                } else {
                    return NextResponse.json([])
                }
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
            console.error("خطأ في جلب الطلبات:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const formattedData = data?.map(req => {
            let approval_status = ""
            let pending_from = ""

            if (req.status === "مرفوضة") {
                approval_status = "مرفوضة"
            } else if (req.status === "تمت الموافقة") {
                approval_status = "معتمدة"
            } else {
                if (!req.hr_approved && !req.manager_approved) {
                    approval_status = "في انتظار HR ومدير"
                    pending_from = "الموارد البشرية والمدير"
                } else if (!req.hr_approved) {
                    approval_status = "في انتظار HR"
                    pending_from = "الموارد البشرية"
                } else if (!req.manager_approved) {
                    approval_status = "في انتظار مدير"
                    pending_from = "أحد المدراء"
                }
            }

            return {
                ...req,
                approval_status,
                pending_from
            }
        })

        return NextResponse.json(formattedData || [])
    } catch (error) {
        console.error("خطأ غير متوقع:", error)
        return NextResponse.json({ error: "حدث خطأ أثناء جلب الطلبات" }, { status: 500 })
    }
}

// POST: إنشاء طلب إجازة جديد
export async function POST(req: NextRequest) {
    try {
        const { employee_id, leave_type, start_date, end_date, reason } = await req.json()

        if (!employee_id || !leave_type || !start_date || !end_date) {
            return NextResponse.json({ error: "جميع الحقول المطلوبة يجب إدخالها" }, { status: 400 })
        }

        const allowedTypes = ['سنوية', 'مرضية', 'عارضة', 'غير مدفوعة'];
        if (!allowedTypes.includes(leave_type)) {
            return NextResponse.json({ error: "نوع الإجازة غير مسموح به" }, { status: 400 });
        }

        const start = new Date(start_date)
        const end = new Date(end_date)
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

        if (leave_type === "سنوية") {
            const { data: employee, error: empError } = await supabase
                .from("employees")
                .select("used_leave_days, total_leave_days")
                .eq("id", employee_id)
                .single()

            if (empError) {
                return NextResponse.json({ error: "خطأ في جلب بيانات الموظف" }, { status: 500 })
            }

            const total = employee?.total_leave_days || 21
            const used = employee?.used_leave_days || 0
            const remaining = total - used

            if (days > remaining) {
                return NextResponse.json({
                    error: `لا يوجد رصيد كافٍ. المتبقي: ${remaining} يوم`
                }, { status: 400 })
            }
        }

        const { data: existing, error: existingError } = await supabase
            .from("leave_requests")
            .select("*")
            .eq("employee_id", employee_id)
            .eq("status", "قيد الانتظار")
            .or(`and(start_date.lte.${end_date},end_date.gte.${start_date})`)

        if (existing && existing.length > 0) {
            return NextResponse.json({ error: "لديك طلب إجازة في نفس الفترة قيد المراجعة" }, { status: 400 })
        }

        const { error } = await supabase
            .from("leave_requests")
            .insert([{
                employee_id,
                leave_type,
                start_date,
                end_date,
                reason,
                hr_approved: false,
                manager_approved: false,
                status: "قيد الانتظار"
            }])

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ message: "تم تقديم طلب الإجازة بنجاح" })
    } catch {
        return NextResponse.json({ error: "حدث خطأ أثناء إنشاء الطلب" }, { status: 500 })
    }
}

// PATCH: تحديث حالة الطلب (موافقة/رفض) - معدل لدعم Admin كمدير
export async function PATCH(req: NextRequest) {
    try {
        const { id, action, approved_by, user_role, is_admin_as_manager } = await req.json()

        console.log("📝 معالجة طلب إجازة:", { id, action, approved_by, user_role, is_admin_as_manager })

        if (!id || !action || !approved_by || !user_role) {
            return NextResponse.json({ error: "البيانات غير كاملة" }, { status: 400 })
        }

        const { data: request, error: fetchError } = await supabase
            .from("leave_requests")
            .select(`
                *,
                employees:employee_id (name, department_id)
            `)
            .eq("id", id)
            .single()

        if (fetchError || !request) {
            return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 })
        }

        if (request.status === "مرفوضة" || request.status === "تمت الموافقة") {
            return NextResponse.json({ error: "لا يمكن تعديل طلب منتهي" }, { status: 400 })
        }

        if (action === "reject") {
            const { error } = await supabase
                .from("leave_requests")
                .update({
                    status: "مرفوضة",
                    updated_at: new Date()
                })
                .eq("id", id)

            if (error) return NextResponse.json({ error: error.message }, { status: 500 })
            return NextResponse.json({ message: "تم رفض الطلب" })
        }

        let updateData: any = { updated_at: new Date() }

        // الحالة الخاصة: Admin هو مدير على القسم
        if (is_admin_as_manager && user_role === "hr") {
            console.log("🎯 Admin كمدير - موافقة كاملة فورية")
            updateData.hr_approved = true
            updateData.hr_approved_by = approved_by
            updateData.manager_approved = true
            updateData.manager_approved_by = approved_by
            updateData.status = "تمت الموافقة"

            if (request.leave_type === "سنوية") {
                const start = new Date(request.start_date)
                const end = new Date(request.end_date)
                const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

                const { data: employee } = await supabase
                    .from("employees")
                    .select("used_leave_days")
                    .eq("id", request.employee_id)
                    .single()

                const currentUsed = employee?.used_leave_days || 0
                await supabase
                    .from("employees")
                    .update({ used_leave_days: currentUsed + days })
                    .eq("id", request.employee_id)
            }
        }
        else if (user_role === "hr") {
            updateData.hr_approved = true
            updateData.hr_approved_by = approved_by

            if (request.manager_approved) {
                updateData.status = "تمت الموافقة"

                if (request.leave_type === "سنوية") {
                    const start = new Date(request.start_date)
                    const end = new Date(request.end_date)
                    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

                    const { data: employee } = await supabase
                        .from("employees")
                        .select("used_leave_days")
                        .eq("id", request.employee_id)
                        .single()

                    const currentUsed = employee?.used_leave_days || 0
                    await supabase
                        .from("employees")
                        .update({ used_leave_days: currentUsed + days })
                        .eq("id", request.employee_id)
                }
            }
        }
        else if (user_role === "manager") {
            updateData.manager_approved = true
            updateData.manager_approved_by = approved_by

            if (request.hr_approved) {
                updateData.status = "تمت الموافقة"

                if (request.leave_type === "سنوية") {
                    const start = new Date(request.start_date)
                    const end = new Date(request.end_date)
                    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

                    const { data: employee } = await supabase
                        .from("employees")
                        .select("used_leave_days")
                        .eq("id", request.employee_id)
                        .single()

                    const currentUsed = employee?.used_leave_days || 0
                    await supabase
                        .from("employees")
                        .update({ used_leave_days: currentUsed + days })
                        .eq("id", request.employee_id)
                }
            }
        }
        else {
            return NextResponse.json({ error: "صلاحية غير صحيحة" }, { status: 400 })
        }

        const { error } = await supabase
            .from("leave_requests")
            .update(updateData)
            .eq("id", id)

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        let message = ""
        if (is_admin_as_manager) {
            message = "✅ تمت الموافقة (كـ Admin ومدير) والطلب معتمد الآن"
        } else if (user_role === "hr") {
            message = request.manager_approved
                ? "✅ تمت موافقة HR والطلب معتمد الآن"
                : "✅ تمت موافقة HR، في انتظار موافقة مدير"
        } else {
            message = request.hr_approved
                ? "✅ تمت موافقة المدير والطلب معتمد الآن"
                : "✅ تمت موافقة المدير، في انتظار موافقة HR"
        }

        return NextResponse.json({ message })
    } catch (error) {
        console.error("❌ خطأ في PATCH:", error)
        return NextResponse.json({ error: "حدث خطأ أثناء تحديث الطلب" }, { status: 500 })
    }
}

// DELETE: حذف طلب (فقط إذا كان قيد الانتظار)
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get("id")
        const employee_id = searchParams.get("employee_id")

        if (!id || !employee_id) {
            return NextResponse.json({ error: "معرف الطلب والموظف مطلوب" }, { status: 400 })
        }

        const { data: request, error: fetchError } = await supabase
            .from("leave_requests")
            .select("*")
            .eq("id", id)
            .eq("employee_id", employee_id)
            .eq("status", "قيد الانتظار")
            .single()

        if (fetchError || !request) {
            return NextResponse.json({ error: "لا يمكن حذف هذا الطلب" }, { status: 404 })
        }

        const { error } = await supabase
            .from("leave_requests")
            .delete()
            .eq("id", id)

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ message: "تم حذف الطلب بنجاح" })
    } catch {
        return NextResponse.json({ error: "حدث خطأ أثناء حذف الطلب" }, { status: 500 })
    }
}