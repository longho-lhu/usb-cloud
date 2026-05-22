import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db, User } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const user = db.prepare('SELECT id, username, defaultExpirationDays, role FROM User WHERE id = ?').get(payload.id) as User | undefined;

  return NextResponse.json({ user });
}

