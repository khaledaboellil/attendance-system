// app/api/attendance-correction/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getTimezoneOffset } from 'date-fns-tz'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ✅ دالة لحساب فرق التوقيت بين مصر والتوقيت المحلي
function getEgyptTimeDifference(): number {
    // الوقت الحالي بتوقيت مصر
    const now = new Date()
    const egyptTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Cairo' }))

    // الفرق بالساعات
    const diffHours = (egyptTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    return Math.round(diffHours)
}

// ✅ دالة لطرح الفرق من الوقت
function subtractHours(date: Date): Date {
    const diff = getEgyptTimeDifference()
    const result = new Date(date)
    result.setHours(result.getHours() - diff)
    return result
}

function createTimestamp(dateStr: string, timeValue: string | null): string | null {
    if (!timeValue) return null

    // لو كان already full timestamp
    if (timeValue.includes('T') && timeValue.includes('-')) {
        const parsedDate = new Date(timeValue)
        if (!isNaN(parsedDate.getTime())) {
            const adjustedDate = subtractHours(parsedDate)
            return adjustedDate.toISOString()
        }
    }

    // استخراج الوقت فقط
    let timeOnly = timeValue
    if (timeValue.includes('T')) {
        timeOnly = timeValue.split('T')[1]
    }

    // إنشاء التاريخ
    const fullDateTime = `${dateStr}T${timeOnly}:00`
    const date = new Date(fullDateTime)

    if (isNaN(date.getTime())) {
        return null
    }

    const adjustedDate = subtractHours(date)
    return adjustedDate.toISOString()
}

// ... باقي الكود (GET, POST, PATCH, DELETE) نفس ما هو

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
                query = query.neq("status", "rejected").neq("status", "approved")
            } else if (status === "approved") {
                query = query.eq("status", "approved")
            } else if (status === "rejected") {
                query = query.eq("status", "rejected")
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

// app/api/attendance-correction/route.ts - POST function كاملة

export async function POST(req: NextRequest) {
    try {
        const { employee_id, date, expected_check_in, expected_check_out, reason } = await req.json()

        console.log("📥 Received:", { employee_id, date, expected_check_in, expected_check_out, reason })

        // التحقق من الحقول المطلوبة
        if (!employee_id) {
            return NextResponse.json({
                error_ar: "جميع الحقول المطلوبة يجب إدخالها",
                error_en: "All required fields must be filled"
            }, { status: 400 })
        }

        if (!date) {
            return NextResponse.json({
                error_ar: "التاريخ مطلوب",
                error_en: "Date is required"
            }, { status: 400 })
        }

        // ✅ نفس طريقة كود الحضور بالضبط
        const checkInTimestamp = createTimestamp(date, expected_check_in)
        const checkOutTimestamp = createTimestamp(date, expected_check_out)

        console.log("✅ Formatted:", { checkInTimestamp, checkOutTimestamp })

        // التأكد من وجود وقت واحد على الأقل
        if (!checkInTimestamp && !checkOutTimestamp) {
            return NextResponse.json({
                error_ar: "يجب تحديد وقت الحضور أو الانصراف بشكل صحيح",
                en: "Please specify a valid check-in or check-out time"
            }, { status: 400 })
        }

        // التحقق من وجود طلب قيد الانتظار لنفس اليوم
        const { data: existingRequests, error: checkError } = await supabase
            .from("attendance_correction_requests")
            .select("*")
            .eq("employee_id", employee_id)
            .eq("status", "pending")

        if (checkError) {
            console.error("Error checking existing requests:", checkError)
        }

        // فلترة النتائج لمقارنة التاريخ
        const existingOnSameDate = existingRequests?.filter(req => {
            const reqDate = req.check_in
                ? new Date(req.check_in).toISOString().split('T')[0]
                : req.check_out
                    ? new Date(req.check_out).toISOString().split('T')[0]
                    : null
            return reqDate === date
        })

        if (existingOnSameDate && existingOnSameDate.length > 0) {
            return NextResponse.json({
                error_ar: "لديك طلب قيد الانتظار لنفس اليوم",
                error_en: "You already have a pending request for this date"
            }, { status: 400 })
        }

        // إدراج الطلب في قاعدة البيانات
        const { data, error } = await supabase
            .from("attendance_correction_requests")
            .insert([{
                employee_id,
                check_in: checkInTimestamp,
                check_out: checkOutTimestamp,
                reason,
                hr_approved: false,
                manager_approved: false,
                status: "pending",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }])
            .select()

        if (error) {
            console.error("Insert error:", error)
            return NextResponse.json({
                error_ar: `خطأ في قاعدة البيانات: ${error.message}`,
                error_en: `Database error: ${error.message}`
            }, { status: 500 })
        }

        console.log("✅ Request created successfully:", data)

        return NextResponse.json({
            message_ar: "تم تقديم طلب التصحيح بنجاح",
            message_en: "Correction request submitted successfully"
        })

    } catch (error) {
        console.error("POST error:", error)
        return NextResponse.json({
            error_ar: `حدث خطأ أثناء إنشاء الطلب: ${error instanceof Error ? error.message : 'Unknown error'}`,
            error_en: `Error creating request: ${error instanceof Error ? error.message : 'Unknown error'}`
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
            .from("attendance_correction_requests")
            .select(`*, employees:employee_id (id, name)`)
            .eq("id", id)
            .single()

        if (fetchError || !request) {
            return NextResponse.json({
                error_ar: "الطلب غير موجود",
                error_en: "Request not found"
            }, { status: 404 })
        }

        if (request.status === "rejected" || request.status === "approved") {
            return NextResponse.json({
                error_ar: "لا يمكن تعديل طلب منتهي",
                error_en: "Cannot modify a completed request"
            }, { status: 400 })
        }

        if (action === "reject") {
            const { error } = await supabase
                .from("attendance_correction_requests")
                .update({
                    status: "rejected",
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
        let shouldUpdateAttendance = false

        if (is_admin_as_manager && user_role === "hr") {
            updateData.hr_approved = true
            updateData.hr_approved_by = approved_by
            updateData.manager_approved = true
            updateData.manager_approved_by = approved_by
            updateData.status = "approved"
            shouldUpdateAttendance = true
        }
        else if (user_role === "hr") {
            updateData.hr_approved = true
            updateData.hr_approved_by = approved_by
            if (request.manager_approved) {
                updateData.status = "approved"
                shouldUpdateAttendance = true
            }
        }
        else if (user_role === "manager") {
            updateData.manager_approved = true
            updateData.manager_approved_by = approved_by
            if (request.hr_approved) {
                updateData.status = "approved"
                shouldUpdateAttendance = true
            }
        }
        else {
            return NextResponse.json({
                error_ar: "صلاحية غير صحيحة",
                error_en: "Invalid role"
            }, { status: 400 })
        }

        // عند الموافقة، نقل البيانات إلى جدول attendance
        if (shouldUpdateAttendance) {
            const employeeId = request.employee_id

            // استخراج التاريخ من check_in أو check_out
            let attendanceDate = null
            if (request.check_in) {
                attendanceDate = new Date(request.check_in).toISOString().split('T')[0]
            } else if (request.check_out) {
                attendanceDate = new Date(request.check_out).toISOString().split('T')[0]
            }

            if (attendanceDate) {
                const attendanceData: any = {
                    employee_id: employeeId,
                    day: attendanceDate,
                    location: `تم التصحيح بواسطة ${user_role}`
                }

                if (request.check_in) attendanceData.check_in = request.check_in
                if (request.check_out) attendanceData.check_out = request.check_out

                const { data: existingAttendance } = await supabase
                    .from("attendance")
                    .select("*")
                    .eq("employee_id", employeeId)
                    .eq("day", attendanceDate)
                    .maybeSingle()

                if (existingAttendance) {
                    await supabase
                        .from("attendance")
                        .update({
                            check_in: request.check_in || existingAttendance.check_in,
                            check_out: request.check_out || existingAttendance.check_out,
                            location: attendanceData.location
                        })
                        .eq("id", existingAttendance.id)
                } else {
                    await supabase
                        .from("attendance")
                        .insert([attendanceData])
                }
            }
        }

        const { error } = await supabase
            .from("attendance_correction_requests")
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
            message_ar = "تمت الموافقة على طلب التصحيح وتحديث الحضور"
            message_en = "Correction request approved and attendance updated"
        } else if (user_role === "hr") {
            if (request.manager_approved) {
                message_ar = "تمت الموافقة على طلب التصحيح وتحديث الحضور"
                message_en = "Correction request approved and attendance updated"
            } else {
                message_ar = "تمت موافقة HR، في انتظار موافقة مدير"
                message_en = "HR approved, waiting for manager"
            }
        } else {
            if (request.hr_approved) {
                message_ar = "تمت الموافقة على طلب التصحيح وتحديث الحضور"
                message_en = "Correction request approved and attendance updated"
            } else {
                message_ar = "تمت موافقة مدير، في انتظار موافقة HR"
                message_en = "Manager approved, waiting for HR"
            }
        }

        return NextResponse.json({ message_ar, message_en })

    } catch (error) {
        console.error("PATCH error:", error)
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
            .from("attendance_correction_requests")
            .select("*")
            .eq("id", id)
            .eq("employee_id", employee_id)
            .eq("status", "pending")
            .single()

        if (fetchError || !request) {
            return NextResponse.json({
                error_ar: "لا يمكن حذف هذا الطلب",
                error_en: "Cannot delete this request"
            }, { status: 404 })
        }

        const { error } = await supabase
            .from("attendance_correction_requests")
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