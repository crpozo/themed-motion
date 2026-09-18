import { createContext, useContext } from 'react';
import { FIELDS, LISTS, isMediaPath } from './schema.js';
import { demoApi } from './demo.js';

// ---- Editable site content · core ---------------------------------------------
// Helpers, defaults, the context and the reading hooks. The components
// (provider, <T>, the inline bar) live in content.jsx.
//
// The site renders the defaults from schema.js. A logged-in user can override
// them — inline on the page, or from the dashboard at `#/admin` — and the small
// PHP API in `public/api/` stores the overrides on the hosting in
// `data/content.json`:
//
//   { v: 2, text: {key: html}, media: {key: path}, flags: {key: bool}, lists: {key: [items]} }
//
// That file is created on the server and is never part of the build, so
// uploading a new build never wipes the client's edits. On a static host (no
// PHP) the site simply shows the defaults.

export const API = 'api/';
export const CONTENT_URL = 'data/content.json';
const ADMIN_FLAG = 'tm-admin';
const KEY_RE = /^[a-z0-9._-]{1,80}$/i;
const ID_RE = /^[a-z0-9-]{1,40}$/;
export const PARTS = ['text', 'media', 'flags', 'lists'];
const NBSP = new RegExp(String.fromCharCode(160), 'g');
export const emptyDoc = () => ({ text: {}, media: {}, flags: {}, lists: {} });
export const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
export const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Whitelist sanitizer. Keeps text; in `rich` fields also <b>, <em> and <br>.
// Every other element is unwrapped and every attribute dropped, so whatever
// ends up in innerHTML is inert. Runs on defaults, on loaded overrides and on
// everything typed in edit mode (the PHP side applies the same whitelist).
const INLINE = { b: 'b', strong: 'b', em: 'em', i: 'em' };
export function cleanHtml(html, rich) {
  const tpl = document.createElement('template');
  tpl.innerHTML = String(html ?? '');
  const out = [];
  const walk = (node) => {
    node.childNodes.forEach((n) => {
      if (n.nodeType === 3) {
        out.push(escapeHtml(n.nodeValue.replace(NBSP, ' ')));
        return;
      }
      if (n.nodeType !== 1) return;
      const tag = n.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style') return;
      if (tag === 'br') { out.push(rich ? '<br>' : ' '); return; }
      // Browsers wrap new lines in <div>/<p> when Enter is pressed.
      if ((tag === 'div' || tag === 'p') && out.length) out.push(rich ? '<br>' : ' ');
      const keep = rich ? INLINE[tag] : null;
      if (keep) out.push(`<${keep}>`);
      walk(n);
      if (keep) out.push(`</${keep}>`);
    });
  };
  walk(tpl.content);
  return out
    .join('')
    .replace(/[ \t\r\n]+/g, ' ')
    .replace(/ ?<br> ?/g, '<br>')
    .replace(/(<br>)+$/, '')
    .replace(/<(b|em)><\/\1>/g, '')
    .trim();
}

// Sanitized copy → plain string, for attributes (alt, aria-label, href, title).
export function plainText(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = String(html ?? '').replace(/<br>/g, ' ');
  return tpl.content.textContent;
}

// ---- defaults (from the schema, sanitized once) -------------------------------
const defTextCache = new Map();
export function defText(k) {
  if (!defTextCache.has(k)) {
    const f = FIELDS[k];
    if (!f && import.meta.env.DEV) console.warn(`[content] "${k}" is not in schema.js`);
    const rich = f?.kind === 'rich';
    defTextCache.set(k, f ? cleanHtml(rich ? f.def : escapeHtml(f.def), rich) : '');
  }
  return defTextCache.get(k);
}

const typeOf = (listKey, item) => {
  const types = LISTS[listKey].types;
  return types[item?.type] ? item.type : Object.keys(types)[0];
};
export const fieldsOf = (listKey, item) => LISTS[listKey].types[typeOf(listKey, item)].fields;

