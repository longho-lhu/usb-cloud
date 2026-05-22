import { NextResponse } from 'next/server';
import { db, FileRecord } from '@/lib/db';
import { r2Client } from '@/lib/r2';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const file = db.prepare('SELECT * FROM FileRecord WHERE id = ?').get(id) as FileRecord | undefined;

    if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 });
    if (file.userId !== payload.id && payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete from R2
    await r2Client.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: file.s3Key,
    }));

    // Delete from DB
    db.prepare('DELETE FROM FileRecord WHERE id = ?').run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

