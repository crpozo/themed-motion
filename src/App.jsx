import { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { SoftSketch } from './Sketches.jsx';
import { T, AdminBar } from './content.jsx';
import { useContent, useMedia, useFlag, useList, useLink, usePlain, useChoice, plainText } from './content-core.js';
import { SECTIONS, FONTS } from './schema.js';
import ukkieModelSvg from './ukkie-simplified.svg?raw';

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('in');
        });
      },
      { threshold: 0.18, rootMargin: '0px 0px -10% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// Typefaces picked in the admin: load the family from Google Fonts (the default
// pair already ships in index.html) and point the site's font variables at it.
const FONT_VARS = { heading: '--serif', body: '--sans' };
const FONT_BASE = {}; // the stacks from styles.css, read once before any override
function useFonts() {
  const heading = useChoice('font.heading');
  const body = useChoice('font.body');
  useEffect(() => {
    for (const [set, key] of [['heading', heading], ['body', body]]) {
      const f = FONTS[set][key];
      const id = 'tm-font-' + set;
      let link = document.getElementById(id);
      if (f.gf && !link) {
        link = Object.assign(document.createElement('link'), { id, rel: 'stylesheet' });
        document.head.appendChild(link);
      }
      if (link) {
        if (f.gf) link.href = 'https://fonts.googleapis.com/css2?family=' + f.gf + '&display=swap';
        else link.remove();
      }
      // The default keeps the stack from styles.css; a pick replaces its first family.
      if (!FONT_BASE[set]) FONT_BASE[set] = getComputedStyle(document.documentElement).getPropertyValue(FONT_VARS[set]).replace(/^\s*"?[^",]+"?,\s*/, '');
      if (f.gf) document.documentElement.style.setProperty(FONT_VARS[set], f.family + ', ' + FONT_BASE[set]);
      else document.documentElement.style.removeProperty(FONT_VARS[set]);
    }
  }, [heading, body]);
}

// The dashboard (login, content, users) is its own chunk — visitors never load it.
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));

// Content key for a nav label (see <T> in content.jsx). Section labels are
// shared by the mobile menu and the side rail, so they edit as one.
const labelKey = (id) => (id === 'top' ? 'nav.intro' : id === 'contact' ? 'nav.contact' : `sec.${id}.label`);

function useActive(ids) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY + window.innerHeight * 0.35;
      let cur = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= y) cur = id;
      }
      setActive(cur);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [ids.join('|')]);
  return active;
}

// Minimal hash router. Only `#/...` paths (e.g. `#/projects`) switch the view;
// bare fragment anchors like `#concept` keep the home page and let the browser
// scroll natively. Relative `assets/...` URLs keep working because the real
// path is always the site root.
function useHashRoute() {
  const [hash, setHash] = useState(() =>
    typeof window !== 'undefined' ? window.location.hash : '',
  );
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

// True when the viewport is phone-width. Used to frame the 3D models tighter
// on mobile, where each visual fills the whole screen.
function useIsMobile(maxWidth = 760) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [maxWidth]);
  return mobile;
}

// True once the visitor has scrolled past the hero. Used to reveal the process
// tracker only after they've started moving through the page.
function useScrolled(factor = 0.6) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * factor);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [factor]);
  return scrolled;
}

// Scroll a section to the top of the viewport (its content is padded clear of
// the fixed nav). Used by the side-slider clicks.
function scrollToSectionEl(el) {
  if (!el) return;
  window.scrollTo({ top: el.id === 'top' ? 0 : el.offsetTop, behavior: 'smooth' });
}

function Nav({ route }) {
  const { editing } = useContent();
  const ppUrl = useLink('link.pp');
  const logo = useMedia('brand.logo');
  const logoLight = useMedia('brand.logoLight');
  // Hidden pages drop out of the menus (a logged-in editor still sees them).
  const showWork = useFlag('page.work') || editing;
  const showHistory = useFlag('page.history') || editing;
  const onProjects = route === '#/projects';
  const onHome = !route.startsWith('#/');
  const scrolled = useScrolled(0.08);
  const [menuOpen, setMenuOpen] = useState(false);

  // Freeze page scroll while the mobile menu is open.
  useEffect(() => {
    document.documentElement.classList.toggle('menu-open', menuOpen);
    return () => document.documentElement.classList.remove('menu-open');
  }, [menuOpen]);
  // Close the menu whenever the route changes (e.g. Work was tapped).
  useEffect(() => { setMenuOpen(false); }, [route]);

  // Jump to a home section from the menu; from the Work page, go home first.
  const goSection = (id) => (e) => {
    e.preventDefault();
    setMenuOpen(false);
    const go = () => {
      const el = id === 'top' ? document.body : document.getElementById(id);
      if (id === 'top') window.scrollTo(0, 0);
      else if (el) jumpTo(el);
    };
    if (window.location.hash.startsWith('#/')) {
      window.location.hash = '';
      window.setTimeout(go, 60);
    } else go();
  };

  const menuItems = [{ id: 'top', label: 'Intro' }, ...SECTIONS];

  return (
    <>
      <nav className={'nav' + (scrolled ? ' is-scrolled' : '') + (onHome && !scrolled && !menuOpen ? ' is-hero' : '') + (menuOpen ? ' menu-is-open' : '')}>
        <a className="brand" href="#top" aria-label="ThemedMotion home" onClick={goSection('top')}>
          <img className="brand-logo brand-logo-dark" src={logo} alt="ThemedMotion by P&P Projects" />
          <img className="brand-logo brand-logo-light" src={logoLight} alt="" aria-hidden="true" />
        </a>

        <div className="nav-actions">
          <a className="nav-back" href={ppUrl} target="_blank" rel="noopener noreferrer" aria-label="Go to P&P Projects (opens in a new tab)" title="P&P Projects">
            <T className="nav-back-label" k="nav.pp" />
            <span className="nav-back-arrow" aria-hidden="true">↗</span>
          </a>
          <a
            href="#top"
            className={'nav-projects' + (!route.startsWith('#/') ? ' is-active' : '')}
            onClick={goSection('top')}
          >
            <T k="nav.process" />
          </a>
          {showWork && (
            <a href="#/projects" className={'nav-projects' + (onProjects ? ' is-active' : '')}>
              <T k="nav.work" />
            </a>
          )}
          {showHistory && (
            <a href="#/history" className={'nav-projects' + (route === '#/history' ? ' is-active' : '')}>
              <T k="nav.history" />
            </a>
          )}
          <a className="nav-cta" href="#contact" onClick={(e) => { setMenuOpen(false); scrollToContact(e); }}><T k="nav.cta" /></a>
          <button
            type="button"
            className={'nav-burger' + (menuOpen ? ' is-open' : '')}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span></span><span></span><span></span>
          </button>
        </div>
      </nav>

      {/* Sibling of the nav: .nav's backdrop-filter would otherwise become the
          containing block for this fixed overlay and clip it to the bar. */}
      {menuOpen && (
        <div className="mobile-menu" id="mobile-menu">
          <T as="div" className="mm-kicker" k="nav.menu" />
          <div className="mm-links">
            {menuItems.map((it, i) => (
              <a key={it.id} className="mm-link" href={`#${it.id}`} onClick={goSection(it.id)}>
                <span className="idx">{String(i).padStart(2, '0')}</span>
                <T k={labelKey(it.id)} />
              </a>
            ))}
            {showWork && (
              <a className="mm-link" href="#/projects" onClick={() => setMenuOpen(false)}>
                <span className="idx">↗</span>
                <T k="nav.work" />
              </a>
            )}
            {showHistory && (
              <a className="mm-link" href="#/history" onClick={() => setMenuOpen(false)}>
                <span className="idx">↗</span>
                <T k="nav.history" />
              </a>
            )}
          </div>
          <div className="mm-foot">
            <a className="mm-cta" href="#contact" onClick={(e) => { setMenuOpen(false); scrollToContact(e); }}><T k="nav.cta" /></a>
            <a className="mm-ext" href={ppUrl} target="_blank" rel="noopener noreferrer">
              <T k="nav.pp" /> ↗
            </a>
          </div>
        </div>
      )}
    </>
  );
}

