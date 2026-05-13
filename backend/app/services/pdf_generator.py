from __future__ import annotations

from datetime import date
from decimal import Decimal
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)

from app.config import get_settings

settings = get_settings()

VERMELHO = colors.HexColor("#DC2626")
VERMELHO_ESCURO = colors.HexColor("#991B1B")
CINZA_ESCURO = colors.HexColor("#1F2937")
VERDE = colors.HexColor("#10B981")
_GRID = colors.HexColor("#E5E7EB")
_ZEBRA = colors.HexColor("#F9FAFB")


def _fmt_moeda(v: Decimal) -> str:
    return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _fmt_cpf(cpf: str) -> str:
    if len(cpf) == 11:
        return f"{cpf[:3]}.{cpf[3:6]}.{cpf[6:9]}-{cpf[9:]}"
    return cpf


def _estilos() -> dict:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("Title", parent=base["Heading1"], fontSize=18, textColor=VERMELHO_ESCURO, spaceAfter=6),
        "subtitle": ParagraphStyle("Subtitle", parent=base["Normal"], fontSize=10, textColor=CINZA_ESCURO),
        "section": ParagraphStyle("Section", parent=base["Heading2"], fontSize=11, textColor=VERMELHO, spaceBefore=12, spaceAfter=4),
        "rec_title": ParagraphStyle("RecTitle", parent=base["Heading1"], fontSize=14, textColor=CINZA_ESCURO, alignment=1, spaceBefore=4, spaceAfter=4),
        "footer": ParagraphStyle("Footer", parent=base["Normal"], fontSize=7, textColor=colors.HexColor("#9CA3AF"), alignment=1),
    }


def _cabecalho(pagamento_data: dict, s: dict) -> list:
    return [
        Paragraph("MAIS QUE PISOS", s["title"]),
        Paragraph("Instalação e Acabamento de Pisos", s["subtitle"]),
        HRFlowable(width="100%", thickness=2, color=VERMELHO, spaceAfter=8),
        Paragraph("RECIBO DE PAGAMENTO", s["rec_title"]),
        Paragraph(f"Período: {pagamento_data['semana_inicio']} a {pagamento_data['semana_fim']}", s["subtitle"]),
        Paragraph(f"Data de Pagamento: {pagamento_data.get('data_pagamento', date.today())}", s["subtitle"]),
        Spacer(1, 0.3 * cm),
    ]


def _secao_instalador(instalador: dict, s: dict) -> list:
    rows = [
        ["Nome:", instalador["nome"]],
        ["CPF:", _fmt_cpf(instalador["cpf"])],
    ]
    if instalador.get("telefone"):
        rows.append(["Telefone:", instalador["telefone"]])
    if instalador.get("chave_pix"):
        rows.append(["Chave PIX:", instalador["chave_pix"]])
    if instalador.get("eh_mei") and instalador.get("cnpj_mei"):
        rows.append(["CNPJ MEI:", instalador["cnpj_mei"]])

    table = Table(rows, colWidths=[3 * cm, None])
    table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (0, -1), VERMELHO),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return [Paragraph("DADOS DO INSTALADOR", s["section"]), table, Spacer(1, 0.3 * cm)]


def _secao_atividades(atividades: list, s: dict) -> list:
    headers = ["Data", "Obra/Cliente", "Serviço", "Qtd", "Unid.", "Valor Unit.", "Total"]
    rows = [headers] + [
        [
            str(a["data_execucao"]),
            a.get("obra_cliente", ""),
            a.get("servico_descricao", ""),
            str(a["quantidade"]),
            a.get("servico_unidade", ""),
            _fmt_moeda(Decimal(str(a.get("valor_unitario", 0)))),
            _fmt_moeda(Decimal(str(a["valor_calculado"]))),
        ]
        for a in atividades
    ]
    col_widths = [2.2 * cm, 4.5 * cm, 4 * cm, 1.5 * cm, 1.5 * cm, 2.5 * cm, 2.5 * cm]
    table = Table(rows, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), VERMELHO),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, _ZEBRA]),
        ("GRID", (0, 0), (-1, -1), 0.5, _GRID),
        ("ALIGN", (3, 0), (-1, -1), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    return [Paragraph("ATIVIDADES REALIZADAS", s["section"]), table, Spacer(1, 0.3 * cm)]


def _secao_adiantamentos(adiantamentos: list, s: dict) -> list:
    if not adiantamentos:
        return []
    rows = [["Data", "Descrição", "Valor"]] + [
        [str(adt["data"]), adt.get("descricao") or "—", _fmt_moeda(Decimal(str(adt["valor"])))]
        for adt in adiantamentos
    ]
    table = Table(rows, colWidths=[2.5 * cm, None, 3 * cm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F59E0B")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, _GRID),
        ("ALIGN", (2, 0), (2, -1), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    return [Paragraph("ADIANTAMENTOS DESCONTADOS", s["section"]), table, Spacer(1, 0.3 * cm)]


def _secao_totais(pagamento_data: dict) -> list:
    rows = [
        ["Valor Bruto:", _fmt_moeda(Decimal(str(pagamento_data["valor_bruto"])))],
        ["(-) Adiantamentos:", _fmt_moeda(Decimal(str(pagamento_data["valor_adiantamentos"])))],
        ["VALOR LÍQUIDO:", _fmt_moeda(Decimal(str(pagamento_data["valor_liquido"])))],
    ]
    table = Table(rows, colWidths=[None, 4 * cm], hAlign="RIGHT")
    table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("FONTNAME", (0, 2), (-1, 2), "Helvetica-Bold"),
        ("FONTSIZE", (0, 2), (-1, 2), 11),
        ("TEXTCOLOR", (0, 2), (-1, 2), VERDE),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return [HRFlowable(width="100%", thickness=1, color=VERMELHO, spaceAfter=4), table, Spacer(1, 1.5 * cm)]


def _secao_assinatura(nome: str) -> list:
    rows = [
        ["_" * 35, "_" * 35],
        [nome, "Responsável / Empresa"],
        ["Instalador", ""],
    ]
    table = Table(rows, colWidths=["50%", "50%"])
    table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    return [
        HRFlowable(width="100%", thickness=1, color=colors.HexColor("#D1D5DB")),
        Spacer(1, 0.3 * cm),
        table,
    ]


def _rodape(pagamento_id: int, s: dict) -> list:
    return [
        Spacer(1, 0.5 * cm),
        Paragraph(
            f"Documento gerado em {date.today().strftime('%d/%m/%Y')} | Recibo #{pagamento_id}",
            s["footer"],
        ),
    ]


def gerar_recibo_pdf(pagamento_data: dict) -> str:
    storage = Path(settings.PDF_STORAGE_PATH)
    storage.mkdir(parents=True, exist_ok=True)
    filepath = storage / f"recibo_pagamento_{pagamento_data['id']}.pdf"

    s = _estilos()
    story = (
        _cabecalho(pagamento_data, s)
        + _secao_instalador(pagamento_data["instalador"], s)
        + _secao_atividades(pagamento_data.get("atividades", []), s)
        + _secao_adiantamentos(pagamento_data.get("adiantamentos", []), s)
        + _secao_totais(pagamento_data)
        + _secao_assinatura(pagamento_data["instalador"]["nome"])
        + _rodape(pagamento_data["id"], s)
    )

    doc = SimpleDocTemplate(
        str(filepath), pagesize=A4,
        rightMargin=2 * cm, leftMargin=2 * cm,
        topMargin=2 * cm, bottomMargin=2 * cm,
    )
    doc.build(story)
    return str(filepath)
