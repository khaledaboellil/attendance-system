import { supabase } from "./supabase";

export async function getCurrentUser(userId: string) {
    const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("id", userId)
        .single();

    if (error) throw new Error(error.message);

    return data;
}