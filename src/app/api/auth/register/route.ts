import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken } from '@/lib/auth';
import { z } from 'zod';

const registerSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = registerSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
      },
    });

    const token = signToken({ id: user.id, username: user.username });
    const response = NextResponse.json({ user: { id: user.id, username: user.username } }, { status: 201 });
    
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Invalid data' }, { status: 400 });
  }
}
