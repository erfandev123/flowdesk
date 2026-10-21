# Flowdesk — Pricing, Pitch & Launch Plan

This is the commercial side of the project: what to charge, how to pitch it, and how to get
the first paying customers.

---

## 1. What you are actually selling

Not "an invoicing app". You are selling **faster collection of money that is already owed**.

That framing matters because it removes the price objection. Nobody buys software for $19.
People buy "I will stop wasting 6 hours a month chasing invoices and my clients will pay me
3 days sooner."

**Proof point to lead with:** for a business billing $5,000/month, moving collection from 30 days
to 15 days is worth roughly $60/month in working capital. At $19/month that is a 3x return on
day one. That is the entire pitch.

---

## 2. Price sheet

### A. Direct to local businesses (most volume, easiest to start)

| Plan | Price | Who |
|---|---|---|
| Starter | **$0** | First 5 clients, unlimited invoices — your acquisition tier |
| Professional | **$19/mo** | Unlimited clients, full branding, WhatsApp/SMS reminders, recurring billing, reports |
| Studio | **$49/mo** | Multiple workspaces, team roles, white-label portal |

Add local-currency pricing: **৳1,500/mo** and **৳3,900/mo** for Bangladesh,
**₹799/mo** and **₹2,499/mo** for India. Price in their currency — it converts itself.

### B. One-time setup fee (charge this on day one)

| Scope | Price |
|---|---|
| Basic setup — account, branding, import client list, 1 training call | **$50–$100** |
| Full setup — branding, catalog, recurring plans, reminders, staff training, 2 weeks support | **$150–$300** |
| Data migration from Excel/old software | **+$50** |

> Setup fees are what make the first month profitable. A client who signs for $19/mo but pays
> a $150 setup fee is worth as much as 8 months of subscription.

### C. White-label license (highest margin, sells to agencies/developers)

| Plan | Price | Terms |
|---|---|---|
| Single-reseller | **$499 one-time** | Their brand, 10 client workspaces, no source access |
| Unlimited reseller | **$1,499–$2,499 one-time** | Unlimited workspaces, source code, 6 months support |
| White-label + custom dev | **$3,000+** | Their clients only, feature work billed hourly |

### D. Custom development on top (your hourly rate)

| Work | Rate |
|---|---|
| Payment gateway integration (bKash, Nagad, Stripe, PayPal, Razorpay) | $150–$400 each |
| WhatsApp Business API reminders | $200–$350 |
| Automated PDF invoice emailing | $75–$150 |
| Country-specific tax compliance (VAT/GST) | $150–$300 |
| Additional module (appointments, inventory, payroll) | $400–$1,200 |

### E. Realistic monthly income targets

| Scenario | Setup fees | Subscriptions | Custom work | Total |
|---|---|---|---|---|
| Month 1–2 (5 clients, mostly setup) | $500 | $60 | $200 | **~$760** |
| Month 3–6 (15 clients, mix) | $900 | $350 | $800 | **~$2,050** |
| Month 7–12 (30 clients + 2 resellers) | $1,500 | $900 | $2,500 | **~$4,900** |

Add one white-label license and a $1,500 custom project into a good month and $8k–$10k is
realistic by month 12.

---

## 3. The pitch script (60 seconds)

> "I built a small system that sends your invoice, lets your client pay it from their phone
> without logging in, and automatically tells you who is late and reminds them for you.
>
> Right now, how many invoices are you still waiting on? How many times did you have to
> message someone last month for money you already earned?
>
> I can have your first invoice out today and your client list imported by Friday. It's $19 a
> month, or I can set it all up for you once for $150 and you keep the client portal under your
> own name.
>
> Can I show you the portal on your phone?"

Then **stop talking**. Show the client portal on a phone. It is the strongest asset you have.

### Objection handling

