const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { DatabaseSync } = require('node:sqlite');

const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'Banco de Dados');
const spreadsheetPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(dataDir, 'Gestão de Anúncio - Mercado Livre(2).xlsm');
const dbPath = process.argv[3]
  ? path.resolve(process.argv[3])
  : path.join(dataDir, 'gestao_vendas.sqlite');
const schemaPath = path.join(dataDir, 'schema.sql');

function toFloat(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  const text = String(value).replace('R$', '').replace('%', '').trim();
  if (!text || text === '-') return 0;
  const normalized = text.includes(',') && text.includes('.')
    ? text.replace(/\./g, '').replace(',', '.')
    : text.replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIntFromText(value) {
  const match = String(value ?? '').match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function excelDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (!date) return null;
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function splitProductAndSku(text) {
  const lines = String(text ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const nome = lines[0] || '';
  const skuLine = lines.find((line) => /SKU|[A-Z]\d{3,}/i.test(line)) || '';
  const sku = skuLine.match(/(?:SKU\s*)?([A-Z]\d{3,}[A-Z0-9]*)/i)?.[1] || '';
  return { nome, sku };
}

function calcPromotionStatus(dataInicio, dataFim) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!dataInicio && !dataFim) return 'Sem Promoção';
  const inicio = dataInicio ? new Date(`${dataInicio}T00:00:00`) : null;
  const fim = dataFim ? new Date(`${dataFim}T00:00:00`) : null;
  if (inicio && inicio > today) return 'Programado';
  if (fim && fim < today) return 'Expirado';
  return 'Ativado';
}

function rows(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Aba não encontrada: ${sheetName}`);
  const data = [];
  for (const cellRef of Object.keys(sheet)) {
    if (cellRef.startsWith('!')) continue;
    const position = XLSX.utils.decode_cell(cellRef);
    if (!data[position.r]) data[position.r] = [];
    data[position.r][position.c] = sheet[cellRef].v ?? '';
  }
  return data.map((row) => row || []);
}

function link(workbook, sheetName, cellRef) {
  return workbook.Sheets[sheetName]?.[cellRef]?.l?.Target || '';
}

function importSpreadsheet() {
  if (!fs.existsSync(spreadsheetPath)) {
    throw new Error(`Planilha não encontrada: ${spreadsheetPath}`);
  }

  console.log(`Lendo planilha: ${spreadsheetPath}`);
  const workbook = XLSX.readFile(spreadsheetPath, { cellDates: true });
  console.log(`Abas encontradas: ${workbook.SheetNames.join(', ')}`);
  const db = new DatabaseSync(dbPath, { timeout: 1000 });
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(fs.readFileSync(schemaPath, 'utf8'));

  console.log(`Recriando dados em: ${dbPath}`);
  db.exec('BEGIN');
  try {
    for (const table of ['simulacoes', 'vendas', 'promocoes', 'anuncios', 'importacoes']) {
      db.prepare(`DELETE FROM ${table}`).run();
    }

    const insertAnuncio = db.prepare(`
      INSERT OR REPLACE INTO anuncios
      (codigo_produto, sku, nome, status, tipo_anuncio, valor_total, frete, tarifa,
       custo_fixo, desconto, preco_anunciado, liquido_receber, estoque,
       quantidade_vendida, ultima_atualizacao_preco, link_anuncio, ordem_importacao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let anunciosCount = 0;
    const anunciosRows = rows(workbook, 'Precificação de produto').slice(3);
    console.log(`Linhas de anúncios lidas: ${anunciosRows.length}`);
    for (const [index, row] of anunciosRows.entries()) {
      const excelRow = index + 4;
      const codigo = String(row[2] ?? '').trim();
      const nome = String(row[4] ?? '').trim();
      if (!codigo || !nome || codigo === 'Cód. do Produto') continue;
      const tipo = toFloat(row[7]) >= 0.16 ? 'Premium' : 'Clássico';
      insertAnuncio.run(
        codigo,
        String(row[3] ?? '').trim(),
        nome,
        String(row[1] ?? '').trim(),
        tipo,
        toFloat(row[5]),
        toFloat(row[6]),
        toFloat(row[7]),
        toFloat(row[8]),
        toFloat(row[9]),
        toFloat(row[10]),
        toFloat(row[11]),
        0,
        toIntFromText(row[12]),
        null,
        link(workbook, 'Precificação de produto', `A${excelRow}`),
        anunciosCount + 1,
      );
      anunciosCount += 1;
    }

    const findAnuncio = db.prepare('SELECT id, sku FROM anuncios WHERE codigo_produto = ?');
    const insertPromocao = db.prepare(`
      INSERT INTO promocoes
      (anuncio_id, codigo_produto, nome_anuncio, status, data_inicio, data_fim,
       preco, desconto, preco_final, link_promocao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let promocoesCount = 0;
    const promocoesRows = rows(workbook, 'Central de Promoções').slice(3);
    console.log(`Linhas de promoções lidas: ${promocoesRows.length}`);
    for (const [index, row] of promocoesRows.entries()) {
      const excelRow = index + 4;
      const codigo = String(row[2] ?? '').trim();
      const nome = String(row[3] ?? '').trim();
      if (!codigo || !nome || codigo === 'Cód. do Produto') continue;
      const dataInicio = excelDate(row[4]);
      const dataFim = excelDate(row[5]);
      const statusRaw = String(row[0] ?? '').trim();
      const status = statusRaw && !statusRaw.startsWith('=')
        ? statusRaw
        : calcPromotionStatus(dataInicio, dataFim);
      const anuncio = findAnuncio.get(codigo);
      insertPromocao.run(
        anuncio?.id || null,
        codigo,
        nome,
        !dataInicio && !dataFim ? 'Sem Promoção' : status,
        dataInicio,
        dataFim,
        toFloat(row[6]),
        toFloat(row[7]),
        toFloat(row[8]),
        link(workbook, 'Central de Promoções', `B${excelRow}`),
      );
      promocoesCount += 1;
    }

    const insertVenda = db.prepare(`
      INSERT OR REPLACE INTO vendas
      (numero_venda, anuncio_id, codigo_produto, sku, produto_nome, cliente_nome,
       status, data_venda, quantidade, valor_unitario, valor_receber, observacao, link_venda)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let vendasCount = 0;
    const vendasRows = rows(workbook, 'Vendas').slice(2);
    console.log(`Linhas de vendas lidas: ${vendasRows.length}`);
    for (const [index, row] of vendasRows.entries()) {
      const excelRow = index + 3;
      const numero = String(row[0] ?? '').trim();
      if (!numero || numero === 'Nº Venda') continue;
      const codigo = String(row[4] ?? '').trim();
      const anuncio = findAnuncio.get(codigo);
      const produto = splitProductAndSku(row[3]);
      insertVenda.run(
        numero,
        anuncio?.id || null,
        codigo,
        produto.sku || anuncio?.sku || '',
        produto.nome,
        String(row[9] ?? '').trim(),
        String(row[1] ?? '').trim(),
        excelDate(row[2]),
        Math.trunc(toFloat(row[5])),
        toFloat(row[6]),
        toFloat(row[7]),
        String(row[8] ?? '').trim(),
        link(workbook, 'Vendas', `A${excelRow}`),
      );
      vendasCount += 1;
    }

    db.prepare(`
      INSERT INTO importacoes
      (arquivo_origem, anuncios_importados, promocoes_importadas, vendas_importadas, observacao)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      path.basename(spreadsheetPath),
      anunciosCount,
      promocoesCount,
      vendasCount,
      'Importação via Node/Electron a partir da planilha do Mercado Livre.',
    );

    db.exec('COMMIT');
    console.log(`Importação concluída: anúncios=${anunciosCount}, promoções=${promocoesCount}, vendas=${vendasCount}`);
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  } finally {
    db.close();
  }
}

importSpreadsheet();
