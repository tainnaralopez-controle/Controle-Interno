import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import geminiHandler from './api/gemini.ts';

dotenv.config();

console.log('Environment Check:');
console.log('- VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? 'Present' : 'Missing');
console.log('- VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? 'Present' : 'Missing');
console.log('- GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Present' : 'Missing');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      env: {
        supabaseUrl: !!process.env.VITE_SUPABASE_URL,
        supabaseKey: !!process.env.VITE_SUPABASE_ANON_KEY,
        geminiKey: !!process.env.GEMINI_API_KEY
      }
    });
  });

  // API Routes
  app.post('/api/gemini', async (req, res) => {
    try {
      // Adapt Express req/res to Vercel handler if needed, 
      // but here we can just call it or rewrite it.
      // Since gemini.ts uses VercelRequest/VercelResponse, 
      // we can pass Express objects (they are mostly compatible for simple cases).
      await geminiHandler(req as any, res as any);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
