import { withSupabase } from 'npm:@supabase/server@1.4.1';
import { corsHeaders, json, rejectDisallowedOrigin } from '../_shared/cors.ts';
import { clean, completedAnalysis, digest, email, renderLetter, TEMPLATE_VERSION, validateTerms } from './letter.mjs';

const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const denied = rejectDisallowedOrigin(req); if (denied) return denied;
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    const db = ctx.supabase, admin = ctx.supabaseAdmin, userId = ctx.userClaims!.id;
    const { data: access, error: accessError } = await db.rpc('get_account_access');
    if (accessError) return json({ error: 'Account access check unavailable.' }, 503);
    if (access?.owner !== true) return json({ error: 'The Letter of Intent pilot is currently available only to the owner account.' }, 403);
    // Check the live Auth user, not editable metadata or a client-supplied sender.
    const { data: auth, error: authError } = await admin.auth.admin.getUserById(userId);
    if (authError || !auth.user?.email_confirmed_at || !auth.user.email) return json({ error: 'A currently verified account email is required.' }, 403);
    const senderEmail = email(auth.user.email);
    const externalEnabled = Deno.env.get('LOI_PILOT_EXTERNAL_ENABLED') === 'true';
    const sender = Deno.env.get('LOI_FROM') || Deno.env.get('REGISTRATION_NOTIFICATION_FROM') || 'PropertyThesis <notifications@propertythesis.com>';
    const emailReady = !!Deno.env.get('RESEND_API_KEY');
    const raw = await req.text(); if (raw.length > 16000) return json({ error: 'Request too large.' }, 413);
    let body: any; try { body = JSON.parse(raw); } catch { return json({ error: 'Invalid request.' }, 400); }
    if (!body || typeof body !== 'object') return json({ error: 'Invalid request.' }, 400);
    const { data: rate, error: rateError } = await admin.rpc('consume_edge_rate_limit', { p_user_id: userId, p_function_name: 'letter-of-intent', p_limit: 60, p_window_seconds: 60 });
    if (rateError || !rate?.allowed) return json({ error: 'Please wait a minute before trying again.' }, rateError ? 503 : 429);
    try {
      if (body.action === 'context') {
        const { data, error } = await db.from('analyses').select('id,property_id,name,assumptions,outputs,updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(100);
        if (error) throw error;
        return json({ senderEmail, from: sender, externalEnabled, emailReady, analyses: (data || []).filter(completedAnalysis).map(a => ({
          id: a.id, name: a.name, address: a.assumptions?.address || '', price: a.assumptions?.price,
          listingAgent: a.assumptions?.sourceListing?.listingAgent || null,
          listingStatus: a.assumptions?.sourceListing?.status || null,
          listingLastSeen: a.assumptions?.sourceListing?.lastSeenDate || null,
        })) });
      }
      if (body.action === 'history') {
        const { data, error } = await db.from('letters_of_intent').select('id,address,recipient_email,sender_email,sender_from,subject,letter_text,document_hash,status,created_at,submitted_at,last_error').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
        if (error) throw error; return json({ letters: data });
      }
      if (body.action === 'prepare') {
        if (!uuid(body.analysisId)) return json({ error: 'Select a saved, completed analysis.' }, 400);
        const terms = validateTerms(body.terms);
        if (!externalEnabled && (terms.recipientEmail !== senderEmail || !terms.test)) return json({ error: 'This pilot can send only a clearly labeled test to your own verified email.' }, 403);
        const { data: analysis, error } = await db.from('analyses').select('id,property_id,user_id,assumptions,outputs,updated_at').eq('id', body.analysisId).eq('user_id', userId).maybeSingle();
        if (error) throw error;
        if (!analysis || !completedAnalysis(analysis)) return json({ error: 'Save a completed analysis with valid results before preparing an LOI.' }, 409);
        const { data: property, error: propertyError } = await db.from('properties').select('id,address').eq('id', analysis.property_id).eq('user_id', userId).maybeSingle();
        if (propertyError) throw propertyError;
        if (!property) return json({ error: 'Property unavailable.' }, 404);
        const address = clean(analysis.assumptions?.address || property.address || '', 'Saved property address', 300);
        const fingerprint = await digest(JSON.stringify({ template: TEMPLATE_VERSION, analysisId: analysis.id, version: analysis.updated_at, senderEmail, sender, terms, address }));
        const { data: existing, error: existingError } = await db.from('letters_of_intent').select('*').eq('user_id', userId).eq('fingerprint', fingerprint).maybeSingle();
        if (existingError) throw existingError;
        if (existing) return json({ letter: existing, duplicate: true });
        const letter = renderLetter(terms, address, senderEmail, new Date().toISOString().slice(0, 10));
        const documentHash = await digest(JSON.stringify({ recipient: terms.recipientEmail, senderEmail, sender, ...letter }));
        const row = { user_id: userId, property_id: property.id, analysis_id: analysis.id, analysis_updated_at: analysis.updated_at,
          address, recipient_email: terms.recipientEmail, sender_email: senderEmail, sender_from: sender, terms,
          subject: letter.subject, letter_text: letter.text, letter_html: letter.html, document_hash: documentHash, fingerprint, template_version: TEMPLATE_VERSION };
        const { data: saved, error: saveError } = await admin.from('letters_of_intent').insert(row).select().single();
        if (saveError?.code === '23505') return json({ error: 'This preview was already created. Open history to review it.' }, 409);
        if (saveError) throw saveError;
        return json({ letter: saved });
      }
      if (body.action !== 'send') return json({ error: 'Unknown action.' }, 400);
      if (!uuid(body.id) || body.confirmed !== true || typeof body.documentHash !== 'string') return json({ error: 'Review the saved letter and explicitly confirm the recipient and terms.' }, 400);
      const { data: letter, error: readError } = await db.from('letters_of_intent').select('*').eq('id', body.id).eq('user_id', userId).maybeSingle();
      if (readError) throw readError;
      if (!letter) return json({ error: 'Letter not found.' }, 404);
      if (letter.document_hash !== body.documentHash) return json({ error: 'The preview does not match. Please review it again.' }, 409);
      if (letter.status !== 'prepared') return json({ status: letter.status, error: 'This letter already has a sending attempt. Check history; it will not be sent again.' }, 409);
      if (letter.sender_email !== senderEmail || letter.sender_from !== sender) return json({ error: 'Sender details changed. Prepare a fresh preview.' }, 409);
      if (!externalEnabled && (letter.recipient_email !== senderEmail || letter.terms?.test !== true)) return json({ error: 'External recipients are disabled during the pilot.' }, 403);
      const { data: analysis, error: analysisError } = await db.from('analyses').select('id,property_id,assumptions,outputs,updated_at').eq('id', letter.analysis_id).eq('user_id', userId).maybeSingle();
      if (analysisError) throw analysisError;
      if (!analysis || !completedAnalysis(analysis) || analysis.updated_at !== letter.analysis_updated_at) return json({ error: 'The saved analysis changed or was removed. Prepare a fresh preview.' }, 409);
      const { data: property, error: propError } = await db.from('properties').select('id').eq('id', letter.property_id).eq('user_id', userId).maybeSingle();
      if (propError || !property) return json({ error: 'Property access unavailable.' }, 403);
      if (!emailReady) return json({ error: 'Email service is not configured. Your preview is saved.' }, 503);
      const { data: quota, error: quotaError } = await admin.rpc('consume_edge_rate_limit', { p_user_id: userId, p_function_name: 'letter-of-intent-send', p_limit: 10, p_window_seconds: 86400 });
      if (quotaError || !quota?.allowed) return json({ error: 'The pilot sending allowance is unavailable or reached (10 attempts/day).' }, quotaError ? 503 : 429);
      // Atomic compare-and-set: only one caller can contact the email provider.
      const { data: claimed, error: claimError } = await admin.from('letters_of_intent').update({ status: 'sending', confirmed_at: new Date().toISOString() }).eq('id', letter.id).eq('user_id', userId).eq('status', 'prepared').select('id').maybeSingle();
      if (claimError) throw claimError;
      if (!claimed) return json({ error: 'A sending attempt already started. Check history.' }, 409);
      let status = 'unknown', providerId: string | null = null, lastError: string | null = 'Delivery outcome is uncertain. Do not resend; contact support to check the email provider.';
      try {
        const response = await fetch('https://api.resend.com/emails', { method: 'POST', signal: AbortSignal.timeout(15000),
          headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json', 'Idempotency-Key': `propertythesis-loi-${letter.id}` },
          body: JSON.stringify({ from: letter.sender_from, to: [letter.recipient_email], reply_to: senderEmail, subject: letter.subject, text: letter.letter_text, html: letter.letter_html }) });
        const result = await response.json().catch(() => ({}));
        if (response.ok && typeof result.id === 'string') { status = 'submitted'; providerId = result.id; lastError = null; }
        else if (response.status >= 400 && response.status < 500 && response.status !== 408) { status = 'failed'; lastError = 'The email provider rejected this attempt. Contact support before preparing another copy.'; }
      } catch { /* Keep uncertain attempts locked; never automatically resend. */ }
      const { error: recordError } = await admin.from('letters_of_intent').update({ status, provider_id: providerId, last_error: lastError,
        submitted_at: status === 'submitted' ? new Date().toISOString() : null }).eq('id', letter.id).eq('user_id', userId);
      if (recordError) return json({ error: 'Sending outcome could not be recorded. Do not resend; contact support.', status: 'unknown' }, 503);
      return json({ status, message: status === 'submitted' ? 'Submitted to the email provider. This does not confirm inbox delivery or acceptance of any terms.' : lastError }, status === 'submitted' ? 200 : 502);
    } catch (error) {
      if (error instanceof Error && !('code' in error)) return json({ error: error.message }, 400);
      console.error('[letter-of-intent] operation failed');
      return json({ error: 'The LOI operation could not be completed. Your existing records have not been overwritten.' }, 503);
    }
  }),
};
