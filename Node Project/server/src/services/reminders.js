/**
 * Payment reminder message generation.
 *
 * The message is built from the workspace's reminder template, with the
 * client's name, the invoice number, the outstanding amount and the due date
 * filled in. Placeholders supported in the template:
 *
 *   {{client}}  {{number}}  {{amount}}  {{due}}  {{link}}  {{business}}
 */

/**
 * Build a reminder message for a channel.
 *
 * @param {object} business   the workspace record
 * @param {object} invoice    the invoice, including `client_name`
 * @param {string} channel    `email` | `sms` | `whatsapp`
 * @param {number} outstanding balance still due, in cents
 * @param {string} portalUrl  the client's payment link
 */
export function buildReminder(business, invoice, channel, outstanding, portalUrl = '') {
  const formatMoney = (cents) => new Intl.NumberFormat(business.locale || 'en-US', {
    style: 'currency',
    currency: business.currency,
  }).format(cents / 100);

  const clientName = invoice.client_name || 'there';
  const amount = formatMoney(outstanding);
  const link = portalUrl || '';

  if (channel === 'whatsapp') {
    return `Hi ${clientName}, a friendly reminder that invoice ${invoice.number} for ${amount} is due on ${invoice.due_date}. You can view and pay it here: ${link || '(client portal link)'}. Thank you!`;
  }

  if (channel === 'sms') {
    return `Hi ${clientName}, invoice ${invoice.number} (${amount}) is due ${invoice.due_date}. Pay: ${link || '(portal link)'}`;
  }

  if (business.reminder_template) {
    return business.reminder_template
      .replace(/\{\{client\}\}/g, clientName)
      .replace(/\{\{number\}\}/g, invoice.number)
      .replace(/\{\{amount\}\}/g, amount)
      .replace(/\{\{due\}\}/g, invoice.due_date)
      .replace(/\{\{link\}\}/g, link)
      .replace(/\{\{business\}\}/g, business.name);
  }

  return `Hi ${clientName},\n\nJust a friendly reminder that invoice ${invoice.number} for ${amount} is due on ${invoice.due_date}.\n\nYou can view and pay it online: ${link}\n\nThank you,\n${business.name}`;
}
