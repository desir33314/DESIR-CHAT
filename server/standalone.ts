import http from 'http';
import fs from 'fs';
import path from 'path';
import { createApiMiddleware } from './apiMiddleware';

const PORT = parseInt(process.env.PORT || '3000', 10);
const apiHandler = createApiMiddleware();
const distDir = path.resolve(process.cwd(), 'dist');

const server = http.createServer((req, res) => {
  apiHandler(req, res, () => {
    // Fallback static files from dist/ if built
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    let filePath = path.join(distDir, url.pathname === '/' ? 'index.html' : url.pathname);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return fs.createReadStream(filePath).pipe(res);
    }

    const indexHtml = path.join(distDir, 'index.html');
    if (fs.existsSync(indexHtml)) {
      return fs.createReadStream(indexHtml).pipe(res);
    }

    res.writeHead(404);
    res.end('Not Found');
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`DESIR CHAT server running on http://0.0.0.0:${PORT}`);
});
