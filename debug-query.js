const { Pool } = require('pg');

async function debugQuery() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'contrag_test',
    user: 'postgres',
    password: 'password'
  });

  const client = await pool.connect();
  
  try {
    console.log('Testing direct database query...');
    
    const result = await client.query(`
      SELECT namespace, content, entity, uid, relations, chunk_index, total_chunks
      FROM contrag_embeddings
      WHERE namespace = $1
      ORDER BY chunk_index
      LIMIT $2
    `, ['users:507f1f77bcf86cd799439011', 5]);

    console.log('Query result:', JSON.stringify(result.rows, null, 2));
    
    // Test JSON parsing
    result.rows.forEach((row, i) => {
      console.log(`Row ${i}:`);
      console.log('  relations raw:', row.relations);
      console.log('  relations type:', typeof row.relations);
      
      try {
        const parsed = row.relations ? JSON.parse(row.relations) : [];
        console.log('  relations parsed:', parsed);
      } catch (e) {
        console.log('  relations parse error:', e.message);
      }
    });
    
  } finally {
    client.release();
    await pool.end();
  }
}

debugQuery().catch(console.error);
