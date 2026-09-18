// ---- Demo backend --------------------------------------------------------------
// On a host without PHP (GitHub Pages, `npm run dev`) the admin still has to be
// seen and tried. This stands in for public/api/: same endpoints, same JSON
// shapes, same rules — but everything lives in this browser's localStorage, so
// "saving" never reaches other visitors. The real site never uses it: it only
// kicks in when api/*.php comes back as a plain file instead of JSON.

const LS = { users: 'tm-demo-users', session: 'tm-demo-session', content: 'tm-demo-content', media: 'tm-demo-media' };
export const DEMO_LOGIN = { username: 'demo', password: 'demo' };
const MAX_UPLOAD = 2 * 1048576;
const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/;

const read = (key, fallback) => {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
};
const write = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
};

const seedUsers = () => [{ id: 'u-demo', username: DEMO_LOGIN.username, name: 'Demo admin', role: 'admin', password: DEMO_LOGIN.password, created: 0, lastLogin: null }];
const users = () => { const u = read(LS.users, null); return Array.isArray(u) && u.length ? u : seedUsers(); };
const pub = (u) => ({ id: u.id, username: u.username, name: u.name || u.username, role: u.role === 'admin' ? 'admin' : 'editor', created: u.created || 0, lastLogin: u.lastLogin ?? null });
const me = () => { const s = read(LS.session, null); return s ? users().find((u) => u.id === s.uid) || null : null; };
const ok = (data) => ({ status: 200, ok: true, data });
const fail = (status, error) => ({ status, ok: false, data: { error } });
const session = (u) => ({ configured: true, authed: !!u, csrf: u ? 'demo' : null, user: u ? pub(u) : null, maxUpload: u ? MAX_UPLOAD : 0, demo: true });
const cleanName = (name, fallback) => (String(name || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 60) || fallback);
const pwProblem = (p) => (typeof p !== 'string' || p.length < 10 ? 'Use at least 10 characters for the password.' : '');

export const demoContent = () => read(LS.content, null);
export const isDemoMedia = (v) => typeof v === 'string' && v.startsWith('data/uploads/demo-');
export const resolveDemoMedia = (v) => (isDemoMedia(v) ? read(LS.media, {})[v] || v : v);

export function demoApi(path, { method = 'GET', body } = {}) {
  const user = me();
  const need = () => (user ? null : fail(401, 'Not logged in.'));
  switch (path) {
    case 'session.php':
      return ok(session(user));
    case 'login.php': {
      const u = users().find((x) => x.username === String(body?.username || '').trim().toLowerCase());
      if (!u || u.password !== body?.password) return fail(401, 'Wrong username or password.');
      write(LS.users, users().map((x) => (x.id === u.id ? { ...x, lastLogin: Math.floor(Date.now() / 1000) } : x)));
      write(LS.session, { uid: u.id });
      return ok({ ...session({ ...u, lastLogin: Math.floor(Date.now() / 1000) }), authed: true });
    }
    case 'logout.php':
      localStorage.removeItem(LS.session);
      return ok({ ok: true });
    case 'save.php': {
      if (need()) return need();
      if (!body?.doc || typeof body.doc !== 'object') return fail(400, 'Missing content.');
      if (!write(LS.content, body.doc)) return fail(500, 'Demo storage is full — remove some uploaded pictures.');
      return ok({ ok: true, doc: body.doc });
    }
    case 'users.php': {
      if (need()) return need();
      if (user.role !== 'admin') return fail(403, 'Only an administrator can do that.');
      let list = users();
      if (method === 'GET') return ok({ users: list.map(pub) });
      const role = body?.role === 'admin' ? 'admin' : 'editor';
      if (body?.action === 'create') {
        const username = String(body.username || '').trim().toLowerCase();
        if (!USERNAME_RE.test(username)) return fail(400, 'Usernames are 3–32 characters: lowercase letters, numbers, dot, dash or underscore.');
        if (list.some((u) => u.username === username)) return fail(400, 'That username is already taken.');
        if (list.length >= 50) return fail(400, 'User limit reached.');
        const problem = pwProblem(body.password); if (problem) return fail(400, problem);
        list = [...list, { id: 'u-' + Math.random().toString(36).slice(2, 10), username, name: cleanName(body.name, username), role, password: body.password, created: Math.floor(Date.now() / 1000), lastLogin: null }];
      } else {
        const i = list.findIndex((u) => u.id === body?.id);
        if (i < 0) return fail(400, 'That user no longer exists.');
        const self = list[i].id === user.id;
        if (body.action === 'update') {
          if (self && role !== 'admin') return fail(400, 'You can’t remove your own administrator role.');
          list = list.map((u, j) => (j === i ? { ...u, name: cleanName(body.name, u.username), role } : u));
        } else if (body.action === 'password') {
          const problem = pwProblem(body.password); if (problem) return fail(400, problem);
          list = list.map((u, j) => (j === i ? { ...u, password: body.password } : u));
        } else if (body.action === 'delete') {
          if (self) return fail(400, 'You can’t delete your own account.');
          list = list.filter((_, j) => j !== i);
        } else return fail(400, 'Unknown action.');
      }
      write(LS.users, list);
      return ok({ ok: true, users: list.map(pub) });
    }
    case 'account.php': {
      if (need()) return need();
      let list = users();
      if (body?.action === 'password') {
        if (user.password !== body.current) return fail(400, 'Your current password is not correct.');
        const problem = pwProblem(body.password); if (problem) return fail(400, problem);
        list = list.map((u) => (u.id === user.id ? { ...u, password: body.password } : u));
      } else if (body?.action === 'profile') {
        list = list.map((u) => (u.id === user.id ? { ...u, name: cleanName(body.name, u.username) } : u));
      } else return fail(400, 'Unknown action.');
      write(LS.users, list);
      return ok({ ok: true, user: pub(list.find((u) => u.id === user.id)) });
    }
    default:
      return fail(404, 'Unknown endpoint.');
  }
}

// Pictures only, kept small: they are stored as data URLs in localStorage.
export function demoUpload(file) {
  return new Promise((resolve, reject) => {
    if (!me()) { reject(new Error('Not logged in.')); return; }
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) { reject(new Error('Demo mode: only JPG, PNG, WebP or GIF pictures can be uploaded here (videos need the real hosting).')); return; }
    if (file.size > MAX_UPLOAD) { reject(new Error('Demo mode: pictures up to 2 MB.')); return; }
    const fr = new FileReader();
    fr.onerror = () => reject(new Error('Could not read that file.'));
    fr.onload = () => {
      const ext = file.type === 'image/jpeg' ? 'jpg' : file.type.slice(6);
      const path = 'data/uploads/demo-' + Math.random().toString(36).slice(2, 12) + '.' + ext;
      const map = read(LS.media, {});
      map[path] = fr.result;
      if (!write(LS.media, map)) { reject(new Error('Demo storage is full — remove some uploaded pictures first.')); return; }
      resolve({ ok: true, path, thumb: path });
    };
    fr.readAsDataURL(file);
  });
}
