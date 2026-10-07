import { query } from '../../shared/config/db.js';
import config from '../../shared/config/env.js';
import { findById, resolveRecipients } from './announcementModel.js';
import { sendAnnouncementEmail } from '../../shared/services/emailService.js';
import { logAction } from '../audit/auditService.js';

export async function deliverPublication(id) {
  try {
    const announcement = await findById(id);
    if (!announcement?.email_eligible || announcement.status !== 'published') return;
    const claim = await query(`INSERT INTO announcement_email_deliveries(announcement_id,mode,status)
      VALUES($1,$2,'processing') ON CONFLICT DO NOTHING RETURNING announcement_id`, [id, config.emailMode]);
    if (!claim.rowCount) return;
    let recipients = [], result;
    const details = new Map();
    try {
      recipients = await resolveRecipients(id);
      result = await sendAnnouncementEmail(announcement, recipients, { onDelivery: async detail => {
        details.set(detail.recipient_email, { ...detail });
        await query('UPDATE announcement_email_deliveries SET delivery_details=$2::jsonb WHERE announcement_id=$1', [id, JSON.stringify([...details.values()])]);
      } });
    } catch {
      const accepted = [...details.values()].filter(detail => detail.status === 'accepted').length;
      result = { status: 'failed', accepted, failed: Math.max(0, recipients.length - accepted) };
    }
    await query(`UPDATE announcement_email_deliveries SET status=$2,recipient_count=$3,accepted_count=$4,
      failed_count=$5,completed_at=NOW() WHERE announcement_id=$1`, [id,result.status,recipients.length,result.accepted,result.failed]);
    if (['failed', 'partial_failure', 'configuration_blocked'].includes(result.status)) await logAction({
      action: 'email.delivery_failure', entityType: 'announcement', entityId: id,
      details: { status: result.status, recipient_count: recipients.length, accepted_count: result.accepted, failed_count: result.failed },
    });
    else await logAction({ action: 'email.delivery_result', entityType: 'announcement', entityId: id,
      details: { status: result.status, recipient_count: recipients.length, accepted_count: result.accepted, failed_count: result.failed } });
    console.info('[email]', { announcementId: id, status: result.status, recipientCount: recipients.length, accepted: result.accepted, failed: result.failed });
  } catch { console.error('[email] Delivery recording failed', { announcementId: id }); }
}
