"""Build the complete SellFastBuyFast documentation suite."""

from datetime import date
from html import escape
from pathlib import Path
import re

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

import build_founder_pdfs
import create_founder_docs_pdf


ROOT = Path(__file__).resolve().parent
OUT = Path.home() / "Desktop" / "SellFastBuyFast"
LOGO = ROOT / "assets" / "adaptive-icon.png"
ISSUE_DATE = date(2026, 8, 22)
VERSION = "0.9 Draft"

GREEN = colors.HexColor("#004839")
GOLD = colors.HexColor("#E29A17")
INK = colors.HexColor("#18221F")
MUTED = colors.HexColor("#65716C")
PALE = colors.HexColor("#F3F6F2")
LINE = colors.HexColor("#D7E0DB")
BLACK = colors.HexColor("#050706")

FONT_DIR = Path("/System/Library/Fonts/Supplemental")
pdfmetrics.registerFont(TTFont("DocSans", str(FONT_DIR / "Arial.ttf")))
pdfmetrics.registerFont(TTFont("DocSans-Bold", str(FONT_DIR / "Arial Bold.ttf")))

BASE = getSampleStyleSheet()
STYLES = {
    "title": ParagraphStyle(
        "SuiteTitle", parent=BASE["Title"], fontName="DocSans-Bold",
        fontSize=28, leading=33, textColor=GREEN, spaceAfter=10,
    ),
    "subtitle": ParagraphStyle(
        "SuiteSubtitle", parent=BASE["BodyText"], fontName="DocSans",
        fontSize=12, leading=17, textColor=MUTED,
    ),
    "h1": ParagraphStyle(
        "SuiteH1", parent=BASE["Heading1"], fontName="DocSans-Bold",
        fontSize=19, leading=23, textColor=GREEN, spaceBefore=10, spaceAfter=8,
    ),
    "h2": ParagraphStyle(
        "SuiteH2", parent=BASE["Heading2"], fontName="DocSans-Bold",
        fontSize=13, leading=17, textColor=GREEN, spaceBefore=9, spaceAfter=5,
    ),
    "h3": ParagraphStyle(
        "SuiteH3", parent=BASE["Heading3"], fontName="DocSans-Bold",
        fontSize=10.5, leading=14, textColor=INK, spaceBefore=7, spaceAfter=4,
    ),
    "body": ParagraphStyle(
        "SuiteBody", parent=BASE["BodyText"], fontName="DocSans",
        fontSize=8.5, leading=12.2, textColor=INK, spaceAfter=5,
    ),
    "bullet": ParagraphStyle(
        "SuiteBullet", parent=BASE["BodyText"], fontName="DocSans",
        fontSize=8.4, leading=12, textColor=INK, leftIndent=12,
        firstLineIndent=-7, spaceAfter=3,
    ),
    "small": ParagraphStyle(
        "SuiteSmall", parent=BASE["BodyText"], fontName="DocSans",
        fontSize=7.2, leading=9.5, textColor=MUTED,
    ),
    "table_head": ParagraphStyle(
        "SuiteTableHead", parent=BASE["BodyText"], fontName="DocSans-Bold",
        fontSize=6.8, leading=8.3, textColor=colors.white,
    ),
    "table_cell": ParagraphStyle(
        "SuiteTableCell", parent=BASE["BodyText"], fontName="DocSans",
        fontSize=6.6, leading=8.2, textColor=INK,
    ),
    "code": ParagraphStyle(
        "SuiteCode", parent=BASE["Code"], fontName="DocSans",
        fontSize=6.3, leading=8.0, textColor=INK,
    ),
    "cover_note": ParagraphStyle(
        "SuiteCoverNote", parent=BASE["BodyText"], fontName="DocSans-Bold",
        fontSize=8.5, leading=12, textColor=GREEN,
    ),
    "register_title": ParagraphStyle(
        "RegisterTitle", parent=BASE["Title"], fontName="DocSans-Bold",
        fontSize=25, leading=30, alignment=TA_CENTER, textColor=GREEN,
    ),
}


def rich(text):
    """Convert the small inline Markdown subset used by the source files."""
    text = escape(text.strip())
    text = re.sub(r"\[([^]]+)]\([^)]+\)", r"\1", text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"`(.+?)`", r"<font name='DocSans'>\1</font>", text)
    return text


