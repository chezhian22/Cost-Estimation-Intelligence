"""Server-side invoice PDF generation using fpdf2.
Mirrors the layout and data of the frontend buildPDFHtml() function.
"""
import base64
import io
import re
from datetime import datetime

# ── Palette ───────────────────────────────────────────────────────────────────
_TEAL  = (26, 188, 171)   # #1abcab
_DARK  = (30, 41, 59)     # #1e293b  — headings & values
_BODY  = (45, 55, 72)     # dark body text (replaces light slate for readability)
_SLATE = (80, 95, 115)    # secondary labels — darker than original
_MUTED = (100, 116, 139)  # sub-labels — darkened from original #94a3b8
_LGRAY = (241, 245, 249)  # #f1f5f9
_FGRAY = (248, 250, 252)  # #f8fafc
_WHITE = (255, 255, 255)
_BLUE1 = (37, 99, 235)    # #2563eb
_BLUE2 = (29, 78, 216)    # #1d4ed8
_BLUEBG = (239, 246, 255) # #eff6ff


def _embed_logo(pdf, logo_data_url: str, x: float, y: float, size: float):
    try:
        m = re.match(r'data:image/(\w+);base64,(.+)', logo_data_url, re.DOTALL)
        if not m:
            return
        img_type = m.group(1).upper().replace("JPEG", "JPG")
        raw = base64.b64decode(m.group(2))
        pdf.image(io.BytesIO(raw), x=x, y=y, w=size, h=size, type=img_type)
    except Exception:
        pass


def _ind(value, decimals=2):
    """Format a number with commas and fixed decimals (like en-IN locale)."""
    try:
        return f"{float(value):,.{decimals}f}"
    except (TypeError, ValueError):
        return "0.00"


