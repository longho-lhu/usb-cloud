import { NextResponse } from 'next/server';
import { r2Client } from '@/lib/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db, User } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { filename, size, type } = await req.json();

    const user = db.prepare('SELECT * FROM User WHERE id = ?').get(payload.id) as User | undefined;
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Enforce account storage limit checks
    const storageUsage = db.prepare('SELECT SUM(size) as total FROM FileRecord WHERE userId = ?').get(user.id) as { total: number | null } | undefined;
    const currentUsed = storageUsage?.total || 0;
    const totalUsage = currentUsed + size;

    if (totalUsage > user.storageLimit) {
      const currentFormatted = currentUsed >= 1024 * 1024 * 1024
        ? `${(currentUsed / (1024 * 1024 * 1024)).toFixed(2)} GB`
        : `${(currentUsed / (1024 * 1024)).toFixed(1)} MB`;
      const limitFormatted = user.storageLimit >= 1024 * 1024 * 1024
        ? `${(user.storageLimit / (1024 * 1024 * 1024)).toFixed(2)} GB`
        : `${(user.storageLimit / (1024 * 1024)).toFixed(1)} MB`;

      return NextResponse.json({
        error: `Storage limit exceeded. You are using ${currentFormatted} of your ${limitFormatted} limit.`
      }, { status: 400 });
    }

    const extension = filename.split('.').pop();
    const s3Key = `${payload.id}/${randomUUID()}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: s3Key,
      ContentType: type,
    });

    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });

    // Calculate expiration based on user's defaultExpirationDays
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + user.defaultExpirationDays);

    const fileId = randomUUID();
    db.prepare(`
      INSERT INTO FileRecord (id, originalName, s3Key, size, mimetype, expiresAt, userId)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(fileId, filename, s3Key, size, type, expiresAt.toISOString(), user.id);

    return NextResponse.json({ uploadUrl, fileId });
  } catch (error) {
    console.error('Upload Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

