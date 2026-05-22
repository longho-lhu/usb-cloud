import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { r2Client } from '@/lib/r2';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const file = await prisma.fileRecord.findUnique({
    where: { id },
  });

  if (!file) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  // Lazy cleanup if expired
  if (new Date() > new Date(file.expiresAt)) {
    await prisma.fileRecord.delete({ where: { id } });
    return NextResponse.json({ error: 'File expired and has been deleted' }, { status: 410 });
  }

  const publicUrl = process.env.R2_PUBLIC_URL;
  let url = '';

  if (publicUrl) {
    url = `${publicUrl}/${file.s3Key}`;
  } else {
    // Generate presigned URL
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: file.s3Key,
    });
    url = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
  }

  return NextResponse.json({ file, url });
}
