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
        const department_ids = searchParams.get("department_ids") // للManager
        const status = searchParams.get("status") // pending, approved, rejected
        const user_role = searchParams.get("user_role") // admin, manager
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

        // فلترة حسب التاريخ
        if (from) {
            query = query.gte("start_date", from)
        }
        if (to) {
            query = query.lte("end_date", to)
        }

        // لو مدير واتبعته department_ids (أقسام متعددة)
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
                    // لو مفيش موظفين في الأقسام دي، نرجع array فاضي
                    return NextResponse.json([])
                }
            }
        }

        // لو المدير (manager) يشوف بس موظفي قسم معين
        if (user_role === "manager" && user_id && !department_ids) {
            // نجيب المدير نشوف هو مدير على أي أقسام
            const { data: managedDepts } = await supabase
                .from("manager_departments")
                .select("department_id")
                .eq("manager_id", user_id)

            const deptIds = managedDepts?.map(d => d.department_id) || []

            if (deptIds.length > 0) {
                // نجيب الموظفين اللي في الأقسام دي
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
                // لو المدير مش تابع لأقسام، ميفضلش حاجة
                return NextResponse.json([])
            }
        }

        // فلترة حسب القسم (لو الـ HR عايز يشوف قسم معين)
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

        // فلترة حسب الحالة
        if (status) {
            if (status === "pending") {
                // قيد الانتظار: مش مرفوضة ومش معتمدة
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

        // تحويل البيانات لإضافة حالة مفهومة
        const formattedData = data?.map(req => {
            let approval_status = ""
            let pending_from = ""

            if (req.status === "مرفوضة") {
                approval_status = "مرفوضة"
            } else if (req.status === "تمت الموافقة") {
                approval_status = "معتمدة"
            } else {
                // لسه في انتظار الموافقات
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

        // التحقق من أن نوع الإجازة مسموح به
        const allowedTypes = ['سنوية', 'مرضية', 'عارضة', 'غير مدفوعة'];
        if (!allowedTypes.includes(leave_type)) {
            return NextResponse.json({ error: "نوع الإجازة غير مسموح به" }, { status: 400 });
        }

        // حساب عدد الأيام
        const start = new Date(start_date)
        const end = new Date(end_date)
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

        // لو إجازة سنوية، نتأكد إن الرصيد يكفي
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

        // التحقق من عدم وجود طلب مسبق لنفس الفترة
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

// PATCH: تحديث حالة الطلب (موافقة/رفض)
export async function PATCH(req: NextRequest) {
    try {
        const { id, action, approved_by, user_role } = await req.json()

        if (!id || !action || !approved_by || !user_role) {
            return NextResponse.json({ error: "البيانات غير كاملة" }, { status: 400 })
        }

        // جلب الطلب الحالي
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

        // لو الطلب مرفوض من قبل، مينفعش نغير
        if (request.status === "مرفوضة") {
            return NextResponse.json({ error: "الطلب مرفوض بالفعل" }, { status: 400 })
        }

        // لو الطلب معتمد من قبل، مينفعش نغير
        if (request.status === "تمت الموافقة") {
            return NextResponse.json({ error: "الطلب معتمد بالفعل" }, { status: 400 })
        }

        // ============= حالة الرفض =============
        if (action === "reject") {
            // أي رفض من أي حد = الطلب مرفوض نهائياً
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

        // ============= حالة الموافقة =============
        let updateData: any = { updated_at: new Date() }

        if (user_role === "hr") {
            // موافقة HR
            updateData.hr_approved = true
            updateData.hr_approved_by = approved_by

            // تحقق: هل في مدير وافق قبل كده؟
            if (request.manager_approved) {
                // HR وافق + في مدير وافق قبل كده = الطلب معتمد
                updateData.status = "تمت الموافقة"

                // لو إجازة سنوية، نضيف الأيام للمستخدم
                if (request.leave_type === "سنوية") {
                    const start = new Date(request.start_date)
                    const end = new Date(request.end_date)
                    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

                    // جلب الرصيد الحالي
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
            // موافقة مدير
            updateData.manager_approved = true
            updateData.manager_approved_by = approved_by

            // تحقق: هل HR وافق قبل كده؟
            if (request.hr_approved) {
                // مدير وافق + HR وافق قبل كده = الطلب معتمد
                updateData.status = "تمت الموافقة"

                // لو إجازة سنوية، نضيف الأيام للمستخدم
                if (request.leave_type === "سنوية") {
                    const start = new Date(request.start_date)
                    const end = new Date(request.end_date)
                    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

                    // جلب الرصيد الحالي
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

        // رسالة مناسبة حسب الموقف
        let message = ""
        if (user_role === "hr") {
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
        console.error("خطأ في PATCH:", error)
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

        // التأكد أن الطلب موجود وحالته "قيد الانتظار" وبيخص نفس الموظف
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

        // حذف الطلب
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