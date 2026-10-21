import { db, uid, hashPassword, nowISO, today } from './db.js';

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const email = process.argv[2] || 'demo@flowdesk.app';
const password = process.argv[3] || 'demo1234';

const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
if (existing) {
  console.log(`User ${email} already exists. Nothing to do.`);
  process.exit(0);
}

const ts = nowISO();
const userId = uid('u_');
const businessId = uid('b_');

db.prepare(
  'INSERT INTO users (id,email,name,password_hash,created_at) VALUES (?,?,?,?,?)',
).run(userId, email, 'Demo Owner', hashPassword(password), ts);

db.prepare(
  `INSERT INTO businesses (id,name,currency,locale,brand_color,accent_color,logo_text,
    invoice_prefix,quote_prefix,next_invoice_seq,next_quote_seq,default_tax,default_terms,reminder_template,created_at)
   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
).run(
  businessId, 'Northlight Studio', 'USD', 'en-US', '#1E3A5F', '#059669', 'NS',
  'INV', 'QUO', 1001, 1001, 8.5,
  'Payment is due within 14 days. Late payments may incur a 2% monthly service charge.',
  'Hi {{client}},\n\nA friendly reminder that invoice {{number}} for {{amount}} is due on {{due}}. You can view and pay it here: {{link}}\n\nThank you,\n{{business}}',
  ts,
);

db.prepare(
  'INSERT INTO memberships (user_id,business_id,role,created_at) VALUES (?,?,?,?)',
).run(userId, businessId, 'owner', ts);

const clientSeed = [
  ['Ava Bennett', 'Ava Bennett Studio', 'ava@studio.co', '+1 415 555 0142', 'active'],
  ['Marcus Lee', 'Kite & Co. Retail', 'marcus@kiteco.com', '+1 212 555 0198', 'active'],
  ['Priya Raman', 'Lumen Health', 'priya@lumenhealth.io', '+1 617 555 0117', 'active'],
  ['Tomás Ortega', 'Ortega Legal', 'tomas@ortegalaw.com', '+1 305 555 0173', 'active'],
  ['Sofia Almeida', 'Atelier Almeida', 'sofia@atelieralmeida.com', '+1 213 555 0164', 'active'],
  ['Daniel Okoye', 'Okoye Logistics', 'daniel@okoyelogistics.com', '+1 404 555 0155', 'lead'],
  ['Hannah Weiss', 'Weiss Fitness Studio', 'hannah@weissfit.com', '+1 206 555 0186', 'active'],
];

const clientIds = [];
for (const [name, company, mail, phone, status] of clientSeed) {
  const id = uid('c_');
  clientIds.push({ id, name, company });
  db.prepare(
    `INSERT INTO clients (id,business_id,name,company,email,phone,address,notes,status,portal_token,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    id, businessId, name, company, mail, phone, '1200 Market Street, Suite 400',
    'Prefers email invoices. Net-14 terms agreed.', status, uid('p_'), ts,
  );
}

