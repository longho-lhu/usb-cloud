import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
  const expiredFiles = await prisma.fileRecord.findMany({
    where: { userId: payload.id, expiresAt: { lt: new Date() } },
  });

  if (expiredFiles.length > 0) {
    await Promise.allSettled(
      expiredFiles.map(f =>
        r2Client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: f.s3Key }))
      )
    );
    await prisma.fileRecord.deleteMany({
      where: { id: { in: expiredFiles.map(f => f.id) } },
    });
  }

  const files = await prisma.fileRecord.findMany({
    where: { userId: payload.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ files });
}
