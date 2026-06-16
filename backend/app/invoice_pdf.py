"""Server-side invoice PDF generation using fpdf2."""
import base64
import io
import re
from datetime import datetime


def _embed_logo(pdf, logo_data_url: str, x: float, y: float, size: float):
    """Decode a base64 data-URL and draw it as an image in the PDF."""
    try:
        m = re.match(r'data:image/(\w+);base64,(.+)', logo_data_url, re.DOTALL)
        if not m:
            return
        img_type = m.group(1).upper().replace("JPEG", "JPG")
        raw = base64.b64decode(m.group(2))
        pdf.image(io.BytesIO(raw), x=x, y=y, w=size, h=size, type=img_type)
    except Exception:
        pass  # silently skip if logo fails (missing Pillow, bad data, etc.)


def generate_invoice_pdf_bytes(calc, order, client, cs) -> bytes:
    from fpdf import FPDF  # imported lazily so startup doesn't fail if not yet installed

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()
    pdf.set_margins(15, 15, 15)

    co_name  = cs.company_name or "ChromaPrint India"
    inv_no   = f"INV-{datetime.utcnow().year}-{str(calc.id).zfill(4)}"
    today    = datetime.utcnow().strftime("%d %B %Y")
    pricing  = (calc.result or {}).get("pricing", {})

    # ── Teal header band ──────────────────────────────────────────────────────
    pdf.set_fill_color(26, 188, 171)
    pdf.rect(0, 0, 215, 42, "F")

    # Logo — top-right of header band
    if cs.logo:
        _embed_logo(pdf, cs.logo, x=174, y=4, size=34)

    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 17)
    pdf.set_xy(15, 8)
    pdf.cell(0, 9, co_name.upper(), ln=True)

    pdf.set_font("Helvetica", "", 8)
    contact = "  |  ".join(filter(None, [cs.email, cs.phone, cs.website]))
    if contact:
        pdf.set_x(15)
        pdf.cell(0, 5, contact, ln=True)
    addr = ", ".join(filter(None, [cs.address, cs.location, cs.state, cs.country]))
    if addr:
        pdf.set_x(15)
        pdf.cell(0, 5, addr, ln=True)

    # ── Invoice title + right-side meta ───────────────────────────────────────
    pdf.set_text_color(15, 30, 28)
    pdf.set_y(50)

    pdf.set_font("Helvetica", "B", 26)
    pdf.cell(110, 12, "INVOICE", ln=False)

    def meta_row(label, value):
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(90, 105, 100)
        pdf.set_x(140)
        pdf.cell(32, 7, label, border="B", ln=False)
        pdf.set_text_color(15, 30, 28)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(0, 7, value, border="B", ln=True)

    meta_row("Invoice No.", inv_no)
    meta_row("Date", today)
    if order:
        meta_row("Order", order.name)
    if cs.gst_number:
        meta_row("GST No.", cs.gst_number)

    pdf.ln(10)

    # ── Bill To ───────────────────────────────────────────────────────────────
    pdf.set_text_color(26, 188, 171)
    pdf.set_font("Helvetica", "B", 8)
    pdf.cell(0, 5, "BILL TO", ln=True)

    if client:
        pdf.set_text_color(15, 30, 28)
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 7, client.name, ln=True)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(90, 105, 100)
        for val in filter(None, [client.email, client.phone, client.location]):
            pdf.cell(0, 5, val, ln=True)

    pdf.ln(8)
    _divider(pdf)

    # ── Label specifications ───────────────────────────────────────────────────
    pdf.set_text_color(26, 188, 171)
    pdf.set_font("Helvetica", "B", 8)
    pdf.cell(0, 5, "LABEL SPECIFICATIONS", ln=True)
    pdf.ln(1)

    specs = [
        ("Size", f"{calc.width:.1f} x {calc.height:.1f} mm"),
        ("Substrate", calc.substrate_name or "Custom"),
        ("Yield", f"{calc.yield_pct}%"),
    ]
    if calc.order_qty:
        specs.append(("Quantity", f"{calc.order_qty:,} labels"))

    for label, value in specs:
        _spec_row(pdf, label, value)

    pdf.ln(6)
    _divider(pdf)

    # ── Pricing ────────────────────────────────────────────────────────────────
    pdf.set_text_color(26, 188, 171)
    pdf.set_font("Helvetica", "B", 8)
    pdf.cell(0, 5, "PRICING", ln=True)
    pdf.ln(1)

    price_inr_1000  = float(pricing.get("price_inr_1000",  0) or 0)
    price_usd_1000  = float(pricing.get("price_usd_1000",  0) or 0)
    price_inr_label = float(pricing.get("price_inr_label", 0) or 0)

    qty       = calc.order_qty or 0
    total_inr = qty * price_inr_label if qty > 0 and price_inr_label else None

    _spec_row(pdf, "Rate (INR)", f"Rs. {price_inr_1000:,.2f} per 1,000 labels")
    _spec_row(pdf, "Rate (USD)", f"$ {price_usd_1000:,.3f} per 1,000 labels")
    if total_inr is not None:
        _spec_row(pdf, "Amount Due", f"Rs. {total_inr:,.2f}")

    # GST breakdown
    cgst_pct = float(cs.cgst_pct or 0)
    sgst_pct = float(cs.sgst_pct or 0)
    if total_inr and (cgst_pct or sgst_pct):
        pdf.ln(3)
        cgst_amt    = total_inr * cgst_pct / 100
        sgst_amt    = total_inr * sgst_pct / 100
        grand_total = total_inr + cgst_amt + sgst_amt
        _spec_row(pdf, f"CGST ({cgst_pct:.0f}%)", f"Rs. {cgst_amt:,.2f}")
        _spec_row(pdf, f"SGST ({sgst_pct:.0f}%)", f"Rs. {sgst_amt:,.2f}")
        pdf.ln(1)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(15, 30, 28)
        pdf.cell(45, 7, "Total (incl. GST):", ln=False)
        pdf.cell(0, 7, f"Rs. {grand_total:,.2f}", ln=True)

    pdf.ln(8)
    _divider(pdf)

    # ── Terms & conditions ─────────────────────────────────────────────────────
    pdf.set_text_color(26, 188, 171)
    pdf.set_font("Helvetica", "B", 8)
    pdf.cell(0, 5, "TERMS & CONDITIONS", ln=True)
    pdf.ln(1)

    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(90, 105, 100)
    for term in [
        "Prices are subject to applicable GST.",
        "50% advance payment required before production begins.",
        "This invoice is valid for 30 days from date of issue.",
        "Delivery timelines to be confirmed upon order placement.",
    ]:
        pdf.cell(5, 5, "-", ln=False)
        pdf.cell(0, 5, term, ln=True)

    # ── Footer ────────────────────────────────────────────────────────────────
    pdf.set_auto_page_break(auto=False)
    pdf.set_y(-20)
    pdf.set_draw_color(26, 188, 171)
    pdf.set_line_width(0.4)
    pdf.line(15, pdf.get_y(), 195, pdf.get_y())
    pdf.ln(4)
    pdf.set_font("Helvetica", "", 7)
    pdf.set_text_color(120, 130, 128)
    pdf.cell(0, 4, f"{co_name}  |  {today}  |  {inv_no}", align="C")

    return bytes(pdf.output())


def _divider(pdf):
    pdf.set_draw_color(26, 188, 171)
    pdf.set_line_width(0.4)
    pdf.line(15, pdf.get_y(), 195, pdf.get_y())
    pdf.ln(6)


def _spec_row(pdf, label, value):
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(90, 105, 100)
    pdf.cell(45, 6, label + ":", ln=False)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(15, 30, 28)
    pdf.cell(0, 6, value, ln=True)
