import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, redirect: '/admin/login' });

  // Wipe the authorization cookie completely out of the browser memory directory
  response.cookies.set('starlinknet_wifi_admin_auth', '', {
    httpOnly: true,
    expires: new Date(0), // Sets expiration to the past, deleting it instantly
    path: '/',
  });

  return response;
}
