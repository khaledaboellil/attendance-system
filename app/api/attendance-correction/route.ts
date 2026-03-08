import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: جلب طلبات التصحيح
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const employee_id = searchParams.get("employee_id")
        const department_id = searchParams.get("department_id")
        const status = searchParams.get("status")
        const user_role = searchParams.get("user_role")
        const user_id = searchParams.get("user_id")

        let query = supabase
            .from("attendance_correction_requests")
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

        if (user_role === "manager" && user_id) {
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

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json(data || [])
    } catch {
        return NextResponse.json({ error: "حدث خطأ أثناء جلب الطلبات" }, { status: 500 })
    }
}

// POST: إنشاء طلب تصحيح جديد
export async function POST(req: NextRequest) {
    try {
        const { employee_id, date, expected_check_in, expected_check_out, reason } = await req.json()

        if (!employee_id || !date || !reason) {
            return NextResponse.json({ error: "جميع الحقول المطلوبة يجب إدخالها" }, { status: 400 })
        }

        const { data: existing } = await supabase
            .from("attendance_correction_requests")
            .select("*")
            .eq("employee_id", employee_id)
            .eq("date", date)
            .eq("status", "قيد الانتظار")
            .maybeSingle()

        if (existing) {
            return NextResponse.json({ error: "لديك طلب قيد الانتظار لنفس اليوم" }, { status: 400 })
        }

        const { error } = await supabase
            .from("attendance_correction_requests")
            .insert([{
                employee_id,
                date,
                expected_check_in: expected_check_in || null,
                expected_check_out: expected_check_out || null,
                reason,
                hr_approved: false,
                manager_approved: false,
                status: "قيد الانتظار"
            }])

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ message: "تم تقديم طلب التصحيح بنجاح" })
    } catch {
        return NextResponse.json({ error: "حدث خطأ أثناء إنشاء الطلب" }, { status: 500 })
    }
}

