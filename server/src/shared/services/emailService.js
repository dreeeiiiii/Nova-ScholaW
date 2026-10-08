import config from "../config/emailConfig.js";
import { recipientEmails, emailEligibility } from "./emailEligibility.js";

const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const httpError = (status) =>
  status === 401
    ? "authentication_rejected"
    : status === 403
      ? "sender_or_permission_rejected"
      : status === 429
        ? "rate_limited"
        : status >= 500
          ? "provider_unavailable"
          : "provider_request_rejected";

// Never log provider responses, request headers, email content, or credentials.
export async function sendAnnouncementEmail(
  announcement,
  recipients,
  { settings = config, transport = fetch, onDelivery = async () => {} } = {},
) {
  const emails = recipientEmails(recipients);
  const eligibility = emailEligibility(announcement, recipients, settings);
  if (!eligibility.eligible) {
    const status =
      eligibility.reason === "no_valid_recipients"
        ? "no_recipients"
        : settings.emailMode === "disabled"
          ? "skipped"
          : "configuration_blocked";
    return {
      status,
      accepted: 0,
      failed: status === "configuration_blocked" ? emails.length : 0,
    };
  }
  if (settings.emailMode === "mock")
    return { status: "mock", accepted: emails.length, failed: 0 };
  const targets =
    settings.emailMode === "test"
      ? emails.length
        ? [settings.emailTestRecipient]
        : []
      : emails;
  if (!targets.length)
    return { status: "no_recipients", accepted: 0, failed: 0 };
  let accepted = 0,
    failed = 0;
  // Individual messages keep recipient addresses private. No automatic retry.
  for (const email of targets) {
    // Persist before transport. An interrupted attempt remains uncertain and must not be retried automatically.
    const detail = {
      recipient_email: email,
      status: "processing",
      attempted_at: new Date().toISOString(),
      message_id: null,
      error: null,
    };
    await onDelivery(detail);
    console.info("[email-debug] brevo request starting", {
      announcement_id: announcement.id ?? null,
      recipient_count: 1,
    });
    try {
      const response = await transport("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        signal: AbortSignal.timeout(10000),
        headers: {
          "api-key": settings.brevoApiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          sender: {
            email: settings.emailSender,
            name: settings.emailSenderName,
          },
          to: [{ email }],
          subject: announcement.title,
          htmlContent: `<!doctype html><html><body><h1>${escapeHtml(
            announcement.title,
          )}</h1><div>${escapeHtml(announcement.content).replace(
            /\r?\n/g,
            "<br>",
          )}</div></body></html>`,
          textContent: announcement.content,
        }),
      });
      detail.http_status = response.status ?? null;
      // Never retain arbitrary provider error messages: they can echo request data/secrets.
      let payload;
      try {
        payload = await response.json();
      } catch {
        /* HTTP status still determines outcome. */
      }
      if (response.ok) {
        accepted++;
        detail.status = "accepted";
        if (
          typeof payload?.messageId === "string" &&
          payload.messageId.length <= 512 &&
          !payload.messageId.includes(settings.brevoApiKey)
        )
          detail.message_id = payload.messageId;
      } else {
        failed++;
        detail.status = "failed";
        detail.error = httpError(response.status);

        const providerCode =
          typeof payload?.code === "string" ? payload.code.slice(0, 100) : null;

        const providerMessage =
          typeof payload?.message === "string"
            ? payload.message.slice(0, 300)
            : null;

        if (providerMessage && /sender/i.test(providerMessage)) {
          detail.error = "sender_rejected_or_unverified";
        }

        console.error("[email-debug] brevo rejected request", {
          announcement_id: announcement.id ?? null,
          http_status: response.status ?? null,
          provider_code: providerCode,
          provider_message: providerMessage,
        });
      }
    } catch {
      failed++;
      detail.status = "uncertain";
      detail.error = "network_or_timeout";
    }
    console.info("[email-debug] brevo response", {
      announcement_id: announcement.id ?? null,
      http_status: detail.http_status ?? null,
      success: detail.status === "accepted",
      provider_message_id: detail.message_id,
      safe_error_category: detail.error,
    });
    detail.completed_at = new Date().toISOString();
    // Recording failures stop the loop rather than continuing an unrecorded bulk send.
    await onDelivery(detail);
  }
  return {
    status: failed ? (accepted ? "partial_failure" : "failed") : "accepted",
    accepted,
    failed,
  };
}
