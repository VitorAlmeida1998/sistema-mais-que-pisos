from __future__ import annotations

import os
import tempfile
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


_UNIDADE_LABELS: dict[str, str] = {
    "m2": "m²",
    "metro_linear": "m lin.",
    "diaria": "diária",
    "unidade": "un.",
}


def _fmt_quantidade(qtd: str, unidade: str) -> str:
    n = Decimal(str(qtd))
    qtd_str = f"{int(n)}" if n % 1 == 0 else f"{n:.3f}".rstrip("0").replace(".", ",")
    label = _UNIDADE_LABELS.get(unidade, unidade)
    return f"{qtd_str} {label}"


def _secao_atividades(atividades: list, s: dict) -> list:
    # Largura útil A4 com margens de 2cm = 17 cm
    _cell = ParagraphStyle("rcell", fontSize=8, leading=10)

    def _obra_cell(a: dict) -> Paragraph:
        cliente = a.get("obra_cliente") or ""
        pedido = a.get("obra_numero_pedido")
        text = cliente
        if pedido:
            text += f"<br/><font size='6' color='#6B7280'>{pedido}</font>"
        return Paragraph(text, _cell)

    headers = ["Data", "Obra/Cliente", "Serviço", "Qtd/Unid.", "Valor Unit.", "Total"]
    rows = [headers] + [
        [
            str(a["data_execucao"]),
            _obra_cell(a),
            a.get("servico_descricao", ""),
            _fmt_quantidade(a["quantidade"], a.get("servico_unidade", "")),
            _fmt_moeda(Decimal(str(a.get("valor_unitario", 0)))),
            _fmt_moeda(Decimal(str(a["valor_calculado"]))),
        ]
        for a in atividades
    ]
    col_widths = [1.9 * cm, 4.6 * cm, 4.5 * cm, 2.5 * cm, 2.5 * cm, 2.5 * cm]  # total = 17 cm
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
        ("WORDWRAP", (0, 0), (-1, -1), True),
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


_STATUS_ATIVIDADE_LABELS = {"pendente": "Pendente", "aprovada": "Aprovada", "paga": "Paga"}
_STATUS_OBRA_LABELS = {"em_andamento": "Em Andamento", "concluida": "Concluída", "cancelada": "Cancelada"}
AZUL = colors.HexColor("#3B82F6")
AMARELO = colors.HexColor("#F59E0B")


def _cabecalho_obra(obra: dict, s: dict) -> list:
    status_label = _STATUS_OBRA_LABELS.get(str(obra.get("status", "")), str(obra.get("status", "")))
    pedido = f" — Pedido {obra['numero_pedido']}" if obra.get("numero_pedido") else ""
    return [
        Paragraph("MAIS QUE PISOS", s["title"]),
        Paragraph("Instalação e Acabamento de Pisos", s["subtitle"]),
        HRFlowable(width="100%", thickness=2, color=VERMELHO, spaceAfter=8),
        Paragraph("RELATÓRIO DE OBRA", s["rec_title"]),
        Paragraph(f"{obra['cliente_nome']}{pedido} — {status_label}", s["subtitle"]),
        Spacer(1, 0.3 * cm),
    ]


def _secao_info_obra(obra: dict, s: dict) -> list:
    data_fim = obra.get("data_fim_prevista")
    rows = [
        ["Cliente:", obra["cliente_nome"]],
        ["Endereço:", obra["endereco"]],
        ["Início:", str(obra["data_inicio"])],
        ["Previsão de Término:", str(data_fim) if data_fim else "—"],
    ]
    if obra.get("observacoes"):
        rows.append(["Observações:", obra["observacoes"]])

    table = Table(rows, colWidths=[4 * cm, None])
    table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (0, -1), VERMELHO),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return [Paragraph("DADOS DA OBRA", s["section"]), table, Spacer(1, 0.3 * cm)]


