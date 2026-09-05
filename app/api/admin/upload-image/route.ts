import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

function ensureUploadDir(): void {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    ensureUploadDir();

    const contentType = request.headers.get('content-type') || '';

    // Handle Multipart FormData upload
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = path.extname(file.name) || '.jpg';
      const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'].includes(ext.toLowerCase())
        ? ext.toLowerCase()
        : '.jpg';

      const fileName = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${safeExt}`;
      const filePath = path.join(UPLOAD_DIR, fileName);

      fs.writeFileSync(filePath, buffer);

      return NextResponse.json({
        success: true,
        url: `/uploads/${fileName}`,
      });
    }

    // Handle Base64 Data URL upload (clipboard paste)
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const { dataUrl } = body;

      if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
        return NextResponse.json({ error: 'Invalid image data' }, { status: 400 });
      }

      const match = dataUrl.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
      if (!match) {
        return NextResponse.json({ error: 'Malformed base64 image data' }, { status: 400 });
      }

      const ext = match[1] === 'jpeg' ? '.jpg' : `.${match[1].split('+')[0]}`;
      const buffer = Buffer.from(match[2], 'base64');

      const fileName = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
      const filePath = path.join(UPLOAD_DIR, fileName);

      fs.writeFileSync(filePath, buffer);

      return NextResponse.json({
        success: true,
        url: `/uploads/${fileName}`,
      });
    }

    return NextResponse.json({ error: 'Unsupported content type' }, { status: 400 });
  } catch (err: any) {
    console.error('[UploadImage API] Failed to save image:', err);
    return NextResponse.json(
      { error: err.message || 'Image upload failed' },
      { status: 500 }
    );
  }
}
