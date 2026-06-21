import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { adminPassword } = await request.json();
    let ADMIN_SECRET = process.env.STARLINKNET_WIFI_ADMIN_SECRET || 'NJERI';

    // Strip potential quotes from env variable if they were included literally
    ADMIN_SECRET = ADMIN_SECRET.replace(/['"]+/g, '');

    if (adminPassword !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Invalid Secure Admin Pin!' }, { status: 401 });
    }

    // Passwords match! Create a secure response
    const response = NextResponse.json({ success: true, redirect: '/admin/dashboard' });

    // Set a secure HTTP-Only cookie that lasts for 1 day
    response.cookies.set('starlinknet_wifi_admin_auth', ADMIN_SECRET, {
      httpOnly: true, // Prevents cross-site scripting (XSS) hacking attempts
      secure: process.env.NODE_ENV === 'production', // Only sends over HTTPS in production
      sameSite: 'lax', // More compatible for redirects than 'strict'
      maxAge: 60 * 60 * 24, // 24 Hours duration window
      path: '/',
    });

    return response;
  } catch (error: unknown) {
    console.error("Admin Login Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
