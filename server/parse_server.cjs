// Node 14 Polyfills
if (!Object.hasOwn) {
  Object.hasOwn = function(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  };
}
if (!Array.prototype.at) {
  Array.prototype.at = function(n) {
    n = Math.trunc(n) || 0;
    if (n < 0) n += this.length;
    if (n < 0 || n >= this.length) return undefined;
    return this[n];
  };
}

const express = require('express');
const { ParseServer } = require('parse-server');
const ParseDashboard = require('parse-dashboard');
const http = require('http');
const path = require('path');
const cors = require('cors');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();
app.use(cors());

const appId = process.env.PARSE_APP_ID || 'central-camilleros';
const masterKey = process.env.PARSE_MASTER_KEY || 'MasterKeyCNC2026';
const javascriptKey = process.env.PARSE_JS_KEY || 'JsKeyCNC2026';
const restAPIKey = process.env.PARSE_REST_KEY || 'RestKeyCNC2026';
const clientKey = process.env.PARSE_CLIENT_KEY || 'ClientKeyCNC2026';
const port = parseInt(process.env.PARSE_PORT || '1337', 10);
const host = process.env.PARSE_HOST || '0.0.0.0';

// Database URI - default to Postgres server 172.21.21.37
let databaseURI = process.env.PARSE_DATABASE_URI || 'postgres://postgres:Teleco2018@172.21.21.37:5432/bd_estadistica';
if (databaseURI.startsWith('postgresql://')) {
  databaseURI = databaseURI.replace('postgresql://', 'postgres://');
}

console.log('🚀 Iniciando Parse Server...');
console.log('📦 Database URI:', databaseURI.replace(/:[^:@]+@/, ':****@'));
console.log('🔑 App ID:', appId);

const api = new ParseServer({
  databaseURI: databaseURI,
  appId: appId,
  masterKey: masterKey,
  javascriptKey: javascriptKey,
  restAPIKey: restAPIKey,
  clientKey: clientKey,
  serverURL: process.env.PARSE_SERVER_URL || `http://localhost:${port}/parse`,
  publicServerURL: process.env.PARSE_PUBLIC_SERVER_URL || `http://localhost:${port}/parse`,
  allowClientClassCreation: true,
  allowExpiredAuthDataToken: true
});

const dashboard = new ParseDashboard({
  apps: [
    {
      serverURL: `http://localhost:${port}/parse`,
      appId: appId,
      masterKey: masterKey,
      javascriptKey: javascriptKey,
      restAPIKey: restAPIKey,
      appName: 'Central de Camilleros - Clínica Nueva de Cali',
      production: false
    }
  ],
  users: [
    {
      user: process.env.DASHBOARD_USER || 'admin',
      pass: process.env.DASHBOARD_PASS || 'CNC2026'
    }
  ],
  trustProxy: 1
}, { allowInsecureHTTP: true });

function main() {
  app.use('/parse', api);
  app.use('/dashboard', dashboard);

  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Parse Server & Dashboard - CNC</title>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
          .card { background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); text-align: center; max-width: 480px; width: 90%; }
          h1 { color: #302c6b; margin-top: 0; font-size: 1.6rem; }
          p { color: #64748b; line-height: 1.6; }
          .btn { display: inline-block; background: linear-gradient(135deg, #302c6b, #00aaa9); color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; margin-top: 20px; box-shadow: 0 4px 15px rgba(0,170,169,0.3); }
          .creds { background: #f1f5f9; padding: 15px; border-radius: 10px; margin-top: 25px; font-size: 0.9rem; text-align: left; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🚀 Parse Server Activo</h1>
          <p>La base de datos y la API de Parse Server están funcionando correctamente para la <strong>Central de Camilleros</strong>.</p>
          <a class="btn" href="/dashboard">Abrir Parse Dashboard</a>
          <div class="creds">
            <strong>Credenciales de acceso:</strong><br>
            👤 Usuario: <code>admin</code><br>
            🔑 Contraseña: <code>CNC2026</code><br>
            🔗 Endpoint API: <code>/parse</code>
          </div>
        </div>
      </body>
      </html>
    `);
  });

  const server = http.createServer(app);
  server.listen(port, host, () => {
    console.log(`\n======================================================`);
    console.log(`✅ PARSE SERVER ACTIVO en: http://localhost:${port}/parse`);
    console.log(`📊 PARSE DASHBOARD DISPONIBLE en: http://localhost:${port}/dashboard`);
    console.log(`👤 Usuario Dashboard: admin`);
    console.log(`🔑 Contraseña Dashboard: CNC2026`);
    console.log(`======================================================\n`);
  });
}

main();
