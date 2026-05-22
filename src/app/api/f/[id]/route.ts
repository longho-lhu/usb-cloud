import { NextResponse } from 'next/server';
import { db, FileRecord } from '@/lib/db';
import { r2Client } from '@/lib/r2';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const file = db.prepare('SELECT * FROM FileRecord WHERE id = ?').get(id) as FileRecord | undefined;

  if (!file) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  // Lazy cleanup if expired
  if (new Date() > new Date(file.expiresAt)) {
    db.prepare('DELETE FROM FileRecord WHERE id = ?').run(id);
    return NextResponse.json({ error: 'File expired and has been deleted' }, { status: 410 });
  }

  const publicUrl = process.env.R2_PUBLIC_URL;
  let url = '';

  // Fallback to generating a presigned URL if R2_PUBLIC_URL is the standard S3 endpoint or not set
  if (publicUrl && !publicUrl.includes('r2.cloudflarestorage.com')) {
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

