// src/lib/notifications/sessionNotificationService.js
import nodemailer from 'nodemailer';
import { format } from 'date-fns';
import hu from 'date-fns/locale/hu';

/**
 * Checks whether a session change is meaningful enough to warrant an email notification.
 * Meaningful changes:
 * - start_time changed
 * - end_time changed
 * - instructor_id changed
 * - is_active status changed
 */
export function isMeaningfulSessionChange(oldSession, updates) {
  if (!oldSession || !updates) return false;

  if (
    updates.start_time !== undefined &&
    new Date(oldSession.start_time).getTime() !== new Date(updates.start_time).getTime()
  ) {
    return true;
  }

  if (
    updates.end_time !== undefined &&
    new Date(oldSession.end_time).getTime() !== new Date(updates.end_time).getTime()
  ) {
    return true;
  }

  if (
    updates.instructor_id !== undefined &&
    String(oldSession.instructor_id || '') !== String(updates.instructor_id || '')
  ) {
    return true;
  }

  if (
    updates.is_active !== undefined &&
    Boolean(oldSession.is_active) !== Boolean(updates.is_active)
  ) {
    return true;
  }

  return false;
}

/**
 * Generates an array of human-readable changes in Hungarian.
 */
export function getSessionChangeSummary(oldSession, newSession, { oldInstructorName, newInstructorName } = {}) {
  const changes = [];

  const oldStart = new Date(oldSession.start_time);
  const oldEnd = new Date(oldSession.end_time);
  const newStart = new Date(newSession.start_time);
  const newEnd = new Date(newSession.end_time);

  if (oldStart.getTime() !== newStart.getTime() || oldEnd.getTime() !== newEnd.getTime()) {
    const oldFormatted = `${format(oldStart, 'yyyy. MMMM d., EEEE HH:mm', { locale: hu })} – ${format(oldEnd, 'HH:mm')}`;
    const newFormatted = `${format(newStart, 'yyyy. MMMM d., EEEE HH:mm', { locale: hu })} – ${format(newEnd, 'HH:mm')}`;
    changes.push({
      field: 'Időpont',
      oldValue: oldFormatted,
      newValue: newFormatted,
    });
  }

  if (String(oldSession.instructor_id || '') !== String(newSession.instructor_id || '')) {
    changes.push({
      field: 'Oktató',
      oldValue: oldInstructorName || 'Nincs megadva',
      newValue: newInstructorName || 'Nincs megadva',
    });
  }

  if (Boolean(oldSession.is_active) !== Boolean(newSession.is_active)) {
    changes.push({
      field: 'Státusz',
      oldValue: oldSession.is_active ? 'Aktív' : 'Inaktív',
      newValue: newSession.is_active ? 'Aktív' : 'Inaktív (Elmarad)',
    });
  }

  return changes;
}

/**
 * Normalizes and deduplicates a list of recipients by email.
 */
export function deduplicateRecipients(recipients = []) {
  const map = new Map();

  for (const r of recipients) {
    if (!r) continue;
    const email = typeof r === 'string' ? r.trim().toLowerCase() : r.email?.trim().toLowerCase();
    if (!email || !email.includes('@')) continue;

    if (!map.has(email)) {
      map.set(email, {
        email,
        name: typeof r === 'object' ? r.name || r.full_name || r.username || '' : '',
        role: typeof r === 'object' ? r.role || 'participant' : 'participant',
      });
    }
  }

  return Array.from(map.values());
}

/**
 * Dispatches a transactional email to one or multiple recipients.
 * Supports Resend API (HTTP fetch) and Nodemailer (SMTP), with graceful console fallback.
 */
