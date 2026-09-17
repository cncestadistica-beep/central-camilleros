const { Client } = require('pg');

const client = new Client({
  host: 'aws-0-us-east-2.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.vgkpnhtctbdmnnxnmlyi',
  password: 'nza0p2WbAJSNCPvs',
  ssl: { rejectUnauthorized: false }
});

async function grantPermissions() {
  console.log('Granting permissions to anon and authenticated in Supabase...');
  await client.connect();

  await client.query(`
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    
    GRANT ALL ON TABLE public.solicitudes_camilleros TO anon, authenticated, service_role;
    GRANT ALL ON TABLE public.camilleros_personal TO anon, authenticated, service_role;
    
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
    
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
  `);

  console.log('✓ All permissions granted to anon and authenticated!');
  await client.end();
}
grantPermissions().catch(console.error);
