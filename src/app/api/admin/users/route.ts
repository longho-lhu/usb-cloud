import { NextResponse } from 'next/server';
import { db, User } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  try {
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

    // Select all user attributes
    const users = db.prepare('SELECT id, username, defaultExpirationDays, role, storageLimit, planName, createdAt FROM User').all() as User[];

    // Map each user with their dynamic current storage usage
    const usersWithUsage = users.map((u) => {
      const usage = db.prepare('SELECT SUM(size) as total FROM FileRecord WHERE userId = ?').get(u.id) as { total: number | null } | undefined;
      return {
        ...u,
        storageUsed: usage?.total || 0,
      };
    });

    return NextResponse.json({ users: usersWithUsage });
  } catch (error) {
    console.error('Admin Users List Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