// PATCH: الموافقة على طلب تصحيح بصمة (مع تحديث الحضور)
export async function PATCH(req: NextRequest) {
    try {
        const { id, action, approved_by, user_role } = await req.json()

        console.log("📝 بدء معالجة طلب تصحيح:", { id, action, approved_by, user_role })

        if (!id || !action || !approved_by || !user_role) {
            return NextResponse.json({ error: "البيانات غير كاملة" }, { status: 400 })
        }

        // جلب الطلب الحالي
        const { data: request, error: fetchError } = await supabase
            .from("attendance_correction_requests")
            .select(`*, employees:employee_id (id, name)`)
            .eq("id", id)
            .single()

        console.log("📋 بيانات الطلب:", request)

        if (fetchError || !request) {
            return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 })
        }

        if (request.status === "مرفوضة" || request.status === "تمت الموافقة") {
            return NextResponse.json({ error: "لا يمكن تعديل طلب منتهي" }, { status: 400 })
        }

        // ============= حالة الرفض =============
        if (action === "reject") {
            console.log("❌ رفض الطلب")
            const { error } = await supabase
                .from("attendance_correction_requests")
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
            updateData.hr_approved = true
            updateData.hr_approved_by = approved_by
            console.log("✅ موافقة HR")
        } else if (user_role === "manager") {
            updateData.manager_approved = true
            updateData.manager_approved_by = approved_by
            console.log("✅ موافقة مدير")
        } else {
            return NextResponse.json({ error: "صلاحية غير صحيحة" }, { status: 400 })
        }

        const newHrStatus = user_role === "hr" ? true : request.hr_approved
        const newManagerStatus = user_role === "manager" ? true : request.manager_approved

        console.log("📊 حالة الموافقات:", { newHrStatus, newManagerStatus })

        // إذا اكتملت الموافقات (HR + مدير)
        if (newHrStatus && newManagerStatus) {
            console.log("🎯 اكتملت الموافقات - جاري تحديث الحضور")
            updateData.status = "تمت الموافقة"

            // ============= تحديث جدول الحضور =============
            const employeeId = request.employee_id
            const targetDate = request.date

            console.log("👤 الموظف:", employeeId)
            console.log("📅 التاريخ:", targetDate)
            console.log("⏰ وقت الحضور المفترض:", request.expected_check_in)
            console.log("⏰ وقت الانصراف المفترض:", request.expected_check_out)

            // 1️⃣ نبحث عن سجل حضور في هذا اليوم
            const { data: existingAttendance, error: searchError } = await supabase
                .from("attendance")
                .select("*")
                .eq("employee_id", employeeId)
                .eq("day", targetDate)
                .maybeSingle()

            console.log("🔍 سجل الحضور الموجود:", existingAttendance)

            // تجهيز بيانات التحديث
            const attendanceData: any = {
                employee_id: employeeId,
                day: targetDate
            }

            // إذا كان الطلب يحتوي على وقت حضور
            if (request.expected_check_in) {
                const checkInDateTime = `${targetDate}T${request.expected_check_in}`
                console.log("🕒 وقت الحضور المراد:", checkInDateTime)
                attendanceData.check_in = checkInDateTime
            }

            // إذا كان الطلب يحتوي على وقت انصراف
            if (request.expected_check_out) {
                const checkOutDateTime = `${targetDate}T${request.expected_check_out}`
                console.log("🕒 وقت الانصراف المراد:", checkOutDateTime)
                attendanceData.check_out = checkOutDateTime
            }

            let attendanceResult

            if (existingAttendance) {
                console.log("📝 تحديث سجل موجود ID:", existingAttendance.id)
                attendanceResult = await supabase
                    .from("attendance")
                    .update(attendanceData)
                    .eq("id", existingAttendance.id)
            } else {
                console.log("➕ إضافة سجل جديد")
                attendanceResult = await supabase
                    .from("attendance")
                    .insert([attendanceData])
            }

            console.log("📊 نتيجة تحديث/إضافة الحضور:", attendanceResult)

            if (attendanceResult.error) {
                console.error("❌ خطأ في تحديث/إضافة الحضور:", attendanceResult.error)
            } else {
                console.log("✅ تم تحديث الحضور بنجاح")
            }
        }

        // تحديث حالة الطلب
        console.log("💾 تحديث حالة الطلب:", updateData)

        const { error } = await supabase
            .from("attendance_correction_requests")
            .update(updateData)
            .eq("id", id)

        if (error) {
            console.error("❌ خطأ في تحديث الطلب:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        let message = ""
        if (user_role === "hr") {
            message = newManagerStatus
                ? "✅ تمت الموافقة على طلب التصحيح وتحديث الحضور"
                : "✅ تمت موافقة HR، في انتظار موافقة مدير"
        } else {
            message = newHrStatus
                ? "✅ تمت الموافقة على طلب التصحيح وتحديث الحضور"
                : "✅ تمت موافقة مدير، في انتظار موافقة HR"
        }

        console.log("✨ الرسالة النهائية:", message)
        return NextResponse.json({ message })

    } catch (error) {
        console.error("❌ خطأ في PATCH:", error)
        return NextResponse.json({ error: "حدث خطأ أثناء تحديث الطلب" }, { status: 500 })
    }
}

// DELETE: حذف طلب
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get("id")
        const employee_id = searchParams.get("employee_id")

        if (!id || !employee_id) {
            return NextResponse.json({ error: "معرف الطلب والموظف مطلوب" }, { status: 400 })
        }

        const { data: request, error: fetchError } = await supabase
            .from("attendance_correction_requests")
            .select("*")
            .eq("id", id)
            .eq("employee_id", employee_id)
            .eq("status", "قيد الانتظار")
            .single()

        if (fetchError || !request) {
            return NextResponse.json({ error: "لا يمكن حذف هذا الطلب" }, { status: 404 })
        }

        const { error } = await supabase
            .from("attendance_correction_requests")
            .delete()
            .eq("id", id)

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ message: "تم حذف الطلب بنجاح" })
    } catch {
        return NextResponse.json({ error: "حدث خطأ أثناء حذف الطلب" }, { status: 500 })
    }
}