port { NextResponse, NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

// ========================
// إنشاء طلب إجازة (Employee)
// ========================
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { employee_id: username, start_date, end_date, reason, type } = body;

        // 1️⃣ جلب الـid من username
        const { data: user, error: userError } = await supabase
            .from("employees")
            .select("id")
            .eq("username", username)
            .single();

        if (userError || !user) {
            return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 });
        }

        // 2️⃣ إدراج طلب الإجازة
        const { data, error } = await supabase
            .from("leave_requests")
            .insert([{
                employee_id: user.id,  // ← استخدم الـid الحقيقي
                start_date,
                end_date,
                reason,
                type,
                status: "pending_manager",
            }]);

        if (error)
            return NextResponse.json({ error: error.message }, { status: 400 });

        return NextResponse.json(data);

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ========================
// جلب الطلبات حسب الدور
// ========================


// ========================
// الموافقة أو الرفض
// ========================
export async function PATCH(req: Request) {
    const body = await req.json();
    const { request_id, user_id, action } = body;

    const { data: user } = await supabase
        .from("employees")
        .select("*")
        .eq("id", user_id)
        .single();

    if (!user)
        return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Manager Approval
    if (user.role === "manager" && action === "approve") {
        await supabase
            .from("leave_requests")
            .update({ status: "pending_hr" })
            .eq("id", request_id);
    }

    // HR Final Approval
    if (user.role === "hr" && action === "approve") {
        await supabase
            .from("leave_requests")
            .update({ status: "approved" })
            .eq("id", request_id);
    }

    // Reject
    if (action === "reject") {
        await supabase
            .from("leave_requests")
            .update({ status: "rejected" })
            .eq("id", request_id);
    }

    return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
    try {
        const { id } = await req.json(); // ← هنا مهم يكون نفس المفتاح اللي ابعته

        // نتحقق إن الطلب موجود وحالته pending_manager
        const { data: leave, error: fetchError } = await supabase
            .from("leave_requests")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !leave) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
        if (leave.status !== "pending_manager") return NextResponse.json({ error: "لا يمكن حذف هذا الطلب" }, { status: 400 });

        // حذف الطلب
        const { error } = await supabase
            .from("leave_requests")
            .delete()
            .eq("id", id);

        if (error) return NextResponse.json({ error: error.message }, { status: 400 });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "حدث خطأ أثناء الحذف" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId)
        return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    // نجيب بيانات الشخص
    const { data: user } = await supabase
        .from("employees")
        .select("*")
        .eq("username", userId)
        .single();

    if (!user)
        return NextResponse.json({ error: "User not found" }, { status: 404 });

    // ========================
    // Employee
    // ========================
    if (user.role === "employee") {
        const { data } = await supabase
            .from("leave_requests")
            .select("*")
            .eq("employee_id", user.id);

        return NextResponse.json(data);
    }

    // ========================
    // Manager
    // ========================
    if (user.role === "manager") {
        // نجيب القسم اللي هو مديره
        const { data: department } = await supabase
            .from("departments")
            .select("*")
            .eq("manager_id", user.id)
            .single();

        if (!department) return NextResponse.json([]);

        const { data } = await supabase
            .from("leave_requests")
            .select("*, employees(*)")
            .eq("employees.department_id", department.id)
            .eq("status", "pending_manager");

        return NextResponse.json(data);
    }

    // ========================
    // HR (Admin عام)
    // ========================
    if (user.role === "admin") {
        const { data } = await supabase
            .from("leave_requests")
            .select("*");

        return NextResponse.json(data);
    }

    return NextResponse.json([]);
}