import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(
      new URL("/login?message=Missing%20Supabase%20environment%20variables.", url.origin),
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?message=Missing%20OAuth%20code.", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?message=${encodeURIComponent(error.message)}`, url.origin),
    );
  }

  return NextResponse.redirect(new URL("/dashboard", url.origin));
}