// Vertical section slider on the right edge — a "you are here" dot rail that
// tracks scroll and jumps to a section on click. Home only, desktop only.
function SideNav({ route }) {
  const items = [{ id: 'top', label: 'Intro' }, ...SECTIONS, { id: 'contact', label: 'Contact' }];
  const active = useActive(items.map((i) => i.id));
  const scrolled = useScrolled(0.5);
  if (route.startsWith('#/')) return null;
  const go = (e, id) => {
    e.preventDefault();
    scrollToSectionEl(document.getElementById(id));
  };
  return (
    <nav className={'sidenav' + (scrolled ? ' is-visible' : '')} aria-label="Section navigation">
      <ul>
        {items.map((s) => (
          <li key={s.id}>
            <a
              href={'#' + s.id}
              className={active === s.id ? 'is-active' : ''}
              onClick={(e) => go(e, s.id)}
              aria-current={active === s.id ? 'true' : undefined}
            >
              <T className="sidenav-name" k={labelKey(s.id)} />
              <span className="sidenav-dot" aria-hidden="true"></span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Banner() {
  const video = useMedia('hero.video');
  return (
    <section className="banner" id="top">
      <img className="banner-fallback" src={useMedia('hero.fallback')} alt="" aria-hidden="true" />
      {/* Self-hosted reel — native muted autoplay loop, zero player chrome. */}
      <video
        className="banner-video"
        key={video}
        src={video}
        poster={useMedia('hero.poster')}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        tabIndex={-1}
        aria-hidden="true"
      />
      <div className="copy">
        <T as="div" className="banner-kicker" k="hero.kicker" />
        <h1><T k="hero.title" /><br /><T as="em" k="hero.em" /></h1>
      </div>
      <div className="scroll-cue" aria-hidden="true">
        <T className="scroll-word" k="hero.scroll" />
        <span className="line"></span>
        <svg className="scroll-chevron" viewBox="0 0 24 24" width="26" height="26">
          <polyline points="5 8 12 15 19 8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </section>
  );
}

function Chapter({ id, num, kicker, title, em }) {
  return (
    <div className="chapter-head" id={id}>
      <div className="num reveal">{num}</div>
      <div className="heads">
        <div className="kicker reveal">{kicker}</div>
        <h2 className="reveal d1">
          {title} <em>{em}</em>
        </h2>
      </div>
    </div>
  );
}

function Stage({ flip, visual, beats, specs }) {
  return (
    <div className={'stage' + (flip ? ' flip' : '')}>
      <div className="visual">{visual}</div>
      <div className="panel">
        <div className="reveal">
          {beats.map((b, i) => (
            <div className="beat" key={i}>
              <div className="idx">
                {String(i + 1).padStart(2, '0')} / {String(beats.length).padStart(2, '0')}
              </div>
              <div>
                <h3>{b.h}</h3>
                <p>{b.p}</p>
              </div>
            </div>
          ))}
        </div>
        {specs && specs.length > 0 && (
          <div className="specs reveal d1">
            {specs.map((s, i) => (
              <div className="row" key={i}>
                <span className="k">{s.k}</span>
                <span className="v">{s.v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Slab({ children, meta }) {
  return (
    <section className="slab">
      <div className="reveal">
        <h2 className="bigtext">{children}</h2>
        <div className="meta">{meta.map((m, i) => <span key={i}>{m}</span>)}</div>
      </div>
    </section>
  );
}

function Bp({ title, code, children }) {
  return (
    <div className="bp">
      {children}
      <div className="stamp">
        <b>{title}</b>
        <div>{code}</div>
      </div>
    </div>
  );
}

// Analysis-section visual: the real FEA stress-analysis animation, framed on the
// blueprint board. Lazy-loaded/played only near the viewport to keep it light.
function AnalysisVisual() {
  const src = useMedia('sec.analysis.video');
  const poster = useMedia('sec.analysis.poster');
  return (
    <Bp title={<T k="sec.analysis.stamp" />} code={<T k="sec.analysis.code" />}>
      <LoopVideo className="bp-video" src={src} poster={poster} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </Bp>
  );
}

// Muted, seamless-looping video. It restarts from the beginning each time its
// section actually scrolls into view (not 400px early), so you always catch the
// animation from the start instead of mid-way. Source clips are pre-trimmed so
// the last frame isn't a duplicate of the first — the loop runs with no jump.
function LoopVideo({ src, poster, className, style }) {
  const ref = useRef(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          if (v.getAttribute('src') !== src) v.setAttribute('src', src);
          try { v.currentTime = 0; } catch (_) {}
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [src]);
  return (
    <video ref={ref} className={className} style={style} muted loop playsInline preload="none" poster={poster} aria-hidden="true" />
  );
}

function CCSketchBoard() {
  return (
    <div className="cc-board">
      <div className="cc-board-grid-bg" aria-hidden="true"></div>
      <div className="cc-board-cells">
        <div className="cc-cell cc-cell-a">
          <img src="assets/cc-figure.png" alt="Critter Control character sketch" />
          <div className="cc-cell-tag">Character · CC-A</div>
        </div>
        <div className="cc-cell cc-cell-b">
          <img src="assets/cc-figure-rack.png" alt="Figure beside CritterControl rack" />
          <div className="cc-cell-tag">Scale · CC-B</div>
        </div>
        <div className="cc-cell cc-cell-c">
          <img src="assets/cc-rack-open.png" alt="CritterControl rack opened, FSCS modules inside" />
          <div className="cc-cell-tag">Internals · CC-C</div>
        </div>
        <div className="cc-cell cc-cell-d">
          <img src="assets/cc-box-fscs.png" alt="CritterControl box and FSCS hardware module callouts" />
          <div className="cc-cell-tag">Box + FSCS · CC-D</div>
        </div>
      </div>
      <div className="cc-board-meta">
        <div className="cc-board-title">CritterControl · CC-02</div>
        <div className="cc-board-sub">Designed for optimal performance · refined for monitoring</div>
      </div>
    </div>
  );
}

// Actuators-section visual: the routing-study video full-bleed (the old MW-B
// joint-detail sketch is dropped — the video is the focus and fills the space).
function MotorWiringBoard() {
  return (
    <div className="cc-board mw-board">
      <LoopVideo className="mw-fill" src={useMedia('sec.actuators.video')} poster={useMedia('sec.actuators.poster')} />
      <T as="div" className="cc-cell-tag mw-tag" k="sec.actuators.tag" />
    </div>
  );
}

function VideoStage({ src, tag }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="video-stage">
      {playing ? (
        <iframe src={src} title="Animation software" allow="autoplay" allowFullScreen />
      ) : (
        <div className="video-poster">
          <div className="video-poster-frame">
            <div className="video-poster-grid" aria-hidden="true"></div>
            <div className="video-poster-meta">
              <div className="video-poster-eyebrow">ThemedMotion · Anim suite</div>
              <div className="video-poster-title">Curves on a timeline</div>
              <div className="video-poster-sub">In-house animation software · live to bench</div>
            </div>
            <button
              type="button"
              className="video-poster-play"
              onClick={() => setPlaying(true)}
              aria-label="Play animation reel"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path d="M7 5v14l12-7z" fill="currentColor" />
              </svg>
              <span>Play reel</span>
            </button>
          </div>
        </div>
      )}
      <div className="rotate3d-tag">{tag}</div>
    </div>
  );
}

// Unified storytelling section: number + chapter + title and the beats live in
// one column, the visual fills the other — sized so the whole section reads in a
// single viewport (per the dossier's "see everything at once" note).
function Section({ id, num, beats, visual, flip, mark }) {
  // Two-block sections get a slightly shorter line so the copy fills the panel
  // instead of running wide across it.
  return (
    <section className={'sec' + (flip ? ' flip' : '') + (beats.length <= 2 ? ' few' : '')} id={id}>
      <div className="sec-visual">{visual}</div>
      <div className="sec-panel">
        <div className={'sec-head reveal' + (mark ? ' has-mark' : '')}>
          {mark && <MotionMark className="sec-mark" />}
          <div className="sec-num">{num}<span>/ 07</span></div>
          <h2 className="sec-title"><T k={`sec.${id}.title`} /> <T as="em" k={`sec.${id}.em`} /></h2>
        </div>
        <div className="sec-beats reveal d1">
          {beats.map((_, i) => (
            <div className="beat" key={i}>
              <div className="beat-idx">{String(i + 1).padStart(2, '0')} / {String(beats.length).padStart(2, '0')}</div>
              <div className="beat-body">
                <T as="h3" k={`sec.${id}.b${i + 1}.h`} />
                <T as="p" k={`sec.${id}.b${i + 1}.p`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Design-section visual: the Ukkie line "sketch" fills in to a coloured model,
// then gently turns on a turntable. Uses the supplied simplified SVG inline so
// the fill can animate (stroke = sketch, fill = model) without shipping the
// heavy generated transition CSS.
function UkkieStage() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf1 = 0, raf2 = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        // Replay the sketch→model reveal (+ turntable) every time the Design
        // slide returns: snap instantly back to the sketch, then play forward.
        if (e.isIntersecting) {
          el.classList.add('reset');         // hold the sketch, no transition
          el.classList.remove('is-active');
          cancelAnimationFrame(raf2);
          raf1 = requestAnimationFrame(() => {
            el.classList.remove('reset');     // re-enable transitions
            raf2 = requestAnimationFrame(() => el.classList.add('is-active')); // play
          });
        } else {
          cancelAnimationFrame(raf1);
          cancelAnimationFrame(raf2);
          el.classList.add('reset');          // instantly reset to the sketch
          el.classList.remove('is-active');
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
  }, []);
  return (
    <div className="ukkie-stage" ref={ref}>
      {/* The concept sketch draws in and fills with colour, then cross-fades in
          place into the live, rigged 3D model — sketch → model in one frame. */}
      <div className="ukkie-svg" dangerouslySetInnerHTML={{ __html: ukkieModelSvg }} />
      <model-viewer
        className="ukkie-model"
        src="assets/critter.glb"
        alt="Critter — rigged, animated 3D model"
        autoplay
        animation-name="ArmatureAction"
        camera-controls
        interaction-prompt="none"
        disable-zoom
        touch-action="pan-y"
        loading="eager"
        environment-image="neutral"
        shadow-intensity="0.8"
        shadow-softness="0.9"
        exposure="1.05"
        camera-orbit="40deg 74deg auto"
        camera-target="auto auto auto"
      ></model-viewer>
      <div className="ukkie-floor" aria-hidden="true"></div>
      <div className="ukkie-tag">UKKIE · SKETCH → MODEL</div>
      <div className="ukkie-hint" aria-hidden="true">Drag to rotate</div>
    </div>
  );
}

// Design-section visual: the client-supplied Ukkie transition film (sketch →
// clay model turntable) as a seamless full-bleed loop. Replaces the old
// SVG-sketch + <model-viewer> stage.
function DesignVisual() {
  return (
    <div className="ukkie-film">
      <LoopVideo
        className="ukkie-film-video"
        src={useMedia('sec.design.video')}
        poster={useMedia('sec.design.poster')}
      />
      <T as="div" className="ukkie-tag" k="sec.design.tag" />
    </div>
  );
}

// Control-section visual: the real CritterControl hardware as 3D models
// (converted from the supplied STEP CAD). Both pieces — the control box and the
// FSCS module that lives inside it — are shown together, each independently
// draggable. Auto radius lets model-viewer frame each model so neither clips.
// Control-section visual: the control-box render full-bleed (the video is the
// hero; the FSCS 3D model was dropped so the cabinet owns the whole space).
function ControlVisual() {
  return (
    <div className="mv-stage mv-solo">
      <LoopVideo className="mv-fill" src={useMedia('sec.control.video')} poster={useMedia('sec.control.poster')} />
      <T as="div" className="mv-label mv-label-solo" k="sec.control.tag" />
    </div>
  );
}

// Engineering-section visual: the real Vulkan SC11 figure as two synced animated
// models — one with shells (the body) layered over one with only the internal
// structure. They share one fixed camera so the skeleton lines up exactly under
// the body; a slider cross-fades between them (mid = x-ray). The animations are
// the same "ArmatureAction" clip, kept frame-locked so the blend always matches.
function VulkanStage() {
  const wrapRef = useRef(null);
  const shellsRef = useRef(null);
  const frameRef = useRef(null);
  const tweenRef = useRef(0);
  const [shell, setShell] = useState(100); // 100 = body, 0 = structure

  // Shared fixed camera (both models live in the same world space).
  // theta -78° faces the figure's front (it was authored facing this way).
  const TARGET = '6.585m 119.8m -3.3m';
  const ORBIT = '-78deg 80deg 560m';

  // Every frame: keep the structure locked to the body — both its animation
  // time AND its camera. The body (shells) is the interactive one (camera-
  // controls); we mirror its live orbit/target onto the fixed structure so the
  // skeleton stays perfectly under the body no matter how the visitor rotates.
  useEffect(() => {
    let raf;
    const sync = () => {
      const s = shellsRef.current, f = frameRef.current;
      if (s && f && s.loaded && f.loaded) {
        const st = s.currentTime || 0;
        if (Math.abs((f.currentTime || 0) - st) > 0.03) f.currentTime = st;
        try {
          const o = s.getCameraOrbit();
          f.cameraOrbit = `${o.theta}rad ${o.phi}rad ${o.radius}m`;
          const t = s.getCameraTarget();
          f.cameraTarget = `${t.x}m ${t.y}m ${t.z}m`;
        } catch (_) { /* methods unavailable until fully loaded */ }
      }
      raf = requestAnimationFrame(sync);
    };
    raf = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(raf);
  }, []);

  // tween the blend value smoothly (used for the auto reveal).
  const tween = (from, to, dur) => {
    cancelAnimationFrame(tweenRef.current);
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      setShell(from + (to - from) * e);
      if (t < 1) tweenRef.current = requestAnimationFrame(step);
    };
    tweenRef.current = requestAnimationFrame(step);
  };

  // On first reveal: show the body, then cross-fade to the structure once.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let done = false;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting && !done) {
          done = true;
          window.setTimeout(() => tween(100, 0, 1900), 2800);
        }
      }),
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="vulkan-stage" ref={wrapRef}>
      <div className="vulkan-models">
        <model-viewer
          ref={frameRef}
          className="vulkan-mv"
          src="assets/vulkan-frame.glb"
          alt="Vulkan SC11 internal structure — animated"
          autoplay
          animation-name="ArmatureAction"
          interaction-prompt="none"
          camera-target={TARGET}
          camera-orbit={ORBIT}
          loading="eager"
          environment-image="neutral"
          shadow-intensity="0.35"
          shadow-softness="1"
          exposure="1.05"
        ></model-viewer>
        <model-viewer
          ref={shellsRef}
          className="vulkan-mv vulkan-shells"
          src="assets/vulkan-shells.glb"
          alt="Vulkan SC11 with shells — animated"
          style={{ opacity: shell / 100 }}
          autoplay
          animation-name="ArmatureAction"
          interaction-prompt="none"
          camera-controls
          disable-zoom
          touch-action="pan-y"
          camera-target={TARGET}
          camera-orbit={ORBIT}
          loading="eager"
          environment-image="neutral"
          shadow-intensity="0.35"
          shadow-softness="1"
          exposure="1.05"
        ></model-viewer>
      </div>
      <div className="vulkan-controls">
        <T className="vulkan-end" k="sec.engineering.structure" />
        <input
          className="vulkan-slider"
          type="range"
          min="0"
          max="100"
          value={Math.round(shell)}
          onChange={(e) => { cancelAnimationFrame(tweenRef.current); setShell(+e.target.value); }}
          aria-label="Blend between internal structure and body shells"
          style={{ '--fill': `${Math.round(shell)}%` }}
        />
        <T className="vulkan-end" k="sec.engineering.body" />
      </div>
      <T as="div" className="rotate3d-tag" k="sec.engineering.tag" />
      <T as="div" className="vulkan-hint" aria-hidden="true" k="sec.engineering.hint" />
    </div>
  );
}

// Animation-section visual: an artsy, abstract representation of motion curves on
// a timeline (we can't show the real CritterControl software for IP reasons).
// Smooth cubic path THROUGH the given points (Catmull-Rom → bezier) so every
// point lies exactly on the line — that's where the keyframe diamonds sit.
function smoothPath(pts) {
  if (pts.length < 2) return '';
  const d = ['M ' + pts[0][0] + ' ' + pts[0][1]];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d.push(`C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0]} ${p2[1]}`);
  }
  return d.join(' ');
}

const CURVE_XS = [40, 144, 248, 352, 456, 560];
// Vibrant animation-editor track colours, readable on white.
const CURVE_DATA = [
  { color: '#06b6d4', ys: [300, 110, 280, 120, 250, 130] }, // cyan
  { color: '#e0218a', ys: [170, 320, 120, 300, 140, 290] }, // magenta
  { color: '#e8920c', ys: [250, 90, 260, 140, 300, 170] },  // amber
  { color: '#16a34a', ys: [120, 250, 110, 280, 150, 240] }, // green
  { color: '#ef4444', ys: [330, 190, 320, 100, 270, 90] },  // red
].map((c) => ({ ...c, points: CURVE_XS.map((x, i) => [x, c.ys[i]]) }));
const CURVE_DRAW = 2.2;      // seconds for one curve to draw on
const CURVE_STAGGER = 0.16;  // start offset between curves

function CurvesVisual() {
  const ref = useRef(null);
  // Replay the "draw itself" build each time the slide returns into view.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.remove('is-visible');     // arm: reset to undrawn
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() =>
            requestAnimationFrame(() => el.classList.add('is-visible')),
          );
        } else {
          cancelAnimationFrame(raf);
          el.classList.remove('is-visible');
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, []);
  return (
    <div className="curves-stage" ref={ref}>
      <svg className="curves-svg" viewBox="0 0 600 440" fill="none" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <g className="curves-grid">
          {[80, 160, 240, 320].map((y) => <line key={y} x1="40" y1={y} x2="560" y2={y} />)}
          {[120, 240, 360, 480].map((x) => <line key={x} x1={x} y1="50" x2={x} y2="360" className="v" />)}
        </g>
        {/* Each track draws itself on, staggered. */}
        {CURVE_DATA.map((c, ci) => (
          <path
            key={ci}
            className="curve"
            d={smoothPath(c.points)}
            style={{ stroke: c.color, '--d': `${(ci * CURVE_STAGGER).toFixed(2)}s` }}
          />
        ))}
        <line className="curves-playhead" x1="0" y1="44" x2="0" y2="366" />
        <g className="curves-ruler">
          {[0,1,2,3,4,5].map((s)=>(<text key={s} x={40 + s*104} y="392">0{s}s</text>))}
        </g>
        {/* Diamonds render last (always on top of the curves) and pop as the
            line draws past each one — every diamond sits exactly on a curve. */}
        <g className="curve-keys">
          {CURVE_DATA.flatMap((c, ci) => c.points.map(([x, y], ai) => {
            const kd = ci * CURVE_STAGGER + (ai / (c.points.length - 1)) * CURVE_DRAW + 0.05;
            return <rect key={`${ci}-${ai}`} x={x - 5} y={y - 5} width="10" height="10" style={{ '--kd': `${kd.toFixed(2)}s` }} />;
          }))}
        </g>
      </svg>
      <div className="rotate3d-tag">CRITTERCONTROL · ANIMATION TOOL</div>
    </div>
  );
}

// Figure-finishing: cinematic full-bleed background video with a dark filter and
// the copy on top. Video is lazy-loaded/played only when the section is near the
// viewport to keep the page light.
function FinishingSection({ beats }) {
  const src = useMedia('sec.finishing.video');
  const poster = useMedia('sec.finishing.poster');
  const vref = useRef(null);
  useEffect(() => {
    const v = vref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          if (v.getAttribute('src') !== src) v.setAttribute('src', src);
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      },
      { rootMargin: '400px 0px' },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [src]);
  return (
    <section className="finishing" id="finishing">
      <video
        ref={vref}
        className="finishing-video"
        muted
        loop
        playsInline
        preload="none"
        poster={poster}
        aria-hidden="true"
      />
      <div className="finishing-scrim" aria-hidden="true"></div>
      <div className="finishing-inner">
        <div className="sec-head reveal">
          <div className="sec-num">07<span>/ 07</span></div>
          <h2 className="sec-title"><T k="sec.finishing.title" /> <T as="em" k="sec.finishing.em" /></h2>
        </div>
        <div className="sec-beats finishing-beats reveal d1">
          {beats.map((_, i) => (
            <div className="beat" key={i}>
              <div className="beat-idx">{String(i + 1).padStart(2, '0')} / {String(beats.length).padStart(2, '0')}</div>
              <div className="beat-body">
                <T as="h3" k={`sec.finishing.b${i + 1}.h`} />
                <T as="p" k={`sec.finishing.b${i + 1}.p`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Smoothly scroll to the contact section on the current page (it is rendered on
// both Home and Projects), so "#contact" links never switch routes.
// Jump straight to an element. CSS scroll-snap-stop:always + the global
// scroll-behavior:smooth make native programmatic smooth scrolls refuse to
// cross snap points, so we force an instant jump (snap then settles on the
// target, which is itself a snap point).
function jumpTo(el) {
  if (!el) return;
  const html = document.documentElement;
  const prev = html.style.scrollBehavior;
  html.style.scrollBehavior = 'auto';
  window.scrollTo(0, Math.max(0, window.scrollY + el.getBoundingClientRect().top));
  html.style.scrollBehavior = prev;
}

function scrollToContact(e) {
  // Land straight on the brief form (skip the contact copy/heading), falling
  // back to the section itself if the form isn't mounted for some reason.
  const el = document.querySelector('.contact .form-wrap') || document.getElementById('contact');
  if (el) {
    e.preventDefault();
    jumpTo(el);
  }
}

// Full-bleed invitation between the last chapter and the contact form. The
// picture is shown blurred, so any shot works as a backdrop.
function ContactBanner() {
  const img = useMedia('cta.image');
  return (
    <section className="cta-band" id="more">
      <img className="cta-band-bg" src={img} alt="" aria-hidden="true" />
      <div className="cta-band-scrim" aria-hidden="true"></div>
      <div className="cta-band-inner reveal">
        <T as="h2" k="cta.title" />
        <a className="cta-band-btn" href="#contact" onClick={scrollToContact}>
          <T k="cta.button" /> <span className="arrow" aria-hidden="true">→</span>
        </a>
      </div>
    </section>
  );
}

// Shared contact section — rendered identically on Home and Projects, so any
// edit here reflects on both pages.
function Contact() {
  const mormel = useMedia('contact.mormel');
  const mormelHand = useMedia('contact.mormelHand');
  return (
    <section className="contact" id="contact">
      <div className="contact-inner">
        <div className="reveal">
          <T as="div" className="kicker" k="contact.kicker" />
          <h2><T k="contact.title" /> <T as="em" k="contact.em" /></h2>
          <T
            as="p"
            className="lede"
            k="contact.lede"
          />
          <div className="info">
            <div className="row"><T className="k" k="contact.hq.k" /><T className="v" k="contact.hq.v" /></div>
            <div className="row"><T className="k" k="contact.email.k" /><T className="v" k="contact.email.v" /></div>
            <div className="row"><T className="k" k="contact.phone.k" /><T className="v" k="contact.phone.v" /></div>
            <div className="row"><T className="k" k="contact.hours.k" /><T className="v" k="contact.hours.v" /></div>
          </div>
        </div>
        <div className="form-wrap reveal d1">
          <div className="peek peek-mormel">
            <T as="div" className="speech" k="contact.speech" />
            <img className="peek-base" src={mormel} alt="" />
            <img className="peek-paw" src={mormelHand} alt="" aria-hidden="true" />
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              alert('Thanks! We’ll be in touch within 48 hours.');
            }}
          >
            <T as="div" className="form-title" k="form.title" />
            <T as="div" className="form-sub" k="form.sub" />
            <div className="row-2">
              <div className="field">
                <T as="label" htmlFor="cn" k="form.name" />
                <input id="cn" type="text" placeholder="Jane Doe" required />
              </div>
              <div className="field">
                <T as="label" htmlFor="cc" k="form.company" />
                <input id="cc" type="text" placeholder="Studio / venue" />
              </div>
            </div>
            <div className="field">
              <T as="label" htmlFor="ce" k="form.email" />
              <input id="ce" type="email" placeholder="you@studio.com" required />
            </div>
            <div className="field">
              <T as="label" htmlFor="cl" k="form.location" />
              <input id="cl" type="text" placeholder="City / park / country" />
            </div>
            <div className="field">
              <T as="label" htmlFor="cm" k="form.message" />
              <textarea id="cm" placeholder="A queue-line character, a dark ride animatronic, a creature effect…"></textarea>
            </div>
            <button type="submit" className="cta-btn">
              <T k="form.submit" /> <span className="arrow">→</span>
            </button>
            <T as="div" className="form-foot" k="form.foot" />
          </form>
        </div>
      </div>
    </section>
  );
}

// Shared site footer
function SiteFooter() {
  const ppUrl = useLink('link.pp');
  return (
    <footer>
      <T as="div" k="footer.copy" />
      <a className="footer-back" href={ppUrl} target="_blank" rel="noopener noreferrer"><T k="footer.pp" /> <span aria-hidden="true">↗</span></a>
      <T as="div" k="footer.brand" />
    </footer>
  );
}

// ---- Motion Graph Editor: interactive animation-curve editor (Animation §) ----
// Five channels, six keyframes each (one per second), eased between keys with
// a feel of their own. The playhead sweeps and loops by itself; visitors can
// take over — tap a channel to focus it, drag its diamonds to reshape the
// curve, drag across the graph to scrub, pause/play, reset.
const MGE_W = 900, MGE_H = 440, MGE_DUR = 5, MGE_TOP = 22, MGE_SPAN = 396;
const MGE_EASE = {
  smooth: (u) => u * u * (3 - 2 * u),                                                // ease in / out
  hold: (u) => (u < 0.3 ? 0 : u > 0.7 ? 1 : MGE_EASE.smooth((u - 0.3) / 0.4)),      // dwell · move · dwell
  snap: (u) => (u < 0.5 ? 8 * u ** 4 : 1 - 8 * (1 - u) ** 4),                        // quick flick
  linear: (u) => u,
};
const MGE_CHANNELS = [
  { key: 'opacity',  color: 'oklch(0.63 0.20 28)',  ease: 'smooth', vals: [0.50, 0.80, 0.55, 0.25, 0.60, 0.50] }, // head tilt · slow sway
  { key: 'scale',    color: 'oklch(0.70 0.15 72)',  ease: 'snap',   vals: [0.08, 0.85, 0.15, 0.70, 0.30, 0.08] }, // jaw · talking
  { key: 'posx',     color: 'oklch(0.60 0.13 175)', ease: 'snap',   vals: [0.95, 0.95, 0.05, 0.95, 0.95, 0.10] }, // blink
  { key: 'posy',     color: 'oklch(0.55 0.16 256)', ease: 'hold',   vals: [0.20, 0.20, 0.75, 0.75, 0.40, 0.20] }, // shoulder · hold & move
  { key: 'rotation', color: 'oklch(0.58 0.19 350)', ease: 'linear', vals: [0.40, 0.15, 0.65, 0.35, 0.90, 0.40] }, // elbow · mechanical
];
const MGE_DEFAULTS = Object.fromEntries(MGE_CHANNELS.map((c) => [c.key, c.vals]));
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const mgeX = (t) => (t / MGE_DUR) * MGE_W;
const mgeY = (v) => MGE_TOP + (1 - v) * MGE_SPAN;
const mgeVal = (ch, vals, t) => {
  const i = Math.min(MGE_DUR - 1, Math.max(0, Math.floor(t)));
  const a = vals[i], b = vals[i + 1];
  return a + (b - a) * MGE_EASE[ch.ease](clamp01(t - i));
};
const mgePath = (ch, vals) => {
  const N = 300; let d = '';
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * MGE_DUR;
    d += (i ? 'L' : 'M') + mgeX(t).toFixed(1) + ' ' + mgeY(mgeVal(ch, vals, t)).toFixed(1) + ' ';
  }
  return d.trim();
};

function MotionGraphEditor() {
  const [vals, setVals] = useState(MGE_DEFAULTS);
  const [sel, setSel] = useState('posx');
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(true);
  const [touched, setTouched] = useState(false); // once the visitor takes over, the focus stops cycling
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const lastRef = useRef(0);
  const dragRef = useRef(null); // { i } while a diamond is dragged, 'scrub' on the graph, else null

  // Pause the loop when the slide is off-screen.
  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Playhead sweep (~0.9 u/s); left alone, each loop focuses the next channel.
  useEffect(() => {
    if (!visible || !playing) { lastRef.current = 0; return; }
    let raf;
    const step = (now) => {
      if (!lastRef.current) lastRef.current = now;
      const dt = Math.min(0.05, (now - lastRef.current) / 1000);
      lastRef.current = now;
      setTime((t) => {
        const n = t + dt * 0.9;
        if (n >= MGE_DUR) {
          if (!touched) setSel((cur) => MGE_CHANNELS[(MGE_CHANNELS.findIndex((c) => c.key === cur) + 1) % MGE_CHANNELS.length].key);
          return n - MGE_DUR;
        }
        return n;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [visible, playing, touched]);

  const data = useMemo(() => MGE_CHANNELS.map((ch) => ({
    ...ch,
    d: mgePath(ch, vals[ch.key]),
    keys: vals[ch.key].map((v, s) => ({ x: mgeX(s), y: mgeY(v) })),
  })), [vals]);
  const selCh = data.find((c) => c.key === sel);
  const px = mgeX(time);
  const py = mgeY(mgeVal(selCh, vals[sel], time));

  // Pointer → graph units. The SVG is stretched, so each axis maps on its own.
  const toGraph = (e) => {
    const box = svgRef.current.getBoundingClientRect();
    return {
      t: clamp01((e.clientX - box.left) / box.width) * MGE_DUR,
      v: clamp01(1 - (((e.clientY - box.top) / box.height) * MGE_H - MGE_TOP) / MGE_SPAN),
    };
  };
  const setKey = (i, v) => setVals((cur) => ({ ...cur, [sel]: cur[sel].map((x, j) => (j === i ? v : x)) }));
  const onDown = (e) => {
    const kf = e.target.closest ? e.target.closest('[data-kf]') : null;
    setTouched(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    if (kf) {
      dragRef.current = { i: +kf.dataset.kf };
      setKey(dragRef.current.i, toGraph(e).v);
    } else {
      dragRef.current = 'scrub';
      setPlaying(false);
      setTime(toGraph(e).t);
    }
  };
  const onMove = (e) => {
    if (!dragRef.current) return;
    const g = toGraph(e);
    if (dragRef.current === 'scrub') setTime(g.t);
    else setKey(dragRef.current.i, g.v);
  };
  const onUp = () => { dragRef.current = null; };
  const pick = (key) => { setSel(key); setTouched(true); };
  const reset = () => { setVals(MGE_DEFAULTS); setTouched(false); setPlaying(true); };

  return (
    <div className="mge-wrap" ref={wrapRef}>
      <div className="mge-card">
        <div className="mge-head">
          <div className="mge-head-l">
            <T className="mge-chip" k="sec.animation.chip" />
            <T as="div" className="mge-title" k="sec.animation.title" />
            <T as="div" className="mge-sub" k="sec.animation.sub" />
          </div>
          <div className="mge-head-r">
            <div className="mge-time">{time.toFixed(2).padStart(5, '0')}s</div>
            <button type="button" className="mge-btn" onClick={() => { setPlaying((p) => !p); setTouched(true); }} aria-label={playing ? 'Pause' : 'Play'} title={playing ? 'Pause' : 'Play'}>
              {playing ? '❚❚' : '▶'}
            </button>
            <button type="button" className="mge-btn" onClick={reset} aria-label="Reset the curves" title="Reset">↺</button>
          </div>
        </div>
        <div className="mge-body">
          <div className="mge-yaxis">{[100, 75, 50, 25, 0].map((v) => <span key={v}>{v}</span>)}</div>
          <svg
            ref={svgRef}
            className="mge-svg"
            viewBox={`0 0 ${MGE_W} ${MGE_H}`}
            preserveAspectRatio="none"
            role="application"
            aria-label="Animation curve editor: drag the diamonds to reshape the focused curve"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            <g className="mge-grid">
              {[0, 25, 50, 75, 100].map((p) => { const y = mgeY(p / 100); return <line key={p} x1="0" y1={y} x2={MGE_W} y2={y} className={p === 50 ? 'mid' : ''} />; })}
              {[0, 1, 2, 3, 4, 5].map((s) => <line key={s} className="v" x1={mgeX(s)} y1="0" x2={mgeX(s)} y2={MGE_H} />)}
            </g>
            <path className="mge-fill" d={`${selCh.d} L${MGE_W} ${mgeY(0)} L0 ${mgeY(0)} Z`} style={{ fill: selCh.color }} />
            {data.map((ch) => (
              <path key={ch.key} className={'mge-curve' + (ch.key === sel ? ' is-sel' : '')} d={ch.d} style={{ stroke: ch.color, color: ch.color }} />
            ))}
            <line className="mge-ph" x1={px} y1="0" x2={px} y2={mgeY(0)} />
            <circle className="mge-ph-top" cx={px} cy={MGE_TOP} r="5" />
            <circle className="mge-ph-dot" cx={px} cy={py} r="6" style={{ fill: selCh.color }} />
            {selCh.keys.map((k, i) => (
              <rect key={i} data-kf={i} className="mge-kf" x={k.x - 7} y={k.y - 7} width="14" height="14" style={{ stroke: selCh.color }} />
            ))}
          </svg>
        </div>
        <div className="mge-taxis">{[0, 1, 2, 3, 4, 5].map((s) => <span key={s}>{String(s).padStart(2, '0')}s</span>)}</div>
        <div className="mge-legend">
          {data.map((ch) => (
            <button
              key={ch.key}
              type="button"
              className={'mge-leg' + (ch.key === sel ? ' is-sel' : '')}
              style={{ '--c': ch.color }}
              onClick={() => pick(ch.key)}
              aria-pressed={ch.key === sel}
            >
              <span className="mge-leg-dot" />
              <T className="mge-leg-name" k={`sec.animation.ch.${ch.key}`} />
              <span className="mge-leg-val">{Math.round(mgeVal(ch, vals[ch.key], time) * 100)}%</span>
            </button>
          ))}
        </div>
        <T as="div" className="mge-hint" k="sec.animation.hint" />
      </div>
    </div>
  );
}

// Which visual sits next to each storytelling section (copy lives in schema.js).
const SECTION_VISUALS = {
  design: DesignVisual,
  engineering: VulkanStage,
  analysis: AnalysisVisual,
  actuators: MotorWiringBoard,
  control: ControlVisual,
  animation: MotionGraphEditor,
};

function Home() {
  useReveal();
  // When arriving on the home page with a section fragment (e.g. coming back
  // from the Projects page via a nav link), scroll that section into view.
  // Retry a couple of times because the hero iframe and stage images grow the
  // page after first paint, which would otherwise leave us scrolled short.
  useEffect(() => {
    const h = window.location.hash;
    const id = h && h.length > 1 && !h.startsWith('#/') ? h.slice(1) : null;
    const scroll = () => {
      if (id) {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView();
      } else {
        // No section fragment → always land on the hero, never mid-deck at 01.
        window.scrollTo(0, 0);
      }
    };
    scroll();
    const timers = [setTimeout(scroll, 250), setTimeout(scroll, 700)];
    return () => timers.forEach(clearTimeout);
  }, []);

  // The heavy models (critter, Vulkan pair) use loading="eager": they download
  // AND Draco-decode at page load, during the hero dwell, so they render the
  // instant their section scrolls into view. With loading="lazy" model-viewer
  // defers even parsing until visibility, which showed as a ~2s blank on first
  // scroll despite the file being prefetched.

  return (
    <>
      <Banner />

      {SECTIONS.slice(0, -1).map((sec, i) => {
        const Visual = SECTION_VISUALS[sec.id];
        return (
          <Section
            key={sec.id}
            id={sec.id}
            num={String(i + 1).padStart(2, '0')}
            flip={i % 2 === 1}
            beats={sec.beats}
            visual={<Visual />}
          />
        );
      })}

      {/* 07 · FINISHING — full-bleed film instead of the split layout */}
      <FinishingSection beats={SECTIONS[SECTIONS.length - 1].beats} />

      <ContactBanner />

      {/* CONTACT */}
      <Contact />

      <SiteFooter />
    </>
  );
}

// ThemedMotion's orange motion chevrons — two open angular strokes vectorized
// from the supplied artwork (round caps/joins via CSS). Inline SVG so it stays
// crisp at any size. Reused behind the big titles on Work, History and Design.
function MotionMark({ className }) {
  return (
    <svg className={className} viewBox="0 0 1081 802" fill="none" aria-hidden="true">
      <polyline points="288,272 353,152 1035,42 842,269" />
      <polyline points="599,550 497,664 42,758 145,551" />
    </svg>
  );
}

// Tiles come from the `work.projects` list (schema.js): order interleaves
// landscape/portrait shots so the masonry columns balance, and `card` frames a
// piece on a cream card (concept art / drawings) among the dark tiles.
function Projects() {
  const projects = useList('work.projects');
  useReveal();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return (
    <>
      <header className="portfolio-head">
        <div className="portfolio-head-inner reveal">
          <div className="work-title-wrap">
            <h1><T k="work.title" /><span className="dot">.</span></h1>
          </div>
          <T
            as="p"
            className="head-sub"
            k="work.sub"
          />
          <div className="portfolio-tags">
            <T k="work.tag1" />
            <T k="work.tag2" />
            <T k="work.tag3" />
            <T k="work.tag4" />
          </div>
        </div>
      </header>

      <section className="portfolio">
        <div className="portfolio-grid">
          {projects.map((p, i) => (
            <figure
              key={p.id}
              className={'proj-tile reveal' + (p.card ? ' proj-card' : '') + (i % 3 === 1 ? ' d1' : i % 3 === 2 ? ' d2' : '')}
              data-index={String(i + 1).padStart(2, '0')}
              aria-label={`${plainText(p.name)} — ${plainText(p.cat)}`}
            >
              <div className="proj-media">
                {p.img && <img src={p.img} alt={plainText(p.name)} loading="lazy" />}
              </div>
              <figcaption className="proj-meta">
                <T className="proj-cat" list="work.projects" id={p.id} f="cat" />
                <T className="proj-name" list="work.projects" id={p.id} f="name" />
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <Contact />

      <SiteFooter />
    </>
  );
}

// History page — the studio's story (client copy, kept verbatim) interleaved
// with two photo reels and two pieces of historical footage, in the order
// reel 1 → film 1 → reel 2 → film 2.

// Auto-scrolling photo "reel" — a full-bleed filmstrip. Images are duplicated
// so the marquee loops seamlessly; it pauses on hover and stops for users who
// prefer reduced motion (becoming a horizontally scrollable strip instead).
// `photos` is the editable `history.photos` list: light thumbnails drive the
// reel; the full-size images feed the lightbox.
function PhotoReel({ photos, reverse, onOpen }) {
  const items = photos.filter((it) => it.full);
  const full = items.map((it) => it.full);
  const total = items.length;
  const wrapRef = useRef(null);

  // Warm the cache for the whole strip ~900px before it scrolls into view, so the
  // marquee never shows a half-loaded photo as new tiles enter from the right.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          items.forEach((it) => { const im = new Image(); im.src = it.thumb; });
          io.disconnect();
        }
      },
      { rootMargin: '900px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  return (
    <div
      ref={wrapRef}
      className={'photoreel reveal' + (reverse ? ' reverse' : '')}
      style={{ '--reel-dur': `${Math.round(total * 3.4)}s` }}
    >
      <div className="photoreel-track">
        {[...items, ...items].map((it, i) => (
          <button
            type="button"
            className="photoreel-item"
            key={i}
            onClick={() => onOpen(full, i % total)}
            aria-label="Open photo"
          >
            <img src={it.thumb} alt="" loading="lazy" decoding="async" draggable="false" />
          </button>
        ))}
      </div>
    </div>
  );
}

// Fullscreen image viewer ("lightbox") for the photo reels — opens on click,
// supports prev/next (arrows or ← →), and closes on the backdrop, the ✕, or Esc.
function Lightbox({ images, index, onClose, onNav }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') onNav(1);
      else if (e.key === 'ArrowLeft') onNav(-1);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = prevOverflow;
    };
  }, [onClose, onNav]);
  return (
    <div className="lightbox" onClick={onClose} role="dialog" aria-modal="true">
      <button className="lightbox-close" onClick={onClose} aria-label="Close">&times;</button>
      <button
        className="lightbox-nav prev"
        onClick={(e) => { e.stopPropagation(); onNav(-1); }}
        aria-label="Previous photo"
      >&#8249;</button>
      <img
        className="lightbox-img"
        src={images[index]}
        alt=""
        onClick={(e) => e.stopPropagation()}
      />
      <button
        className="lightbox-nav next"
        onClick={(e) => { e.stopPropagation(); onNav(1); }}
        aria-label="Next photo"
      >&#8250;</button>
      <div className="lightbox-count">{index + 1} / {images.length}</div>
    </div>
  );
}

// A piece of historical footage — muted, auto-looping (reuses LoopVideo, which
// lazy-loads and restarts the clip when it scrolls into view).
function HistoryFilm({ video, poster }) {
  return (
    <figure className="history-film reveal">
      <LoopVideo className="history-film-video" src={video} poster={poster || undefined} />
    </figure>
  );
}

function History() {
  const story = useList('history.blocks');
  const photos = useList('history.photos');
  useReveal();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Lightbox state: { images, index } when open, null when closed.
  const [lb, setLb] = useState(null);
  const openLb = (images, index) => setLb({ images, index });
  const closeLb = () => setLb(null);
  const navLb = (d) => setLb((s) => (s ? { ...s, index: (s.index + d + s.images.length) % s.images.length } : s));

  // Each run of paragraphs sits beside the film that follows it, sides
  // alternating; a run with no film borrows a few reel photos as a collage so
  // no text stands alone. The photo reel itself breaks out full-bleed.
  const full = photos.map((p) => p.full);
  const rows = [];
  let buf = [];
  let lent = 0; // next reel photo to lend to a collage
  const collage = () => {
    if (lent >= photos.length) return null;
    const pick = photos.slice(lent, lent + 3);
    lent += pick.length;
    return { type: 'collage', items: pick.map((p) => ({ ...p, index: full.indexOf(p.full) })) };
  };
  const flush = (key, media) => {
    if (!buf.length && !media) return;
    if (media) { rows.push({ key, text: buf, media }); buf = []; return; }
    // A long run of paragraphs is split into rows of up to three, each with
    // its own collage, so the page keeps alternating text and pictures.
    let n = 0;
    while (buf.length) {
      const chunk = buf.splice(0, 3);
      // Never leave a highlighted line dangling at the end of a chunk.
      if (buf.length && chunk[chunk.length - 1].type === 'lead') buf.unshift(chunk.pop());
      rows.push({ key: key + '-' + n++, text: chunk, media: collage() });
    }
  };
  story.forEach((b) => {
    if (b.type === 'reel') {
      flush(b.id + '-text');
      rows.push({ key: b.id, reel: true });
    } else if (b.type === 'film') {
      if (b.video) flush(b.id, { type: 'film', video: b.video, poster: b.poster });
    } else {
      buf.push(b);
    }
  });
  flush('end');

  let side = 0;
  const blocks = rows.map((r) => {
    if (r.reel) return photos.length ? <PhotoReel key={r.key} photos={photos} onOpen={openLb} /> : null;
    const cls = ['history-row', 'reveal', side++ % 2 ? 'flip' : '', r.media ? '' : 'solo', r.text.length ? '' : 'media-only'].filter(Boolean).join(' ');
    return (
      <div key={r.key} className={cls}>
        {r.text.length > 0 && (
          <div className="history-text">
            {r.text.map((b) => (
              <T as="p" key={b.id} className={b.type === 'lead' ? 'lead' : undefined} list="history.blocks" id={b.id} f="text" />
            ))}
          </div>
        )}
        {r.media?.type === 'film' && <HistoryFilm video={r.media.video} poster={r.media.poster} />}
        {r.media?.type === 'collage' && (
          <div className="history-collage">
            {r.media.items.map((p) => (
              <button type="button" key={p.id} onClick={() => openLb(full, p.index)} aria-label="Open photo">
                <img src={p.thumb || p.full} alt="" loading="lazy" decoding="async" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  });

  return (
    <>
      <header className="portfolio-head">
        <div className="portfolio-head-inner reveal">
          <div className="work-title-wrap">
            <h1><T k="history.title" /><span className="dot">.</span></h1>
          </div>
          <T as="p" className="head-sub" k="history.sub" />
        </div>
      </header>

      <section className="history">{blocks}</section>

      {lb && <Lightbox images={lb.images} index={lb.index} onClose={closeLb} onNav={navLb} />}

      <Contact />
      <SiteFooter />
    </>
  );
}

export default function App() {
  const route = useHashRoute();
  const { editing } = useContent();
  // A hidden page behaves as if it didn't exist — except for a logged-in editor,
  // who can still open it to work on it before switching it on.
  const showWork = useFlag('page.work') || editing;
  const showHistory = useFlag('page.history') || editing;
  const onProjects = route === '#/projects' && showWork;
  const onHistory = route === '#/history' && showHistory;
  const onAdmin = route === '#/admin';
  const title = usePlain('seo.title');
  useEffect(() => { if (title) document.title = title; }, [title]);
  useFonts();
  // Don't let the browser restore a previous scroll position on first load —
  // otherwise the deck can open part-way down (at section 01) instead of the hero.
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  }, []);
  // The Work and History pages are normal long pages — never snap decks.
  useEffect(() => {
    document.documentElement.classList.toggle('route-projects', onProjects);
    document.documentElement.classList.toggle('route-history', onHistory);
    document.documentElement.classList.toggle('route-admin', onAdmin);
    return () => {
      document.documentElement.classList.remove('route-projects');
      document.documentElement.classList.remove('route-history');
      document.documentElement.classList.remove('route-admin');
    };
  }, [onProjects, onHistory, onAdmin]);
  // Login + dashboard (content, media, users) — a bare page, no site chrome.
  if (onAdmin) return <Suspense fallback={null}><AdminApp /></Suspense>;
  // What the chrome treats as the current page: a hidden page counts as home.
  const shown = onProjects ? '#/projects' : onHistory ? '#/history' : '';
  return (
    <>
      <Nav route={shown} />
      <SideNav route={shown} />
      {onProjects ? <Projects /> : onHistory ? <History /> : <Home />}
      <AdminBar />
    </>
  );
}
