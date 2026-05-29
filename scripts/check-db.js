const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const dbPath = path.join(__dirname, '..', 'Banco de Dados', 'gestao_vendas.sqlite');
const db = new DatabaseSync(dbPath, { readOnly: true, timeout: 1000 });

for (const table of ['anuncios', 'promocoes', 'vendas', 'importacoes']) {
  const row = db.prepare(`SELECT COUNT(*) AS total FROM ${table}`).get();
  console.log(`${table}: ${row.total}`);
}

const sample = db.prepare('SELECT codigo_produto, sku, nome FROM anuncios LIMIT 3').all();
console.log('amostra_anuncios:', JSON.stringify(sample, null, 2));

db.close();
