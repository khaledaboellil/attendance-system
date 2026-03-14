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

        if (employee_id) query = query.eq("employee_id", employee_id)
        if (from) query = query.gte("start_date", from)
        if (to) query = query.lte("end_date", to)

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

    } catch (error) {
        return NextResponse.json({
            error_ar: "حدث خطأ أثناء جلب الطلبات",
            error_en: "Error fetching requests"
        }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const { employee_id, leave_type, start_date, end_date, reason } = await req.json()

        if (!employee_id || !leave_type || !start_date || !end_date) {
            return NextResponse.json({
                error_ar: "جميع الحقول المطلوبة يجب إدخالها",
                error_en: "All required fields must be filled"
            }, { status: 400 })
        }

        const allowedTypes = ['سنوية', 'مرضية', 'عارضة', 'غير مدفوعة'];
        if (!allowedTypes.includes(leave_type)) {
            return NextResponse.json({
                error_ar: "نوع الإجازة غير مسموح به",
                error_en: "Leave type not allowed"
            }, { status: 400 });
        }

        const start = new Date(start_date)
        const end = new Date(end_date)
        const requestedDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

        // جلب بيانات الموظف
        const { data: employee, error: empError } = await supabase
            .from("employees")
            .select("current_year_leave_days, current_year_emergency_days")
            .eq("id", employee_id)
            .single()

        if (empError || !employee) {
            return NextResponse.json({
                error_ar: "خطأ في جلب بيانات الموظف",
                error_en: "Error fetching employee data"
            }, { status: 500 })
        }

        // جلب الطلبات السابقة (معتمدة + معلقة) لنفس السنة
        const currentYear = new Date().getFullYear()
        const yearStart = `${currentYear}-01-01`
        const yearEnd = `${currentYear}-12-31`

        const { data: allRequests } = await supabase
            .from("leave_requests")
            .select("start_date, end_date, leave_type, status")
            .eq("employee_id", employee_id)
            .gte("start_date", yearStart)
            .lte("end_date", yearEnd)

        if (leave_type === "سنوية") {
            // حساب الإجازات السنوية المستخدمة من الطلبات (معتمدة + معلقة)
            let usedAnnual = 0
            allRequests?.forEach(req => {
                if (req.leave_type === "سنوية" && req.status !== "مرفوضة" && req.status !== "معتمدة")
                { // معلقة أو معتمدة
                    const s = new Date(req.start_date)
                    const e = new Date(req.end_date)
                    const days = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1
                    usedAnnual += days
                }
            })

            const total = employee.current_year_leave_days
            const remaining = total - usedAnnual

            if (requestedDays > remaining) {
                return NextResponse.json({
                    error_ar: `لا يوجد رصيد كافٍ. رصيدك المتبقي: ${remaining} يوم (بما في ذلك الطلبات المعلقة)`,
                    error_en: `Insufficient balance. Your remaining balance: ${remaining} days (including pending requests)`
                }, { status: 400 })
            }
        }
        else if (leave_type === "عارضة") {
            // حساب الإجازات العارضة المستخدمة من الطلبات (معتمدة + معلقة)
            let usedEmergency = 0
            allRequests?.forEach(req => {
                if (req.leave_type === "عارضة" && req.status !== "مرفوضة" && req.status !== "معتمدة")
                { // معلقة أو معتمدة
                    const s = new Date(req.start_date)
                    const e = new Date(req.end_date)
                    const days = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1
                    usedEmergency += days
                }
            })

            const emergencyTotal = employee.current_year_emergency_days
            const remainingEmergency = emergencyTotal - usedEmergency

            if (requestedDays > remainingEmergency) {
                return NextResponse.json({
                    error_ar: `لا يوجد رصيد إجازات عارضة كافٍ. المتبقي: ${remainingEmergency} يوم (بما في ذلك الطلبات المعلقة)`,
                    error_en: `Insufficient emergency leave balance. Remaining: ${remainingEmergency} days (including pending requests)`
                }, { status: 400 })
            }
        }

        // التحقق من عدم وجود طلب مكرر في نفس الفترة
        const { data: existing, error: existingError } = await supabase
            .from("leave_requests")
            .select("*")
            .eq("employee_id", employee_id)
            .eq("status", "قيد الانتظار")
            .or(`and(start_date.lte.${end_date},end_date.gte.${start_date})`)

        if (existing && existing.length > 0) {
            return NextResponse.json({
                error_ar: "لديك طلب إجازة في نفس الفترة قيد المراجعة",
                error_en: "You already have a pending leave request for this period"
            }, { status: 400 })
        }

        // إنشاء الطلب الجديد
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

        if (error) {
            return NextResponse.json({
                error_ar: error.message,
                error_en: error.message
            }, { status: 500 })
        }

        return NextResponse.json({
            message_ar: "تم تقديم طلب الإجازة بنجاح",
            message_en: "Leave request submitted successfully"
        })

    } catch (error) {
        console.error("Error in POST:", error)
        return NextResponse.json({
            error_ar: "حدث خطأ أثناء إنشاء الطلب",
            error_en: "Error creating request"
        }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const { id, action, approved_by, user_role, is_admin_as_manager } = await req.json()

        console.log("🔍 PATCH received:", { id, action, approved_by, user_role, is_admin_as_manager })

        if (!id || !action || !approved_by || !user_role) {
            return NextResponse.json({
                error_ar: "البيانات غير كاملة",
                error_en: "Incomplete data"
            }, { status: 400 })
        }

        const { data: request, error: fetchError } = await supabase
            .from("leave_requests")
            .select(`
                *,
                employees:employee_id (name, department_id)
            `)
            .eq("id", id)
            .single()

        console.log("📋 Request found:", request)

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
                .from("leave_requests")
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

        // حساب عدد الأيام
        const start = new Date(request.start_date)
        const end = new Date(request.end_date)
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

        let updateData: any = { updated_at: new Date() }

        if (is_admin_as_manager && user_role === "hr") {
            updateData.hr_approved = true
            updateData.hr_approved_by = approved_by
            updateData.manager_approved = true
            updateData.manager_approved_by = approved_by
            updateData.status = "تمت الموافقة"

            // تحديث رصيد الموظف
            if (request.leave_type === "سنوية") {
                // جلب الرصيد الحالي أولاً
                const { data: employee, error: empError } = await supabase
                    .from("employees")
                    .select("current_year_leave_days")
                    .eq("id", request.employee_id)
                    .single()

                if (empError) {
                    console.error("❌ Error fetching employee balance:", empError)
                } else if (employee) {
                    const newBalance = (employee.current_year_leave_days) - days
                    console.log(`📊 Old balance: ${employee.current_year_leave_days}, New balance: ${newBalance}`)

                    const { error: updateError } = await supabase
                        .from("employees")
                        .update({ current_year_leave_days: newBalance })
                        .eq("id", request.employee_id)

                    if (updateError) {
                        console.error("❌ Error updating leave balance:", updateError)
                    } else {
                        console.log("✅ Leave balance updated successfully")
                    }
                }
            } else if (request.leave_type === "عارضة") {
                // جلب الرصيد الحالي أولاً
                const { data: employee, error: empError } = await supabase
                    .from("employees")
                    .select("current_year_emergency_days")
                    .eq("id", request.employee_id)
                    .single()

                if (empError) {
                    console.error("❌ Error fetching emergency balance:", empError)
                } else if (employee) {
                    const newBalance = (employee.current_year_emergency_days) - days
                    console.log(`📊 Old emergency balance: ${employee.current_year_emergency_days}, New balance: ${newBalance}`)

                    const { error: updateError } = await supabase
                        .from("employees")
                        .update({ current_year_emergency_days: newBalance })
                        .eq("id", request.employee_id)

                    if (updateError) {
                        console.error("❌ Error updating emergency balance:", updateError)
                    } else {
                        console.log("✅ Emergency balance updated successfully")
                    }
                }
            }
        }
        else if (user_role === "hr") {
            updateData.hr_approved = true
            updateData.hr_approved_by = approved_by

            if (request.manager_approved) {
                updateData.status = "تمت الموافقة"

                // تحديث رصيد الموظف
                if (request.leave_type === "سنوية") {
                    const { data: employee, error: empError } = await supabase
                        .from("employees")
                        .select("current_year_leave_days")
                        .eq("id", request.employee_id)
                        .single()

                    if (empError) {
                        console.error("❌ Error fetching employee balance:", empError)
                    } else if (employee) {
                        const newBalance = (employee.current_year_leave_days) - days
                        await supabase
                            .from("employees")
                            .update({ current_year_leave_days: newBalance })
                            .eq("id", request.employee_id)
                    }
                } else if (request.leave_type === "عارضة") {
                    const { data: employee, error: empError } = await supabase
                        .from("employees")
                        .select("current_year_emergency_days")
                        .eq("id", request.employee_id)
                        .single()

                    if (empError) {
                        console.error("❌ Error fetching emergency balance:", empError)
                    } else if (employee) {
                        const newBalance = (employee.current_year_emergency_days) - days
                        await supabase
                            .from("employees")
                            .update({ current_year_emergency_days: newBalance })
                            .eq("id", request.employee_id)
                    }
                }
            }
        }
        else if (user_role === "manager") {
            updateData.manager_approved = true
            updateData.manager_approved_by = approved_by

            if (request.hr_approved) {
                updateData.status = "تمت الموافقة"

                // تحديث رصيد الموظف
                if (request.leave_type === "سنوية") {
                    const { data: employee, error: empError } = await supabase
                        .from("employees")
                        .select("current_year_leave_days")
                        .eq("id", request.employee_id)
                        .single()

                    if (empError) {
                        console.error("❌ Error fetching employee balance:", empError)
                    } else if (employee) {
                        const newBalance = (employee.current_year_leave_days) - days
                        await supabase
                            .from("employees")
                            .update({ current_year_leave_days: newBalance })
                            .eq("id", request.employee_id)
                    }
                } else if (request.leave_type === "عارضة") {
                    const { data: employee, error: empError } = await supabase
                        .from("employees")
                        .select("current_year_emergency_days")
                        .eq("id", request.employee_id)
                        .single()

                    if (empError) {
                        console.error("❌ Error fetching emergency balance:", empError)
                    } else if (employee) {
                        const newBalance = (employee.current_year_emergency_days) - days
                        await supabase
                            .from("employees")
                            .update({ current_year_emergency_days: newBalance })
                            .eq("id", request.employee_id)
                    }
                }
            }
        }
        else {
            return NextResponse.json({
                error_ar: "صلاحية غير صحيحة",
                error_en: "Invalid role"
            }, { status: 400 })
        }

        const { error } = await supabase
            .from("leave_requests")
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

    } catch (error) {
        console.error("❌ Error in PATCH:", error)
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
            .from("leave_requests")
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
            .from("leave_requests")
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

    } catch (error) {
        console.error("Error in DELETE:", error)
        return NextResponse.json({
            error_ar: "حدث خطأ أثناء حذف الطلب",
            error_en: "Error deleting request"
        }, { status: 500 })
    }
}