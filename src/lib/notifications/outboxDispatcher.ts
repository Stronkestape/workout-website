import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/server';
import { sendEmail } from './sessionNotificationService';
import { formatDateTime } from '@/utils/calendarHelpers';
import type { Database, Tables } from '@/types/database';

export interface OutboxProcessingResult {
  processed: number;
  sent: number;
  failed: number;
  errors: string[];
}

/**
 * Returns a Supabase client capable of claiming and updating outbox entries.
 * Prefers the dedicated SUPABASE_SERVICE_ROLE_KEY if present in environment,
 * otherwise falls back to the server client calling the SECURITY DEFINER RPCs.
 */
async function getOutboxClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (supabaseUrl && serviceRoleKey) {
    return createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return await createSupabaseServerClient();
}

/**
 * Dispatches all pending notifications stored in the notification_outbox table.
 * Follows the Transactional Outbox pattern with `FOR UPDATE SKIP LOCKED`
 * to guarantee that concurrent cancellation actions never cause duplicate email storms.
 */
export async function dispatchPendingOutboxNotifications(): Promise<OutboxProcessingResult> {
  const result: OutboxProcessingResult = {
    processed: 0,
    sent: 0,
    failed: 0,
    errors: [],
  };

  try {
    const supabase = await getOutboxClient();

    // 1. Claim pending notifications atomically via SECURITY DEFINER function with SKIP LOCKED
    const { data: claimedEntries, error: claimError } = await supabase.rpc(
      'claim_pending_outbox_notifications',
      { p_batch_size: 25 }
    );

    if (claimError) {
      // Fallback: If RPC not yet available, try direct select if service role is active
      const { data: directEntries, error: directError } = await supabase
        .from('notification_outbox')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(25);

      if (directError || !directEntries || directEntries.length === 0) {
        return result;
      }
      return processEntries(supabase, directEntries, result);
    }

    if (!claimedEntries || claimedEntries.length === 0) {
      return result;
    }

    return processEntries(supabase, claimedEntries, result);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Outbox loop failed';
    result.errors.push(errMsg);
    return result;
  }
}

async function processEntries(
  supabase: SupabaseClient<Database>,
  entries: Tables<'notification_outbox'>[],
  result: OutboxProcessingResult
): Promise<OutboxProcessingResult> {
  result.processed = entries.length;

  for (const entry of entries) {
    try {
      let htmlBody = '';
      let textBody = '';

      if (entry.notification_type === 'waitlist_promoted') {
        const payload = (entry.payload as Record<string, unknown>) || {};
        const workoutTitle = (payload.workout_title as string) || 'Csoportos edzés';
        const startTimeStr = (payload.start_time as string) || '';
        const { date, time } = formatDateTime(startTimeStr);

        textBody = `Kedves ${entry.recipient_name || 'Vendégünk'}!

Nagyszerű hírünk van! Egy másik résztvevő lemondása miatt a várólistáról automatikusan bekerültél a megerősített résztvevők közé az alábbi edzésre:

Edzés: ${workoutTitle}
Időpont: ${date} ${time}
Helyszín: Mozgás Központ Stúdió (Budapest)

Amennyiben mégsem felel meg az időpont, kérjük a kezdés előtt legalább 2 órával mondd le a foglalást a profilodban vagy az Órarend menüpontban, hogy a várólistán utánad következő sporttársad megkaphassa a helyet.

Várunk szeretettel az edzésen!
Mozgás Központ Csapata`;

        htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f7f6f4; margin: 0; padding: 24px; color: #1c1917;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e7e5e4; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="background-color: #c25e00; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Hely felszabadult!</h1>
    </div>
    <div style="padding: 28px;">
      <p style="font-size: 16px; line-height: 1.5; margin-top: 0;">Kedves <strong>${entry.recipient_name || 'Vendégünk'}</strong>!</p>
      <p style="font-size: 15px; line-height: 1.6; color: #44403c;">
        Nagyszerű hírünk van: egy felszabadult hely révén a várólistáról <strong>automatikusan bekerültél a megerősített résztvevők közé</strong> a következő órára:
      </p>
      <div style="background-color: #fafaf9; border-radius: 12px; border: 1px solid #e7e5e4; padding: 18px; margin: 20px 0;">
        <div style="font-size: 18px; font-weight: 700; color: #1c1917; margin-bottom: 8px;">${workoutTitle}</div>
        <div style="font-size: 14px; color: #57534e; margin-bottom: 4px;">📅 Időpont: <strong>${date}</strong></div>
        <div style="font-size: 14px; color: #57534e; margin-bottom: 4px;">⏰ Kezdés: <strong>${time}</strong></div>
        <div style="font-size: 14px; color: #57534e;">📍 Helyszín: <strong>Mozgás Központ, Budapest</strong></div>
      </div>
      <p style="font-size: 13px; line-height: 1.6; color: #78716c;">
        Ha mégsem tudsz részt venni, kérjük, az edzés kezdete előtt legalább 2 órával mondd le a foglalásodat, hogy a várólistán utánad állóknak is esélyük legyen bejutni.
      </p>
      <div style="margin-top: 28px; text-align: center;">
        <a href="https://mozgaskozpont.hu/bookings" style="display: inline-block; background-color: #c25e00; color: #ffffff; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 10px; text-decoration: none;">Foglalásaim Megtekintése</a>
      </div>
    </div>
  </div>
</body>
</html>`;
      } else {
        textBody = `Értesítés: ${entry.subject}`;
        htmlBody = `<p>${entry.subject}</p>`;
      }

      const emailResult = await sendEmail({
        to: entry.recipient_email,
        subject: entry.subject,
        html: htmlBody,
        text: textBody,
      });

      if (emailResult.success) {
        result.sent += 1;
        await supabase.rpc('complete_outbox_notification', {
          p_id: entry.id,
          p_status: 'sent',
          p_error: null,
        });
      } else {
        result.failed += 1;
        const errMsg = emailResult.error || 'Email dispatch failed';
        result.errors.push(`Outbox #${entry.id}: ${errMsg}`);
        await supabase.rpc('complete_outbox_notification', {
          p_id: entry.id,
          p_status: 'failed',
          p_error: errMsg,
        });
      }
    } catch (err: unknown) {
      result.failed += 1;
      const errMsg = err instanceof Error ? err.message : 'Unexpected processing error';
      result.errors.push(`Outbox #${entry.id}: ${errMsg}`);
      try {
        await supabase.rpc('complete_outbox_notification', {
          p_id: entry.id,
          p_status: 'failed',
          p_error: errMsg,
        });
      } catch {
        // Ignore fallback update errors
      }
    }
  }

  return result;
}
