-- Cards da página Início
SELECT
  (SELECT ROUND(COALESCE(SUM(valor_receber), 0), 2) FROM vendas WHERE status = 'Entregue') AS receita_liquida,
  (SELECT COUNT(*) FROM vendas) AS vendas,
  (SELECT COUNT(*) FROM anuncios WHERE status = 'Ativado') AS anuncios_ativos,
  (SELECT COUNT(*) FROM anuncios WHERE status != 'Ativado') AS anuncios_pausados,
  (SELECT COUNT(*) FROM vendas WHERE status LIKE '%Devol%') AS devolucoes;

-- Cards da página Promoções
SELECT status, COUNT(*) AS total
FROM promocoes
GROUP BY status
ORDER BY status;

-- Promoções expiradas para a fila de reativação
SELECT id, codigo_produto, nome_anuncio, desconto, data_inicio, data_fim, link_promocao
FROM promocoes
WHERE status = 'Expirado'
ORDER BY data_fim ASC;

-- Anúncios para a tabela principal
SELECT codigo_produto, sku, nome, status, tipo_anuncio, preco_anunciado,
       liquido_receber, estoque, quantidade_vendida, ultima_atualizacao_preco
FROM anuncios
ORDER BY nome;

-- Vendas recentes para cards estilo Mercado Livre
SELECT numero_venda, data_venda, cliente_nome, status, produto_nome,
       valor_unitario, quantidade, sku, link_venda
FROM vendas
ORDER BY data_venda DESC, id DESC
LIMIT 20;