def footer(canvas, doc):
    canvas.saveState()
    page_w, page_h = doc.pagesize
    canvas.setStrokeColor(GOLD)
    canvas.setLineWidth(0.9)
    canvas.line(doc.leftMargin, page_h - 12 * mm, page_w - doc.rightMargin, page_h - 12 * mm)
    canvas.setFont("DocSans-Bold", 7)
    canvas.setFillColor(GREEN)
    canvas.drawString(doc.leftMargin, page_h - 9 * mm, "SELLFASTBUYFAST")
    canvas.setFont("DocSans", 7)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(page_w - doc.rightMargin, page_h - 9 * mm, doc.title)
    canvas.setStrokeColor(LINE)
    canvas.line(doc.leftMargin, 12 * mm, page_w - doc.rightMargin, 12 * mm)
    canvas.drawString(doc.leftMargin, 7.5 * mm, f"INTERNAL | {VERSION} | {ISSUE_DATE.strftime('%d %B %Y')}")
    canvas.drawRightString(page_w - doc.rightMargin, 7.5 * mm, f"Page {doc.page}")
    canvas.restoreState()


def cover(title, subtitle, scope, landscape_page=False):
    logo_size = 72 * mm if not landscape_page else 52 * mm
    logo = Image(str(LOGO), width=logo_size, height=logo_size)
    logo.hAlign = "LEFT"
    width = 155 * mm if not landscape_page else 235 * mm
    note = Table(
        [[Paragraph(rich(scope), STYLES["cover_note"])],],
        colWidths=[width],
        style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), PALE),
            ("BOX", (0, 0), (-1, -1), 0.8, GOLD),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]),
    )
    return [
        Spacer(1, 10 * mm if landscape_page else 18 * mm),
        logo,
        Spacer(1, 5 * mm),
        Paragraph(title, STYLES["title"]),
        Paragraph(subtitle, STYLES["subtitle"]),
        Spacer(1, 9 * mm),
        note,
        Spacer(1, 9 * mm),
        Paragraph(f"Version {VERSION} | Issued {ISSUE_DATE.strftime('%d %B %Y')} | Internal", STYLES["small"]),
        PageBreak(),
    ]


def markdown_table(rows, available_width):
    parsed = []
    for row in rows:
        cells = [cell.strip() for cell in row.strip().strip("|").split("|")]
        if all(re.fullmatch(r":?-{3,}:?", cell.replace(" ", "")) for cell in cells):
            continue
        parsed.append(cells)
    if not parsed:
        return Spacer(1, 1)
    count = max(len(row) for row in parsed)
    data = []
    for row_index, row in enumerate(parsed):
        row += [""] * (count - len(row))
        style = STYLES["table_head"] if row_index == 0 else STYLES["table_cell"]
        data.append([Paragraph(rich(cell), style) for cell in row])
    table = Table(data, colWidths=[available_width / count] * count, repeatRows=1, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), GREEN),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.3, LINE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table


