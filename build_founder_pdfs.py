from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, PageBreak,
    Table, TableStyle, KeepTogether, Image,
)


ROOT = Path(__file__).resolve().parent
OUT = Path.home() / "Desktop" / "SellFastBuyFast"
OUT.mkdir(parents=True, exist_ok=True)
LOGO = ROOT / "assets" / "adaptive-icon.png"

GREEN = colors.HexColor("#123D32")
GOLD = colors.HexColor("#B8892D")
INK = colors.HexColor("#17221F")
MUTED = colors.HexColor("#59645F")
PALE = colors.HexColor("#F3F6F2")
LINE = colors.HexColor("#D8E0DA")


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=29, leading=35, textColor=GREEN, spaceAfter=12))
styles.add(ParagraphStyle(name="CoverSub", parent=styles["Normal"], fontName="Helvetica", fontSize=13, leading=19, textColor=MUTED))
styles.add(ParagraphStyle(name="H1x", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=19, leading=24, textColor=GREEN, spaceBefore=12, spaceAfter=10, keepWithNext=True))
styles.add(ParagraphStyle(name="H2x", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=13, leading=17, textColor=GREEN, spaceBefore=12, spaceAfter=6, keepWithNext=True))
styles.add(ParagraphStyle(name="Bodyx", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.25, leading=14, textColor=INK, spaceAfter=6))
styles.add(ParagraphStyle(name="Smallx", parent=styles["BodyText"], fontName="Helvetica", fontSize=8, leading=10, textColor=MUTED))
styles.add(ParagraphStyle(name="Callout", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=10, leading=15, textColor=GREEN, backColor=PALE, borderColor=LINE, borderWidth=0.5, borderPadding=8, spaceBefore=5, spaceAfter=10))
styles.add(ParagraphStyle(name="TableHead", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=7.5, leading=9, textColor=colors.white))
styles.add(ParagraphStyle(name="TableCell", parent=styles["BodyText"], fontName="Helvetica", fontSize=7.3, leading=9.4, textColor=INK))
styles.add(ParagraphStyle(name="TableCellBold", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=7.3, leading=9.4, textColor=INK))


def P(text, style="Bodyx"):
    return Paragraph(text, styles[style])


def bullets(items):
    result = []
    for item in items:
        result.append(P("&bull; " + item))
    return result


def table(headers, rows, widths):
    data = [[P(h, "TableHead") for h in headers]]
    for row in rows:
        data.append([P(str(v), "TableCellBold" if i == 0 else "TableCell") for i, v in enumerate(row)])
    t = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), GREEN),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("BACKGROUND", (0, 1), (-1, -1), colors.white),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return t


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.line(18 * mm, 14 * mm, A4[0] - 18 * mm, 14 * mm)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(18 * mm, 8.5 * mm, doc.title)
    canvas.drawRightString(A4[0] - 18 * mm, 8.5 * mm, f"Page {doc.page}")
    canvas.restoreState()