const productSeed = [
  ['Brand Identity Sprint', 'Logo system, palette, type scale and brand guide', 240000, 'project'],
  ['Website Design', 'Responsive marketing site design, up to 8 pages', 180000, 'project'],
  ['Frontend Build', 'Production React implementation with CMS hooks', 320000, 'project'],
  ['Monthly Retainer', 'Ongoing design and development support', 65000, 'month'],
  ['Motion Graphics', 'Animated logo sting and social cutdowns', 120000, 'project'],
  ['Copywriting', 'Web copy for landing and product pages', 95000, 'project'],
];
const productIds = [];
for (const [name, description, price, unit] of productSeed) {
  const id = uid('pr_');
  productIds.push({ id, name, price, unit });
  db.prepare(
    `INSERT INTO products (id,business_id,name,description,unit_price,unit,tax_rate,active,created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
  ).run(id, businessId, name, description, price, unit, 8.5, 1, ts);
}

function makeInvoice({
  clientIdx, productIdxs, status, issueDaysAgo, dueDaysAfterIssue = 14, paidDaysAgo = null,
  discount = 0, recurring = '', nextInvoice = null, partial = false,
}) {
  const id = uid('iv_');
  const seq = 1001 + Math.floor(Math.random() * 800);
  const issue = addDays(today(), -issueDaysAgo);
  const due = addDays(issue, dueDaysAfterIssue);
  let subtotal = 0;
  let taxTotal = 0;
  const lineItems = productIdxs.map((pi, idx) => {
    const p = productIds[pi];
    const qty = 1;
    const line = Math.round(p.price * qty);
    subtotal += line;
    const tax = Math.round(line * 0.085);
    taxTotal += tax;
    return { p, qty, idx };
  });
  const total = Math.max(0, subtotal + taxTotal - discount);
  let paid = 0;
  let paidAt = null;
  if (status === 'paid') {
    paid = total;
    paidAt = `${addDays(issue, Math.max(1, Math.round((dueDaysAfterIssue) * 0.55)))}T10:24:00.000Z`;
    // Never record a payment in the future relative to today.
    if (new Date(paidAt).getTime() > Date.now()) {
      paidAt = `${today()}T10:24:00.000Z`;
    }
  } else if (partial) {
    paid = Math.round(total * 0.4);
    paidAt = `${addDays(issue, Math.max(1, Math.round(dueDaysAfterIssue * 0.3)))}T15:10:00.000Z`;
  }
  db.prepare(
    `INSERT INTO invoices (id,business_id,client_id,number,status,issue_date,due_date,notes,terms,
      subtotal,discount,tax_total,total,paid_amount,recurring_rule,next_invoice_date,sent_at,paid_at,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    id, businessId, clientIds[clientIdx].id, `INV-${seq}`, status, issue, due,
    'Thanks for trusting Northlight Studio.', 'Payment is due within 14 days. Late payments may incur a 2% monthly service charge.',
    subtotal, discount, taxTotal, total, paid, recurring, nextInvoice,
    status === 'draft' ? null : `${issue}T09:00:00.000Z`, paidAt, ts,
  );
  lineItems.forEach(({ p, qty, idx }) => {
    db.prepare(
      `INSERT INTO invoice_items (id,invoice_id,product_id,description,qty,unit_price,tax_rate,position)
       VALUES (?,?,?,?,?,?,?,?)`,
    ).run(uid('ii_'), id, p.id, `${p.name} — ${clientSeed[clientIdx][1]}`, qty, p.price, 8.5, idx);
  });
  if (paid > 0) {
    db.prepare(
      `INSERT INTO payments (id,invoice_id,business_id,amount,method,reference,note,paid_at,created_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
    ).run(
      uid('pay_'), id, businessId, paid, partial ? 'bank' : 'card',
      `REF-${Math.floor(Math.random() * 900000 + 100000)}`, '', paidAt, ts,
    );
  }
  return id;
}

makeInvoice({ clientIdx: 0, productIdxs: [0, 1], status: 'paid', issueDaysAgo: 96 });
makeInvoice({ clientIdx: 1, productIdxs: [1, 2], status: 'paid', issueDaysAgo: 74 });
makeInvoice({ clientIdx: 2, productIdxs: [3], status: 'paid', issueDaysAgo: 62, dueDaysAfterIssue: 14 });
makeInvoice({ clientIdx: 3, productIdxs: [0, 5], status: 'paid', issueDaysAgo: 48 });
makeInvoice({ clientIdx: 4, productIdxs: [1, 4], status: 'paid', issueDaysAgo: 33 });
makeInvoice({ clientIdx: 6, productIdxs: [3], status: 'paid', issueDaysAgo: 25 });
makeInvoice({ clientIdx: 0, productIdxs: [2], status: 'paid', issueDaysAgo: 18 });
makeInvoice({ clientIdx: 2, productIdxs: [0, 4], status: 'partial', issueDaysAgo: 22, partial: true });
makeInvoice({ clientIdx: 1, productIdxs: [3], status: 'sent', issueDaysAgo: 9 });
makeInvoice({ clientIdx: 5, productIdxs: [0, 1], status: 'sent', issueDaysAgo: 5 });
makeInvoice({
  clientIdx: 6, productIdxs: [3], status: 'sent', issueDaysAgo: 3,
  recurring: 'monthly', nextInvoice: addDays(today(), 11),
});
makeInvoice({ clientIdx: 3, productIdxs: [5], status: 'overdue', issueDaysAgo: 47 });
makeInvoice({ clientIdx: 4, productIdxs: [1], status: 'overdue', issueDaysAgo: 30 });
makeInvoice({ clientIdx: 2, productIdxs: [4], status: 'draft', issueDaysAgo: 2 });

const quoteSeed = [
  [0, [0, 1, 2], 'sent'],
  [5, [0], 'draft'],
  [4, [3, 5], 'accepted'],
];
quoteSeed.forEach(([clientIdx, pIdx, status], idx) => {
  const qid = uid('qt_');
  let subtotal = 0;
  let taxTotal = 0;
  const issue = addDays(today(), -(idx * 6 + 4));
  const qItems = pIdx.map((pi) => {
    const p = productIds[pi];
    const line = p.price;
    subtotal += line;
    taxTotal += Math.round(line * 0.085);
    return p;
  });
  db.prepare(
    `INSERT INTO quotes (id,business_id,client_id,number,status,issue_date,valid_until,notes,subtotal,tax_total,total,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    qid, businessId, clientIds[clientIdx].id, `QUO-${2001 + idx}`, status, issue,
    addDays(issue, 30), 'Scope includes two revision rounds per deliverable.',
    subtotal, taxTotal, subtotal + taxTotal, ts,
  );
  qItems.forEach((p, i) => {
    db.prepare(
      `INSERT INTO quote_items (id,quote_id,product_id,description,qty,unit_price,tax_rate,position)
       VALUES (?,?,?,?,?,?,?,?)`,
    ).run(uid('qi_'), qid, p.id, p.name, 1, p.price, 8.5, i);
  });
});

const expenseSeed = [
  ['software', 'Figma', 4500, 6],
  ['contractors', 'Riley — 3D artist', 180000, 12],
  ['marketing', 'Meta Ads', 32000, 4],
  ['software', 'Adobe CC', 5299, 2],
  ['office', 'Coworking studio', 24000, 1],
  ['travel', 'Client workshop travel', 68000, 18],
];
for (const [category, vendor, amount, daysAgo] of expenseSeed) {
  db.prepare(
    `INSERT INTO expenses (id,business_id,category,vendor,amount,expense_date,note,created_at)
     VALUES (?,?,?,?,?,?,?,?)`,
  ).run(uid('ex_'), businessId, category, vendor, amount, addDays(today(), -daysAgo), '', ts);
}

console.log('Seed complete.');
console.log(`  Login: ${email} / ${password}`);
console.log(`  Business: Northlight Studio (${businessId})`);
