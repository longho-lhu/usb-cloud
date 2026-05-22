import { NextResponse } from 'next/server';
import { db, FileRecord } from '@/lib/db';
import { r2Client } from '@/lib/r2';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Lazy cleanup: delete expired files from R2 then DB
  const now = new Date().toISOString();
  const expiredFiles = db.prepare('SELECT * FROM FileRecord WHERE userId = ? AND expiresAt < ?').all(payload.id, now) as FileRecord[];

  if (expiredFiles.length > 0) {
    await Promise.allSettled(
      expiredFiles.map(f =>
        r2Client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: f.s3Key }))
      )
    );
    const placeholders = expiredFiles.map(() => '?').join(',');
    const ids = expiredFiles.map(f => f.id);
    db.prepare(`DELETE FROM FileRecord WHERE id IN (${placeholders})`).run(...ids);
  }

  const files = db.prepare('SELECT * FROM FileRecord WHERE userId = ? ORDER BY createdAt DESC').all(payload.id) as FileRecord[];

  return NextResponse.json({ files });
}

