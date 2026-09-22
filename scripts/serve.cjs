const http = require('http'),
  fs = require('fs'),
  path = require('path');
const root = path.resolve('dist');
http
  .createServer((req, res) => {
    let p;
    try {
      p = path.resolve(
        root,
        '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname),
      );
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (!p.startsWith(root + path.sep) && p !== root) {
      res.writeHead(403).end();
      return;
    }
    if (p === root) p = path.join(root, 'index.html');
    fs.readFile(p, (err, data) => {
      if (err) {
        res.writeHead(404).end();
        return;
      }
      res.setHeader(
        'Content-Type',
        {
          '.html': 'text/html',
          '.css': 'text/css',
          '.js': 'text/javascript',
          '.mjs': 'text/javascript',
          '.json': 'application/json',
          '.svg': 'image/svg+xml',
        }[path.extname(p)] || 'application/octet-stream',
      );
      res.setHeader('Cache-Control', 'no-store');
      res.end(data);
    });
  })
  .listen(4173, '0.0.0.0', () => console.log('Local: http://localhost:4173'));
