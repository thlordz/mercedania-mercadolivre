const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const rootDir = path.resolve(__dirname, '..', '..');
const dbPath = path.join(rootDir, 'Banco de Dados', 'gestao_vendas.sqlite');

let db;

function getDb() {
  if (!db) {
    db = new DatabaseSync(dbPath, { timeout: 1000 });
    db.exec('PRAGMA foreign_keys = ON');
    migrate(db);
  }
  return db;
}

function columns(database, table) {
  return database.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name);
}

function ensureColumn(database, table, name, definition) {
  if (!columns(database, table).includes(name)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
  }
}

function migrate(database) {
  ensureColumn(database, 'anuncios', 'foto_url', 'TEXT');
  ensureColumn(database, 'vendas', 'foto_url', 'TEXT');
  ensureColumn(database, 'vendas', 'cliente_documento', 'TEXT');
  ensureColumn(database, 'vendas', 'tarifa_venda_total', 'REAL DEFAULT 0');
  ensureColumn(database, 'vendas', 'envios_total', 'REAL DEFAULT 0');
  ensureColumn(database, 'vendas', 'cep', 'TEXT');
  ensureColumn(database, 'vendas', 'logradouro', 'TEXT');
  ensureColumn(database, 'vendas', 'numero_endereco', 'TEXT');
  ensureColumn(database, 'vendas', 'complemento_endereco', 'TEXT');
  ensureColumn(database, 'vendas', 'bairro', 'TEXT');
  ensureColumn(database, 'vendas', 'cidade', 'TEXT');
  ensureColumn(database, 'vendas', 'uf', 'TEXT');
  database.exec(`
    CREATE TABLE IF NOT EXISTS venda_itens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venda_id INTEGER NOT NULL,
      anuncio_id INTEGER,
      codigo_produto TEXT,
      sku TEXT,
      produto_nome TEXT NOT NULL,
      quantidade INTEGER DEFAULT 1,
      valor_unitario REAL DEFAULT 0,
      foto_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE,
      FOREIGN KEY (anuncio_id) REFERENCES anuncios(id) ON DELETE SET NULL
    );
  `);
}

function all(sql, params = {}) {
  const statement = getDb().prepare(sql);
  return Array.isArray(params) ? statement.all(...params) : statement.all(params);
}

function get(sql, params = {}) {
  const statement = getDb().prepare(sql);
  return Array.isArray(params) ? statement.get(...params) : statement.get(params);
}

