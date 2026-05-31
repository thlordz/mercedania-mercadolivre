import argparse
import os
import re
import sqlite3
import zipfile
import xml.etree.ElementTree as ET
from datetime import date, datetime, timedelta

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
R_NS = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
PKG_REL_NS = "{http://schemas.openxmlformats.org/package/2006/relationships}"


def excel_date(value):
    if value in (None, ""):
        return None
    try:
        # Excel serial date. 1899-12-30 handles Excel's leap-year bug.
        return (datetime(1899, 12, 30) + timedelta(days=float(value))).date().isoformat()
    except Exception:
        return None


def to_float(value):
    if value in (None, ""):
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    txt = str(value).strip()
    if not txt or txt == "-":
        return 0.0
    txt = txt.replace("R$", "").replace("%", "").strip()
    # Formato brasileiro: 1.234,56
    if "," in txt and "." in txt:
        txt = txt.replace(".", "").replace(",", ".")
    elif "," in txt:
        txt = txt.replace(",", ".")
    try:
        return float(txt)
    except Exception:
        return 0.0


def to_int_from_text(value):
    if value in (None, ""):
        return 0
    m = re.search(r"\d+", str(value))
    return int(m.group(0)) if m else 0


def split_product_and_sku(text):
    if not text:
        return "", ""
    parts = str(text).splitlines()
    nome = parts[0].strip() if parts else str(text).strip()
    sku = ""
    for part in parts[1:]:
        # Ex.: "M004068" ou "Cor: Verde | SKU M005944T"
        m = re.search(r"(?:SKU\s*)?([A-Z]\d{3,}[A-Z0-9]*)", part.strip(), re.I)
        if m:
            sku = m.group(1).strip()
            break
    return nome, sku


def calc_promotion_status(data_inicio, data_fim, today=None):
    today = today or date.today()
    if not data_inicio and not data_fim:
        return "Sem Promoção"
    try:
        inicio = date.fromisoformat(data_inicio) if data_inicio else None
        fim = date.fromisoformat(data_fim) if data_fim else None
    except Exception:
        return "Sem Promoção"
    if inicio and inicio > today:
        return "Programado"
    if fim:
        if fim < today:
            return "Expirado"
        return "Ativado"
    return "Ativado"


class XlsmReader:
    def __init__(self, path):
        self.path = path
        self.zip = zipfile.ZipFile(path)
        self.shared_strings = self._load_shared_strings()
        self.sheets = self._load_sheet_map()

    def _load_shared_strings(self):
        strings = []
        try:
            root = ET.fromstring(self.zip.read("xl/sharedStrings.xml"))
        except KeyError:
            return strings
        for si in root.findall(NS + "si"):
            texts = []
            for t in si.iter(NS + "t"):
                texts.append(t.text or "")
            strings.append("".join(texts))
        return strings

    def _load_sheet_map(self):
        wb = ET.fromstring(self.zip.read("xl/workbook.xml"))
        rels = ET.fromstring(self.zip.read("xl/_rels/workbook.xml.rels"))
        rel_map = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rels}
        sheets = {}
        for sh in wb.find(NS + "sheets"):
            name = sh.attrib.get("name")
            rid = sh.attrib.get(R_NS + "id")
            target = rel_map.get(rid)
            if target:
                sheets[name] = target.replace("worksheets/", "")
        return sheets

    @staticmethod
    def _cell_ref_to_pos(ref):
        m = re.match(r"([A-Z]+)(\d+)", ref)
        col = 0
        for ch in m.group(1):
            col = col * 26 + ord(ch) - 64
        return int(m.group(2)), col

    def get_hyperlinks(self, sheet_xml_name):
        rel_path = f"xl/worksheets/_rels/{sheet_xml_name}.rels"
        rels = {}
        try:
            rel_root = ET.fromstring(self.zip.read(rel_path))
            rels = {rel.attrib["Id"]: rel.attrib.get("Target", "") for rel in rel_root}
        except KeyError:
            pass
        root = ET.fromstring(self.zip.read(f"xl/worksheets/{sheet_xml_name}"))
        links = {}
        for h in root.iter(NS + "hyperlink"):
            ref = h.attrib.get("ref")
            rid = h.attrib.get(R_NS + "id")
            if ref and rid in rels:
                links[ref] = rels[rid]
        return links

    def sheet_rows(self, sheet_name):
        sheet_xml = self.sheets[sheet_name]
        root = ET.fromstring(self.zip.read(f"xl/worksheets/{sheet_xml}"))
        cells = {}
        for c in root.iter(NS + "c"):
            ref = c.attrib.get("r")
            row, col = self._cell_ref_to_pos(ref)
            cell_type = c.attrib.get("t")
            v = c.find(NS + "v")
            inline = c.find(NS + "is")
            value = ""
            if cell_type == "s" and v is not None:
                value = self.shared_strings[int(v.text)]
            elif cell_type == "inlineStr" and inline is not None:
                value = "".join(t.text or "" for t in inline.iter(NS + "t"))
            elif v is not None:
                value = v.text
            else:
                f = c.find(NS + "f")
                if f is not None:
                    value = "=" + (f.text or "")
            cells[(row, col)] = value
        max_row = max((r for r, c in cells), default=0)
        max_col = max((c for r, c in cells), default=0)
        rows = []
        for r in range(1, max_row + 1):
            rows.append([cells.get((r, c), "") for c in range(1, max_col + 1)])
        return rows


