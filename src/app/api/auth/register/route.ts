import { NextResponse } from 'next/server';
import { db, User } from '@/lib/db';
import { hashPassword, signToken } from '@/lib/auth';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const registerSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = registerSchema.parse(body);

    const existingUser = db.prepare('SELECT * FROM User WHERE username = ?').get(username) as User | undefined;

    if (existingUser) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    const id = randomUUID();
    
    db.prepare('INSERT INTO User (id, username, password) VALUES (?, ?, ?)').run(id, username, hashedPassword);

    const token = signToken({ id, username });
    const response = NextResponse.json({ user: { id, username } }, { status: 201 });
    
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

