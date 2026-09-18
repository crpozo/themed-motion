import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { T } from '../content.jsx';
import { useContent, fieldsOf, plainText } from '../content-core.js';
import { GROUPS, LISTS } from '../schema.js';
import './admin.css';

// ---- `#/admin` ---------------------------------------------------------------
// Login, then the dashboard: every piece of content grouped by page and section
// (copy, pictures, videos, lists, page switches), the users, and the account.
// Loaded as its own chunk, so visitors never download any of this.

export default function AdminApp() {
  const c = useContent();
  return c.editing ? <Dashboard /> : <Login />;
}

// ---- login ---------------------------------------------------------------------
function Login() {
  const c = useContent();
  const [state, setState] = useState('checking'); // checking | unavailable | setup | form
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const user = useRef(null);
  const pw = useRef(null);

  useEffect(() => {
    let alive = true;
    c.call('session.php').then(({ ok, data }) => {
      if (!alive) return;
      if (!ok) setState('unavailable');
      else if (!data.configured) setState('setup');
      else setState('form');
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const r = await c.login(user.current.value, pw.current.value);
    if (r.ok) return; // the provider flips to the dashboard
    setBusy(false);
    pw.current.value = '';
    setError(r.code === 429 ? 'Too many attempts. Wait 15 minutes and try again.' : r.error || 'Wrong username or password.');
  };

  return (
    <main className="adm-login">
      <div className="adm-login-card">
        <img className="adm-login-logo" src="assets/themedmotion-logo.png" alt="ThemedMotion" />
        <h1>Site admin</h1>
        {state === 'checking' && <p className="adm-note">Checking…</p>}
        {state === 'unavailable' && (
          <p className="adm-note">The admin isn’t available on this server — it needs the PHP hosting the live site runs on.</p>
        )}
        {state === 'setup' && (
          <p className="adm-note">No administrator yet. <a href="api/setup.php">Create the first one here</a>, then come back to log in.</p>
        )}
        {state === 'form' && (
          <form onSubmit={submit}>
            <label htmlFor="adm-user">Username</label>
            <input id="adm-user" ref={user} type="text" autoComplete="username" autoCapitalize="none" autoFocus required />
            <label htmlFor="adm-pw">Password</label>
            <input id="adm-pw" ref={pw} type="password" autoComplete="current-password" required />
            {error && <div className="adm-error" role="alert">{error}</div>}
            <button type="submit" className="adm-btn adm-btn-primary" disabled={busy}>{busy ? 'Checking…' : 'Log in'}</button>
          </form>
        )}
        <a className="adm-login-back" href="#">← Back to the site</a>
      </div>
    </main>
  );
}

// ---- dashboard shell -------------------------------------------------------------
function Dashboard() {
  const c = useContent();
  const isAdmin = c.user?.role === 'admin';
  const [tab, setTab] = useState('content');
  const tabs = [['content', 'Content'], ...(isAdmin ? [['users', 'Users']] : []), ['account', 'My account']];

  const leave = (fn) => () => {
    if (!c.dirty || window.confirm('You have unsaved changes. Leave without saving?')) fn();
  };

  return (
    <div className="adm">
      {c.demo && <div className="adm-demo-bar">Demo mode — changes are saved only in this browser, not on the real website.</div>}
      <header className="adm-top">
        <img className="adm-top-logo" src="assets/themedmotion-logo.png" alt="ThemedMotion" />
        <nav className="adm-tabs" aria-label="Admin sections">
          {tabs.map(([id, label]) => (
            <button key={id} type="button" className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>{label}</button>
          ))}
        </nav>
        <div className="adm-top-right">
          <a className="adm-btn" href="#" title="Open the site — you can also edit texts directly on the page">Edit on the page ↗</a>
          <span className="adm-who">{c.user?.name}<small>{isAdmin ? 'Administrator' : 'Editor'}</small></span>
          <button type="button" className="adm-btn" onClick={leave(c.logout)}>Log out</button>
        </div>
      </header>

      {tab === 'content' && <ContentTab />}
      {tab === 'users' && isAdmin && <UsersTab />}
      {tab === 'account' && <AccountTab />}

      {(c.dirty > 0 || c.status) && (
        <div className={'adm-save' + (c.status ? ' is-' + c.status.kind : '')} role="status">
          <span>{c.status ? c.status.msg : `${c.dirty} unsaved change${c.dirty === 1 ? '' : 's'}`}</span>
          {c.dirty > 0 && (
            <span className="adm-save-actions">
              <button type="button" className="adm-btn adm-btn-ghost" onClick={c.discard} disabled={c.saving}>Discard</button>
              <button type="button" className="adm-btn adm-btn-primary" onClick={c.save} disabled={c.saving}>{c.saving ? 'Saving…' : c.demo ? 'Save (demo)' : 'Save & publish'}</button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ---- content ---------------------------------------------------------------------
const PAGES = [...new Set(GROUPS.map((g) => g.page))];

function ContentTab() {
  const c = useContent();
  const [groupId, setGroupId] = useState(GROUPS[0].id);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  // Search runs over labels and the current text of every field.
  const results = useMemo(() => {
    if (!q) return null;
    return GROUPS.map((g) => ({
      ...g,
      fields: g.fields.filter((f) => {
        if (f.label.toLowerCase().includes(q) || g.title.toLowerCase().includes(q)) return true;
        if (f.kind === 'text' || f.kind === 'rich') return plainText(c.get('text', f.k)).toLowerCase().includes(q);
        if (f.kind === 'list') return c.get('lists', f.k).some((it) => Object.values(it).some((v) => typeof v === 'string' && plainText(v).toLowerCase().includes(q)));
        return false;
      }),
    })).filter((g) => g.fields.length);
  }, [q, c]);

  const group = GROUPS.find((g) => g.id === groupId);
  const dirtyIn = (g) => g.fields.filter((f) => isDirty(c, f)).length;

  return (
    <div className="adm-body">
      <aside className="adm-side">
        <input
          className="adm-search"
          type="search"
          placeholder="Search the content…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search the content"
        />
        {PAGES.map((page) => (
          <div key={page} className="adm-side-group">
            <div className="adm-side-title">{page}</div>
            {GROUPS.filter((g) => g.page === page).map((g) => (
              <button
                key={g.id}
                type="button"
                className={'adm-side-item' + (!q && g.id === groupId ? ' is-active' : '')}
                onClick={() => { setQuery(''); setGroupId(g.id); window.scrollTo(0, 0); }}
              >
                {g.title}
                {dirtyIn(g) > 0 && <span className="adm-dot" aria-label="unsaved changes" />}
              </button>
            ))}
          </div>
        ))}
      </aside>

      <main className="adm-main">
        {results ? (
          results.length ? results.map((g) => <Group key={g.id} group={g} showPage />) : <p className="adm-note">Nothing matches “{query}”.</p>
        ) : (
          <Group group={group} />
        )}
      </main>
    </div>
  );
}

const PART = { text: 'text', rich: 'text', image: 'media', video: 'media', flag: 'flags', list: 'lists' };
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const isDirty = (c, f) => has(c.draft[PART[f.kind]], f.k);
const isEdited = (c, f) => {
  const part = PART[f.kind];
  if (has(c.draft[part], f.k)) return c.draft[part][f.k] !== null;
  return has(c.doc[part], f.k);
};

function Group({ group, showPage }) {
  return (
    <section className="adm-group">
      <h2>{showPage && <small>{group.page} · </small>}{group.title}</h2>
      {group.fields.map((f) => <Field key={f.k} field={f} />)}
    </section>
  );
}

function Field({ field }) {
  const c = useContent();
  const { kind, k, label, help } = field;
  const edited = isEdited(c, field);
  const head = (
    <div className="adm-field-head">
      <span className="adm-label">{label}</span>
      {isDirty(c, field) && <span className="adm-badge">unsaved</span>}
      {edited && kind !== 'flag' && (
        <button type="button" className="adm-link" onClick={() => {
          if (kind !== 'list' || window.confirm('Put the original list back? Your changes to it will be removed.')) c.reset(PART[kind], k);
        }}>↺ Original</button>
      )}
    </div>
  );

  if (kind === 'flag') {
    const on = c.get('flags', k);
    return (
      <label className="adm-field adm-switch">
        <input type="checkbox" checked={on} onChange={(e) => c.set('flags', k, e.target.checked)} />
        <span className="adm-switch-ui" aria-hidden="true" />
        <span>
          <span className="adm-label">{label}</span>
          {isDirty(c, field) && <span className="adm-badge">unsaved</span>}
          {help && <small className="adm-help">{help}</small>}
        </span>
      </label>
    );
  }
  if (kind === 'list') return <div className="adm-field">{head}<ListField k={k} /></div>;
  if (kind === 'image' || kind === 'video') {
    return (
      <div className="adm-field">
        {head}
        <MediaPicker kind={kind} value={c.get('media', k)} onChange={(r) => c.set('media', k, r.path)} />
      </div>
    );
  }
  return (
    <div className="adm-field">
      {head}
      <T k={k} as="div" className={'adm-input' + (kind === 'rich' ? ' adm-rich' : '')} role="textbox" aria-label={label} aria-multiline={kind === 'rich'} />
      {kind === 'rich' && <small className="adm-help">Enter = new line · Ctrl/Cmd + B = bold</small>}
    </div>
  );
}

// ---- media -------------------------------------------------------------------------
const ACCEPT = { image: 'image/jpeg,image/png,image/webp,image/gif', video: 'video/mp4,video/webm' };
const mb = (bytes) => Math.round(bytes / 1048576);

function MediaPicker({ kind, value, onChange, thumb = false, compact = false }) {
  const c = useContent();
  const input = useRef(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    if (c.maxUpload && file.size > c.maxUpload) {
      setError(`That file is ${mb(file.size)} MB — this hosting accepts up to ${mb(c.maxUpload)} MB per file.`);
      return;
    }
    setProgress(0);
    try {
      onChange(await c.upload(file, { thumb, onProgress: setProgress }));
    } catch (err) {
      setError(err.message);
    }
    setProgress(null);
  };

  return (
    <div className={'adm-media' + (compact ? ' is-compact' : '')}>
      <div className="adm-media-preview">
        {!value ? <span className="adm-media-empty">No file</span>
          : kind === 'video' ? <video key={value} src={value} muted controls preload="metadata" />
          : <img src={value} alt="" />}
      </div>
      <div className="adm-media-side">
        <input ref={input} type="file" accept={ACCEPT[kind]} onChange={pick} hidden />
        <button type="button" className="adm-btn" onClick={() => input.current.click()} disabled={progress !== null}>
          {progress !== null ? `Uploading… ${Math.round(progress * 100)}%` : value ? `Replace ${kind}…` : `Choose ${kind}…`}
        </button>
        {progress !== null && <progress value={progress} max="1" />}
        <small className="adm-help">
          {kind === 'video' ? 'MP4 or WebM' : 'JPG, PNG, WebP or GIF'}{c.maxUpload ? ` · up to ${mb(Math.min(c.maxUpload, kind === 'video' ? 96 * 1048576 : 12 * 1048576))} MB` : ''}
        </small>
        {error && <div className="adm-error" role="alert">{error}</div>}
      </div>
    </div>
  );
}

// ---- lists --------------------------------------------------------------------------
const newId = () => 'n-' + Math.random().toString(36).slice(2, 10);

function ListField({ k }) {
  const c = useContent();
  const spec = LISTS[k];
  const items = c.get('lists', k);
  const types = Object.entries(spec.types);
  const [open, setOpen] = useState(null);
  const update = useCallback((fn) => c.set('lists', k, fn), [c, k]);

  const move = (i, d) => update((cur) => {
    const next = [...cur];
    const j = i + d;
    if (j < 0 || j >= next.length) return cur;
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const remove = (id) => update((cur) => cur.filter((it) => it.id !== id));
  const patch = (id, changes) => update((cur) => cur.map((it) => (it.id === id ? { ...it, ...changes } : it)));
  const add = (type) => {
    const item = { id: newId() };
    if (types.length > 1) item.type = type;
    for (const fd of spec.types[type].fields) if (fd.kind !== 'flag') item[fd.f] = '';
    update((cur) => [...cur, item]);
    setOpen(item.id);
  };

  if (spec.gallery) return <Gallery k={k} items={items} update={update} move={move} remove={remove} />;

  return (
    <div className="adm-list">
      {items.map((it, i) => {
        const isOpen = open === it.id;
        const fields = fieldsOf(k, it);
        const typeLabel = types.length > 1 ? spec.types[it.type]?.label : null;
        return (
          <div key={it.id} className={'adm-item' + (isOpen ? ' is-open' : '')}>
            <div className="adm-item-head">
              <button type="button" className="adm-item-title" onClick={() => setOpen(isOpen ? null : it.id)} aria-expanded={isOpen} disabled={!fields.length}>
                <span className="adm-item-n">{String(i + 1).padStart(2, '0')}</span>
                {typeLabel && <span className="adm-item-type">{typeLabel}</span>}
                <span className="adm-item-text">{plainText(spec.title(it))}</span>
              </button>
              <span className="adm-item-actions">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" title="Move up">↑</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down" title="Move down">↓</button>
                <button type="button" onClick={() => { if (window.confirm(`Remove this ${spec.noun}?`)) remove(it.id); }} aria-label="Remove" title="Remove">✕</button>
              </span>
            </div>
            {isOpen && (
              <div className="adm-item-body">
                {fields.map((fd) => (
                  <div className="adm-subfield" key={fd.f}>
                    {fd.kind === 'flag' ? (
                      <label className="adm-check">
                        <input type="checkbox" checked={it[fd.f] === true} onChange={(e) => patch(it.id, { [fd.f]: e.target.checked || undefined })} />
                        {fd.label}
                      </label>
                    ) : (
                      <>
                        <span className="adm-label">{fd.label}</span>
                        {fd.kind === 'image' || fd.kind === 'video' ? (
                          <MediaPicker kind={fd.kind} value={it[fd.f]} compact onChange={(r) => patch(it.id, { [fd.f]: r.path })} />
                        ) : (
                          <T list={k} id={it.id} f={fd.f} as="div" className={'adm-input' + (fd.kind === 'rich' ? ' adm-rich' : '')} role="textbox" aria-label={fd.label} />
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <div className="adm-list-add">
        {types.map(([type, t]) => (
          <button key={type} type="button" className="adm-btn" onClick={() => add(type)}>+ {types.length > 1 ? t.label : `Add ${spec.noun}`}</button>
        ))}
      </div>
    </div>
  );
}

// Photo grid: upload many at once, reorder, remove.
function Gallery({ k, items, update, move, remove }) {
  const c = useContent();
  const input = useRef(null);
  const [busy, setBusy] = useState(null); // "3 / 12"
  const [error, setError] = useState('');
  const fd = fieldsOf(k, null)[0];

  const pick = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    setError('');
    let done = 0;
    for (const file of files) {
      setBusy(`${++done} / ${files.length}`);
      try {
        const r = await c.upload(file, { thumb: true });
        update((cur) => [...cur, { id: newId(), [fd.f]: r.path, [fd.thumbTo]: r.thumb || r.path }]);
      } catch (err) {
        setError(`${file.name}: ${err.message}`);
      }
    }
    setBusy(null);
  };

  return (
    <div className="adm-gallery">
      <div className="adm-gallery-grid">
        {items.map((it, i) => (
          <figure key={it.id} className="adm-photo">
            <img src={it[fd.thumbTo] || it[fd.f]} alt="" loading="lazy" />
            <figcaption>
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move earlier" title="Move earlier">←</button>
              <span>{i + 1}</span>
              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move later" title="Move later">→</button>
              <button type="button" onClick={() => remove(it.id)} aria-label="Remove photo" title="Remove">✕</button>
            </figcaption>
          </figure>
        ))}
      </div>
      <input ref={input} type="file" accept={ACCEPT.image} multiple onChange={pick} hidden />
      <button type="button" className="adm-btn" onClick={() => input.current.click()} disabled={busy !== null}>
        {busy ? `Uploading ${busy}…` : '+ Add photos'}
      </button>
      {error && <div className="adm-error" role="alert">{error}</div>}
    </div>
  );
}

// ---- users ---------------------------------------------------------------------------
const fmtDate = (ts) => (ts ? new Date(ts * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—');

function UsersTab() {
  const c = useContent();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(null); // { mode: 'new' | 'edit' | 'password', user }

  useEffect(() => {
    c.call('users.php').then(({ ok, data }) => (ok ? setUsers(data.users) : setError(data?.error || 'Could not load the users.')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async (body, done) => {
    setError('');
    setNote('');
    const { ok, data } = await c.call('users.php', body);
    if (!ok) { setError(data?.error || 'Something went wrong.'); return false; }
    setUsers(data.users);
    setEditing(null);
    setNote(done);
    return true;
  };

  return (
    <main className="adm-main adm-narrow">
      <section className="adm-group">
        <h2>Users</h2>
        <p className="adm-note">
          <b>Administrators</b> edit the content and manage users. <b>Editors</b> only edit the content.
        </p>
        {error && <div className="adm-error" role="alert">{error}</div>}
        {note && <div className="adm-ok" role="status">{note}</div>}

        {users === null ? <p className="adm-note">Loading…</p> : (
          <table className="adm-table">
            <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Last login</th><th /></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}{u.id === c.user.id && <span className="adm-badge adm-badge-you">you</span>}</td>
                  <td>{u.username}</td>
                  <td>{u.role === 'admin' ? 'Administrator' : 'Editor'}</td>
                  <td>{fmtDate(u.lastLogin)}</td>
                  <td className="adm-table-actions">
                    <button type="button" className="adm-link" onClick={() => setEditing({ mode: 'edit', user: u })}>Edit</button>
                    <button type="button" className="adm-link" onClick={() => setEditing({ mode: 'password', user: u })}>Set password</button>
                    {u.id !== c.user.id && (
                      <button type="button" className="adm-link adm-link-danger" onClick={() => {
                        if (window.confirm(`Delete ${u.name}? They will no longer be able to log in.`)) run({ action: 'delete', id: u.id }, `${u.name} was deleted.`);
                      }}>Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!editing && <button type="button" className="adm-btn adm-btn-primary" onClick={() => { setNote(''); setEditing({ mode: 'new' }); }}>+ Add user</button>}
        {editing && <UserForm key={editing.mode + (editing.user?.id || '')} {...editing} selfId={c.user.id} onCancel={() => setEditing(null)} onSubmit={run} />}
      </section>
    </main>
  );
}

function UserForm({ mode, user, selfId, onCancel, onSubmit }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (n) => String(f.get(n) ?? '');
    setError('');
    if (mode !== 'edit' && v('password') !== v('confirm')) { setError('The two passwords do not match.'); return; }
    setBusy(true);
    if (mode === 'new') await onSubmit({ action: 'create', username: v('username'), name: v('name'), role: v('role'), password: v('password') }, `${v('name') || v('username')} can now log in.`);
    else if (mode === 'edit') await onSubmit({ action: 'update', id: user.id, name: v('name'), role: v('role') }, 'User updated.');
    else await onSubmit({ action: 'password', id: user.id, password: v('password') }, `New password set for ${user.name}.`);
    setBusy(false);
  };
  const title = mode === 'new' ? 'New user' : mode === 'edit' ? `Edit ${user.name}` : `New password for ${user.name}`;
  return (
    <form className="adm-form" onSubmit={submit} autoComplete="off">
      <h3>{title}</h3>
      {mode === 'new' && (
        <label>Username
          <input name="username" type="text" required minLength={3} maxLength={32} pattern="[a-z0-9][a-z0-9._\-]{2,31}" autoCapitalize="none" autoComplete="off" />
          <small className="adm-help">3–32 characters: lowercase letters, numbers, dot, dash or underscore.</small>
        </label>
      )}
      {mode !== 'password' && (
        <>
          <label>Name
            <input name="name" type="text" maxLength={60} defaultValue={user?.name || ''} autoComplete="off" />
          </label>
          <label>Role
            <select name="role" defaultValue={user?.role || 'editor'} disabled={user?.id === selfId}>
              <option value="editor">Editor — content only</option>
              <option value="admin">Administrator — content and users</option>
            </select>
            {user?.id === selfId && <input type="hidden" name="role" value="admin" />}
          </label>
        </>
      )}
      {mode !== 'edit' && (
        <>
          <label>Password
            <input name="password" type="password" required minLength={10} autoComplete="new-password" />
            <small className="adm-help">At least 10 characters. Share it with the person privately; they can change it under “My account”.</small>
          </label>
          <label>Repeat the password
            <input name="confirm" type="password" required minLength={10} autoComplete="new-password" />
          </label>
        </>
      )}
      {error && <div className="adm-error" role="alert">{error}</div>}
      <div className="adm-form-actions">
        <button type="button" className="adm-btn adm-btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="adm-btn adm-btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}

// ---- my account -------------------------------------------------------------------------
function AccountTab() {
  const c = useContent();
  const [msg, setMsg] = useState(null); // { kind, text }
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setMsg(null);
    if (f.get('password') !== f.get('confirm')) { setMsg({ kind: 'error', text: 'The two new passwords do not match.' }); return; }
    setBusy(true);
    const { ok, data } = await c.call('account.php', { action: 'password', current: String(f.get('current')), password: String(f.get('password')) });
    setBusy(false);
    if (ok) { form.reset(); setMsg({ kind: 'ok', text: 'Password changed.' }); }
    else setMsg({ kind: 'error', text: data?.error || 'Could not change the password.' });
  };

  return (
    <main className="adm-main adm-narrow">
      <section className="adm-group">
        <h2>My account</h2>
        <p className="adm-note">Logged in as <b>{c.user.name}</b> ({c.user.username}) · {c.user.role === 'admin' ? 'Administrator' : 'Editor'}</p>
        <form className="adm-form" onSubmit={submit}>
          <h3>Change my password</h3>
          <label>Current password
            <input name="current" type="password" required autoComplete="current-password" />
          </label>
          <label>New password
            <input name="password" type="password" required minLength={10} autoComplete="new-password" />
            <small className="adm-help">At least 10 characters.</small>
          </label>
          <label>Repeat the new password
            <input name="confirm" type="password" required minLength={10} autoComplete="new-password" />
          </label>
          {msg && <div className={msg.kind === 'ok' ? 'adm-ok' : 'adm-error'} role="status">{msg.text}</div>}
          <div className="adm-form-actions">
            <button type="submit" className="adm-btn adm-btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button>
          </div>
        </form>
      </section>
    </main>
  );
}
