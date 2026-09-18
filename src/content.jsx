import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FIELDS, isMediaPath } from './schema.js';
import { demoContent, demoUpload, isDemoMedia, resolveDemoMedia } from './demo.js';
import {
  API, CONTENT_URL, ContentCtx, DEFAULTS, PARTS, api, cleanHtml, defList, defText, emptyDoc, fieldsOf, flag, has, normalizeDoc, same, useContent,
} from './content-core.js';

// ---- Editable site content · components -------------------------------------------
// <ContentProvider> loads the saved overrides and owns the editing session,
// <T> renders one piece of (editable) copy, <AdminBar> is the inline-edit bar.
// See content-core.js for how content is stored and layered over schema.js.

export function ContentProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [doc, setDoc] = useState(emptyDoc);       // saved overrides
  const [draft, setDraft] = useState(emptyDoc);   // unsaved edits; null = back to the original
  const [session, setSession] = useState(null);   // { csrf, user, maxUpload } once logged in
  const [focused, setFocusedKey] = useState(null);
  const focusedEl = useRef(null);
  const [status, setStatus] = useState(null);     // { kind: 'ok' | 'err', msg }
  const [saving, setSaving] = useState(false);
  const editing = session !== null;
  const csrf = session?.csrf ?? null;
  const demo = !!session?.demo; // in-browser stand-in backend (static hosts)

  // Load saved overrides before first paint so edited copy never flashes the
  // default. Capped: a slow/absent file must not hold the page hostage.
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => alive && setReady(true), 2000);
    fetch(CONTENT_URL, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((json) => {
        if (!alive) return;
        // No saved file on this host → whatever the demo admin saved in this browser.
        setDoc(normalizeDoc(json ?? demoContent()));
        setReady(true);
      });
    return () => { alive = false; clearTimeout(timer); };
  }, []);

  const adopt = useCallback((data) => {
    if (data?.authed && data.csrf && data.user) {
      flag.set(true);
      setSession({ csrf: data.csrf, user: data.user, maxUpload: data.maxUpload || 0, demo: !!data.demo });
      return true;
    }
    return false;
  }, []);

  // Returning user: resume the session without showing the login again. Only
  // browsers that logged in before ever hit the PHP endpoint.
  useEffect(() => {
    if (!flag.get()) return;
    api('session.php').then(({ ok, data }) => { if (!ok || !adopt(data)) flag.set(false); });
  }, [adopt]);

  // PHP sessions expire after ~24 idle minutes — keep it warm while editing.
  useEffect(() => {
    if (!editing || demo) return;
    const t = setInterval(() => {
      api('session.php').then(({ ok, data }) => {
        if (ok && !data.authed) setStatus({ kind: 'err', msg: 'Your session expired. Open #/admin in a new tab, log in, then save again.' });
      });
    }, 240000);
    return () => clearInterval(t);
  }, [editing, demo]);

  const login = useCallback(async (username, password) => {
    const { ok, status: code, data } = await api('login.php', { method: 'POST', body: { username, password } });
    if (ok && adopt(data)) return { ok: true };
    return { ok: false, code, error: data?.error };
  }, [adopt]);

  const logout = useCallback(async () => {
    await api('logout.php', { method: 'POST', csrf }).catch(() => {});
    flag.set(false);
    setSession(null);
    setDraft(emptyDoc());
    focusedEl.current = null;
    setFocusedKey(null);
    setStatus(null);
  }, [csrf]);

  // ---- reading -----------------------------------------------------------------
  const get = useCallback((part, k) => {
    const def = DEFAULTS[part](k);
    const v = has(draft[part], k) ? (draft[part][k] === null ? def : draft[part][k]) : has(doc[part], k) ? doc[part][k] : def;
    // Demo uploads live in this browser: swap their fake paths for the stored picture.
    if (part === 'media') return resolveDemoMedia(v);
    if (part === 'lists' && v.some((it) => Object.values(it).some(isDemoMedia))) {
      return v.map((it) => Object.fromEntries(Object.entries(it).map(([f, x]) => [f, resolveDemoMedia(x)])));
    }
    return v;
  }, [doc, draft]);
  const getSaved = useCallback((part, k) => (has(doc[part], k) ? doc[part][k] : DEFAULTS[part](k)), [doc]);

  // ---- writing -----------------------------------------------------------------
  // Setting a value back to what is saved clears the draft entry; setting it
  // back to the code default stores `null` (= remove the override on save).
  // `value` may be an updater (current → next) so edits that land in the same
  // tick — e.g. two fields of one list — build on each other, not on stale state.
  const set = useCallback((part, k, valueOrFn) => {
    setStatus(null);
    const def = DEFAULTS[part](k);
    setDraft((d) => {
      const next = { ...d, [part]: { ...d[part] } };
      const base = has(doc[part], k) ? doc[part][k] : def;
      const cur = has(d[part], k) ? (d[part][k] === null ? def : d[part][k]) : base;
      const value = typeof valueOrFn === 'function' ? valueOrFn(cur) : valueOrFn;
      if (same(value, base)) delete next[part][k];
      else if (same(value, def)) next[part][k] = null;
      else next[part][k] = value;
      return next;
    });
  }, [doc]);

  const reset = useCallback((part, k) => set(part, k, DEFAULTS[part](k)), [set]);

  const dirty = PARTS.reduce((n, p) => n + Object.keys(draft[p]).length, 0);

  const save = useCallback(async () => {
    if (!dirty || saving) return false;
    setSaving(true);
    const merged = { v: 2 };
    for (const p of PARTS) {
      merged[p] = { ...doc[p] };
      for (const [k, v] of Object.entries(draft[p])) {
        if (v === null) delete merged[p][k];
        else merged[p][k] = v;
      }
    }
    const { ok, status: code, data } = await api('save.php', { method: 'POST', body: { doc: merged }, csrf });
    setSaving(false);
    if (ok && data.doc) {
      setDoc(normalizeDoc(data.doc));
      setDraft(emptyDoc());
      setStatus({ kind: 'ok', msg: demo ? 'Saved in this browser (demo) — the real website is unchanged.' : 'Saved — live for every visitor.' });
      return true;
    }
    setStatus({
      kind: 'err',
      msg: code === 401
        ? 'Your session expired. Open #/admin in a new tab, log in, then save again.'
        : data?.error || 'Could not save. Check your connection and try again.',
    });
    return false;
  }, [dirty, saving, doc, draft, csrf, demo]);

  const discard = useCallback(() => {
    setDraft(emptyDoc());
    setStatus(null);
    // Fields whose DOM was typed into but whose value prop never changed need
    // a nudge: React won't rewrite innerHTML it believes is already current.
    document.querySelectorAll('[data-saved]').forEach((el) => {
      const orig = el.getAttribute('data-saved');
      if (el.innerHTML !== orig) el.innerHTML = orig;
    });
  }, []);

  // Upload a picture/clip; resolves to { path, thumb? } stored under data/uploads/.
  const upload = useCallback((file, { thumb = false, onProgress } = {}) => new Promise((resolve, reject) => {
    if (demo) { demoUpload(file).then(resolve, reject); return; }
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append('file', file);
    if (thumb) form.append('thumb', '1');
    xhr.open('POST', API + 'upload.php');
    xhr.setRequestHeader('X-CSRF-Token', csrf || '');
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.upload.onprogress = (e) => { if (onProgress && e.lengthComputable) onProgress(e.loaded / e.total); };
    xhr.onerror = () => reject(new Error('Upload failed — check your connection.'));
    xhr.onload = () => {
      let data = null;
      try { data = JSON.parse(xhr.responseText); } catch { /* not JSON */ }
      if (xhr.status === 200 && data && isMediaPath(data.path)) resolve(data);
      else if (xhr.status === 413) reject(new Error('That file is larger than the hosting accepts.'));
      else reject(new Error(data?.error || 'Upload failed.'));
    };
    xhr.send(form);
  }), [csrf, demo]);

  const call = useCallback((path, body) => api(path, body ? { method: 'POST', body, csrf } : { csrf }), [csrf]);

  const setFocused = useCallback((info, el) => {
    focusedEl.current = el;
    setFocusedKey(info);
  }, []);

  const resetFocused = useCallback(() => {
    if (!focused) return;
    const el = focusedEl.current;
    if (el && el.isConnected) el.innerHTML = focused.def;
    focused.commit(focused.def);
  }, [focused]);

  // Edit mode: a click on editable copy places the caret instead of following
  // the link / pressing the button it sits in. Cmd/Ctrl-click still goes through.
  useEffect(() => {
    if (!editing) return;
    const onClick = (e) => {
      if (e.metaKey || e.ctrlKey) return;
      if (e.target.closest && e.target.closest('[data-saved]')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('click', onClick, true);
    document.documentElement.classList.add('tm-editing');
    return () => {
      document.removeEventListener('click', onClick, true);
      document.documentElement.classList.remove('tm-editing');
    };
  }, [editing]);

  // A success note clears itself; errors stay until the next action.
  useEffect(() => {
    if (status?.kind !== 'ok') return;
    const t = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(t);
  }, [status]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const value = useMemo(() => ({
    editing, demo, user: session?.user ?? null, maxUpload: session?.maxUpload ?? 0,
    doc, draft, get, getSaved, set, reset,
    dirty, saving, status, setStatus, save, discard,
    login, logout, upload, call, setFocused, focused, resetFocused,
  }), [editing, demo, session, doc, draft, get, getSaved, set, reset, dirty, saving, status, save, discard, login, logout, upload, call, setFocused, focused, resetFocused]);

  return <ContentCtx.Provider value={value}>{ready ? children : null}</ContentCtx.Provider>;
}

// Editable copy. `k` is a text key from schema.js; or `list` + `id` + `f` point
// at one field of a list item. `as` swaps the wrapper so an existing element
// (p, em, span, div…) becomes the editable node without extra markup.
export function T({ k, list, id, f, as: Tag = 'span', className, ...rest }) {
  const c = useContent();
  let rich, def, value, saved, isDirty, commit;

  if (list) {
    const item = c.get('lists', list).find((it) => it.id === id);
    const fd = item && fieldsOf(list, item).find((x) => x.f === f);
    rich = fd?.kind === 'rich';
    value = item?.[f] ?? '';
    def = defList(list).find((it) => it.id === id)?.[f] ?? '';
    saved = c.getSaved('lists', list).find((it) => it.id === id)?.[f] ?? value;
    isDirty = value !== saved;
    commit = (html) => c.set('lists', list, (cur) => cur.map((it) => (it.id === id ? { ...it, [f]: html } : it)));
  } else {
    rich = FIELDS[k]?.kind === 'rich';
    def = defText(k);
    value = c.get('text', k);
    saved = c.getSaved('text', k);
    isDirty = has(c.draft.text, k);
    commit = (html) => c.set('text', k, html);
  }

  const inner = { __html: value };
  if (!c.editing) return <Tag {...rest} className={className} dangerouslySetInnerHTML={inner} />;

  const cls = [className, 'tm-ed', isDirty ? 'tm-ed-dirty' : ''].filter(Boolean).join(' ');
  return (
    <Tag
      {...rest}
      className={cls}
      data-saved={saved}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      tabIndex={0}
      dangerouslySetInnerHTML={inner}
      onFocus={(e) => c.setFocused({ def, commit }, e.currentTarget)}
      onBlur={(e) => {
        const el = e.currentTarget;
        const clean = cleanHtml(el.innerHTML, rich);
        if (el.innerHTML !== clean) el.innerHTML = clean;
        if (clean !== value) commit(clean);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.currentTarget.innerHTML = value;
          e.currentTarget.blur();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (rich) document.execCommand('insertLineBreak');
          else e.currentTarget.blur();
        } else if (!rich && (e.metaKey || e.ctrlKey) && ['b', 'i', 'u'].includes(e.key.toLowerCase())) {
          e.preventDefault();
        }
      }}
      onPaste={(e) => {
        e.preventDefault();
        const txt = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, rich ? txt : txt.replace(/\s+/g, ' '));
      }}
      onDrop={(e) => e.preventDefault()}
    />
  );
}

