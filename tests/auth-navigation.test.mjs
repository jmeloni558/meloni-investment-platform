import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../app-navigation-toolbar.js', import.meta.url), 'utf8');
function harness() {
  let active = 'landing', authCallback, resolveSession, now = 0;
  const timers = [], clicks = [], switches = [], domEvents = {};
  const storage = () => {
    const values = new Map();
    return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  };
  const context = {
    URLSearchParams, Promise, console,
    location: { search: '', pathname: '/', hash: '' },
    history: { replaceState() {} },
    sessionStorage: storage(), localStorage: storage(),
    cloudUser: { id: 'owner-a' }, selectedAnalysisId: null,
    cloudClient: { auth: {
      onAuthStateChange(fn) { authCallback = fn; },
      getSession() { return new Promise(resolve => { resolveSession = resolve; }); },
    } },
    document: {
      readyState: 'loading',
      getElementById() { return null; },
      querySelector(selector) { return selector === '.section.active' ? { id: active } : null; },
      querySelectorAll() { return []; },
      addEventListener(name, fn) { domEvents[name] = fn; },
    },
    setTimeout(fn, delay = 0) { timers.push({ fn, at: now + delay }); },
    setInterval() { return 1; }, clearInterval() {},
    switchTab(id) { active = id; switches.push(id); },
    addEventListener(name, fn) { if (name === 'click') clicks.push(fn); },
  };
  context.window = context;
  vm.runInNewContext(source, context);
  domEvents.DOMContentLoaded();
  return {
    context, switches,
    auth(event, id = 'owner-a') {
      context.cloudUser = id ? { id } : null;
      authCallback(event, id ? { user: { id } } : null);
    },
    setActive(id, selected = null) { active = id; context.selectedAnalysisId = selected; },
    get active() { return active; },
    navigateClick() { clicks[0]({ target: { closest: () => ({}) } }); },
    async resolve(id) { resolveSession({ data: { session: id ? { user: { id } } : null } }); await Promise.resolve(); },
    flush() {
      let count = 0;
      while (timers.length) {
        assert.ok(++count < 200, 'timers should settle');
        timers.sort((a, b) => a.at - b.at);
        const timer = timers.shift(); now = timer.at; timer.fn();
      }
    },
  };
}

test('fresh sign-in opens saved properties once', () => {
  const h = harness(); h.auth('SIGNED_IN'); h.flush();
  assert.deepEqual(h.switches, ['propertyhub']);
});

test('same-user SIGNED_IN and token refresh preserve all workflow sections', () => {
  const h = harness(); h.auth('INITIAL_SESSION'); h.flush();
  for (const section of ['assumptions', 'dashboard', 'report']) {
    h.setActive(section, 'saved-analysis');
    h.auth('SIGNED_IN'); h.auth('TOKEN_REFRESHED'); h.auth('USER_UPDATED'); h.flush();
    assert.equal(h.active, section);
  }
  assert.deepEqual(h.switches, ['propertyhub']);
});

test('sign-out cancels pending sign-in navigation; signing in again still works', () => {
  const h = harness(); h.auth('SIGNED_IN'); h.auth('SIGNED_OUT', null); h.flush();
  assert.equal(h.switches.length, 0);
  h.auth('SIGNED_IN'); h.flush();
  assert.deepEqual(h.switches, ['propertyhub']);
});

test('explicit workflow click supersedes delayed login navigation', () => {
  const h = harness(); h.auth('INITIAL_SESSION'); h.navigateClick(); h.setActive('report'); h.flush();
  assert.equal(h.active, 'report'); assert.equal(h.switches.length, 0);
});

test('saved-analysis restoration during initial auth is preserved', () => {
  const h = harness(); h.auth('INITIAL_SESSION'); h.setActive('report', 'saved-analysis'); h.flush();
  assert.equal(h.active, 'report'); assert.equal(h.switches.length, 0);
});

test('a different account is routed to its property list, not a stale report', () => {
  const h = harness(); h.auth('SIGNED_IN'); h.flush();
  h.setActive('report', 'old-account-analysis'); h.auth('SIGNED_IN', 'owner-b'); h.flush();
  assert.equal(h.active, 'propertyhub'); assert.equal(h.switches.length, 2);
});

test('late getSession cannot override a newer auth event', async () => {
  const h = harness(); h.auth('SIGNED_OUT', null); await h.resolve('owner-a'); h.flush();
  assert.equal(h.switches.length, 0);
});

test('getSession fallback still opens properties when no auth event fires', async () => {
  const h = harness(); await h.resolve('owner-a'); h.flush();
  assert.deepEqual(h.switches, ['propertyhub']);
});

test('password recovery cancels an earlier delayed redirect', () => {
  const h = harness(); h.auth('SIGNED_IN'); h.auth('PASSWORD_RECOVERY'); h.flush();
  assert.equal(h.switches.length, 0);
});

test('pending password recovery is not treated as a normal sign-in', () => {
  const h = harness(); h.context.sessionStorage.setItem('ptPasswordRecoveryPending', '1');
  h.auth('SIGNED_IN'); h.flush(); assert.equal(h.switches.length, 0);
});
