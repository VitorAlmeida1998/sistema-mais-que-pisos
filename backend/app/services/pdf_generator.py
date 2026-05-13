"""Gerador de recibos PDF usando ReportLab."""
from __future__ import annotations

import os
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


def _fmt_moeda(v: Decimal) -> str:
    return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _fmt_cpf(cpf: str) -> str:
    if len(cpf) == 11:
        return f"{cpf[:3]}.{cpf[3:6]}.{cpf[6:9]}-{cpf[9:]}"
    return cpf


def gerar_recibo_pdf(pagamento_data: dict) -> str:  # type: ignore[return]
    """
    Gera PDF do recibo e salva em disco.
    pagamento_data: dict com todos os dados necessários.
    Retorna o caminho do arquivo salvo.
    """
    storage = Path(settings.PDF_STORAGE_PATH)
    storage.mkdir(parents=True, exist_ok=True)

    filename = f"recibo_pagamento_{pagamento_data['id']}.pdf"
    filepath = storage / filename

    doc = SimpleDocTemplate(
        str(filepath),
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "Title",
        parent=styles["Heading1"],
        fontSize=18,
        textColor=VERMELHO_ESCURO,
        spaceAfter=6,
    )
    subtitle_style = ParagraphStyle(
        "Subtitle",
        parent=styles["Normal"],
        fontSize=10,
        textColor=CINZA_ESCURO,
    )
    section_style = ParagraphStyle(
        "Section",
        parent=styles["Heading2"],
        fontSize=11,
        textColor=VERMELHO,
        spaceBefore=12,
        spaceAfter=4,
    )
    normal = ParagraphStyle("N", parent=styles["Normal"], fontSize=9, textColor=CINZA_ESCURO)

    story = []

    # Cabeçalho
    story.append(Paragraph("MAIS QUE PISOS", title_style))
    story.append(Paragraph("Instalação e Acabamento de Pisos", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=VERMELHO, spaceAfter=8))

    story.append(Paragraph("RECIBO DE PAGAMENTO", ParagraphStyle(
        "RecTitle", parent=styles["Heading1"], fontSize=14, textColor=CINZA_ESCURO,
        alignment=1, spaceBefore=4, spaceAfter=4,
    )))

    # Período
    story.append(Paragraph(
        f"Período: {pagamento_data['semana_inicio']} a {pagamento_data['semana_fim']}",
        subtitle_style,
    ))
    story.append(Paragraph(
        f"Data de Pagamento: {pagamento_data.get('data_pagamento', date.today())}",
        subtitle_style,
    ))
    story.append(Spacer(1, 0.3 * cm))

    # Dados do instalador
    story.append(Paragraph("DADOS DO INSTALADOR", section_style))
    instalador = pagamento_data["instalador"]
    inst_data = [
        ["Nome:", instalador["nome"]],
        ["CPF:", _fmt_cpf(instalador["cpf"])],
    ]
    if instalador.get("telefone"):
        inst_data.append(["Telefone:", instalador["telefone"]])
    if instalador.get("chave_pix"):
        inst_data.append(["Chave PIX:", instalador["chave_pix"]])
    if instalador.get("eh_mei") and instalador.get("cnpj_mei"):
        inst_data.append(["CNPJ MEI:", instalador["cnpj_mei"]])

    inst_table = Table(inst_data, colWidths=[3 * cm, None])
    inst_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (0, -1), VERMELHO),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(inst_table)
    story.append(Spacer(1, 0.3 * cm))

    # Atividades
    story.append(Paragraph("ATIVIDADES REALIZADAS", section_style))
    headers = ["Data", "Obra/Cliente", "Serviço", "Qtd", "Unid.", "Valor Unit.", "Total"]
    rows = [headers]
    for a in pagamento_data.get("atividades", []):
        rows.append([
            str(a["data_execucao"]),
            a.get("obra_cliente", ""),
            a.get("servico_descricao", ""),
            str(a["quantidade"]),
            a.get("servico_unidade", ""),
            _fmt_moeda(Decimal(str(a.get("valor_unitario", 0)))),
            _fmt_moeda(Decimal(str(a["valor_calculado"]))),
        ])

    col_widths = [2.2 * cm, 4.5 * cm, 4 * cm, 1.5 * cm, 1.5 * cm, 2.5 * cm, 2.5 * cm]
    ativ_table = Table(rows, colWidths=col_widths, repeatRows=1)
    ativ_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), VERMELHO),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
        ("ALIGN", (3, 0), (-1, -1), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(ativ_table)
    story.append(Spacer(1, 0.3 * cm))

    # Adiantamentos
    adiantamentos = pagamento_data.get("adiantamentos", [])
    if adiantamentos:
        story.append(Paragraph("ADIANTAMENTOS DESCONTADOS", section_style))
        adt_rows = [["Data", "Descrição", "Valor"]]
        for adt in adiantamentos:
            adt_rows.append([
                str(adt["data"]),
                adt.get("descricao") or "—",
                _fmt_moeda(Decimal(str(adt["valor"]))),
            ])
        adt_table = Table(adt_rows, colWidths=[2.5 * cm, None, 3 * cm])
        adt_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F59E0B")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("ALIGN", (2, 0), (2, -1), "RIGHT"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(adt_table)
        story.append(Spacer(1, 0.3 * cm))

    # Totais
    story.append(HRFlowable(width="100%", thickness=1, color=VERMELHO, spaceAfter=4))
    total_data = [
        ["Valor Bruto:", _fmt_moeda(Decimal(str(pagamento_data["valor_bruto"])))],
        ["(-) Adiantamentos:", _fmt_moeda(Decimal(str(pagamento_data["valor_adiantamentos"])))],
        ["VALOR LÍQUIDO:", _fmt_moeda(Decimal(str(pagamento_data["valor_liquido"])))],
    ]
    total_table = Table(total_data, colWidths=[None, 4 * cm], hAlign="RIGHT")
    total_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("FONTNAME", (0, 2), (-1, 2), "Helvetica-Bold"),
        ("FONTSIZE", (0, 2), (-1, 2), 11),
        ("TEXTCOLOR", (0, 2), (-1, 2), VERDE),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(total_table)
    story.append(Spacer(1, 1.5 * cm))

    # Assinatura
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#D1D5DB")))
    story.append(Spacer(1, 0.3 * cm))
    sign_data = [
        ["_" * 35, "_" * 35],
        [instalador["nome"], "Responsável / Empresa"],
        ["Instalador", ""],
    ]
    sign_table = Table(sign_data, colWidths=["50%", "50%"])
    sign_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    story.append(sign_table)

    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph(
        f"Documento gerado em {date.today().strftime('%d/%m/%Y')} | Recibo #{pagamento_data['id']}",
        ParagraphStyle("Footer", parent=styles["Normal"], fontSize=7,
                       textColor=colors.HexColor("#9CA3AF"), alignment=1),
    ))

    doc.build(story)
    return str(filepath)
