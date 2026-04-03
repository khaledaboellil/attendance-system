import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
    try {
        const { data, error } = await supabase
            .from("employees")
            .select("id, name, username, role, job_title, department_id, hire_date, current_year_leave_days, current_year_emergency_days, is_location_flexible")
            .order("name", { ascending: true })

        if (error) {
            console.error("Error fetching employees:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data || [])
    } catch (error) {
        console.error("Unexpected error:", error)
        return NextResponse.json({ error: "Error fetching employees" }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const {
            name,
            username,
            password,
            role,
            job_title,
            department_id,
            hire_date,
            current_year_leave_days,
            current_year_emergency_days,
            is_location_flexible
        } = await req.json()

        if (!name || !username || !password || !role) {
            return NextResponse.json({ error: "All required fields must be filled" }, { status: 400 })
        }

        const { data: existing, error: checkError } = await supabase
            .from("employees")
            .select("id")
            .eq("username", username)
            .maybeSingle()

        if (checkError) {
            console.error("Error checking existing user:", checkError)
            return NextResponse.json({ error: checkError.message }, { status: 500 })
        }

        if (existing) {
            return NextResponse.json({ error: "User already exists" }, { status: 400 })
        }

        const defaultLocations = [
            "a89a4bbf-83db-403b-b66d-4cb40250bd3d",
            "e2b17a94-a54e-4cb1-905d-9f13d2df3e20",
            "5bfa4c9c-08f5-442d-8441-f2cdd7e624da",
            "4d6aaa7a-9315-47e4-9d58-a0d27bf0a97c"
        ]

        const { data, error } = await supabase
            .from("employees")
            .insert([{
                name,
                username,
                password,
                role,
                job_title: job_title || null,
                department_id: department_id || null,
                hire_date: hire_date || null,
                locations: defaultLocations,
                current_year_leave_days: current_year_leave_days || 21,
                current_year_emergency_days: current_year_emergency_days || 7,
                is_location_flexible: is_location_flexible || false
            }])
            .select()
            .single()

        if (error) {
            console.error("Error adding employee:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            message: "Employee added successfully",
            employee: data
        })
    } catch (error) {
        console.error("Unexpected error:", error)
        return NextResponse.json({ error: "Error adding employee" }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
    try {
        const {
            id,
            name,
            username,
            role,
            job_title,
            department_id,
            hire_date,
            current_year_leave_days,
            current_year_emergency_days,
            is_location_flexible
        } = await req.json()

        if (!id || !name || !username || !role) {
            return NextResponse.json({ error: "All required fields must be filled" }, { status: 400 })
        }

        const { data: existing, error: checkError } = await supabase
            .from("employees")
            .select("id")
            .eq("username", username)
            .neq("id", id)
            .maybeSingle()

        if (checkError) {
            console.error("Error checking existing user:", checkError)
            return NextResponse.json({ error: checkError.message }, { status: 500 })
        }

        if (existing) {
            return NextResponse.json({ error: "Username already taken" }, { status: 400 })
        }

        const { data, error } = await supabase
            .from("employees")
            .update({
                name,
                username,
                role,
                job_title: job_title || null,
                department_id: department_id || null,
                hire_date: hire_date || null,
                current_year_leave_days,
                current_year_emergency_days,
                is_location_flexible
            })
            .eq("id", id)
            .select()
            .single()

        if (error) {
            console.error("Error updating employee:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            message: "Employee updated successfully",
            employee: data
        })
    } catch (error) {
        console.error("Unexpected error:", error)
        return NextResponse.json({ error: "Error updating employee" }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const updates = await req.json()
        const { id, ...fields } = updates

        if (!id) {
            return NextResponse.json({ error: "ID is required" }, { status: 400 })
        }

        if (fields.username) {
            const { data: existing, error: checkError } = await supabase
                .from("employees")
                .select("id")
                .eq("username", fields.username)
                .neq("id", id)
                .maybeSingle()

            if (checkError) {
                console.error("Error checking existing user:", checkError)
                return NextResponse.json({ error: checkError.message }, { status: 500 })
            }

            if (existing) {
                return NextResponse.json({ error: "Username already taken" }, { status: 400 })
            }
        }

        const { data, error } = await supabase
            .from("employees")
            .update(fields)
            .eq("id", id)
            .select()
            .single()

        if (error) {
            console.error("Error updating employee:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            message: "Employee updated successfully",
            employee: data
        })
    } catch (error) {
        console.error("Unexpected error:", error)
        return NextResponse.json({ error: "Error updating employee" }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { id } = await req.json()

        if (!id) {
            return NextResponse.json({ error: "ID is required" }, { status: 400 })
        }

        // Delete attendance records
        const { error: attendanceError } = await supabase
            .from("attendance")
            .delete()
            .eq("employee_id", id)

        if (attendanceError) {
            console.error("Error deleting attendance:", attendanceError)
        }

        // Delete leave requests
        const { error: leaveError } = await supabase
            .from("leave_requests")
            .delete()
            .eq("employee_id", id)

        if (leaveError) {
            console.error("Error deleting leave requests:", leaveError)
        }

        // Delete overtime requests
        const { error: overtimeError } = await supabase
            .from("overtime_requests")
            .delete()
            .eq("employee_id", id)

        if (overtimeError) {
            console.error("Error deleting overtime requests:", overtimeError)
        }

        // Delete permission requests
        const { error: permissionError } = await supabase
            .from("permission_requests")
            .delete()
            .eq("employee_id", id)

        if (permissionError) {
            console.error("Error deleting permission requests:", permissionError)
        }

        // Delete correction requests
        const { error: correctionError } = await supabase
            .from("attendance_correction_requests")
            .delete()
            .eq("employee_id", id)

        if (correctionError) {
            console.error("Error deleting correction requests:", correctionError)
        }

        // Delete manager relationships
        const { error: managerError } = await supabase
            .from("manager_departments")
            .delete()
            .eq("manager_id", id)

        if (managerError) {
            console.error("Error deleting manager relationships:", managerError)
        }

        // Delete the employee
        const { error } = await supabase
            .from("employees")
            .delete()
            .eq("id", id)

        if (error) {
            console.error("Error deleting employee:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            message: "Employee and all related data deleted successfully"
        })
    } catch (error) {
        console.error("Unexpected error:", error)
        return NextResponse.json({ error: "Error deleting employee" }, { status: 500 })
    }
}