def build(path, title, subtitle, date_line, story):
    doc = BaseDocTemplate(
        str(path), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=18 * mm, bottomMargin=19 * mm, title=title,
        author="SellFastBuyFast", subject=subtitle,
        keywords="SellFastBuyFast, marketplace, product, architecture, Nigeria",
    )
    doc.addPageTemplates([PageTemplate(id="main", frames=[Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")], onPage=footer)])
    logo = Image(str(LOGO), width=88 * mm, height=88 * mm)
    logo.hAlign = "LEFT"
    cover = [Spacer(1, 18 * mm), logo, Spacer(1, 6 * mm), P(title, "CoverTitle"), P(subtitle, "CoverSub"), Spacer(1, 18 * mm), P(date_line, "Smallx"), Spacer(1, 4 * mm), P("INTERNAL | Draft working document", "Smallx"), PageBreak()]
    doc.build(cover + story)


def section(story, title, intro=None):
    story.append(P(title, "H1x"))
    if intro:
        story.append(P(intro))


def master():
    s = []
    section(s, "1. Executive summary", "SellFastBuyFast is being designed as a curated, Nigeria-first marketplace for approved consumer goods. It brings together a distinctive shopper experience, reviewed merchants, controlled catalogue entry, supportable fulfilment, and disciplined payment and payout operations.")
    s.append(P("The proposed business is not simply a storefront. It is a managed marketplace: SellFastBuyFast defines entry standards for merchants and products, provides the purchase journey, supports buyers through documented post-purchase processes, and gives merchants controlled operating tools."))
    s.append(P("Founder objective: approve a focused V1 that proves trusted single-merchant commerce in a limited pilot before adding complexity such as multi-merchant checkout, international settlement, wallets, lending, or a second payment provider.", "Callout"))
    s.append(table(["V1 decision", "Recommended position", "Why it matters"], [
        ["Market", "Nigeria-first, curated launch", "Allows local operational, payment, and policy decisions to be validated before expansion."],
        ["Checkout", "One merchant per order", "Makes inventory, fulfilment, cancellation, returns, and settlement understandable and controllable."],
        ["Payments", "Paystack as the first provider", "Focuses integration, reconciliation, support, and security work."],
        ["Merchant release", "Payout only from cleared eligible balance", "Protects buyer refunds and disputes; prevents premature merchant settlement."],
        ["Launch", "Controlled city/category/merchant pilot", "Enables manual oversight and rapid learning before scale."],
    ], [31*mm, 54*mm, 73*mm]))

    section(s, "2. The opportunity and product thesis")
    s.extend(bullets([
        "Customers need a calmer, more trustworthy way to find quality goods from credible merchants, with transparent delivery, support, and buyer protection.",
        "High-quality merchants need a professional route to market that does not require them to build independent commerce, fulfilment, payment, and customer-care capabilities.",
        "A curated model creates differentiation: the catalogue is not open by default; merchant and product quality are operationally managed.",
        "Trust must be built into the operating model - not added as marketing language after launch. That means verified payment outcomes, documented delivery evidence, a return pathway, auditable support decisions, and reconciled merchant payouts."
    ]))
    s.append(P("Initial positioning: premium but accessible marketplace infrastructure for selected Nigerian merchants and quality-conscious shoppers. Category and city choices must follow founder approval of demand, supply quality, logistics feasibility, and margin potential."))

    section(s, "3. The target marketplace model")
    s.append(table(["Participant", "Primary job", "SellFastBuyFast responsibility"], [
        ["Shopper", "Discover, compare, buy, track, return, seek support", "Present approved catalogue, protect checkout, communicate order state, provide an accountable support and refund path."],
        ["Merchant", "Onboard, submit products, manage stock, fulfil orders, request payouts", "Verify merchant, moderate catalogue, provide operational tools, maintain fair and auditable settlement."],
        ["Operations", "Review, moderate, support, resolve exceptions, reconcile", "Enforce policies, maintain service quality, preserve evidence and approval records."],
        ["Finance", "Protect funds, review payouts, resolve reconciliation variance", "Maintain ledger-backed financial facts, separation of duties, and daily reconciliation."],
    ], [30*mm, 55*mm, 73*mm]))
    s.append(P("The marketplace has three product surfaces: a shopper mobile app; a merchant portal; and a role-based operations portal. Each submits privileged commands to a controlled platform service. Financial state, permissions, merchant approval, refunds, and payout status cannot be changed directly by a user interface."))

    section(s, "4. V1 product promise")
    s.append(P("A shopper can discover approved products, purchase from one approved merchant, receive delivery updates, request a return where eligible, and receive a supported refund. A merchant can complete verification, manage products and stock, fulfil orders, see ledger-derived earnings, and request an eligible payout. Operations can approve merchants and catalogue content, handle exceptions, and reconcile money."))
    s.append(table(["Included in V1", "Not included in V1"], [
        ["Curated merchant onboarding and KYC review", "Multi-merchant carts and split checkout"],
        ["Catalogue moderation, product variants, stock, and imagery", "Cash on delivery, stored wallet, P2P transfers, withdrawals"],
        ["Paystack checkout, verified webhooks, refunds, reconciliation", "International settlement, buyer currency conversion, BNPL"],
        ["Delivery quotes/tracking through a selected provider", "Self-managed delivery fleet or automated dispute resolution"],
        ["Returns, support cases, payout requests and review", "Second gateway failover, merchant advertising, lending"],
    ], [79*mm, 79*mm]))

    section(s, "5. End-to-end operating journey")
    s.append(table(["Stage", "What happens", "Control that cannot be skipped"], [
        ["Merchant entry", "Merchant submits business, KYC, bank, and terms information.", "Approval is evidence-based; unapproved/suspended merchants cannot trade."],
        ["Catalogue entry", "Merchant creates products, variants, stock, media, and prices.", "Only approved, active catalogue content becomes shopper-visible."],
        ["Purchase", "Shopper builds a one-merchant bag, selects address/delivery, and pays.", "Stock and totals are rechecked; payment success comes from provider verification, not a client callback."],
        ["Fulfilment", "Merchant accepts, packs, dispatches, and records shipment evidence.", "Only valid order-state transitions are accepted; tracking has a manual-support fallback."],
        ["Care", "Buyer cancels when eligible or requests a return with evidence.", "Policy snapshot, timeline, roles, reasons, and case evidence are retained."],
        ["Settlement", "Eligible funds become available; merchant requests payout; finance reviews.", "A payout hold, dual-control where needed, provider confirmation, and reconciliation determine final status."],
    ], [25*mm, 69*mm, 64*mm]))

    section(s, "6. Commercial model and policy choices")
    s.append(P("The final commercial numbers are founder decisions. The project should not imply fee levels, payout speed, delivery coverage, or refund treatment before these decisions are approved in writing."))
    s.append(table(["Decision area", "Founder decision required", "Recommended rule for V1"], [
        ["Commission", "Category-level commission percentages and inclusions", "Snapshot the approved rate on every order line so later rate changes do not rewrite past economics."],
        ["Delivery", "Cities/zones, carrier, SLA, customer fee, subsidy, lost-parcel owner", "Launch only where a clear delivery and exception process can be operated."],
        ["Returns", "Window, eligible goods, condition/evidence, who bears return delivery", "Seven calendar days from delivery evidence is the proposed baseline, subject to legal/commercial approval."],
        ["Refunds", "Partial refunds, delivery-fee refund, approval thresholds", "Refund to original payment method; never create an informal customer cash balance."],
        ["Payouts", "Eligibility, frequency, minimums, limits, reserve/hold policy", "Release only reconciled, cleared, undisputed funds after the approved return policy condition."],
    ], [29*mm, 57*mm, 72*mm]))

    section(s, "7. Financial-control model")
    s.append(P("SellFastBuyFast must distinguish provider settlement from its internal accounting. The product must not describe any payment arrangement as escrow unless the provider contract and written legal advice explicitly establish that structure."))
    s.extend(bullets([
        "Every verified payment, refund, payout, fee, reversal, and adjustment is represented with immutable, balanced ledger entries in minor currency units.",
        "A merchant dashboard balance is derived from the ledger; it is not an editable source of truth.",
        "Payment success requires verified provider data. Provider events are signature-checked, stored once, processed idempotently, and reconciled daily.",
        "A payout request moves the amount into a hold atomically; it is not paid until transfer confirmation and reconciliation support that result.",
        "Finance review, payout approval, dispute decisions, and security administration follow least-privilege access and separation of duties."
    ]))

    section(s, "8. Platform and delivery approach")
    s.append(P("The proposed architecture is a modular monolith: a TypeScript platform with an Expo React Native shopper app, Next.js merchant and operations web applications, a NestJS core API, Supabase PostgreSQL/Auth/Storage/Realtime, and durable workers for webhooks, notifications, scanning, scheduled checks, and reconciliation."))
    s.append(P("This approach creates one transactional source of truth for orders and money while allowing search, notifications, and other workloads to be separated later if scale requires it. It intentionally avoids premature microservices."))
    s.append(table(["Phase", "Outcome", "Exit condition"], [
        ["0. Decisions and foundation", "Commercial/legal approvals, environments, security baseline, schema/API direction", "Written policy decisions, threat model, reviewed schema, authenticated staging slice"],
        ["1. Catalogue and onboarding", "Verified merchants and moderated sellable catalogue", "Approved merchant can publish; unauthorized access is tested and denied"],
        ["2. Single-merchant commerce", "Checkout, payment verification, fulfilment, tracking, reconciliation queue", "Success/failure/expiry/duplicate-webhook/stock-race flows pass in staging"],
        ["3. Returns, finance, payouts", "Ledger, returns, refunds, release logic, payout workflow", "Balances reproduce from journals; sandbox payout/refund/reversal cases reconcile"],
        ["4. Hardening and pilot", "Security, support, recovery, training, selected launch cohort", "Pilot targets and operational stability meet agreed thresholds"],
    ], [34*mm, 58*mm, 66*mm]))

    section(s, "9. Launch readiness and risk management")
    s.append(table(["Risk", "Required mitigation before launch"], [
        ["Payment or payout error", "Verified provider events, idempotency, daily reconciliation, exception queue, tested refund/reversal cases."],
        ["Merchant quality or fraud", "KYC, bank verification, merchant policy acceptance, catalogue moderation, auditable suspension path."],
        ["Delivery failure", "Defined coverage, carrier SLA, evidence rules, tracking fallback, documented ownership of loss/delay."],
        ["Data/security incident", "MFA for staff, scoped roles, encryption, secure secrets, access logging, upload scanning, tested recovery."],
        ["Policy ambiguity", "Signed terms for commission, returns, refund, payout, tax/invoicing, data handling, and prohibited goods."],
    ], [43*mm, 115*mm]))
    s.append(P("Production readiness means: no unresolved critical/high security issues; end-to-end payment/refund/payout failure scenarios tested; reconciliation without unexplained variance; proven access isolation; exercised backup/incident procedures; and written legal/business policy approval."))

    section(s, "10. Founder decisions required now")
    s.append(table(["Priority", "Decision", "Why it unlocks work"], [
        ["Immediate", "Initial categories, target pilot city/cities, merchant quality bar", "Shapes merchant recruitment, catalogue policy, delivery selection, and launch narrative."],
        ["Immediate", "Commission, delivery fee/subsidy, return/refund policy, payout eligibility", "Defines the financial model, merchant terms, support rules, and ledger behavior."],
        ["Immediate", "Budget envelope, team ownership, delivery target", "Converts the roadmap into an accountable execution plan."],
        ["Before live payments", "Provider settlement structure and legal terminology", "Prevents prohibited or misleading handling of customer/merchant funds."],
        ["Before pilot", "Merchant agreement, buyer terms, privacy, KYC/AML, tax/invoicing, support escalation", "Creates an operable and defensible marketplace."],
    ], [24*mm, 70*mm, 64*mm]))
    s.append(P("Recommended founder action: approve the V1 boundaries and nominate accountable owners for commercial, product, finance/legal, technology, merchant operations, and launch. Convert unresolved decisions into a dated decision register before feature work advances.", "Callout"))
    return s


def prd():
    s = []
    section(s, "1. Product definition", "This PRD defines the draft target V1 behavior for SellFastBuyFast. It is a working baseline for founders, product, design, engineering, operations, finance, support, and launch partners; unresolved approvals remain release blockers.")
    s.append(P("V1 outcome: a buyer can discover approved products, purchase items from one approved merchant, track delivery, request a return, and receive a supported refund. A merchant can complete verification, manage products and stock, fulfil orders, view ledger-derived earnings, and request an eligible payout. Authorised operations users can review merchants and catalogue content, resolve exceptions, and reconcile money."))
    s.append(P("Scope rule: the system must favor correctness, traceability, and controllable operations over feature breadth. A feature is not complete until it has access rules, state transitions, error/retry behavior, audit expectations, and a support path.", "Callout"))

    section(s, "2. Goals, non-goals, and success measures")
    s.append(table(["Goals", "Non-goals for V1"], [
        ["Trusted, curated shopping and one-merchant checkout", "Multi-merchant cart, split checkout, cash on delivery"],
        ["Controlled merchant entry, catalogue quality, stock and fulfilment", "Wallet, P2P transfers, customer withdrawals, lending"],
        ["Buyer protection through returns, support, refund visibility", "Automated dispute resolution and delivery fleet management"],
        ["Ledger-backed payout controls and daily reconciliation", "International settlement, buyer FX, BNPL, second provider failover"],
    ], [79*mm, 79*mm]))
    s.append(table(["Measure", "Definition"], [
        ["Payment success", "Verified successful payments divided by payment attempts, excluding issuer declines; tracked by method and failure reason."],
        ["Commerce funnel", "Search-to-product-view, add-to-bag, checkout-start, and paid-order conversion."],
        ["Fulfilment", "Tracking coverage, on-time delivery, cancellation rate, carrier exception rate."],
        ["Trust", "Return rate, dispute rate, refund completion time, support resolution time."],
        ["Merchant operations", "Verification turnaround, moderation turnaround, stock issues, payout/reconciliation accuracy."],
    ], [40*mm, 118*mm]))

    section(s, "3. Personas, roles, and permissions")
    s.append(table(["Role", "Core permissions", "Must not be able to do"], [
        ["Buyer", "Manage own profile/addresses, browse approved catalogue, manage own bag/orders/returns/support", "View another buyer's data; mark payments/refunds complete; modify financial records."],
        ["Merchant owner/staff", "Operate assigned merchant catalogue, stock, orders, permitted settings, and payout requests", "Publish unapproved product; access another merchant; edit ledger or payout final state."],
        ["Support agent", "Work assigned support/order/return cases", "Approve payouts or silently change financial entries without authority."],
        ["Catalogue moderator", "Approve/reject/request changes for products", "Change merchant bank details or finance outcomes."],
        ["Finance reviewer", "Review reconciliation and approve/reject authorised payout actions", "Approve a payout they created/recommended; bypass unresolved variance."],
        ["Security admin", "Manage staff access under controls and audit", "Use a universal uncontrolled super-admin function."],
    ], [31*mm, 64*mm, 63*mm]))
    s.append(P("All privileged actions are authorised server-side. Role assignments are separate from a person profile. Merchant permissions are separate from platform-staff permissions. Finance and security administration require MFA, with phishing-resistant authentication for high-risk roles."))

    section(s, "4. Buyer experience requirements")
    s.append(P("Discovery and account" , "H2x"))
    s.extend(bullets([
        "Public browsing: home feed, campaigns, categories, search, filters, product detail, and approved merchant stores.",
        "Product detail: media, description, variants, price, stock availability, merchant information, save action, and add-to-bag action.",
        "Authentication: sign-up, sign-in, verification, password recovery, consent capture, and safe return to the protected action that initiated authentication.",
        "Account: profile, address book, notification preferences, saved products, privacy/account-deletion request, support access, and sign out.",
        "All listings expose only active approved products from approved merchants; unavailable products cannot be added to a bag."
    ]))
    s.append(P("Bag, checkout, and payment", "H2x"))
    s.extend(bullets([
        "A bag may contain products from one merchant only. Adding from another merchant presents an explicit choice to replace or keep the existing bag; it never silently discards items.",
        "Checkout requires authentication, an address, a current delivery option/quote, revalidated stock, and a final order review.",
        "The platform creates/resumes a draft order and payment attempt. The provider-hosted Paystack journey is used without exposing secret keys to the client.",
        "The payment return screen queries verified backend state. A browser/app callback alone never proves payment success.",
        "Failure, expiry, pending state, quote expiry, stock change, and duplicate submission have explicit user guidance and recovery paths."
    ]))
    s.append(P("Orders and post-purchase care", "H2x"))
    s.extend(bullets([
        "Order history and order detail show only the buyer's own data and current permitted actions.",
        "Cancellation is available only before merchant fulfilment acceptance under the approved policy.",
        "Delivery tracking presents carrier events where available and a support fallback where unavailable.",
        "Return requests capture reason, evidence, requested resolution, policy snapshot, timestamps, and case status.",
        "Refund status distinguishes initiated/pending/failed/completed based on verified provider and reconciliation state."
    ]))

    section(s, "5. Merchant portal requirements")
    s.append(table(["Area", "Required capability", "Acceptance condition"], [
        ["Onboarding", "Business profile, KYC documents, bank verification, terms acceptance, review status", "Merchant cannot trade until approved; rejection/suspension shows a remediation/status path."],
        ["Catalogue", "Products, variants, media, price, stock, moderation feedback", "Merchant can manage only own catalogue; content is not public until approved."],
        ["Fulfilment", "Order queue, accept, pack, dispatch, shipment evidence, return response", "Actions obey valid state transition and merchant ownership checks."],
        ["Earnings", "Ledger-derived balance and transaction history", "Figures are explainable from immutable financial records; no editable totals."],
        ["Payouts", "Eligibility, request, status/history, bank details", "Request cannot exceed available balance and creates a hold atomically."],
        ["Team/settings", "Merchant members, scoped permissions, business profile, notifications", "Merchant cannot grant platform roles or access other merchants."],
    ], [27*mm, 68*mm, 63*mm]))

    section(s, "6. Operations portal requirements")
    s.append(table(["Queue/workspace", "Required actions", "Mandatory control"], [
        ["Merchant review", "Review evidence; approve, reject, suspend; communicate decision", "Reason code and immutable audit entry."],
        ["Catalogue moderation", "Approve, reject, request changes; preserve history", "Product remains non-public until approved."],
        ["Order/delivery exceptions", "Review evidence, coordinate resolution, notify parties", "State constraints and role-scoped data."],
        ["Returns/disputes/support", "Review cases, evidence, timelines, decisions, escalation", "Policy snapshot, auditable decisions, separation from silent finance change."],
        ["Payout review", "Risk review, approve/reject authorised request", "Separation of duties; strong MFA; no approval of own request."],
        ["Reconciliation", "Review mismatches, delays, duplicates, amount variance", "Unresolved variance blocks relevant automated payout/release action."],
        ["Access/audit", "Manage staff roles; search append-only audit record", "Time-bounded elevated access and sensitive-access logging."],
    ], [34*mm, 69*mm, 55*mm]))

    section(s, "7. Business rules and state machines")
    s.append(table(["Entity", "Permitted core states", "Critical rule"], [
        ["Merchant", "draft -> submitted -> approved | rejected | suspended", "Only approved merchant can publish/trade; suspension removes trading actions."],
        ["Payment attempt", "created -> initiated -> pending -> succeeded | failed | cancelled | expired", "Only verified provider evidence can create succeeded."],
        ["Order", "draft -> awaiting_payment -> paid -> merchant_accepted -> packed -> shipped -> delivered -> return_window -> completed", "Cancellations/returns/disputes follow controlled exception paths and policy snapshots."],
        ["Seller balance", "pending -> available -> payout_held -> paid_out", "Funds may be reserved for dispute; available cannot fall below zero."],
        ["Payout", "requested -> risk_review -> approved -> submitting -> provider_pending -> paid | failed | reversed | rejected", "Accepted transfer request is not the same as paid; reconcile provider outcome."],
        ["Return/refund", "requested -> response/return-shipment -> received/decision -> refund processing -> completed or exception", "Refund finality requires provider confirmation/reconciliation."],
    ], [30*mm, 68*mm, 60*mm]))

    section(s, "8. Financial, data, and integration requirements")
    s.extend(bullets([
        "Amounts use integer minor units and ISO currency; never floating-point monetary values.",
        "Orders snapshot product, price, commission, tax rule, delivery quote, address, and policy version needed to explain the historical transaction.",
        "Every money movement contains a business reference, currency, amount, provider reference where applicable, idempotency key, actor/process, and timestamp.",
        "Provider webhooks are signature-verified against raw payload, stored before processing, processed idempotently, and acknowledged promptly. Provider verification is also performed before payment success.",
        "Run daily reconciliation of transactions, transfers, refunds, fees, and reversals; flag unmatched/duplicate/delayed/mismatched items and retain immutable report output.",
        "Use private, case-scoped storage for KYC, return evidence, and support attachments. Validate type/size, scan uploads, apply short-lived signed access, and access-log sensitive data."
    ]))

    section(s, "9. Experience, quality, and accessibility requirements")
    s.extend(bullets([
        "Use a premium, calm, image-led visual system with deep green, restrained gold, warm off-white surfaces, generous spacing, and product-first imagery.",
        "Provide 44px minimum touch targets, labelled controls, screen-reader descriptions, dynamic text support, sufficient contrast, and keyboard-accessible web flows.",
        "Every data screen defines loading, empty, success, validation error, retryable error, unauthorised, forbidden, and unavailable/archived states.",
        "Transactional screens define in-progress state, duplicate-submission prevention, timeout/retry treatment, and final state based on verified server data.",
        "Do not use unlicensed imagery or product references without confirmed rights and authenticity controls."
    ]))

    section(s, "10. Security, privacy, and reliability requirements")
    s.extend(bullets([
        "TLS in transit; managed encryption at rest; secrets held outside source code and never shipped to client applications.",
        "Secure authenticated sessions; role-based access; least privilege; cross-buyer, cross-merchant, and unauthorised-staff access tests.",
        "Rate limits, bot protection, input validation, dependency scanning, upload scanning, structured logging, and alerting for payment/payout/reconciliation/security anomalies.",
        "Point-in-time recovery and scheduled backups; test restoration into a separate environment at least quarterly.",
        "Separate development, staging, and production configurations; reviewed migrations, automated tests, feature flags, and release manifests for risky changes.",
        "Before production, obtain appropriate review for Nigerian data protection, consumer/returns terms, merchant agreement, tax/invoicing, settlement terminology, KYC/AML responsibilities, and cross-border processing where applicable."
    ]))

    section(s, "11. Delivery plan and release gates")
    s.append(table(["Release phase", "Product increment", "Release gate"], [
        ["Foundation", "Auth, roles, environments, schema/API contracts, observability", "Threat model, security baseline, reviewed data/authorisation design."],
        ["Sellable catalogue", "Merchant onboarding, moderation, buyer discovery", "Approved merchant product can be published; access isolation proven."],
        ["Paid order", "Bag, checkout, Paystack, fulfilment, tracking, reconciliation queue", "Payment success/failure/expiry/replay/stock-race tests pass end-to-end."],
        ["Buyer protection and settlement", "Returns, refunds, ledger, payout workflow", "Financial balances reproducible; refund/payout/reversal cases reconcile."],
        ["Pilot", "Hardening, runbooks, support training, selected cohort", "Security/recovery tested, terms approved, operational targets stable."],
    ], [33*mm, 65*mm, 60*mm]))
    section(s, "12. Dependencies and open approvals")
    s.append(table(["Dependency", "Owner to assign", "Required before"], [
        ["Categories, prohibited goods, merchant quality criteria", "Commercial + operations", "Merchant recruitment and catalogue policy"],
        ["Commission, delivery, returns, refunds, payout terms", "Founders + finance/legal + operations", "Final checkout, merchant agreement, ledger and support rules"],
        ["Paystack settlement/transfer arrangement and sandbox access", "Finance/legal + technology", "Live payment/payout integration"],
        ["Logistics provider, zones, SLA, evidence/exception policy", "Operations", "Delivery quoting, tracking, pilot launch"],
        ["Privacy, consumer terms, merchant agreement, KYC/AML, tax", "Legal/compliance", "Production pilot"],
        ["Pilot cohort, budget, named delivery owners", "Founders", "Roadmap commitment and launch plan"],
    ], [58*mm, 42*mm, 58*mm]))
    s.append(P("Treat this PRD as the draft V1 baseline until its blocking decisions are approved. Changes that affect money movement, access controls, buyer protection, launch geography, merchant obligations, or product scope require a documented decision, impact review, and acceptance criteria before implementation.", "Callout"))
    return s


if __name__ == "__main__":
    founder_path = OUT / "SellFastBuyFast_Founder_Blueprint_v0.9_Draft_2026-08-22.pdf"
    prd_path = OUT / "SellFastBuyFast_Product_Requirements_v0.9_Draft_2026-08-22.pdf"
    build(founder_path, "Founder Blueprint", "Strategic blueprint for the proposed SellFastBuyFast marketplace", "Version 0.9 Draft | 22 August 2026", master())
    build(prd_path, "Product Requirements", "Functional, operational, financial, and launch requirements for target V1", "Version 0.9 Draft | 22 August 2026", prd())
    print("Created", founder_path)
    print("Created", prd_path)
