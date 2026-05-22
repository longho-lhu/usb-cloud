import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminUser = db.prepare('SELECT role FROM User WHERE id = ?').get(payload.id) as { role: string } | undefined;
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { planName, storageLimit, role } = body;

    if (!planName || typeof storageLimit !== 'number' || storageLimit <= 0 || !['user', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid plan configurations or user role.' }, { status: 400 });
    }

    // Do not allow the admin to demote themselves to prevent absolute lockout
    if (payload.id === id && role !== 'admin') {
      return NextResponse.json({ error: 'You cannot demote your own admin account.' }, { status: 400 });
    }

    db.prepare(`
      UPDATE User 
      SET planName = ?, storageLimit = ?, role = ?, updatedAt = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) 
      WHERE id = ?
    `).run(planName, storageLimit, role, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin User Update Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
