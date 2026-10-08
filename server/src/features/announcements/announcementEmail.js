import { query } from '../../shared/config/db.js';
import config from '../../shared/config/env.js';
import { findById, resolveRecipients } from './announcementModel.js';
import { sendAnnouncementEmail } from '../../shared/services/emailService.js';
import { emailEligibility, emailConfigSummary } from '../../shared/services/emailEligibility.js';
import { logAction } from '../audit/auditService.js';

export async function deliverPublication(id) {
  let stage = 'announcement_lookup';
  try {
    const announcement = await findById(id);
    console.info('[email-debug] publish started', { announcement_id: id, type: announcement?.type, status: announcement?.status, created_at: announcement?.created_at });
    console.info('[email-debug] config', emailConfigSummary(config));
    if (!announcement) {
      console.info('[email-debug] eligibility', { announcement_id: id, eligible: false, reason: 'announcement_not_found' });
      return;
    }
    // Resolve and validate before claiming: no-send skips must not consume the first attempt.
    stage = 'recipient_resolution';
    const recipients = await resolveRecipients(id);
    const targetTypes = announcement.type === 'class'
      ? (await query('SELECT DISTINCT target_type FROM announcement_targets WHERE announcement_id=$1', [id])).rows.map(row => row.target_type)
      : [announcement.type];
    console.info('[email-debug] recipient resolution', { announcement_id: id, recipient_count: recipients.length, active_recipient_count: recipients.length, target_type: targetTypes });
    const eligibility = emailEligibility(announcement, recipients, config);
    console.info('[email-debug] eligibility', { announcement_id: id, ...eligibility });
    if (!eligibility.eligible) return;
    // Fail before consuming a claim if migration 008 has not been applied.
    stage = 'delivery_schema_check';
    await query('SELECT delivery_details FROM announcement_email_deliveries LIMIT 0');
    stage = 'delivery_claim';
    const claim = await query(`INSERT INTO announcement_email_deliveries(announcement_id,mode,status)
      VALUES($1,$2,'processing') ON CONFLICT DO NOTHING RETURNING announcement_id`, [id, config.emailMode]);
    if (!claim.rowCount) {
      console.info('[email-debug] eligibility', { announcement_id: id, eligible: false, reason: 'duplicate_delivery_claim' });
      return;
    }
    console.info('[email-debug] delivery claim created', { announcement_id: id });
    let result;
    const details = new Map();
    try {
      stage = 'email_service';
      result = await sendAnnouncementEmail(announcement, recipients, { onDelivery: async detail => {
        stage = detail.status === 'processing' ? 'delivery_attempt_write' : 'delivery_result_write';
        details.set(detail.recipient_email, { ...detail });
        await query('UPDATE announcement_email_deliveries SET delivery_details=$2::jsonb WHERE announcement_id=$1', [id, JSON.stringify([...details.values()])]);
      } });
    } catch (error) {
      console.error('[email-debug] delivery failed', { announcement_id: id, stage, safe_error_category: safeDatabaseError(error) });
      const accepted = [...details.values()].filter(detail => detail.status === 'accepted').length;
      result = { status: 'failed', accepted, failed: Math.max(0, recipients.length - accepted) };
    }
    stage = 'delivery_summary_write';
    await query(`UPDATE announcement_email_deliveries SET status=$2,recipient_count=$3,accepted_count=$4,
      failed_count=$5,completed_at=NOW() WHERE announcement_id=$1`, [id,result.status,recipients.length,result.accepted,result.failed]);
    if (['failed', 'partial_failure', 'configuration_blocked'].includes(result.status)) await logAction({
      action: 'email.delivery_failure', entityType: 'announcement', entityId: id,
      details: { status: result.status, recipient_count: recipients.length, accepted_count: result.accepted, failed_count: result.failed },
    });
    else await logAction({ action: 'email.delivery_result', entityType: 'announcement', entityId: id,
      details: { status: result.status, recipient_count: recipients.length, accepted_count: result.accepted, failed_count: result.failed } });
    console.info('[email]', { announcementId: id, status: result.status, recipientCount: recipients.length, accepted: result.accepted, failed: result.failed });
  } catch (error) { console.error('[email-debug] delivery failed', { announcement_id: id, stage, safe_error_category: safeDatabaseError(error) }); }
}

function safeDatabaseError(error) {
  return error?.code === '42703' ? 'database_column_missing_run_migrations' : error?.code === '42P01' ? 'database_table_missing_run_migrations' : 'delivery_recording_failed';
}