def parse_markdown(path, available_width):
    lines = path.read_text(encoding="utf-8").splitlines()
    story = []
    paragraph = []
    index = 0

    def flush_paragraph():
        if paragraph:
            story.append(Paragraph(rich(" ".join(paragraph)), STYLES["body"]))
            paragraph.clear()

    while index < len(lines):
        line = lines[index]
        stripped = line.strip()
        if stripped.startswith("```"):
            flush_paragraph()
            language = stripped[3:].strip()
            index += 1
            code = []
            while index < len(lines) and not lines[index].strip().startswith("```"):
                code.append(lines[index])
                index += 1
            if language == "mermaid":
                story.append(Table(
                    [[Paragraph(
                        "Companion visual: see the controlled Information Architecture and Screen Routing PDFs in this suite. The editable Mermaid definition remains in the maintained Markdown source.",
                        STYLES["cover_note"],
                    )]],
                    colWidths=[available_width],
                    style=TableStyle([
                        ("BACKGROUND", (0, 0), (-1, -1), PALE),
                        ("BOX", (0, 0), (-1, -1), 0.4, LINE),
                        ("LEFTPADDING", (0, 0), (-1, -1), 7),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                        ("TOPPADDING", (0, 0), (-1, -1), 6),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ]),
                ))
            else:
                story.append(Table(
                    [[Paragraph(
                        "Structured route and implementation reference retained in the maintained Markdown source. Use the companion controlled PDF for the presentation edition.",
                        STYLES["cover_note"],
                    )]],
                    colWidths=[available_width],
                    style=TableStyle([
                        ("BACKGROUND", (0, 0), (-1, -1), PALE),
                        ("BOX", (0, 0), (-1, -1), 0.4, LINE),
                        ("LEFTPADDING", (0, 0), (-1, -1), 7),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                        ("TOPPADDING", (0, 0), (-1, -1), 6),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ]),
                ))
        elif stripped.startswith("|") and stripped.endswith("|"):
            flush_paragraph()
            rows = []
            while index < len(lines) and lines[index].strip().startswith("|"):
                rows.append(lines[index])
                index += 1
            story.append(markdown_table(rows, available_width))
            story.append(Spacer(1, 4))
            continue
        elif stripped.startswith("### "):
            flush_paragraph()
            story.append(Paragraph(rich(stripped[4:]), STYLES["h3"]))
        elif stripped.startswith("## "):
            flush_paragraph()
            story.append(Paragraph(rich(stripped[3:]), STYLES["h2"]))
        elif stripped.startswith("# "):
            flush_paragraph()
            story.append(Paragraph(rich(stripped[2:]), STYLES["h1"]))
        elif re.match(r"^-\s+", stripped):
            flush_paragraph()
            story.append(Paragraph("- " + rich(stripped[2:]), STYLES["bullet"]))
        elif re.match(r"^\d+\.\s+", stripped):
            flush_paragraph()
            marker, content = stripped.split(". ", 1)
            story.append(Paragraph(f"{marker}. " + rich(content), STYLES["bullet"]))
        elif not stripped:
            flush_paragraph()
        else:
            paragraph.append(stripped)
        index += 1
    flush_paragraph()
    return story