export async function sendEmail({ to, subject, html, text }) {
  const recipients = Array.isArray(to) ? to : [to];
  const emailAddresses = recipients
    .map((r) => (typeof r === 'string' ? r : r.email))
    .filter(Boolean);

  if (emailAddresses.length === 0) {
    return { success: true, count: 0, message: 'No valid recipients' };
  }

  const fromEmail = process.env.EMAIL_FROM || 'Mozgás Központ <noreply@mozgaskozpont.hu>';
  const resendApiKey = process.env.RESEND_API_KEY;
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  // 1. Resend API delivery
  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [fromEmail], // Prevent PII disclosure: send to stúdió, BCC all recipients
          bcc: emailAddresses,
          subject,
          html,
          text,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Resend API error: ${response.status} ${JSON.stringify(errorData)}`);
      }

      const resData = await response.json();
      return { success: true, provider: 'resend', id: resData.id, count: emailAddresses.length };
    } catch (err) {
      console.error('[NotificationService:Resend Error]', err);
      // Do not crash the application, return error status
      return { success: false, provider: 'resend', error: err.message, count: 0 };
    }
  }

  // 2. Nodemailer SMTP delivery
  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: fromEmail,
        to: fromEmail, // Explicit To header to comply with strict SMTP relays, all recipients in BCC
        bcc: emailAddresses.join(', '),
        subject,
        html,
        text,
      });

      return { success: true, provider: 'smtp', messageId: info.messageId, count: emailAddresses.length };
    } catch (err) {
      console.error('[NotificationService:SMTP Error]', err);
      return { success: false, provider: 'smtp', error: err.message, count: 0 };
    }
  }

  // 3. Fallback / Local Development Logger
  console.log('----------------------------------------------------');
  console.log('[NotificationService:DRY_RUN] Email notification prepared (No SMTP/Resend key configured)');
  console.log(`Subject: ${subject}`);
  console.log(`Recipients (${emailAddresses.length}):`, emailAddresses.join(', '));
  console.log(`Text preview: ${text.slice(0, 150)}...`);
  console.log('----------------------------------------------------');

  return {
    success: true,
    dryRun: true,
    count: emailAddresses.length,
    recipients: emailAddresses,
  };
}

/**
 * Notifies all stakeholders when a class session is deleted.
 */
export async function notifySessionDeleted({
  session,
  workoutTitle,
  participants = [],
  instructor = null,
  admins = [],
  deletedBy = null,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://workout-website-pi.vercel.app',
}) {
  const allRecipients = deduplicateRecipients([
    ...participants.map((p) => ({ ...p, role: 'participant' })),
    instructor ? { ...instructor, role: 'instructor' } : null,
    ...admins.map((a) => ({ ...a, role: 'admin' })),
    process.env.ADMIN_NOTIFICATION_EMAIL
      ? { email: process.env.ADMIN_NOTIFICATION_EMAIL, role: 'admin_inbox' }
      : null,
  ]);

  if (allRecipients.length === 0) {
    return { success: true, count: 0, reason: 'No recipients to notify' };
  }

  const startDate = new Date(session.start_time);
  const endDate = new Date(session.end_time);
  const formattedDate = format(startDate, 'yyyy. MMMM d., EEEE', { locale: hu });
  const formattedTime = `${format(startDate, 'HH:mm')} – ${format(endDate, 'HH:mm')}`;
  const instructorDisplay = instructor?.full_name || instructor?.username || 'Nincs megadva';
  const performerDisplay = deletedBy?.full_name || deletedBy?.username || 'Adminisztrátor';

  const subject = `[Mozgás Központ] Értesítés: ${workoutTitle} edzés törölve (${formattedDate})`;

  const text = `Kedves Felhasználónk!

Tájékoztatunk, hogy a Mozgás Központban meghirdetett alábbi csoportos edzés TÖRLÉSRE KERÜLT:

Edzés: ${workoutTitle}
Dátum: ${formattedDate}
Időpont: ${formattedTime}
Oktató: ${instructorDisplay}
Kezdeményezte: ${performerDisplay}

Amennyiben érvényes foglalással rendelkeztél az edzésre, a rendszer azt automatikusan törölte.
Kérjük, tekints meg további óráinkat az órarendben:
${appUrl}/calendar

Üdvözlettel,
A Mozgás Központ Csapata
`;

  const html = `
<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f3ef; color: #1c1917; margin: 0; padding: 24px; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e7e5e4; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #1c1917; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
    .badge { display: inline-block; background: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-top: 8px; }
    .content { padding: 28px; line-height: 1.6; }
    .card { background: #fafaf9; border: 1px solid #e7e5e4; border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px; margin: 20px 0; }
    .card-item { margin-bottom: 8px; font-size: 14px; }
    .card-item:last-child { margin-bottom: 0; }
    .card-label { font-weight: 600; color: #57534e; }
    .card-value { color: #1c1917; font-weight: 500; }
    .btn { display: inline-block; background: #16a34a; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; font-weight: 600; text-decoration: none; text-align: center; margin-top: 16px; }
    .footer { padding: 20px 28px; background: #fafaf9; border-top: 1px solid #f5f5f4; font-size: 12px; color: #78716c; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Mozgás Központ Fitness Stúdió</h1>
      <span class="badge">Edzés Törölve</span>
    </div>
    <div class="content">
      <p>Kedves Vendégünk / Oktatónk!</p>
      <p>Értesítünk, hogy a stúdió órarendjéből a következő csoportos edzés <strong>törlésre került</strong>:</p>
      
      <div class="card">
        <div class="card-item"><span class="card-label">Edzés:</span> <span class="card-value" style="font-weight: 700; font-size: 15px;">${workoutTitle}</span></div>
        <div class="card-item"><span class="card-label">Dátum:</span> <span class="card-value">${formattedDate}</span></div>
        <div class="card-item"><span class="card-label">Időpont:</span> <span class="card-value">${formattedTime}</span></div>
        <div class="card-item"><span class="card-label">Oktató:</span> <span class="card-value">${instructorDisplay}</span></div>
      </div>

      <p style="font-size: 14px; color: #57534e;">
        Amennyiben érvényes foglalásod volt erre az edzésre, a rendszer azt automatikusan felszabadította. Kérjük, válassz másik időpontot az aktuális heti órarendünkből!
      </p>

      <div style="text-align: center;">
        <a href="${appUrl}/calendar" class="btn">Órarend megtekintése</a>
      </div>
    </div>
    <div class="footer">
      Mozgás Központ • Ez egy automatikus értesítő levél, kérjük ne válaszolj rá.
    </div>
  </div>
</body>
</html>
`;

  return sendEmail({ to: allRecipients, subject, html, text });
}

/**
 * Notifies all stakeholders when a class session is modified with meaningful changes.
 */
export async function notifySessionUpdated({
  oldSession,
  newSession,
  workoutTitle,
  participants = [],
  oldInstructor = null,
  newInstructor = null,
  admins = [],
  updatedBy = null,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://workout-website-pi.vercel.app',
}) {
  const changes = getSessionChangeSummary(oldSession, newSession, {
    oldInstructorName: oldInstructor?.full_name || oldInstructor?.username,
    newInstructorName: newInstructor?.full_name || newInstructor?.username,
  });

  if (changes.length === 0) {
    return { success: true, count: 0, reason: 'No meaningful changes to notify' };
  }

  const allRecipients = deduplicateRecipients([
    ...participants.map((p) => ({ ...p, role: 'participant' })),
    oldInstructor ? { ...oldInstructor, role: 'previous_instructor' } : null,
    newInstructor ? { ...newInstructor, role: 'new_instructor' } : null,
    ...admins.map((a) => ({ ...a, role: 'admin' })),
    process.env.ADMIN_NOTIFICATION_EMAIL
      ? { email: process.env.ADMIN_NOTIFICATION_EMAIL, role: 'admin_inbox' }
      : null,
  ]);

  if (allRecipients.length === 0) {
    return { success: true, count: 0, reason: 'No recipients to notify' };
  }

  const startDate = new Date(newSession.start_time);
  const endDate = new Date(newSession.end_time);
  const formattedDate = format(startDate, 'yyyy. MMMM d., EEEE', { locale: hu });
  const formattedTime = `${format(startDate, 'HH:mm')} – ${format(endDate, 'HH:mm')}`;
  const subject = `[Mozgás Központ] Értesítés: ${workoutTitle} edzés adatai módosultak (${formattedDate})`;

  const changesText = changes
    .map((c) => `- ${c.field}: ${c.oldValue} ➔ ${c.newValue}`)
    .join('\n');

  const text = `Kedves Felhasználónk!

Tájékoztatunk, hogy a Mozgás Központban a(z) ${workoutTitle} csoportos edzés adatai MÓDOSULTAK:

A módosítások részletei:
${changesText}

Aktuális edzésadatok:
Edzés: ${workoutTitle}
Dátum: ${formattedDate}
Időpont: ${formattedTime}
Oktató: ${newInstructor?.full_name || newInstructor?.username || 'Nincs megadva'}

Kérjük, ellenőrizd a részleteket a weboldalon:
${appUrl}/calendar

Üdvözlettel,
A Mozgás Központ Csapata
`;

  const changesHtml = changes
    .map(
      (c) => `
      <div style="margin-bottom: 8px;">
        <strong style="color: #44403c;">${c.field}:</strong><br>
        <span style="text-decoration: line-through; color: #a8a29e; font-size: 13px;">${c.oldValue}</span>
        <span style="color: #16a34a; font-weight: 600; font-size: 14px;"> ➔ ${c.newValue}</span>
      </div>`
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f3ef; color: #1c1917; margin: 0; padding: 24px; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e7e5e4; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #1c1917; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
    .badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-top: 8px; }
    .content { padding: 28px; line-height: 1.6; }
    .changes-card { background: #fefce8; border: 1px solid #fef08a; border-left: 4px solid #eab308; border-radius: 8px; padding: 16px; margin: 20px 0; }
    .btn { display: inline-block; background: #16a34a; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; font-weight: 600; text-decoration: none; text-align: center; margin-top: 16px; }
    .footer { padding: 20px 28px; background: #fafaf9; border-top: 1px solid #f5f5f4; font-size: 12px; color: #78716c; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Mozgás Központ Fitness Stúdió</h1>
      <span class="badge">Edzés Módosult</span>
    </div>
    <div class="content">
      <p>Kedves Vendégünk / Oktatónk!</p>
      <p>Értesítünk, hogy a(z) <strong>${workoutTitle}</strong> csoportos edzésünk adatai módosultak.</p>
      
      <div class="changes-card">
        <div style="font-weight: 700; color: #854d0e; margin-bottom: 10px; font-size: 14px;">Mi változott?</div>
        ${changesHtml}
      </div>

      <p style="font-size: 14px; color: #57534e;">
        Kérjük, ellenőrizd foglalásodat az órarendben!
      </p>

      <div style="text-align: center;">
        <a href="${appUrl}/calendar" class="btn">Órarend megtekintése</a>
      </div>
    </div>
    <div class="footer">
      Mozgás Központ • Ez egy automatikus értesítő levél, kérjük ne válaszolj rá.
    </div>
  </div>
</body>
</html>
`;

  return sendEmail({ to: allRecipients, subject, html, text });
}
