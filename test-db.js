import sql from './db.js';

async function testConnection() {
  try {
    const result = await sql`SELECT NOW()`;
    console.log('Successfully connected to the Supabase database!');
    console.log('Database time:', result[0].now);
  } catch (error) {
    console.error('Failed to connect:', error.message);
  } finally {
    await sql.end();
  }
}

testConnection();