def _secao_atividades_obra(atividades: list, s: dict) -> list:
    if not atividades:
        return [
            Paragraph("ATIVIDADES", s["section"]),
            Paragraph("Nenhuma atividade registrada para esta obra.", s["subtitle"]),
            Spacer(1, 0.3 * cm),
        ]

    # Paragraph cells wrap automatically; plain strings overflow
    _cell = ParagraphStyle("cell", fontSize=8, leading=10)
    _header = ParagraphStyle("header", fontSize=8, leading=10, textColor=colors.white, fontName="Helvetica-Bold")

    headers = [
        Paragraph("Data", _header),
        Paragraph("Instalador", _header),
        Paragraph("Serviço", _header),
        Paragraph("Qtd/Unid.", _header),
        Paragraph("Valor", _header),
        Paragraph("Status", _header),
    ]
    rows = [headers] + [
        [
            Paragraph(str(a.get("data_execucao", "")), _cell),
            Paragraph(a.get("instalador_nome") or "—", _cell),
            Paragraph(a.get("servico_descricao") or "—", _cell),
            Paragraph(_fmt_quantidade(str(a["quantidade"]), str(a.get("servico_unidade") or "")), _cell),
            Paragraph(_fmt_moeda(Decimal(str(a["valor_calculado"]))), _cell),
            Paragraph(_STATUS_ATIVIDADE_LABELS.get(str(a.get("status", "")), str(a.get("status", ""))), _cell),
        ]
        for a in atividades
    ]
    # Total usable width on A4 with 2cm margins = 17cm
    col_widths = [2.0 * cm, 3.5 * cm, 5.2 * cm, 2.1 * cm, 2.4 * cm, 1.8 * cm]
    table = Table(rows, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), VERMELHO),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, _ZEBRA]),
        ("GRID", (0, 0), (-1, -1), 0.5, _GRID),
        ("ALIGN", (3, 0), (4, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]))
    return [Paragraph("ATIVIDADES", s["section"]), table, Spacer(1, 0.3 * cm)]


def _secao_totais_obra(atividades: list, s: dict) -> list:
    pendentes = [a for a in atividades if str(a.get("status")) == "pendente"]
    aprovadas = [a for a in atividades if str(a.get("status")) == "aprovada"]
    pagas = [a for a in atividades if str(a.get("status")) == "paga"]

    def soma(lst: list) -> Decimal:
        return sum(Decimal(str(a["valor_calculado"])) for a in lst)

    total_geral = soma(atividades)
    rows = [
        ["Total de Atividades:", str(len(atividades))],
        ["  Pendentes:", f"{len(pendentes)} — {_fmt_moeda(soma(pendentes))}"],
        ["  Aprovadas:", f"{len(aprovadas)} — {_fmt_moeda(soma(aprovadas))}"],
        ["  Pagas:", f"{len(pagas)} — {_fmt_moeda(soma(pagas))}"],
        ["VALOR TOTAL:", _fmt_moeda(total_geral)],
    ]
    table = Table(rows, colWidths=[None, 5 * cm], hAlign="RIGHT")
    table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("FONTNAME", (0, 4), (-1, 4), "Helvetica-Bold"),
        ("FONTSIZE", (0, 4), (-1, 4), 11),
        ("TEXTCOLOR", (0, 4), (-1, 4), VERDE),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return [HRFlowable(width="100%", thickness=1, color=VERMELHO, spaceAfter=4), table, Spacer(1, 0.5 * cm)]


def gerar_relatorio_obra_pdf(obra: dict, atividades: list[dict]) -> str:
    fd, path = tempfile.mkstemp(suffix=".pdf", prefix="relatorio_obra_")
    os.close(fd)

    s = _estilos()
    story = (
        _cabecalho_obra(obra, s)
        + _secao_info_obra(obra, s)
        + _secao_atividades_obra(atividades, s)
        + _secao_totais_obra(atividades, s)
    )
    story.append(Paragraph(
        f"Documento gerado em {date.today().strftime('%d/%m/%Y')} | Obra #{obra['id']}",
        _estilos()["footer"],
    ))

    doc = SimpleDocTemplate(
        path, pagesize=A4,
        rightMargin=2 * cm, leftMargin=2 * cm,
        topMargin=2 * cm, bottomMargin=2 * cm,
    )
    doc.build(story)
    return path


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