def generate_invoice_pdf_bytes(calc, order, client, cs) -> bytes:
    from fpdf import FPDF

    # ── Data extraction (mirrors buildInvoicePayload / buildPDFHtml) ──────────
    today     = datetime.utcnow()
    inv_no    = f"INV-{today.year}-{str(calc.id).zfill(4)}"
    date_str  = today.strftime("%d %b %Y")

    result   = calc.result or {}
    matched  = result.get("matched", {})
    rows     = result.get("rows", [])
    pricing  = result.get("pricing", {})
    cyl_row  = rows[matched.get("index", 0)] if rows and matched.get("index") is not None else {}

    qty             = int(calc.order_qty or 0)
    price_inr_label = float(pricing.get("price_inr_label", 0) or 0)
    price_usd_label = float(pricing.get("price_usd_label", 0) or 0)
    subtotal        = qty * price_inr_label
    total_usd       = qty * price_usd_label

    # Tax (same logic as buildPDFHtml)
    cgst_pct = float(cs.cgst_pct) if cs.cgst_pct is not None and cs.cgst_pct != '' else None
    sgst_pct = float(cs.sgst_pct) if cs.sgst_pct is not None and cs.sgst_pct != '' else None
    has_tax  = cgst_pct is not None and sgst_pct is not None
    cgst_amt = subtotal * cgst_pct / 100 if has_tax else 0
    sgst_amt = subtotal * sgst_pct / 100 if has_tax else 0
    total_inr = subtotal + cgst_amt + sgst_amt if has_tax else subtotal

    # Company info
    co_name    = cs.company_name or "CHROMAPRINT"
    co_tagline = cs.tagline      or "India Private Limited"
    co_phone   = cs.phone        or "+91-422-2642738"
    co_email   = cs.email        or "sales@chromaprintindia.com"
    co_website = cs.website      or ""
    co_gst     = cs.gst_number   or ""
    addr_parts = [cs.address, cs.location, cs.state, cs.country]
    co_addr    = ", ".join(p for p in addr_parts if p) or "Coimbatore - 641 022, India"

    # Sub-line under item name (mirrors frontend subLine)
    sub_parts = []
    if calc.substrate_name:
        sub_parts.append(calc.substrate_name)
    if calc.width and calc.height:
        sub_parts.append(f"{float(calc.width):.1f} x {float(calc.height):.1f} mm")
    if cyl_row.get("teeth"):
        sub_parts.append(f"Cyl. {cyl_row['teeth']}T")
    if cyl_row.get("across") and cyl_row.get("around"):
        sub_parts.append(f"Layout {cyl_row['across']}x{cyl_row['around']}")
    sub_line = "  ·  ".join(sub_parts)

    # ── PDF setup ─────────────────────────────────────────────────────────────
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()
    pdf.set_margins(15, 15, 15)

    PAGE_W = 180  # printable width (210 - 2*15)
    LEFT   = 15

    # ── Header ────────────────────────────────────────────────────────────────
    hdr_y = 15
    logo_size = 14

    if cs.logo:
        _embed_logo(pdf, cs.logo, x=LEFT, y=hdr_y, size=logo_size)
        co_x = LEFT + logo_size + 3
    else:
        co_x = LEFT

    # Company name (teal, bold)
    pdf.set_xy(co_x, hdr_y)
    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(*_TEAL)
    pdf.cell(95, 10, co_name.upper())

    # Right block: "INVOICE" title
    pdf.set_xy(LEFT + PAGE_W - 65, hdr_y)
    pdf.set_font("Helvetica", "B", 28)
    pdf.set_text_color(*_DARK)
    pdf.cell(65, 12, "INVOICE", align="R")

    # Tagline
    pdf.set_xy(co_x, hdr_y + 11)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*_MUTED)
    pdf.cell(95, 5, co_tagline.upper())

    # Invoice number
    pdf.set_xy(LEFT + PAGE_W - 65, hdr_y + 14)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(*_TEAL)
    pdf.cell(65, 6, f"# {inv_no}", align="R")

    # Address
    pdf.set_xy(co_x, hdr_y + 17)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*_BODY)
    pdf.cell(95, 5, co_addr)

    # Date
    pdf.set_xy(LEFT + PAGE_W - 65, hdr_y + 21)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*_BODY)
    pdf.cell(65, 5, f"Date: {date_str}", align="R")

    # Phone | Email
    contact = "  |  ".join(p for p in [co_phone, co_email] if p)
    pdf.set_xy(co_x, hdr_y + 23)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*_BODY)
    pdf.cell(95, 5, contact)

    # Valid line
    pdf.set_xy(LEFT + PAGE_W - 65, hdr_y + 27)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*_BODY)
    pdf.cell(65, 5, "Valid: 30 days from issue", align="R")

    if co_gst:
        pdf.set_xy(co_x, hdr_y + 29)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*_SLATE)
        pdf.cell(95, 5, f"GSTIN: {co_gst}")

    # ── Teal divider ──────────────────────────────────────────────────────────
    div_y = hdr_y + 38
    pdf.set_fill_color(*_TEAL)
    pdf.rect(LEFT, div_y, PAGE_W, 2, "F")
    pdf.set_y(div_y + 7)

    # ── Bill To ───────────────────────────────────────────────────────────────
    pdf.set_x(LEFT)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*_MUTED)
    pdf.cell(0, 5, "BILL TO", ln=True)

    if client:
        pdf.set_x(LEFT)
        pdf.set_font("Helvetica", "B", 16)
        pdf.set_text_color(*_DARK)
        pdf.cell(0, 9, client.name or "-", ln=True)

        pdf.set_font("Helvetica", "", 11)
        pdf.set_text_color(*_BODY)
        for val in filter(None, [client.location, client.email, client.phone]):
            pdf.set_x(LEFT)
            pdf.cell(0, 6, val, ln=True)
    else:
        pdf.set_x(LEFT)
        pdf.set_font("Helvetica", "B", 16)
        pdf.set_text_color(*_DARK)
        pdf.cell(0, 9, "-", ln=True)

    # Order / ref line
    if order:
        pdf.ln(3)
        pdf.set_draw_color(*_LGRAY)
        pdf.set_line_width(0.3)
        pdf.line(LEFT, pdf.get_y(), LEFT + PAGE_W, pdf.get_y())
        pdf.ln(3)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*_BODY)
        if order.name:
            pdf.set_x(LEFT)
            pdf.cell(0, 6, f"Order:  {order.name}", ln=True)

    pdf.ln(7)

    # ── Items table ───────────────────────────────────────────────────────────
    COL_ITEM = 88
    COL_QTY  = 28
    COL_RATE = 34
    COL_AMT  = PAGE_W - COL_ITEM - COL_QTY - COL_RATE  # remaining

    # Header row
    pdf.set_fill_color(*_DARK)
    pdf.set_text_color(*_WHITE)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_x(LEFT)
    pdf.cell(COL_ITEM, 11, "  ITEM",           fill=True)
    pdf.cell(COL_QTY,  11, "QTY",              fill=True, align="R")
    pdf.cell(COL_RATE, 11, "RATE",             fill=True, align="R")
    pdf.cell(COL_AMT,  11, "AMOUNT  ",         fill=True, align="R")
    pdf.ln()

    # Item row
    pdf.set_text_color(*_DARK)
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_x(LEFT)
    pdf.cell(COL_ITEM, 9, "  Pressure Sensitive Labels", fill=False)

    qty_str  = f"{qty:,} labels" if qty > 0 else "-"
    rate_str = f"Rs. {price_inr_label:.4f} / label" if price_inr_label else "-"
    amt_str  = f"Rs. {_ind(subtotal)}" if subtotal else "-"

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(COL_QTY,  9, qty_str,  align="R")
    pdf.cell(COL_RATE, 9, rate_str, align="R")
    pdf.cell(COL_AMT,  9, f"{amt_str}  ", align="R")
    pdf.ln()

    # Sub-line (substrate · size · cylinder info)
    if sub_line:
        pdf.set_x(LEFT)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*_SLATE)
        pdf.cell(COL_ITEM, 6, f"  {sub_line}", ln=False)
    pdf.ln(10)

    # Light border under table
    pdf.set_draw_color(*_LGRAY)
    pdf.set_line_width(0.3)
    pdf.line(LEFT, pdf.get_y(), LEFT + PAGE_W, pdf.get_y())
    pdf.ln(5)

    # ── Totals (right-aligned block) ──────────────────────────────────────────
    TOT_X   = LEFT + PAGE_W - 82
    TOT_W   = 82
    LBL_W   = 42
    VAL_W   = TOT_W - LBL_W

    def _tot_row(label, value, bold_val=False):
        y = pdf.get_y()
        pdf.set_xy(TOT_X, y)
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(*_SLATE)
        pdf.cell(LBL_W, 8, label)
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(*_DARK)
        pdf.cell(VAL_W, 8, value, align="R")
        pdf.ln()
        pdf.set_draw_color(*_LGRAY)
        pdf.set_line_width(0.2)
        pdf.line(TOT_X, pdf.get_y(), TOT_X + TOT_W, pdf.get_y())
        pdf.ln(1)

    def _tot_final(label, value):
        y = pdf.get_y() + 2
        pdf.set_fill_color(*_DARK)
        pdf.rect(TOT_X, y, TOT_W, 13, "F")
        pdf.set_xy(TOT_X + 3, y + 3)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*_WHITE)
        pdf.cell(LBL_W - 3, 7, label)
        pdf.set_font("Helvetica", "B", 16)
        pdf.set_text_color(*_WHITE)
        pdf.cell(VAL_W - 3, 7, value, align="R")
        pdf.ln(16)

    def _tot_usd(label, value):
        y = pdf.get_y() + 2
        pdf.set_fill_color(*_BLUEBG)
        pdf.rect(TOT_X, y, TOT_W, 12, "F")
        pdf.set_draw_color(*_BLUE1)
        pdf.set_line_width(0.4)
        pdf.rect(TOT_X, y, TOT_W, 12)
        pdf.set_xy(TOT_X + 3, y + 3)
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(*_BLUE1)
        pdf.cell(LBL_W - 3, 6, label)
        pdf.set_font("Helvetica", "B", 14)
        pdf.set_text_color(*_BLUE2)
        pdf.cell(VAL_W - 3, 6, value, align="R")
        pdf.ln(15)

    _tot_row("Subtotal", f"Rs. {_ind(subtotal)}", bold_val=True)

    if has_tax:
        _tot_row(f"CGST @ {cgst_pct:.0f}%", f"Rs. {_ind(cgst_amt)}", bold_val=True)
        _tot_row(f"SGST @ {sgst_pct:.0f}%", f"Rs. {_ind(sgst_amt)}", bold_val=True)
    else:
        _tot_row("GST", "As applicable")

    _tot_final("TOTAL (INR)", f"Rs. {_ind(total_inr)}")

    if total_usd > 0:
        _tot_usd("Total (USD)", f"$ {total_usd:.2f}")

    # GST note if no tax configured
    if not has_tax:
        pdf.set_xy(TOT_X, pdf.get_y())
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*_SLATE)
        pdf.cell(TOT_W, 5, "* GST will be charged as applicable", align="R")
        pdf.ln(6)

    # ── Footer ────────────────────────────────────────────────────────────────
    pdf.ln(10)
    footer_y = pdf.get_y()
    pdf.set_fill_color(*_FGRAY)
    pdf.rect(0, footer_y, 220, 35, "F")
    pdf.set_draw_color(226, 232, 240)
    pdf.set_line_width(0.3)
    pdf.line(LEFT, footer_y, LEFT + PAGE_W, footer_y)
    pdf.set_y(footer_y + 4)

    # Left: terms
    pdf.set_x(LEFT)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(*_DARK)
    pdf.cell(110, 6, "Terms & Conditions", ln=True)

    terms = [
        "Valid 30 days  ·  GST applicable as per government norms  ·  50% advance before production",
        "Subject to substrate availability  ·  Prices subject to change without notice",
    ]
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*_BODY)
    for t in terms:
        pdf.set_x(LEFT)
        pdf.cell(110, 5, t, ln=True)

    # Right: company contact
    pdf.set_y(footer_y + 4)
    pdf.set_x(LEFT + PAGE_W - 65)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(*_TEAL)
    pdf.cell(65, 6, co_name, align="R", ln=True)

    for val in filter(None, [co_email, co_phone, co_website]):
        pdf.set_x(LEFT + PAGE_W - 65)
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(*_BODY)
        pdf.cell(65, 5, val, align="R", ln=True)

    return bytes(pdf.output())
