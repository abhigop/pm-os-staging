const pendingKey = 'pm-os-staging.pending-team-invitation.v1';
const validCode = value => /^[a-f0-9]{48}$/.test(value || '');

export function readTeamInvitationCallback(environment = globalThis) {
  const url = new URL(environment.location.href);
  const fragment = new URLSearchParams(url.hash.slice(1));
  const hasCredentials = fragment.has('access_token') || fragment.has('refresh_token') || fragment.has('error');
  const supplied = url.searchParams.get('teamInvite');
  let saved;
  try { saved = environment.sessionStorage.getItem(pendingKey); } catch { /* The current tab can still join. */ }
  const code = supplied || saved || '';
  const session = fragment.get('access_token') && fragment.get('refresh_token') ? {
    access_token: fragment.get('access_token'), refresh_token: fragment.get('refresh_token')
  } : null;
  // Remove authentication credentials before any async work, rendering or navigation.
  if (hasCredentials || supplied) {
    if (hasCredentials) url.hash = '';
    url.searchParams.delete('teamInvite');
    environment.history.replaceState(environment.history.state, '', url.href);
  }
  if (!code && !hasCredentials) return null;
  if (!validCode(code)) return { code: '', session: null, error: 'This invitation link is incomplete. Open the complete link from your email.' };
  try { environment.sessionStorage.setItem(pendingKey, code); } catch { /* Never persist Auth tokens here. */ }
  return { code, session, error: fragment.has('error') ? 'The email sign-in link has expired or was already used. Sign in below to check the invitation.' : '' };
}

export function clearPendingTeamInvitation(environment = globalThis) {
  try { environment.sessionStorage.removeItem(pendingKey); } catch { /* No stored invitation remains readable in this context. */ }
}

export async function showTeamInvitation({ invitation, config, pool, onJoined, document = globalThis.document }) {
  const dialog = document.createElement('dialog');
  dialog.id = 'teamInvitationReceptionDialog';
  dialog.className = 'confirmation-dialog team-invitation-reception';
  dialog.setAttribute('aria-labelledby', 'teamInvitationReceptionTitle');
  document.body.append(dialog);
  let busy = true, error = invitation.error || '', preview = null, email = '', codeSent = false, authenticated = false, accepted = false;
  let client, connector;
  let usePassword = config?.authMode === 'password';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const cancel = () => { clearPendingTeamInvitation(); invitation.session = null; dialog.close(); dialog.remove(); };
  dialog.addEventListener('cancel', event => { event.preventDefault(); cancel(); });

  function render() {
    dialog.innerHTML = `<h2 id="teamInvitationReceptionTitle">${preview ? `Join ${esc(preview.workspaceName)}` : 'Join your Team workspace'}</h2>
      ${error ? `<p role="alert">${esc(error)}</p>` : ''}
      ${busy ? '<p role="status">Checking your invitation…</p>' : preview ? `<p>You are signed in as <strong>${esc(preview.email)}</strong>.</p><p>Your access will be <strong>${esc(preview.role)}</strong>. ${preview.role === 'viewer' ? 'You can view the team’s work. Editing is unavailable.' : 'You can contribute to the team’s work.'}</p><button class="primary" id="acceptReceivedTeamInvitation" type="button">${accepted ? 'Open workspace' : 'Join workspace'}</button>`
        : client && invitation.code && !authenticated ? `<form id="receivedInvitationSignIn"><p>Sign in with the email address that received this invitation.</p><label>Email<input name="email" type="email" autocomplete="email" value="${esc(email)}" required></label>${usePassword ? '<label>Password<input name="password" type="password" autocomplete="current-password" required></label>' : codeSent ? '<label>Sign-in code<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" required></label>' : ''}<button class="primary" type="submit">${usePassword ? 'Sign in' : codeSent ? 'Verify code' : 'Send code'}</button></form>` : ''}
      ${!busy && client && authenticated && !preview ? '<button class="secondary" id="retryReceivedTeamInvitation" type="button">Check invitation again</button><button class="secondary" id="switchReceivedInvitationAccount" type="button">Use a different account</button>' : ''}
      ${!busy && client && !authenticated && usePassword ? '<button class="secondary" id="receivedInvitationEmailCode" type="button">Use an email code</button>' : ''}
      <button class="secondary" id="cancelReceivedTeamInvitation" type="button" ${busy ? 'disabled' : ''}>Cancel</button>`;
    dialog.querySelector('#receivedInvitationEmailCode')?.addEventListener('click', () => { email = dialog.querySelector('[name=email]')?.value || email; usePassword = false; render(); });
    dialog.querySelector('#cancelReceivedTeamInvitation')?.addEventListener('click', cancel);
    dialog.querySelector('#retryReceivedTeamInvitation')?.addEventListener('click', () => run(loadPreview));
    dialog.querySelector('#switchReceivedInvitationAccount')?.addEventListener('click', () => run(async () => { await client.signOut(); authenticated = false; codeSent = false; }));
    dialog.querySelector('#receivedInvitationSignIn')?.addEventListener('submit', event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      email = String(form.get('email') || '').trim();
      void run(async () => {
        const result = usePassword ? await client.signInWithPassword(email, String(form.get('password') || ''))
          : codeSent ? await client.verifyOtp(email, String(form.get('code') || '')) : await client.sendOtp(email);
        if (result?.status === 'authenticated') { authenticated = true; await loadPreview(); }
        else { codeSent = true; }
      });
    });
    dialog.querySelector('#acceptReceivedTeamInvitation')?.addEventListener('click', () => run(async () => {
      if (!accepted) { await client.teamService.acceptInvite({ code: invitation.code }); accepted = true; }
      await onJoined({ ...preview, connectorId: connector.id });
      clearPendingTeamInvitation();
      dialog.close(); dialog.remove();
    }));
  }
  async function loadPreview() {
    preview = await client.teamService.previewInvite({ code: invitation.code });
  }
  async function run(action) {
    busy = true; error = ''; render();
    try { await action(); }
    catch { error = accepted ? 'You joined, but the workspace could not open. Try Open workspace again.'
      : authenticated ? 'This invitation is unavailable for this account. It may have expired, been revoked, or been accepted already. Check the recipient email or ask the owner to resend it.'
        : 'Sign-in could not complete. Check your credentials or ask the owner for a fresh invitation.'; }
    finally { busy = false; if (dialog.isConnected) { render(); dialog.querySelector('input, button')?.focus(); } }
  }
  render(); dialog.showModal();
  if (!config || !pool || !invitation.code) {
    busy = false;
    error ||= 'This app has no configured Team server. Ask your administrator for the Team app address, then open your invitation there.';
    render(); return;
  }
  await run(async () => {
    const { serverConnectorClientConfig } = await import('./server-connectors.js');
    connector = pool.registry.connectors.find(entry => entry.url === config.url && entry.publishableKey === config.publishableKey
      && entry.mode === config.mode && entry.authMode === config.authMode && entry.persistSession === config.persistSession
      && entry.allowWorkspaceCreation === config.allowWorkspaceCreation) || pool.register({ ...config, id: `server-${globalThis.crypto.randomUUID()}` });
    client = pool.clientFor(connector.id);
    await client.checkCapabilities(serverConnectorClientConfig(connector));
    const session = invitation.session;
    invitation.session = null;
    const auth = session ? await client.acceptEmailSession(session) : await client.getAuthState();
    authenticated = auth?.status === 'authenticated';
    if (authenticated) await loadPreview();
  });
}
