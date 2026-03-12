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
        const department_ids = searchParams.get("department_ids")
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

/**
 * الدالة الأساسية: إنشاء كائن Date صحيح من التاريخ والوقت
 * هذه الدالة تحاكي طريقة عمل new Date() في تسجيل الحضور
 */
function createDateTimeFromLocal(date: string, time: string | null): Date | null {
    if (!time) return null;

    try {
        // تقسيم التاريخ (YYYY-MM-DD)
        const [year, month, day] = date.split('-').map(Number);

        // تقسيم الوقت (HH:mm)
        const [hours, minutes] = time.split(':').map(Number);

        // إنشاء كائن Date باستخدام التوقيت المحلي للمتصفح/السيرفر
        // هذا بالضبط ما يفعله new Date() عندما نستخدمه في تسجيل الحضور
        const localDate = new Date(year, month - 1, day, hours, minutes, 0);

        console.log(`🕒 إنشاء تاريخ محلي: ${date} ${time} -> ${localDate.toString()}`);
        console.log(`🕒 بصيغة ISO: ${localDate.toISOString()}`);

        return localDate;
    } catch (error) {
        console.error("خطأ في إنشاء التاريخ:", error);
        return null;
    }
}

// PATCH: الموافقة على طلب تصحيح بصمة (مع تحديث الحضور)
export async function PATCH(req: NextRequest) {
    try {
        const { id, action, approved_by, user_role, is_admin_as_manager } = await req.json()

        console.log("📝 معالجة طلب تصحيح:", { id, action, approved_by, user_role, is_admin_as_manager })

        if (!id || !action || !approved_by || !user_role) {
            return NextResponse.json({ error: "البيانات غير كاملة" }, { status: 400 })
        }

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

        let updateData: any = { updated_at: new Date() }

        // الحالة الخاصة: Admin هو مدير على القسم
        if (is_admin_as_manager && user_role === "hr") {
            console.log("🎯 Admin كمدير - موافقة كاملة فورية")
            updateData.hr_approved = true
            updateData.hr_approved_by = approved_by
            updateData.manager_approved = true
            updateData.manager_approved_by = approved_by
            updateData.status = "تمت الموافقة"

            // تحديث جدول الحضور - بنفس طريقة تسجيل الحضور
            console.log("🎯 اكتملت الموافقات - جاري تحديث الحضور")
            const employeeId = request.employee_id
            const targetDate = request.date

            console.log("👤 الموظف:", employeeId)
            console.log("📅 التاريخ:", targetDate)
            console.log("⏰ وقت الحضور المفترض:", request.expected_check_in)
            console.log("⏰ وقت الانصراف المفترض:", request.expected_check_out)

            // البحث عن سجل الحضور الموجود
            const { data: existingAttendance, error: searchError } = await supabase
                .from("attendance")
                .select("*")
                .eq("employee_id", employeeId)
                .eq("day", targetDate)
                .maybeSingle()

            console.log("🔍 سجل الحضور الموجود:", existingAttendance)

            const attendanceData: any = {
                employee_id: employeeId,
                day: targetDate
            }

            // ✅ استخدام نفس طريقة تسجيل الحضور بالضبط
            if (request.expected_check_in) {
                // إنشاء كائن Date بنفس طريقة new Date() في تسجيل الحضور
                const checkInDate = createDateTimeFromLocal(targetDate, request.expected_check_in);
                if (checkInDate) {
                    attendanceData.check_in = checkInDate.toISOString();
                    console.log("🕒 وقت الحضور بعد التحويل (ISO):", attendanceData.check_in);
                }
            }

            if (request.expected_check_out) {
                // إنشاء كائن Date بنفس طريقة new Date() في تسجيل الحضور
                const checkOutDate = createDateTimeFromLocal(targetDate, request.expected_check_out);
                if (checkOutDate) {
                    attendanceData.check_out = checkOutDate.toISOString();
                    console.log("🕒 وقت الانصراف بعد التحويل (ISO):", attendanceData.check_out);
                }
            }

            console.log("📦 بيانات الحضور الكاملة:", attendanceData);

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
        else if (user_role === "hr") {
            updateData.hr_approved = true
            updateData.hr_approved_by = approved_by
            console.log("✅ موافقة HR")

            if (request.manager_approved) {
                updateData.status = "تمت الموافقة"
                console.log("🎯 اكتملت الموافقات - جاري تحديث الحضور")

                const employeeId = request.employee_id
                const targetDate = request.date

                const { data: existingAttendance } = await supabase
                    .from("attendance")
                    .select("*")
                    .eq("employee_id", employeeId)
                    .eq("day", targetDate)
                    .maybeSingle()

                const attendanceData: any = {
                    employee_id: employeeId,
                    day: targetDate
                }

                if (request.expected_check_in) {
                    const checkInDate = createDateTimeFromLocal(targetDate, request.expected_check_in);
                    if (checkInDate) {
                        attendanceData.check_in = checkInDate.toISOString();
                    }
                }
                if (request.expected_check_out) {
                    const checkOutDate = createDateTimeFromLocal(targetDate, request.expected_check_out);
                    if (checkOutDate) {
                        attendanceData.check_out = checkOutDate.toISOString();
                    }
                }

                if (existingAttendance) {
                    await supabase
                        .from("attendance")
                        .update(attendanceData)
                        .eq("id", existingAttendance.id)
                } else {
                    await supabase
                        .from("attendance")
                        .insert([attendanceData])
                }
            }
        }
        else if (user_role === "manager") {
            updateData.manager_approved = true
            updateData.manager_approved_by = approved_by
            console.log("✅ موافقة مدير")

            if (request.hr_approved) {
                updateData.status = "تمت الموافقة"
                console.log("🎯 اكتملت الموافقات - جاري تحديث الحضور")

                const employeeId = request.employee_id
                const targetDate = request.date

                const { data: existingAttendance } = await supabase
                    .from("attendance")
                    .select("*")
                    .eq("employee_id", employeeId)
                    .eq("day", targetDate)
                    .maybeSingle()

                const attendanceData: any = {
                    employee_id: employeeId,
                    day: targetDate
                }

                if (request.expected_check_in) {
                    const checkInDate = createDateTimeFromLocal(targetDate, request.expected_check_in);
                    if (checkInDate) {
                        attendanceData.check_in = checkInDate.toISOString();
                    }
                }
                if (request.expected_check_out) {
                    const checkOutDate = createDateTimeFromLocal(targetDate, request.expected_check_out);
                    if (checkOutDate) {
                        attendanceData.check_out = checkOutDate.toISOString();
                    }
                }

                if (existingAttendance) {
                    await supabase
                        .from("attendance")
                        .update(attendanceData)
                        .eq("id", existingAttendance.id)
                } else {
                    await supabase
                        .from("attendance")
                        .insert([attendanceData])
                }
            }
        }
        else {
            return NextResponse.json({ error: "صلاحية غير صحيحة" }, { status: 400 })
        }

        const { error } = await supabase
            .from("attendance_correction_requests")
            .update(updateData)
            .eq("id", id)

        if (error) {
            console.error("❌ خطأ في تحديث الطلب:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        let message = ""
        if (is_admin_as_manager) {
            message = "✅ تمت الموافقة على طلب التصحيح (كـ Admin ومدير) وتحديث الحضور"
        } else if (user_role === "hr") {
            message = request.manager_approved
                ? "✅ تمت الموافقة على طلب التصحيح وتحديث الحضور"
                : "✅ تمت موافقة HR، في انتظار موافقة مدير"
        } else {
            message = request.hr_approved
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