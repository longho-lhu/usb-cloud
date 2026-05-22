import { NextResponse } from 'next/server';
import { db, User } from '@/lib/db';
import { comparePassword, signToken } from '@/lib/auth';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = loginSchema.parse(body);

    const user = db.prepare('SELECT * FROM User WHERE username = ?').get(username) as User | undefined;

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await comparePassword(password, user.password!);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = signToken({ id: user.id, username: user.username });
    const response = NextResponse.json({ user: { id: user.id, username: user.username } }, { status: 200 });
    
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Invalid data';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

