import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { defaultExpirationDays } = await req.json();

  if (![1, 3, 7].includes(defaultExpirationDays)) {
    return NextResponse.json({ error: 'Invalid expiration days' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: payload.id },
    data: { defaultExpirationDays },
  });

  return NextResponse.json({ success: true });
}