function dashboard() {
  const vendas = get(`
    SELECT
      COUNT(*) AS total_vendas,
      COALESCE(SUM(valor_receber), 0) AS receita_liquida
    FROM vendas
  `);

  const anuncios = get(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN LOWER(COALESCE(status, '')) LIKE 'ativ%' THEN 1 ELSE 0 END) AS ativos,
      SUM(CASE WHEN LOWER(COALESCE(status, '')) NOT LIKE 'ativ%' THEN 1 ELSE 0 END) AS inativos,
      SUM(CASE WHEN tipo_anuncio = 'Premium' THEN 1 ELSE 0 END) AS premium,
      SUM(CASE WHEN tipo_anuncio = 'Clássico' THEN 1 ELSE 0 END) AS classico
    FROM anuncios
  `);

  const promocoes = all(`
    SELECT status, COUNT(*) AS total
    FROM promocoes
    GROUP BY status
  `);

  const recentes = vendasList({ limit: 5 });

  return { vendas, anuncios, promocoes, recentes };
}

function anunciosList({ search = '', status = '', limit = 50 } = {}) {
  const where = [];
  const params = { limit };

  if (search) {
    params.search = `%${search}%`;
    where.push('(codigo_produto LIKE :search OR sku LIKE :search OR nome LIKE :search)');
  }

  if (status) {
    params.status = `%${status}%`;
    where.push('status LIKE :status');
  }

  return all(`
    SELECT *
    FROM anuncios
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY quantidade_vendida DESC, nome ASC
    LIMIT :limit
  `, params);
}

function anuncioById(id) {
  return get('SELECT * FROM anuncios WHERE id = ?', [id]);
}

function promocoesList({ search = '', status = '', limit = 50 } = {}) {
  const where = [];
  const params = { limit };

  if (search) {
    params.search = `%${search}%`;
    where.push('(p.codigo_produto LIKE :search OR p.nome_anuncio LIKE :search OR a.sku LIKE :search)');
  }

  if (status) {
    params.status = status;
    where.push('p.status = :status');
  }

  return all(`
    SELECT p.*, a.sku, a.foto_url
    FROM promocoes p
    LEFT JOIN anuncios a ON a.id = p.anuncio_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY p.data_fim IS NULL, p.data_fim ASC, p.nome_anuncio ASC
    LIMIT :limit
  `, params);
}

function vendasList({ search = '', status = '', limit = 50 } = {}) {
  const where = [];
  const params = { limit };

  if (search) {
    params.search = `%${search}%`;
    where.push('(numero_venda LIKE :search OR cliente_nome LIKE :search OR produto_nome LIKE :search OR sku LIKE :search)');
  }

  if (status) {
    params.status = `%${status}%`;
    where.push('status LIKE :status');
  }

  const vendas = all(`
    SELECT *
    FROM vendas
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY data_venda DESC, id DESC
    LIMIT :limit
  `, params);

  const itensStmt = getDb().prepare('SELECT * FROM venda_itens WHERE venda_id = ? ORDER BY id');
  return vendas.map((venda) => {
    const itens = itensStmt.all(venda.id);
    return { ...venda, itens: itens.length ? itens : [{
      id: null,
      venda_id: venda.id,
      anuncio_id: venda.anuncio_id,
      codigo_produto: venda.codigo_produto,
      sku: venda.sku,
      produto_nome: venda.produto_nome,
      quantidade: venda.quantidade,
      valor_unitario: venda.valor_unitario,
      foto_url: venda.foto_url,
    }] };
  });
}

function updateAnuncio(payload) {
  const current = anuncioById(payload.id);
  if (!current) throw new Error('Anúncio não encontrado.');
  const data = { ...current, ...payload };
  getDb().prepare(`
    UPDATE anuncios SET
      codigo_produto = :codigo_produto,
      sku = :sku,
      nome = :nome,
      status = :status,
      tipo_anuncio = :tipo_anuncio,
      valor_total = :valor_total,
      frete = :frete,
      tarifa = :tarifa,
      custo_fixo = :custo_fixo,
      desconto = :desconto,
      preco_anunciado = :preco_anunciado,
      liquido_receber = :liquido_receber,
      estoque = :estoque,
      quantidade_vendida = :quantidade_vendida,
      ultima_atualizacao_preco = :ultima_atualizacao_preco,
      link_anuncio = :link_anuncio,
      foto_url = :foto_url,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = :id
  `).run({
    id: data.id,
    codigo_produto: data.codigo_produto,
    sku: data.sku,
    nome: data.nome,
    status: data.status,
    tipo_anuncio: data.tipo_anuncio,
    ultima_atualizacao_preco: data.ultima_atualizacao_preco,
    link_anuncio: data.link_anuncio,
    foto_url: data.foto_url,
    valor_total: Number(data.valor_total || 0),
    frete: Number(data.frete || 0),
    tarifa: Number(data.tarifa || 0),
    custo_fixo: Number(data.custo_fixo || 0),
    desconto: Number(data.desconto || 0),
    preco_anunciado: Number(data.preco_anunciado || 0),
    liquido_receber: Number(data.liquido_receber || 0),
    estoque: Number(data.estoque || 0),
    quantidade_vendida: Number(data.quantidade_vendida || 0),
  });
  return anuncioById(payload.id);
}

function updatePromocao(payload) {
  getDb().prepare(`
    UPDATE promocoes SET
      data_inicio = :data_inicio,
      data_fim = :data_fim,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = :id
  `).run(payload);
  return get('SELECT * FROM promocoes WHERE id = ?', [payload.id]);
}

function createVenda(payload) {
  const database = getDb();
  const itens = payload.itens || [];
  if (!itens.length) throw new Error('Inclua ao menos um produto na venda.');
  const first = itens[0];
  const total = itens.reduce((sum, item) => sum + (Number(item.valor_unitario || 0) * Number(item.quantidade || 1)), 0);
  const quantidade = itens.reduce((sum, item) => sum + Number(item.quantidade || 1), 0);

  database.exec('BEGIN');
  try {
    const result = database.prepare(`
      INSERT INTO vendas
      (numero_venda, anuncio_id, codigo_produto, sku, produto_nome, cliente_nome,
       status, data_venda, quantidade, valor_unitario, valor_receber, observacao, link_venda, foto_url,
       cliente_documento, tarifa_venda_total, envios_total,
       cep, logradouro, numero_endereco, complemento_endereco, bairro, cidade, uf)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      payload.numero_venda,
      first.anuncio_id || null,
      first.codigo_produto || '',
      first.sku || '',
      itens.length > 1 ? `${itens.length} produtos` : first.produto_nome,
      payload.cliente_nome,
      payload.status,
      payload.data_venda,
      quantidade,
      Number(first.valor_unitario || 0),
      Number(payload.valor_receber || total),
      payload.observacao || '',
      payload.link_venda || '',
      first.foto_url || '',
      payload.cliente_documento || '',
      Number(payload.tarifa_venda_total || 0),
      Number(payload.envios_total || 0),
      payload.cep || '',
      payload.logradouro || '',
      payload.numero_endereco || '',
      payload.complemento_endereco || '',
      payload.bairro || '',
      payload.cidade || '',
      payload.uf || '',
    );

    const vendaId = Number(result.lastInsertRowid);
    const insertItem = database.prepare(`
      INSERT INTO venda_itens
      (venda_id, anuncio_id, codigo_produto, sku, produto_nome, quantidade, valor_unitario, foto_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of itens) {
      insertItem.run(
        vendaId,
        item.anuncio_id || null,
        item.codigo_produto || '',
        item.sku || '',
        item.produto_nome,
        Number(item.quantidade || 1),
        Number(item.valor_unitario || 0),
        item.foto_url || '',
      );
    }
    database.exec('COMMIT');
    return get('SELECT * FROM vendas WHERE id = ?', [vendaId]);
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

function stats() {
  return {
    dashboard: dashboard(),
    anuncios: get(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN LOWER(COALESCE(status, '')) LIKE 'ativ%' THEN 1 ELSE 0 END) AS ativos,
        SUM(CASE WHEN LOWER(COALESCE(status, '')) NOT LIKE 'ativ%' THEN 1 ELSE 0 END) AS inativos,
        SUM(CASE WHEN tipo_anuncio = 'Premium' THEN 1 ELSE 0 END) AS premium,
        SUM(CASE WHEN tipo_anuncio = 'Clássico' THEN 1 ELSE 0 END) AS classico
      FROM anuncios
    `),
    promocoes: all('SELECT status, COUNT(*) AS total FROM promocoes GROUP BY status'),
    vendas: get(`
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(valor_receber), 0) AS receita,
        SUM(CASE WHEN LOWER(COALESCE(status, '')) LIKE '%cancel%' THEN 1 ELSE 0 END) AS canceladas,
        SUM(CASE WHEN LOWER(COALESCE(status, '')) LIKE '%devol%' THEN 1 ELSE 0 END) AS devolucoes
      FROM vendas
    `),
  };
}

module.exports = {
  dbPath,
  dashboard,
  anuncioById,
  anunciosList,
  promocoesList,
  vendasList,
  updateAnuncio,
  updatePromocao,
  createVenda,
  stats,
};