// Floating bar shown on the public pages while logged in (inline editing).
export function AdminBar() {
  const c = useContent();
  // The full-viewport sections leave no free strip for the bar, so it can be
  // tucked away into a small pill while reading/editing the copy under it.
  const [mini, setMini] = useState(() => window.matchMedia('(max-width: 720px)').matches);
  if (!c.editing) return null;
  const { dirty, saving, status, focused } = c;
  // Keep the caret in the field while a toolbar button is pressed.
  const keepFocus = (e) => e.preventDefault();
  const go = (hash) => () => {
    window.location.hash = hash;
    if (!hash) window.scrollTo(0, 0);
  };
  if (mini) {
    return (
      <button type="button" className="tm-bar tm-bar-mini" onMouseDown={keepFocus} onClick={() => setMini(false)} aria-label="Show the editor bar">
        <span className="tm-bar-badge">{c.demo ? 'Demo' : 'Edit mode'}</span>
        {dirty > 0 && <span className="tm-bar-count">{dirty} unsaved</span>}
        <span aria-hidden="true">▴</span>
      </button>
    );
  }
  return (
    <div className="tm-bar" role="region" aria-label="Site editor">
      <div className="tm-bar-row">
        <span className="tm-bar-badge">{c.demo ? 'Demo' : 'Edit mode'}</span>
        <span className="tm-bar-hint">
          {dirty ? `${dirty} unsaved change${dirty === 1 ? '' : 's'}` : 'Click any text to edit it'}
        </span>
        <span className="tm-bar-pages">
          <button type="button" onClick={go('')}>Home</button>
          <button type="button" onClick={go('#/projects')}>Work{c.get('flags', 'page.work') ? '' : ' (hidden)'}</button>
          <button type="button" onClick={go('#/history')}>History{c.get('flags', 'page.history') ? '' : ' (hidden)'}</button>
        </span>
        <span className="tm-bar-actions">
          <button type="button" onMouseDown={keepFocus} onClick={c.resetFocused} disabled={!focused} title="Put the original text back in the selected field">↺ Original</button>
          <button type="button" onClick={c.discard} disabled={!dirty || saving}>Discard</button>
          <button type="button" className="tm-bar-save" onClick={c.save} disabled={!dirty || saving}>{saving ? 'Saving…' : 'Save'}</button>
          <button type="button" onClick={go('#/admin')} title="Images, videos, lists, pages and users">Dashboard</button>
          <button type="button" className="tm-bar-min" onMouseDown={keepFocus} onClick={() => setMini(true)} aria-label="Minimise the editor bar" title="Minimise">▾</button>
        </span>
      </div>
      {status && <div className={'tm-bar-status is-' + status.kind} role="status">{status.msg}</div>}
    </div>
  );
}