| Objection | Response |
|---|---|
| "I already use Excel" | "Excel doesn't chase anyone. This one sends the reminder and shows what's overdue." |
| "Too expensive" | "It's less than one hour of your time, and it makes you invoice faster. If it saves you one late payment a month, it pays for a year." |
| "I'll do it myself later" | "You can — the setup is included and I record a walkthrough. Most people try it for one invoice cycle, then stop going back to the spreadsheet." |
| "Can it do [country-specific thing]?" | "Yes, that's a small addition — roughly $200 and a few days. Everything else you need is already in." |

---

## 4. Who to sell to first (pick the closest)

| Segment | Why they buy | Where to find them | Typical fee |
|---|---|---|---|
| Freelance designers & developers | They feel the pain daily | LinkedIn, X/Twitter, Discord, local FB groups | $150 setup + $19/mo |
| Small agencies (3–15 people) | They need client portals | LinkedIn, agency Slack/Discord, referral | $250 setup + $49/mo |
| Beauty salons & clinics | They bill constantly, mostly by card | Walk in and demo on a tablet, Instagram DMs | $75 setup + $19/mo |
| Coaches, tutors, consultants | Retainers and monthly plans | LinkedIn groups, podcast guesting | $100 setup + $19/mo |
| Other developers & agencies | White-label resale | GitHub, Dev.to, Indie Hackers | $499–$2,499 one-time |
| Local SaaS founders | Need billing for their customers | Indie Hackers, Product Hunt, Twitter | $300 setup + custom |

**Best first customer: a freelancer or small agency you already know.** They trust you, they
have real invoices, and they will give honest feedback. Land two of them before chasing
strangers.

---

## 5. 30-day launch plan

**Week 1 — Make it bulletproof for a stranger**
- Deploy to a real host (Render, Railway, Fly.io, or a VPS). Set up the domain.
- Run the app yourself for a week. Create a real invoice and get a real payment.
- Write a one-page PDF: "Flowdesk — get paid faster", with 3 screenshots.
- Record a 90-second Loom: create invoice → share portal → client pays → you see it land.

**Week 2 — Get the first 3 conversations**
- Post in 5 places daily (LinkedIn, X, 2 relevant Discords, 1 Facebook group).
- Message 10 people per day who visibly complain about unpaid invoices. No pitch, just:
  *"I built something for exactly this — can I show you for 30 seconds?"*
- Offer the first 3 clients **free for 3 months** in exchange for an honest review and logo
  permission. Free onboarding beats a discount.

**Week 3 — Convert**
- Send the Loom to everyone who watched. Offer setup at a discount for a 2-week decision.
- Ask every satisfied client for **two** introductions. Referral is your cheapest pipeline.
- Publish 2 case studies: *"How Ava got paid 11 days faster."* Numbers sell better than features.

**Week 4 — Add revenue**
- Raise the free-tier limit from 5 to 8 clients and announce it (creates urgency for early users).
- Contact 10 agencies/developers with the white-label offer.
- Implement one paid custom feature (gateway integration) and charge for it.

---

## 6. Selling assets you already have

| Asset | Where | Why it sells |
|---|---|---|
| Landing page | `/` on your deployed domain | Your sales page — live and ready |
| Demo workspace | `demo@flowdesk.app` / `demo1234` | Let prospects click around before talking |
| Invoice PDF | Print an invoice | Show them exactly what their client will receive |
| Client portal | `/portal/<token>` | The wow moment — show it on a phone |
| Screenshots | `screenshots/` | Slide 1–5 of your pitch deck |

---

## 7. Rules that protect you

1. **Never sell the code and the client at the same time.** Either subscription or license.
2. **Charge setup.** It converts a hobby purchase into a business purchase.
3. **Do not build before you have 3 paying clients.** Custom features before demand = unpaid work.
4. **Log every feature request.** When 5 clients ask for the same thing, that is your next module.
5. **Keep the free tier real but limited.** Unlimited free = no revenue. Five clients is generous
   enough to prove value and small enough to convert.
6. **Never invoice for work before it is done.** You are selling trust; get it wrong once and
   referrals stop.
