"""Build founder-ready PDF versions of SellFastBuyFast IA and routing documents."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageBreak, PageTemplate, Paragraph, Spacer,
    Table, TableStyle, KeepTogether, Flowable, Image,
)


ROOT = Path(__file__).resolve().parent
OUTPUT = Path.home() / "Desktop" / "SellFastBuyFast"
LOGO = ROOT / "assets" / "adaptive-icon.png"
PAGE = landscape(letter)
W, H = PAGE

GREEN = colors.HexColor("#123B2D")
GREEN_2 = colors.HexColor("#245D48")
GOLD = colors.HexColor("#B58A28")
INK = colors.HexColor("#17221D")
MUTED = colors.HexColor("#56625B")
LINE = colors.HexColor("#CDD7D0")
PALE_GREEN = colors.HexColor("#E7F1EA")
PALE_GOLD = colors.HexColor("#FBF1D6")
PALE_BLUE = colors.HexColor("#EAF0F7")
PALE_PURPLE = colors.HexColor("#F2EAF5")
WHITE = colors.white


def esc(text):
    return (text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


styles = getSampleStyleSheet()
TITLE = ParagraphStyle("Title", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=27,
                       leading=31, textColor=GREEN, spaceAfter=8)
SUBTITLE = ParagraphStyle("Subtitle", parent=styles["Normal"], fontName="Helvetica", fontSize=11,
                          leading=15, textColor=MUTED, spaceAfter=18)
H1 = ParagraphStyle("H1", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=18,
                    leading=22, textColor=GREEN, spaceBefore=8, spaceAfter=8, keepWithNext=True)
H2 = ParagraphStyle("H2", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=11.5,
                    leading=14, textColor=GREEN_2, spaceBefore=8, spaceAfter=5, keepWithNext=True)
BODY = ParagraphStyle("Body", parent=styles["Normal"], fontName="Helvetica", fontSize=8.6,
                      leading=11.8, textColor=INK, spaceAfter=5)
SMALL = ParagraphStyle("Small", parent=BODY, fontSize=7.4, leading=9.5, textColor=MUTED)
TABLE_HEAD = ParagraphStyle("TableHead", parent=BODY, fontName="Helvetica-Bold", fontSize=7.5,
                            leading=9.2, textColor=WHITE)
TABLE_CELL = ParagraphStyle("TableCell", parent=BODY, fontSize=7.25, leading=9.1)
TABLE_CELL_SMALL = ParagraphStyle("TableCellSmall", parent=BODY, fontSize=6.65, leading=8.15)
CALLOUT = ParagraphStyle("Callout", parent=BODY, fontName="Helvetica-Bold", fontSize=8.2,
                         leading=11, textColor=GREEN)
CENTER = ParagraphStyle("Center", parent=BODY, alignment=TA_CENTER)


def P(text, style=BODY):
    return Paragraph(text, style)


def bullet(text):
    return P("&bull; " + text)


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(GOLD)
    canvas.setLineWidth(1.2)
    canvas.line(42, H - 35, W - 42, H - 35)
    canvas.setFont("Helvetica-Bold", 7.5)
    canvas.setFillColor(GREEN)
    canvas.drawString(42, H - 27, "SELLFASTBUYFAST | DOCUMENT SUITE")
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(W - 42, H - 27, doc.title)
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.6)
    canvas.line(42, 31, W - 42, 31)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(42, 19, "INTERNAL | Version 0.9 Draft | 22 August 2026")
    canvas.drawRightString(W - 42, 19, f"Page {doc.page}")
    canvas.restoreState()


class Diagram(Flowable):
    def __init__(self, boxes, arrows, width=W - 84, height=270):
        super().__init__()
        self.boxes, self.arrows, self.width, self.height = boxes, arrows, width, height

    def draw_box(self, c, item):
        x, y, w, h, label, fill = item
        c.setFillColor(fill)
        c.setStrokeColor(GREEN_2)
        c.setLineWidth(0.8)
        c.roundRect(x, y, w, h, 7, stroke=1, fill=1)
        c.setFillColor(INK)
        lines = label.split("\n")
        size = 7.6 if len(lines) > 2 else 8.2
        c.setFont("Helvetica-Bold", size)
        leading = size + 2
        start = y + h / 2 + ((len(lines) - 1) * leading / 2) - size * 0.75
        for i, line in enumerate(lines):
            c.drawCentredString(x + w / 2, start - i * leading, line)

    def draw_arrow(self, c, a):
        x1, y1, x2, y2, label = a
        c.setStrokeColor(MUTED)
        c.setFillColor(MUTED)
        c.setLineWidth(0.8)
        c.line(x1, y1, x2, y2)
        angle = 0
        if abs(x2-x1) >= abs(y2-y1):
            angle = 1 if x2 >= x1 else -1
            pts = [(x2, y2), (x2 - 6*angle, y2 + 3), (x2 - 6*angle, y2 - 3)]
        else:
            angle = 1 if y2 >= y1 else -1
            pts = [(x2, y2), (x2 - 3, y2 - 6*angle), (x2 + 3, y2 - 6*angle)]
        path = c.beginPath(); path.moveTo(*pts[0]); path.lineTo(*pts[1]); path.lineTo(*pts[2]); path.close()
        c.drawPath(path, stroke=0, fill=1)
        if label:
            c.setFont("Helvetica", 6.5)
            c.drawCentredString((x1+x2)/2, (y1+y2)/2 + 4, label)

    def draw(self):
        c = self.canv
        for a in self.arrows:
            self.draw_arrow(c, a)
        for b in self.boxes:
            self.draw_box(c, b)


def table(headers, rows, widths, small=False):
    cell_style = TABLE_CELL_SMALL if small else TABLE_CELL
    data = [[P(esc(h), TABLE_HEAD) for h in headers]]
    for row in rows:
        data.append([P(esc(str(v)), cell_style) for v in row])
    t = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), GREEN),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, colors.HexColor("#F7FAF8")]),
        ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return t


def cover(title, subtitle, scope):
    logo = Image(str(LOGO), width=120, height=120)
    logo.hAlign = "LEFT"
    return [Spacer(1, 30), logo, Spacer(1, 8), P(title, TITLE), P(subtitle, SUBTITLE), Spacer(1, 12),
            Table([[P(scope, CALLOUT)]], colWidths=[W - 140], style=[
                ("BACKGROUND", (0, 0), (-1, -1), PALE_GREEN), ("BOX", (0, 0), (-1, -1), 0.9, GOLD),
                ("LEFTPADDING", (0, 0), (-1, -1), 15), ("RIGHTPADDING", (0, 0), (-1, -1), 15),
                ("TOPPADDING", (0, 0), (-1, -1), 12), ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
            ]), Spacer(1, 20), P("Internal working document | Nigeria-first marketplace | Draft target v1", SUBTITLE)]


def build_ia():
    out = OUTPUT / "SellFastBuyFast_Information_Architecture_v0.9_Draft_2026-08-22.pdf"
    doc = BaseDocTemplate(str(out), pagesize=PAGE, leftMargin=42, rightMargin=42, topMargin=48, bottomMargin=42,
                          title="Information Architecture")
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
    doc.addPageTemplates([PageTemplate(id="normal", frames=[frame], onPage=header_footer)])
    story = cover("V1 Information Architecture", "A founder-ready map of product surfaces, trust boundaries, and delivery scope.",
                   "Status note: shopper, merchant, and operations interfaces are non-production prototypes. The Core API, durable data, finance controls, and provider integrations are draft target-v1 architecture, not current implementation.")
    story += [PageBreak(), P("1. Executive architecture", H1),
              P("SellFastBuyFast has three role-specific experiences. All privileged actions flow through the Core API; the platform, not the client, owns financial state, permission decisions, order transitions, and provider communications."), Spacer(1, 7)]
    boxes = [
        (8, 212, 105, 35, "Buyer", PALE_GREEN), (8, 150, 105, 35, "Merchant owner\nor staff", PALE_GREEN), (8, 88, 105, 35, "Operations staff", PALE_GREEN),
        (158, 212, 142, 35, "Shopper mobile app\nUI prototype -> target v1", PALE_GREEN), (158, 150, 142, 35, "Merchant web portal\nStatic prototype -> target v1", PALE_GOLD), (158, 88, 142, 35, "Operations web portal\nStatic prototype -> target v1", PALE_GOLD),
        (365, 177, 155, 54, "Core API\nidentity | authorization | commands\naudit | domain modules", PALE_BLUE),
        (365, 85, 155, 48, "Supabase platform\nPostgreSQL | Auth | Storage\nRealtime", PALE_BLUE),
        (580, 202, 125, 35, "Paystack\ncheckout | webhooks | transfers", PALE_PURPLE), (580, 141, 125, 35, "Logistics\nquotes | tracking", PALE_PURPLE), (580, 80, 125, 35, "Workers + scheduler\nscan | notify | reconcile", PALE_PURPLE),
    ]
    arrows = [(113,229,158,229,""),(113,167,158,167,""),(113,105,158,105,""),(300,229,365,204,"HTTPS"),(300,167,365,204,"HTTPS"),(300,105,365,198,"HTTPS"),(442,177,442,133,""),(520,210,580,220,""),(520,200,580,159,""),(520,112,580,97,"")]
    story += [Diagram(boxes, arrows, height=270), Spacer(1, 7),
              table(["Surface", "Primary purpose", "Current status"], [
                   ["Shopper mobile", "Discovery, single-merchant purchase, tracking, returns, support", "Local-state UI prototype; no transactional platform"],
                   ["Merchant portal", "Onboarding, catalogue, stock, fulfilment, earnings and payout request", "Static workflow prototype"],
                   ["Operations portal", "Review queues, exceptions, finance reconciliation, audit", "Static workflow prototype"],
                  ["Trusted platform", "Authorizes commands, persists records, integrates providers, writes audit events", "Target v1"],
              ], [130, 350, 220])]
    story += [PageBreak(), P("2. Product map by audience", H1),
              P("The map below is the draft target-v1 IA. Green represents the shopper prototype area; gold represents target expansion that remains subject to approval and implementation."), Spacer(1, 5),
              table(["Audience", "Top-level areas", "Key outcomes"], [
                  ["Buyer", "Discover; Product; Bag; Checkout; Orders; Saved; Notifications; Account", "Find approved goods, purchase from one merchant, track delivery, request return/support"],
                  ["Merchant", "Onboarding; Dashboard; Catalogue; Fulfilment; Earnings/Payouts; Team/Settings", "Complete verification, sell approved goods, fulfil orders, request eligible payout"],
                  ["Operations", "Work queue; Merchant review; Moderation; Exceptions; Returns/Support; Finance; Audit", "Protect marketplace quality, resolve cases, reconcile money with segregation of duties"],
              ], [105, 385, 210]), Spacer(1, 12), P("Shopper route hierarchy", H2),
              table(["Area", "Destinations", "Purpose"], [
                  ["Discovery", "Home; campaigns; categories; search; filters; merchant store; product detail", "Public browsing of approved catalogue"],
                  ["Bag & checkout", "Bag; merchant conflict; sign-in; address; delivery; review; Paystack; processing; confirmation", "One merchant per cart; verified payment before order confirmation"],
                  ["Post-purchase", "Orders; order detail; tracking; cancellation; return; support; refund status", "Buyer protection and transparent status"],
                  ["Account", "Profile; addresses; notifications; saved items; privacy; help", "Buyer-owned information and preferences"],
              ], [110, 390, 200])]
    story += [PageBreak(), P("3. Ownership and trust boundaries", H1),
              P("Clients express intent. The platform verifies identity, validates the current state, changes data transactionally, records an audit trail, and uses workers for slow or provider-facing work."), Spacer(1, 6),
              table(["Domain", "Buyer", "Merchant", "Operations", "Platform authority"], [
                  ["Identity", "Own profile, addresses, deletion request", "Own membership within scope", "Platform role assignment", "JWT/role verification and audit"],
                  ["Catalogue", "Read approved products", "Create/edit own products", "Moderate and publish", "Validate, scan, publish public read model"],
                  ["Checkout", "Build cart and submit payment intent", "No direct access", "Exception support only", "Reserve stock; create order; verify provider payment"],
                  ["Fulfilment", "Read status/tracking", "Accept, pack, dispatch", "Resolve exception", "Validate state changes; ingest carrier events"],
                  ["Finance", "Own payment/refund status", "Balance view; payout request", "Review and reconcile", "Immutable ledger; holds; transfers; reconciliation"],
              ], [88, 150, 150, 150, 200], small=True), Spacer(1, 14), P("V1 gates", H2),
              table(["Gate", "Route behavior"], [
                  ["Merchant not approved", "Allow onboarding/status only; hide catalogue publishing, fulfilment and payout actions."],
                  ["Payment pending or unverified", "Do not show paid confirmation; show processing state and re-query verified backend status."],
                  ["Order before merchant acceptance", "Cancellation action may be offered under policy."],
                  ["Delivered and return eligible", "Return-request entry is available only while policy and evidence requirements allow."],
                  ["Seller balance pending", "Show balance but block payout request until funds are available and eligible."],
              ], [185, 553])]
    story += [PageBreak(), P("4. Founder implications", H1),
              P("This IA makes delivery scope and operating risk visible. The next product decision is not another prototype screen; it is approving the constraints that make the routes safely executable."), Spacer(1, 8),
              table(["Decision", "Why it matters to IA", "Required owner"], [
                  ["Single-merchant cart", "It keeps bag and checkout simple. Multi-merchant checkout is a separately funded future product.", "Product + Finance"],
                  ["Paystack collection model", "It determines checkout, refunds, merchant availability, and payout routing.", "Finance + Legal"],
                  ["Delivery zones and policy", "It defines address validation, delivery quote, tracking, cancellation and lost-parcel flows.", "Operations"],
                  ["Return and payout policy", "It controls route eligibility and finance release gates.", "Legal + Operations + Finance"],
                  ["Role design", "It determines which merchant and staff navigation/actions are visible and permitted.", "Operations + Security"],
              ], [165, 405, 168]), Spacer(1, 16),
              Table([[P("Recommended sequence: approve policy gates -> establish platform foundation -> implement catalogue/onboarding -> build single-merchant checkout -> add returns, ledger, payouts and production hardening.", CALLOUT)]], colWidths=[W-84], style=[("BACKGROUND",(0,0),(-1,-1),PALE_GOLD),("BOX",(0,0),(-1,-1),0.75,GOLD),("LEFTPADDING",(0,0),(-1,-1),10),("RIGHTPADDING",(0,0),(-1,-1),10),("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),8)])]
    doc.build(story)
    return out


def build_routing():
    out = OUTPUT / "SellFastBuyFast_Screen_Routing_v0.9_Draft_2026-08-22.pdf"
    doc = BaseDocTemplate(str(out), pagesize=PAGE, leftMargin=42, rightMargin=42, topMargin=48, bottomMargin=42,
                          title="Screen Routing Specification")
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
    doc.addPageTemplates([PageTemplate(id="normal", frames=[frame], onPage=header_footer)])
    story = cover("V1 Screen Routing Specification", "The route contract for product, design, engineering, QA, and operations.",
                   "Every protected or transactional route has an access rule, a safe entry/exit, and server-side eligibility check. Routes describe draft target v1; current prototypes do not provide a production authorization or transactional boundary.")
    story += [PageBreak(), P("1. Routing rules", H1),
              table(["Rule", "Implementation expectation"], [
                  ["Public vs protected", "Public routes support browsing. Protected routes redirect to authentication and safely resume the original permitted intent."],
                  ["Server-side guard", "The backend, not only the screen, checks user role, ownership, current entity state and policy before accepting a command."],
                  ["Idempotent command", "All write actions use an idempotency key to prevent duplicate orders, returns, payouts or state changes."],
                  ["Safe deep link", "Expired or forbidden destinations resolve to a contextual fallback with an explanation, never an information leak."],
                  ["Verified result", "Payment, refund and payout result screens query verified server/provider state; client callback alone is never proof."],
              ], [180, 538]), Spacer(1, 14), P("Global entry and recovery", H2)]
    boxes = [(15,160,105,36,"App launch",PALE_GREEN),(165,160,120,36,"Session check",PALE_BLUE),(330,160,130,36,"Home or deferred\ndestination",PALE_GREEN),(505,160,150,36,"Target route\nor safe fallback",PALE_GOLD),(230,60,130,36,"Authentication",PALE_GOLD),(415,60,150,36,"Resume protected intent",PALE_GREEN)]
    arrows = [(120,178,165,178,""),(285,178,330,178,"valid"),(460,178,505,178,""),(225,160,295,96,"protected intent"),(360,78,415,78,"verified"),(490,96,505,160,"permitted")]
    story += [Diagram(boxes, arrows, height=235)]
    story += [PageBreak(), P("2. Shopper route inventory - discovery and account", H1),
              table(["Route", "Access", "Entries", "Primary exit/action", "Guard / design note"], [
                  ["/", "Public", "Launch; logo; tab", "Search; category; product; store", "Approved catalogue only"],
                  ["/search", "Public", "Home search; deep link", "Filters; product", "Preserve query on return"],
                  ["/search/filters", "Public", "Search results", "Apply/cancel", "Reversible filter state"],
                  ["/category/:slug", "Public", "Category navigation", "Product; store", "Active approved category"],
                  ["/product/:id", "Public", "Listing; search; deep link", "Save; add bag; store", "Live price and availability"],
                  ["/store/:id", "Public", "Product; search", "Product", "Approved merchant only"],
                  ["/auth/sign-in", "Public", "Protected redirect", "Sign-up; recovery; return", "Safe return intent"],
                  ["/saved", "Protected", "Tab; product save", "Product", "Owner-only data"],
                  ["/account", "Protected", "Profile control", "Addresses; help; privacy", "Owner-only data"],
                  ["/account/addresses", "Protected", "Account; checkout", "Add/edit; checkout", "Order snapshots address"],
                  ["/account/notifications", "Protected", "Header/account", "Validated deep link", "Re-check access at target"],
              ], [90, 60, 120, 150, 248], small=True)]
    story += [PageBreak(), P("3. Shopper route inventory - bag, checkout and aftercare", H1),
              table(["Route", "Access", "Entries", "Primary exit/action", "Guard / design note"], [
                  ["/bag", "View public; continue protected", "Tab; add item", "Checkout sign-in", "One merchant only"],
                  ["/bag/merchant-conflict", "Public", "Add different merchant", "Replace or keep bag", "Never discard bag silently"],
                  ["/checkout/address", "Protected", "Bag", "Delivery option", "Re-check stock/eligibility"],
                  ["/checkout/delivery", "Protected", "Address", "Review", "Time-bound delivery quote"],
                  ["/checkout/review", "Protected", "Delivery", "Paystack handoff", "API creates/resumes attempt"],
                  ["/checkout/paystack", "Protected", "Review", "Provider checkout", "No secrets in client"],
                  ["/checkout/processing", "Protected", "Provider return", "Confirmed/pending/failed", "Query verified state"],
                  ["/orders", "Protected", "Account; confirmation", "Order detail", "Buyer owns order"],
                  ["/orders/:id", "Protected", "Orders; notification", "Tracking; cancel; return; support", "State/policy-driven actions"],
                  ["/orders/:id/tracking", "Protected", "Order; notification", "Support", "Carrier fallback available"],
                  ["/orders/:id/return", "Protected", "Eligible order", "Return case", "Eligible window only"],
                  ["/returns/:id", "Protected", "Order; notification", "Evidence; support", "Participant/case access"],
                  ["/refunds/:id", "Protected", "Return; order", "Order; support", "Provider-confirmed finality"],
              ], [90, 60, 120, 150, 248], small=True)]
    story += [PageBreak(), P("4. Buyer journey routing", H1), P("Discovery to a verified order", H2)]
    boxes = [(10,170,82,36,"Discover",PALE_GREEN),(117,170,93,36,"Product detail",PALE_GREEN),(235,170,80,36,"Bag",PALE_GREEN),(340,170,100,36,"Checkout",PALE_GOLD),(465,170,100,36,"Paystack",PALE_PURPLE),(590,170,90,36,"Verified\norder",PALE_GREEN),(235,90,80,36,"Merchant\nconflict",PALE_GOLD),(340,90,100,36,"Authentication",PALE_GOLD),(465,90,100,36,"Processing",PALE_BLUE)]
    arrows = [(92,188,117,188,""),(210,188,235,188,"add"),(315,188,340,188,""),(440,188,465,188,""),(565,188,590,188,"verified"),(275,170,275,126,"different merchant"),(315,108,340,108,"resolve"),(390,170,390,126,"sign-in needed"),(440,108,465,108,"resume"),(515,170,515,126,"return"),(515,126,635,170,"success")]
    story += [Diagram(boxes, arrows, height=255), Spacer(1, 8), P("Order to return/refund", H2),
              table(["Stage", "Available route/action", "Eligibility"], [
                  ["Paid/fulfilment", "Order detail; tracking", "Buyer owns order; merchant status drives actions"],
                  ["Before merchant acceptance", "Cancellation request", "Approved cancellation policy"],
                  ["Delivered", "Return request", "Within return window and policy conditions"],
                  ["Return case", "Evidence; case timeline; support", "Case participant / authorised staff"],
                  ["Refund", "Refund status", "Provider confirmation and reconciliation determine final state"],
              ], [145, 275, 378])]
    story += [PageBreak(), P("5. Merchant and operations route contracts", H1), P("Merchant portal", H2),
              table(["Route group", "Access", "Core routes/actions", "Key gate"], [
                  ["Authentication/onboarding", "Merchant member", "/merchant/auth/*; /merchant/onboarding/*", "KYC, bank verification, terms and status"],
                  ["Catalogue", "Catalogue permission", "/merchant/catalogue; /products/new; /products/:id", "Ownership, scan and moderation constraints"],
                  ["Fulfilment", "Fulfilment permission", "/merchant/orders; /orders/:id", "Valid order transition only"],
                  ["Earnings/payouts", "Finance view/request permission", "/merchant/earnings; /payouts/new; /payouts/:id", "Ledger-derived available balance; bank/risk eligibility"],
                  ["Settings", "Owner/delegated permission", "/merchant/settings/team; /settings/business", "No platform-role grants"],
              ], [155, 150, 250, 243]), Spacer(1, 10), P("Operations portal", H2),
              table(["Route group", "Required permission", "Core route/actions", "Mandatory control"], [
                  ["Merchant / catalogue review", "Reviewer or moderator", "/ops/merchants/:id/review; /ops/catalogue/:id/review", "Reason code and immutable audit"],
                  ["Cases", "Support/dispute", "/ops/orders/:id; /ops/returns/:id; /ops/disputes/:id", "Evidence, policy snapshot, scoped data"],
                  ["Finance", "Finance reviewer", "/ops/payouts/:id/review; /ops/reconciliation", "Separation of duties; strong MFA"],
                  ["Governance", "Security/admin", "/ops/content; /ops/access; /ops/audit", "Time-bounded access and audit logging"],
              ], [155, 150, 250, 243])]
    story += [PageBreak(), P("6. Handoffs and minimum screen states", H1),
              table(["Trigger", "Source", "Destination", "Contract"], [
                  ["Merchant submits KYC", "Merchant portal", "Operations review queue", "Immutable submission/evidence and status notification"],
                  ["Merchant submits product", "Merchant portal", "Moderation queue", "Non-public until approved"],
                  ["Buyer payment verified", "Shopper checkout", "Merchant order queue", "Only verified payment makes order fulfilment-ready"],
                  ["Merchant dispatches", "Merchant order detail", "Shopper tracking", "Shipment evidence + carrier events"],
                  ["Buyer requests return", "Shopper order detail", "Merchant + operations case queues", "Policy snapshot and evidence travel with case"],
                  ["Merchant requests payout", "Merchant earnings", "Finance review queue", "Request atomically holds eligible balance"],
              ], [155, 145, 180, 318]), Spacer(1, 12), P("Minimum design and QA states", H2),
              table(["Family", "Required states"], [
                  ["All data routes", "Loading, empty, success, validation error, retryable service error, unauthorised, forbidden, unavailable/archived"],
                  ["Checkout", "Empty bag, merchant conflict, stock changed, quote expired, payment pending/failed/expired, provider return"],
                  ["Order and return", "Valid state transitions, unavailable action, carrier delay, evidence upload error, decision, refund pending/failed/completed"],
                  ["Merchant / finance", "Draft/submitted/approved/rejected/suspended; no eligible balance; hold; review/provider pending; failed/reversed; reconciliation blocked"],
                  ["Operations", "Concurrent update, missing evidence, second approver requirement, audit write failure"],
              ], [170, 628])]
    doc.build(story)
    return out


if __name__ == "__main__":
    OUTPUT.mkdir(parents=True, exist_ok=True)
    ia = build_ia()
    routes = build_routing()
    print(ia)
    print(routes)
