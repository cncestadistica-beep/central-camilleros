const fs = require('fs');

const toml = `[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
`;

fs.writeFileSync('netlify.toml', toml, 'utf8');
fs.writeFileSync('public/_redirects', '/*    /index.html   200\n', 'utf8');
console.log('UTF-8 sin BOM guardado exitosamente');
