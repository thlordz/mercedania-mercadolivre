PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS anuncios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo_produto TEXT NOT NULL UNIQUE,
  sku TEXT,
  nome TEXT NOT NULL,
  status TEXT,
  tipo_anuncio TEXT DEFAULT 'Premium',
  valor_total REAL DEFAULT 0,
  frete REAL DEFAULT 0,
  tarifa REAL DEFAULT 0,
  custo_fixo REAL DEFAULT 0,
  desconto REAL DEFAULT 0,
  preco_anunciado REAL DEFAULT 0,
  liquido_receber REAL DEFAULT 0,
  estoque INTEGER DEFAULT 0,
  quantidade_vendida INTEGER DEFAULT 0,
  ultima_atualizacao_preco TEXT,
  link_anuncio TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_anuncios_sku ON anuncios(sku);
CREATE INDEX IF NOT EXISTS idx_anuncios_status ON anuncios(status);
CREATE INDEX IF NOT EXISTS idx_anuncios_nome ON anuncios(nome);

CREATE TABLE IF NOT EXISTS promocoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anuncio_id INTEGER,
  codigo_produto TEXT NOT NULL,
  nome_anuncio TEXT NOT NULL,
  status TEXT,
  data_inicio TEXT,
  data_fim TEXT,
  preco REAL DEFAULT 0,
  desconto REAL DEFAULT 0,
  preco_final REAL DEFAULT 0,
  link_promocao TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (anuncio_id) REFERENCES anuncios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_promocoes_status ON promocoes(status);
CREATE INDEX IF NOT EXISTS idx_promocoes_codigo ON promocoes(codigo_produto);
CREATE INDEX IF NOT EXISTS idx_promocoes_datas ON promocoes(data_inicio, data_fim);

CREATE TABLE IF NOT EXISTS vendas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero_venda TEXT NOT NULL UNIQUE,
  anuncio_id INTEGER,
  codigo_produto TEXT,
  sku TEXT,
  produto_nome TEXT NOT NULL,
  cliente_nome TEXT,
  status TEXT,
  data_venda TEXT,
  quantidade INTEGER DEFAULT 1,
  valor_unitario REAL DEFAULT 0,
  valor_receber REAL DEFAULT 0,
  observacao TEXT,
  link_venda TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (anuncio_id) REFERENCES anuncios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_vendas_status ON vendas(status);
CREATE INDEX IF NOT EXISTS idx_vendas_data ON vendas(data_venda);
CREATE INDEX IF NOT EXISTS idx_vendas_sku ON vendas(sku);
CREATE INDEX IF NOT EXISTS idx_vendas_cliente ON vendas(cliente_nome);

CREATE TABLE IF NOT EXISTS simulacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anuncio_id INTEGER,
  tipo_anuncio TEXT,
  valor_item REAL DEFAULT 0,
  frete REAL DEFAULT 0,
  desconto REAL DEFAULT 0,
  tarifa REAL DEFAULT 0,
  custo_fixo REAL DEFAULT 0,
  liquido_receber REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (anuncio_id) REFERENCES anuncios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS importacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  arquivo_origem TEXT NOT NULL,
  data_importacao TEXT DEFAULT CURRENT_TIMESTAMP,
  anuncios_importados INTEGER DEFAULT 0,
  promocoes_importadas INTEGER DEFAULT 0,
  vendas_importadas INTEGER DEFAULT 0,
  observacao TEXT
);
