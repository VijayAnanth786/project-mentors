import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticateJWT } from '../middleware/authMiddleware';

const router = Router();

router.get('/:filename', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  const { filename } = req.params;

  // Clean filename to prevent path traversal
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '');

  if (safeFilename.endsWith('.pdf')) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    // Return a valid minimalist PDF document
    const samplePdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 73 >> stream
BT
/F1 24 Tf
100 700 Td
(ProjectMentor Report: ${safeFilename}) Tj
ET
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000368 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
445
%%EOF`;
    res.send(Buffer.from(samplePdf));
    return;
  }

  // Image fallback or generic document
  res.setHeader('Content-Type', 'text/plain');
  res.send(`ProjectMentor Attachment File: ${safeFilename}`);
});

export default router;
