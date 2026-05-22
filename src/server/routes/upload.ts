import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

const router = Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key:    process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure: true,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg','image/png','image/webp','application/pdf'].includes(file.mimetype);
    ok ? cb(null, true) : cb(new Error('Tipo de archivo no permitido'));
  },
});

function bufferToStream(buf: Buffer) {
  const s = new Readable();
  s.push(buf);
  s.push(null);
  return s;
}

async function cloudUpload(buf: Buffer, folder: string, publicId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, overwrite: true, resource_type: 'auto' },
      (err, result) => (err || !result) ? reject(err) : resolve(result.secure_url)
    );
    bufferToStream(buf).pipe(stream);
  });
}

// POST /api/upload/document
// multipart/form-data: file (File), type (ine_front|ine_back|selfie|logo|banner|menu_item)
router.post('/document', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) return res.status(401).json({ error: 'No autenticado' });
    if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });
    const { type } = req.body;
    const validos = ['ine_front','ine_back','selfie','logo','banner','menu_item'];
    if (!validos.includes(type)) return res.status(400).json({ error: 'Tipo invalido' });
    const url = await cloudUpload(
      req.file.buffer,
      `ya-voy/${type}`,
      `${userId}_${type}_${Date.now()}`
    );
    res.json({ url, type });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
