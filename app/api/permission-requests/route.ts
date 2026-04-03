import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Function to calculate month range based on system settings
async function getMonthRange(referenceDate: Date) {
    // Fetch system settings from database
    const { data: settings } = await supabase
        .from("system_settings")
        .select("month_start_day, month_end_day")
        .eq("id", 1)
        .single()

    const startDay = settings?.month_start_day || 16
    const endDay = settings?.month_end_day || 15

    const year = referenceDate.getFullYear()
    const month = referenceDate.getMonth()
    const currentDay = referenceDate.getDate()

    let startDate: Date, endDate: Date

    if (currentDay >= startDay) {
        startDate = new Date(year, month, startDay)
        endDate = new Date(year, month + 1, endDay)
    } else {
        startDate = new Date(year, month - 1, startDay)
        endDate = new Date(year, month, endDay)
    }

    const startStr = startDate.toISOString().split('T')[0]
    const endStr = endDate.toISOString().split('T')[0]

    console.log("📅 Month range calculation:", {
        currentDate: referenceDate.toISOString().split('T')[0],
        currentDay,
        startDay,
        endDay,
        startDate: startStr,
        endDate: endStr
    })

    return {
        start: startStr,
        end: endStr
    }
}

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
            .from("permission_requests")
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

export async function POST(req: NextRequest) {
    try {
        const { employee_id, permission_type, date, start_time, end_time, reason } = await req.json()

        if (!employee_id || !permission_type || !date || !reason) {
            return NextResponse.json({
                error_ar: "جميع الحقول المطلوبة يجب إدخالها",
                error_en: "All required fields must be filled"
            }, { status: 400 })
        }

        if (!['hour', 'two_hours', 'half_day'].includes(permission_type)) {
            return NextResponse.json({
                error_ar: "نوع الإذن غير صحيح",
                error_en: "Invalid permission type"
            }, { status: 400 })
        }

        const requestDate = new Date(date)
        const monthRange = await getMonthRange(requestDate)

        // Check monthly hour limit for hour or two_hours permissions
        if (permission_type === "hour" || permission_type === "two_hours") {
            // Fetch max hours per month setting
            const { data: settings } = await supabase
                .from("system_settings")
                .select("max_hours_per_month")
                .eq("id", 1)
                .single()

            const maxHoursPerMonth = settings?.max_hours_per_month || 2

            // Fetch existing requests in current month
            const { data: existingRequests, error: fetchError } = await supabase
                .from("permission_requests")
                .select("permission_type, deducted_from_leave")
                .eq("employee_id", employee_id)
                .in("status", ["approved", "pending"])
                .gte("date", monthRange.start)
                .lte("date", monthRange.end)

            console.log("📊 Checking month range:", monthRange);
            console.log("📊 Existing requests in month:", existingRequests);

            if (fetchError) {
                return NextResponse.json({
                    error_ar: "خطأ في التحقق من الرصيد",
                    error_en: "Error checking balance"
                }, { status: 500 })
            }

            // Calculate total hours used in month
            let totalHoursInMonth = 0
            existingRequests?.forEach(req => {
                if (req.permission_type === "hour") totalHoursInMonth += 1
                else if (req.permission_type === "two_hours") totalHoursInMonth += 2
            })

            const requestedHours = permission_type === "hour" ? 1 : 2

            if (totalHoursInMonth + requestedHours > maxHoursPerMonth) {
                const remainingHours = maxHoursPerMonth - totalHoursInMonth
                return NextResponse.json({
                    error_ar: `لا يمكن تجاوز ${maxHoursPerMonth} ساعات في الشهر. المتبقي: ${remainingHours} ساعة`,
                    error_en: `Cannot exceed ${maxHoursPerMonth} hours per month. Remaining: ${remainingHours} hours`
                }, { status: 400 })
            }
        }

        // Check half-day permission (first one free per month)
        let deductedFromLeave = false
        if (permission_type === "half_day") {
            // Fetch half-day requests in current month only
            const { data: halfDayRequests, error: halfDayError } = await supabase
                .from("permission_requests")
                .select("id, deducted_from_leave")
                .eq("employee_id", employee_id)
                .eq("permission_type", "half_day")
                .in("status", ["approved", "pending"])
                .gte("date", monthRange.start)
                .lte("date", monthRange.end)

            console.log("📊 Half-day requests in current month:", halfDayRequests);
            console.log("📅 Month range:", monthRange);

            if (halfDayError) {
                return NextResponse.json({
                    error_ar: "خطأ في التحقق من طلبات نص اليوم",
                    error_en: "Error checking half-day requests"
                }, { status: 500 })
            }

            // If has previous half-day request in same month
            if (halfDayRequests && halfDayRequests.length > 0) {
                const hasFreeHalfDay = halfDayRequests.some(req => !req.deducted_from_leave)

                console.log("🔍 hasFreeHalfDay in current month:", hasFreeHalfDay);
                console.log("📝 deducted_from_leave values in current month:", halfDayRequests.map(r => r.deducted_from_leave));

                if (hasFreeHalfDay) {
                    // This is second request in same month - will deduct from leave
                    deductedFromLeave = true

                    console.log("💰 This is the second half-day request in the same month - will deduct from leave");

                    // Check leave balance
                    const { data: employee } = await supabase
                        .from("employees")
                        .select("current_year_leave_days, current_year_emergency_days")
                        .eq("id", employee_id)
                        .single()

                    if (employee) {
                        if (employee.current_year_leave_days < 0.5) {
                            if (employee.current_year_emergency_days < 0.5) {
                                return NextResponse.json({
                                    error_ar: "لا يوجد رصيد كافي في الإجازات لنصف يوم",
                                    error_en: "Insufficient leave balance for half day"
                                }, { status: 400 })
                            }
                        }
                    }
                } else {
                    console.log("✅ First half-day request in this month - free");
                }
            } else {
                console.log("🎉 First half-day request in this month - free");
            }
        }

        console.log("🚀 Submitting request with deductedFromLeave =", deductedFromLeave);
        console.log("📅 Month range saved:", monthRange);

        const { error } = await supabase
            .from("permission_requests")
            .insert([{
                employee_id,
                permission_type,
                date,
                start_time: start_time || null,
                end_time: end_time || null,
                reason,
                hr_approved: false,
                manager_approved: false,
                status: "pending",
                deducted_from_leave: deductedFromLeave,
                month_start: monthRange.start,
                month_end: monthRange.end
            }])

        if (error) {
            return NextResponse.json({
                error_ar: error.message,
                error_en: error.message
            }, { status: 500 })
        }

        let message_ar = "", message_en = ""
        if (permission_type === "half_day" && deductedFromLeave) {
            message_ar = "تم تقديم طلب الإذن (سيتم خصم نصف يوم من الإجازات)"
            message_en = "Permission request submitted (will be deducted from leave balance)"
        } else if (permission_type === "half_day") {
            message_ar = "تم تقديم طلب الإذن (نصف يوم مجاني)"
            message_en = "Permission request submitted (free half day)"
        } else {
            message_ar = "تم تقديم طلب الإذن بنجاح"
            message_en = "Permission request submitted successfully"
        }

        return NextResponse.json({ message_ar, message_en })

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

        console.log("🔍 PATCH received:", { id, action, approved_by, user_role, is_admin_as_manager });

        if (!id || !action || !approved_by || !user_role) {
            return NextResponse.json({
                error_ar: "البيانات غير كاملة",
                error_en: "Incomplete data"
            }, { status: 400 })
        }

        const { data: request, error: fetchError } = await supabase
            .from("permission_requests")
            .select("*")
            .eq("id", id)
            .single()

        console.log("📋 Request found:", request);

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
                .from("permission_requests")
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

        if (is_admin_as_manager && user_role === "hr") {
            console.log("✅ Admin approving as manager");
            updateData.hr_approved = true
            updateData.hr_approved_by = approved_by
            updateData.manager_approved = true
            updateData.manager_approved_by = approved_by
            updateData.status = "approved"

            // If half-day permission with deduction from leave
            if (request.permission_type === "half_day" && request.deducted_from_leave) {
                console.log("💰 Attempting to deduct 0.5 day from leave balance");
                console.log("📊 Request details:", {
                    permission_type: request.permission_type,
                    deducted_from_leave: request.deducted_from_leave,
                    employee_id: request.employee_id
                });

                const { data: employee, error: empError } = await supabase
                    .from("employees")
                    .select("current_year_leave_days, current_year_emergency_days")
                    .eq("id", request.employee_id)
                    .single()

                if (empError) {
                    console.error("❌ Error fetching employee:", empError);
                } else if (employee) {
                    if (employee.current_year_leave_days > 0.5) {
                        const newUsedDays = (employee.current_year_leave_days) - 0.5
                        const { error: updateError } = await supabase
                            .from("employees")
                            .update({ current_year_leave_days: newUsedDays })
                            .eq("id", request.employee_id)

                        if (updateError) {
                            console.error("❌ Error updating leave balance:", updateError);
                        } else {
                            console.log("✅ Leave balance updated successfully");
                        }
                    }
                    else {
                        const newUsedDays = (employee.current_year_emergency_days) - 0.5
                        const { error: updateError } = await supabase
                            .from("employees")
                            .update({ current_year_emergency_days: newUsedDays })
                            .eq("id", request.employee_id)

                        if (updateError) {
                            console.error("❌ Error updating leave balance:", updateError);
                        } else {
                            console.log("✅ Leave balance updated successfully");
                        }
                    }
                }
            }
        }
        else if (user_role === "hr") {
            console.log("✅ HR approving");
            updateData.hr_approved = true
            updateData.hr_approved_by = approved_by

            if (request.manager_approved) {
                updateData.status = "approved"

                // If half-day permission with deduction from leave
                if (request.permission_type === "half_day" && request.deducted_from_leave) {
                    console.log("💰 Attempting to deduct 0.5 day from leave balance");
                    console.log("📊 Request details:", {
                        permission_type: request.permission_type,
                        deducted_from_leave: request.deducted_from_leave,
                        employee_id: request.employee_id
                    });

                    const { data: employee, error: empError } = await supabase
                        .from("employees")
                        .select("used_leave_days")
                        .eq("id", request.employee_id)
                        .single()

                    if (empError) {
                        console.error("❌ Error fetching employee:", empError);
                    } else if (employee) {
                        const newUsedDays = (employee.used_leave_days || 0) + 0.5
                        console.log(`📊 Old balance: ${employee.used_leave_days}, New balance: ${newUsedDays}`);

                        const { error: updateError } = await supabase
                            .from("employees")
                            .update({ used_leave_days: newUsedDays })
                            .eq("id", request.employee_id)

                        if (updateError) {
                            console.error("❌ Error updating leave balance:", updateError);
                        } else {
                            console.log("✅ Leave balance updated successfully");
                        }
                    }
                }
            }
        }
        else if (user_role === "manager") {
            console.log("✅ Manager approving");
            updateData.manager_approved = true
            updateData.manager_approved_by = approved_by

            if (request.hr_approved) {
                updateData.status = "approved"

                // If half-day permission with deduction from leave
                if (request.permission_type === "half_day" && request.deducted_from_leave) {
                    console.log("💰 Attempting to deduct 0.5 day from leave balance");
                    console.log("📊 Request details:", {
                        permission_type: request.permission_type,
                        deducted_from_leave: request.deducted_from_leave,
                        employee_id: request.employee_id
                    });

                    const { data: employee, error: empError } = await supabase
                        .from("employees")
                        .select("used_leave_days")
                        .eq("id", request.employee_id)
                        .single()

                    if (empError) {
                        console.error("❌ Error fetching employee:", empError);
                    } else if (employee) {
                        const newUsedDays = (employee.used_leave_days || 0) + 0.5
                        console.log(`📊 Old balance: ${employee.used_leave_days}, New balance: ${newUsedDays}`);

                        const { error: updateError } = await supabase
                            .from("employees")
                            .update({ used_leave_days: newUsedDays })
                            .eq("id", request.employee_id)

                        if (updateError) {
                            console.error("❌ Error updating leave balance:", updateError);
                        } else {
                            console.log("✅ Leave balance updated successfully");
                        }
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
            .from("permission_requests")
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
            if (request.permission_type === "half_day" && request.deducted_from_leave) {
                message_ar = "تمت الموافقة على الطلب (تم خصم نصف يوم من الإجازات)"
                message_en = "Request approved (half day deducted from leave balance)"
            } else if (request.permission_type === "half_day") {
                message_ar = "تمت الموافقة على الطلب (نصف يوم مجاني)"
                message_en = "Request approved (free half day)"
            } else {
                message_ar = "تمت الموافقة على الطلب بنجاح"
                message_en = "Request approved successfully"
            }
        } else if (user_role === "hr") {
            if (request.manager_approved) {
                if (request.permission_type === "half_day" && request.deducted_from_leave) {
                    message_ar = "تمت الموافقة على الطلب (تم خصم نصف يوم من الإجازات)"
                    message_en = "Request approved (half day deducted from leave balance)"
                } else if (request.permission_type === "half_day") {
                    message_ar = "تمت الموافقة على الطلب (نصف يوم مجاني)"
                    message_en = "Request approved (free half day)"
                } else {
                    message_ar = "تمت الموافقة على الطلب بنجاح"
                    message_en = "Request approved successfully"
                }
            } else {
                message_ar = "تمت موافقة HR، في انتظار موافقة المدير"
                message_en = "HR approved, waiting for manager"
            }
        } else {
            if (request.hr_approved) {
                if (request.permission_type === "half_day" && request.deducted_from_leave) {
                    message_ar = "تمت الموافقة على الطلب (تم خصم نصف يوم من الإجازات)"
                    message_en = "Request approved (half day deducted from leave balance)"
                } else if (request.permission_type === "half_day") {
                    message_ar = "تمت الموافقة على الطلب (نصف يوم مجاني)"
                    message_en = "Request approved (free half day)"
                } else {
                    message_ar = "تمت الموافقة على الطلب بنجاح"
                    message_en = "Request approved successfully"
                }
            } else {
                message_ar = "تمت موافقة المدير، في انتظار موافقة HR"
                message_en = "Manager approved, waiting for HR"
            }
        }

        return NextResponse.json({ message_ar, message_en })

    } catch (error) {
        console.error("❌ Error in PATCH:", error);
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
            .from("permission_requests")
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
            .from("permission_requests")
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