def import_to_db(planilha, db_path, schema_path):
    reader = XlsmReader(planilha)
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON")
    with open(schema_path, "r", encoding="utf-8") as f:
        conn.executescript(f.read())

    # Limpa dados operacionais para reimportação completa.
    for table in ["simulacoes", "vendas", "promocoes", "anuncios", "importacoes"]:
        conn.execute(f"DELETE FROM {table}")
    conn.commit()

    anuncios_count = 0
    promocoes_count = 0
    vendas_count = 0

    # Anúncios / Precificação
    prec_rows = reader.sheet_rows("Precificação de produto")
    prec_links = reader.get_hyperlinks(reader.sheets["Precificação de produto"])
    for idx, row in enumerate(prec_rows[3:], start=4):
        if len(row) < 13:
            continue
        codigo = str(row[2]).strip()
        nome = str(row[4]).strip()
        if not codigo or not nome or codigo == "Cód. do Produto":
            continue
        link = prec_links.get(f"A{idx}", "")
        tipo = "Premium" if to_float(row[7]) >= 0.16 else "Clássico"
        conn.execute(
            """
            INSERT OR REPLACE INTO anuncios
            (codigo_produto, sku, nome, status, tipo_anuncio, valor_total, frete, tarifa,
             custo_fixo, desconto, preco_anunciado, liquido_receber, estoque,
             quantidade_vendida, ultima_atualizacao_preco, link_anuncio, ordem_importacao)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                codigo,
                str(row[3]).strip(),
                nome,
                str(row[1]).strip(),
                tipo,
                to_float(row[5]),
                to_float(row[6]),
                to_float(row[7]),
                to_float(row[8]),
                to_float(row[9]),
                to_float(row[10]),
                to_float(row[11]),
                0,
                to_int_from_text(row[12]),
                None,
                link,
                anuncios_count + 1,
            ),
        )
        anuncios_count += 1

    # Promoções
    promo_rows = reader.sheet_rows("Central de Promoções")
    promo_links = reader.get_hyperlinks(reader.sheets["Central de Promoções"])
    for idx, row in enumerate(promo_rows[3:], start=4):
        if len(row) < 9:
            continue
        codigo = str(row[2]).strip()
        nome = str(row[3]).strip()
        if not codigo or not nome or codigo == "Cód. do Produto":
            continue
        data_inicio = excel_date(row[4])
        data_fim = excel_date(row[5])
        status_raw = str(row[0]).strip()
        status = status_raw if status_raw and not status_raw.startswith("=") else calc_promotion_status(data_inicio, data_fim)
        if not data_inicio and not data_fim:
            status = "Sem Promoção"
        anuncio = conn.execute("SELECT id FROM anuncios WHERE codigo_produto = ?", (codigo,)).fetchone()
        conn.execute(
            """
            INSERT INTO promocoes
            (anuncio_id, codigo_produto, nome_anuncio, status, data_inicio, data_fim,
             preco, desconto, preco_final, link_promocao)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                anuncio[0] if anuncio else None,
                codigo,
                nome,
                status,
                data_inicio,
                data_fim,
                to_float(row[6]),
                to_float(row[7]),
                to_float(row[8]),
                promo_links.get(f"B{idx}", ""),
            ),
        )
        promocoes_count += 1

    # Vendas
    vendas_rows = reader.sheet_rows("Vendas")
    vendas_links = reader.get_hyperlinks(reader.sheets["Vendas"])
    for idx, row in enumerate(vendas_rows[2:], start=3):
        if len(row) < 10:
            continue
        numero = str(row[0]).strip()
        if not numero or numero == "Nº Venda":
            continue
        produto_nome, sku_extraido = split_product_and_sku(row[3])
        codigo = str(row[4]).strip()
        anuncio = conn.execute("SELECT id, sku FROM anuncios WHERE codigo_produto = ?", (codigo,)).fetchone()
        sku = sku_extraido or (anuncio[1] if anuncio else "")
        conn.execute(
            """
            INSERT OR REPLACE INTO vendas
            (numero_venda, anuncio_id, codigo_produto, sku, produto_nome, cliente_nome,
             status, data_venda, quantidade, valor_unitario, valor_receber, observacao, link_venda)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                numero,
                anuncio[0] if anuncio else None,
                codigo,
                sku,
                produto_nome,
                str(row[9]).strip(),
                str(row[1]).strip(),
                excel_date(row[2]),
                int(to_float(row[5]) or 0),
                to_float(row[6]),
                to_float(row[7]),
                str(row[8]).strip(),
                vendas_links.get(f"A{idx}", ""),
            ),
        )
        vendas_count += 1

    conn.execute(
        """
        INSERT INTO importacoes
        (arquivo_origem, anuncios_importados, promocoes_importadas, vendas_importadas, observacao)
        VALUES (?, ?, ?, ?, ?)
        """,
        (os.path.basename(planilha), anuncios_count, promocoes_count, vendas_count,
         "Importação inicial a partir da planilha. Campos sensíveis como CPF/endereço não foram importados no MVP."),
    )
    conn.commit()
    conn.close()
    return anuncios_count, promocoes_count, vendas_count


def main():
    parser = argparse.ArgumentParser(description="Importa planilha xlsm para SQLite")
    parser.add_argument("--planilha", default="Gestão de Anúncio - Mercado Livre(2).xlsm")
    parser.add_argument("--db", default="gestao_vendas.sqlite")
    parser.add_argument("--schema", default="schema.sql")
    args = parser.parse_args()
    counts = import_to_db(args.planilha, args.db, args.schema)
    print(f"Importação concluída: anúncios={counts[0]}, promoções={counts[1]}, vendas={counts[2]}")


if __name__ == "__main__":
    main()