def build_compendium():
    path = OUT / "SellFastBuyFast_Product_and_Technical_Specification_v0.9_Draft_2026-08-22.pdf"
    page = landscape(A4)
    doc = BaseDocTemplate(
        str(path), pagesize=page, leftMargin=16 * mm, rightMargin=16 * mm,
        topMargin=18 * mm, bottomMargin=17 * mm,
        title="Product and Technical Specification", author="SellFastBuyFast",
        subject="Consolidated target-v1 product, architecture, finance, security, and delivery specification",
        keywords="SellFastBuyFast, product requirements, architecture, finance controls, security",
    )
    doc.addPageTemplates([PageTemplate(
        id="main",
        frames=[Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")],
        onPage=footer,
    )])
    story = cover(
        "Product and Technical Specification",
        "Consolidated target-v1 product scope, architecture, authorization, financial controls, security, operations, and delivery roadmap.",
        "Status: draft target architecture. Commercial, legal, finance, privacy, provider, and operational approvals listed in this document remain launch blockers.",
        landscape_page=True,
    )
    sources = [
        ROOT / "docs" / "README.md",
        ROOT / "docs" / "product" / "v1-scope.md",
        ROOT / "docs" / "architecture" / "information-architecture.md",
        ROOT / "docs" / "product" / "screen-routing.md",
        ROOT / "docs" / "architecture" / "system-architecture.md",
        ROOT / "docs" / "architecture" / "data-model-and-authorization.md",
        ROOT / "docs" / "architecture" / "financial-domain.md",
        ROOT / "docs" / "operations" / "security-and-operations.md",
        ROOT / "docs" / "roadmap" / "delivery-roadmap.md",
    ]
    for source_index, source in enumerate(sources):
        if source_index:
            story.append(PageBreak())
        story.extend(parse_markdown(source, doc.width))
    doc.build(story)
    return path


def register_table(headers, rows, widths):
    data = [[Paragraph(rich(value), STYLES["table_head"]) for value in headers]]
    for row in rows:
        data.append([Paragraph(rich(value), STYLES["table_cell"]) for value in row])
    table = Table(data, colWidths=widths, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), GREEN),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def build_register(paths):
    path = OUT / "SellFastBuyFast_Document_Register_v0.9_Draft_2026-08-22.pdf"
    doc = BaseDocTemplate(
        str(path), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=18 * mm, bottomMargin=18 * mm, title="Document Register",
        author="SellFastBuyFast", subject="Controlled register for the SellFastBuyFast document suite",
    )
    doc.addPageTemplates([PageTemplate(
        id="main",
        frames=[Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")],
        onPage=footer,
    )])
    story = cover(
        "Document Register",
        "Controlled index, status, intended audience, and source coverage for the SellFastBuyFast document suite.",
        "The suite is internally classified and issued as a draft. Approval of a document does not itself approve unresolved business, legal, finance, privacy, provider, or operational decisions.",
    )
    story.append(Paragraph("Controlled Deliverables", STYLES["h1"]))
    rows = [
        ["Founder Blueprint", paths[0].name, "Founders and leadership", "Strategy, marketplace model, decisions, risks"],
        ["Product Requirements", paths[1].name, "Product, design, delivery, QA", "Target-v1 behavior and release gates"],
        ["Information Architecture", paths[2].name, "Product, design, engineering", "Surfaces, boundaries, ownership, IA gates"],
        ["Screen Routing", paths[3].name, "Product, UX, engineering, QA", "Routes, guards, handoffs, minimum states"],
        ["Product and Technical Specification", paths[4].name, "Engineering, security, finance, operations", "Complete maintained source set and detailed controls"],
    ]
    story.append(register_table(
        ["Document", "Controlled filename", "Primary audience", "Coverage"],
        rows, [33 * mm, 66 * mm, 37 * mm, 38 * mm],
    ))
    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph("Control Status", STYLES["h1"]))
    status_rows = [
        ["Brand", "SellFastBuyFast name and supplied adaptive-icon artwork applied across all controlled PDFs."],
        ["Version", f"{VERSION}; issued {ISSUE_DATE.isoformat()}."],
        ["Classification", "Internal working documents; distribute only to intended reviewers."],
        ["Implementation truth", "UI prototypes exist; production identity, API, database, payment, ledger, payout, reconciliation, and provider controls are not represented as deployed capability."],
        ["Approval state", "Draft. Open policy decisions and release gates remain mandatory."],
        ["Superseded material", "Earlier enterprise-style claims and legacy-branded generated documents are not part of this controlled suite."],
    ]
    story.append(register_table(["Control", "Position"], status_rows, [42 * mm, 132 * mm]))
    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph("Review Discipline", STYLES["h1"]))
    for item in [
        "Record a named owner, approver, approval date, effective date, and next review date before promoting any document from draft.",
        "Manage policy decisions through a versioned decision register; do not resolve open legal or finance questions through interface copy.",
        "Regenerate the complete suite after changing maintained Markdown so executive and technical editions remain aligned.",
        "Do not add guarantees or describe provider settlement as escrow without supporting contracts, evidence, and written approval.",
    ]:
        story.append(Paragraph("- " + rich(item), STYLES["bullet"]))
    doc.build(story)
    return path


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    founder = OUT / "SellFastBuyFast_Founder_Blueprint_v0.9_Draft_2026-08-22.pdf"
    product = OUT / "SellFastBuyFast_Product_Requirements_v0.9_Draft_2026-08-22.pdf"
    build_founder_pdfs.build(
        founder, "Founder Blueprint",
        "Strategic blueprint for the proposed SellFastBuyFast marketplace",
        "Version 0.9 Draft | 22 August 2026", build_founder_pdfs.master(),
    )
    build_founder_pdfs.build(
        product, "Product Requirements",
        "Functional, operational, financial, and launch requirements for target V1",
        "Version 0.9 Draft | 22 August 2026", build_founder_pdfs.prd(),
    )
    ia = create_founder_docs_pdf.build_ia()
    routing = create_founder_docs_pdf.build_routing()
    compendium = build_compendium()
    register = build_register([founder, product, ia, routing, compendium])
    for path in [register, founder, product, ia, routing, compendium]:
        print(path)


if __name__ == "__main__":
    main()