// Rebuilds a list from untrusted data, keeping only what the schema describes.
function normalizeList(listKey, arr) {
  if (!LISTS[listKey] || !Array.isArray(arr)) return null;
  const multi = Object.keys(LISTS[listKey].types).length > 1;
  const seen = new Set();
  const out = [];
  for (const raw of arr.slice(0, 300)) {
    if (!raw || typeof raw !== 'object' || !ID_RE.test(raw.id) || seen.has(raw.id)) continue;
    seen.add(raw.id);
    const item = { id: raw.id };
    if (multi) item.type = typeOf(listKey, raw);
    for (const fd of fieldsOf(listKey, raw)) {
      const v = raw[fd.f];
      if (fd.kind === 'flag') { if (v === true) item[fd.f] = true; }
      else if (fd.kind === 'image' || fd.kind === 'video') {
        item[fd.f] = isMediaPath(v) ? v : '';
        if (fd.thumbTo) item[fd.thumbTo] = isMediaPath(raw[fd.thumbTo]) ? raw[fd.thumbTo] : item[fd.f];
      } else item[fd.f] = cleanHtml(typeof v === 'string' ? v : '', fd.kind === 'rich');
    }
    out.push(item);
  }
  return out;
}

const defListCache = new Map();
export function defList(k) {
  if (!defListCache.has(k)) defListCache.set(k, normalizeList(k, LISTS[k]?.def || []) || []);
  return defListCache.get(k);
}

export const DEFAULTS = {
  text: defText,
  media: (k) => FIELDS[k]?.def ?? '',
  flags: (k) => !!FIELDS[k]?.def,
  lists: defList,
};

// Untrusted JSON (the saved file, or the API's echo of it) → a clean doc.
export function normalizeDoc(json) {
  const doc = emptyDoc();
  if (!json || typeof json !== 'object' || Array.isArray(json)) return doc;
  const src = json.v === 2 ? json : { text: json }; // v1 was a flat text map
  for (const [k, v] of Object.entries(src.text || {})) {
    if (!KEY_RE.test(k) || !FIELDS[k] || typeof v !== 'string') continue;
    if (FIELDS[k].kind === 'choice') { if (FIELDS[k].options.some((o) => o.v === v)) doc.text[k] = v; }
    else doc.text[k] = cleanHtml(v, FIELDS[k].kind === 'rich');
  }
  for (const [k, v] of Object.entries(src.media || {})) {
    if (['image', 'video'].includes(FIELDS[k]?.kind) && isMediaPath(v)) doc.media[k] = v;
  }
  for (const [k, v] of Object.entries(src.flags || {})) {
    if (FIELDS[k]?.kind === 'flag' && typeof v === 'boolean') doc.flags[k] = v;
  }
  for (const [k, v] of Object.entries(src.lists || {})) {
    const list = normalizeList(k, v);
    if (list) doc.lists[k] = list;
  }
  return doc;
}

export const ContentCtx = createContext(null);
export const useContent = () => useContext(ContentCtx);

// Once a host proves it has no PHP (the first call comes back as a plain file),
// every later call goes straight to the demo backend — static servers answer
// POST with 405/501, which must not read as "wrong password".
let demoMode = false;
export async function api(path, { method = 'GET', body, csrf } = {}) {
  if (demoMode) return demoApi(path, { method, body });
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (csrf) headers['X-CSRF-Token'] = csrf;
  const res = await fetch(API + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
    cache: 'no-store',
  });
  // On a static host (GitHub Pages, vite dev) the .php file comes back as a
  // plain file (200, not JSON) or is missing (404): hand over to the in-browser
  // demo backend. A real PHP error (5xx HTML page) is NOT treated as demo.
  const data = await res.json().catch(() => null);
  if (data === null && (res.ok || [404, 405, 501].includes(res.status))) {
    demoMode = true;
    return demoApi(path, { method, body });
  }
  return { status: res.status, ok: res.ok && data !== null, data };
}

export const flag = {
  get: () => { try { return localStorage.getItem(ADMIN_FLAG) === '1'; } catch { return false; } },
  set: (on) => { try { on ? localStorage.setItem(ADMIN_FLAG, '1') : localStorage.removeItem(ADMIN_FLAG); } catch { /* private mode */ } },
};

// ---- reading hooks for the pages ------------------------------------------------
export const useMedia = (k) => useContent().get('media', k);
export const useFlag = (k) => useContent().get('flags', k);
export const useList = (k) => useContent().get('lists', k);
export const usePlain = (k) => plainText(useContent().get('text', k));
// A pick from a fixed set of options (font names etc.) — never anything else.
export function useChoice(k) {
  const v = useContent().get('text', k);
  return FIELDS[k].options.some((o) => o.v === v) ? v : FIELDS[k].def;
}
// A link the admin can change — only ever http(s), or it falls back to the default.
export function useLink(k) {
  const v = usePlain(k).trim();
  return /^https?:\/\/[^\s"'<>]+$/i.test(v) ? v : FIELDS[k].def;
}
