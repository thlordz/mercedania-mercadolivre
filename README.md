# Mercedania Mercado Livre

Aplicativo desktop em Electron para consultar anúncios, promoções, vendas e simulações a partir da planilha do Mercado Livre importada para SQLite.

## Como rodar

```bash
npm install
npm start
```

## Banco de dados

O banco principal fica em `Banco de Dados/gestao_vendas.sqlite`.

Para recriar o banco a partir da planilha:

```bash
npm run import:planilha
```

Para conferir os totais importados:

```bash
npm run check:db
```

## Organização

- `src/main`: processo principal do Electron, preload e acesso ao SQLite.
- `pages`: telas da aplicação.
- `assets`: CSS e JavaScript do renderer.
- `Banco de Dados`: planilha original, schema SQL, SQLite e importadores.
- `archive/data-json-legado`: JSONs vazios que foram substituídos pelo SQLite.
