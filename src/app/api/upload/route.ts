import { NextResponse } from 'next/server';
import { r2Client } from '@/lib/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '@/lib/prisma';
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

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

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

    const fileRecord = await prisma.fileRecord.create({
      data: {
        userId: user.id,
        originalName: filename,
        s3Key,
        size,
        mimetype: type,
        expiresAt,
      },
    });

    return NextResponse.json({ uploadUrl, fileId: fileRecord.id });
  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
