import { useState, useEffect, useRef } from 'react';
import { SoftSketch } from './Sketches.jsx';
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

const SECTIONS = [
  { id: 'design', label: 'Design' },
  { id: 'engineering', label: 'Engineering' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'actuators', label: 'Actuators' },
  { id: 'control', label: 'Control' },
  { id: 'animation', label: 'Animation' },
  { id: 'finishing', label: 'Finishing' },
];

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

// Parent P&P Projects site — the "back" affordance pairs with the link they
// add on their side pointing into this experience.
const PP_PROJECTS_URL = 'https://www.ppprojects.com/';

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
  const onProjects = route === '#/projects';
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
      <nav className={'nav' + (scrolled ? ' is-scrolled' : '') + (menuOpen ? ' menu-is-open' : '')}>
        <a className="brand" href="#top" aria-label="ThemedMotion home" onClick={goSection('top')}>
          <img className="brand-logo" src="assets/themedmotion-logo.png" alt="ThemedMotion by P&P Projects" />
        </a>

        <div className="nav-actions">
          <a className="nav-back" href={PP_PROJECTS_URL} target="_blank" rel="noopener noreferrer" aria-label="Go to P&P Projects (opens in a new tab)" title="P&P Projects">
            <span className="nav-back-label">P&amp;P Projects</span>
            <span className="nav-back-arrow" aria-hidden="true">↗</span>
          </a>
          <a
            href="#top"
            className={'nav-projects' + (!route.startsWith('#/') ? ' is-active' : '')}
            onClick={goSection('top')}
          >
            Process
          </a>
          <a href="#/projects" className={'nav-projects' + (onProjects ? ' is-active' : '')}>
            Work
          </a>
          <a href="#/history" className={'nav-projects' + (route === '#/history' ? ' is-active' : '')}>
            History
          </a>
          <a className="nav-cta" href="#contact" onClick={(e) => { setMenuOpen(false); scrollToContact(e); }}>Let's Make It Move →</a>
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
          <div className="mm-kicker">Menu</div>
          <div className="mm-links">
            {menuItems.map((it, i) => (
              <a key={it.id} className="mm-link" href={`#${it.id}`} onClick={goSection(it.id)}>
                <span className="idx">{String(i).padStart(2, '0')}</span>
                {it.label}
              </a>
            ))}
            <a className="mm-link" href="#/projects" onClick={() => setMenuOpen(false)}>
              <span className="idx">↗</span>
              Work
            </a>
            <a className="mm-link" href="#/history" onClick={() => setMenuOpen(false)}>
              <span className="idx">↗</span>
              History
            </a>
          </div>
          <div className="mm-foot">
            <a className="mm-cta" href="#contact" onClick={(e) => { setMenuOpen(false); scrollToContact(e); }}>Let's Make It Move →</a>
            <a className="mm-ext" href={PP_PROJECTS_URL} target="_blank" rel="noopener noreferrer">
              P&amp;P Projects ↗
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
              <span className="sidenav-name">{s.label}</span>
              <span className="sidenav-dot" aria-hidden="true"></span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Banner() {
  return (
    <section className="banner" id="top">
      <img className="banner-fallback" src="assets/octopus-hero.png" alt="" aria-hidden="true" />
      {/* Self-hosted reel — native muted autoplay loop, zero player chrome. */}
      <video
        className="banner-video"
        src="assets/banner-reel.mp4"
        poster="assets/banner-reel-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        tabIndex={-1}
        aria-hidden="true"
      />
      <div className="copy">
        <div className="banner-kicker">Animatronics, animated figures and show action equipment</div>
        <h1>Quality motion for<br /><em>powerful stories.</em></h1>
      </div>
      <div className="banner-meta">Eindhoven, NL · Est. P&amp;P Projects</div>
      <div className="scroll-cue" aria-hidden="true">
        <span className="scroll-word">Scroll</span>
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
  const vref = useRef(null);
  useEffect(() => {
    const v = vref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          if (!v.getAttribute('src')) v.setAttribute('src', 'assets/analysis-fea.mp4');
          try { v.currentTime = 0; } catch (_) {}   // restart from the start on entry
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <Bp title="Load case · ME-08" code="ANALYSIS · FEA">
      <video
        ref={vref}
        className="bp-video"
        muted
        loop
        playsInline
        preload="none"
        poster="assets/analysis-fea-poster.jpg"
        aria-hidden="true"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </Bp>
  );
}

// Muted, seamless-looping video. It restarts from the beginning each time its
// section actually scrolls into view (not 400px early), so you always catch the
// animation from the start instead of mid-way. Source clips are pre-trimmed so
// the last frame isn't a duplicate of the first — the loop runs with no jump.
function LoopVideo({ src, poster, className }) {
  const ref = useRef(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          if (!v.getAttribute('src')) v.setAttribute('src', src);
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
    <video ref={ref} className={className} muted loop playsInline preload="none" poster={poster} aria-hidden="true" />
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
      <LoopVideo className="mw-fill" src="assets/mw-routing-anim.mp4" poster="assets/mw-routing-anim-poster.jpg" />
      <div className="cc-cell-tag mw-tag">Routing study · MW-A</div>
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
function Section({ id, num, chapter, title, em, beats, visual, flip, mark }) {
  return (
    <section className={'sec' + (flip ? ' flip' : '')} id={id}>
      <div className="sec-visual">{visual}</div>
      <div className="sec-panel">
        <div className={'sec-head reveal' + (mark ? ' has-mark' : '')}>
          {mark && <MotionMark className="sec-mark" />}
          <div className="sec-num">{num}<span>/ 07</span></div>
          <h2 className="sec-title">{title} <em>{em}</em></h2>
        </div>
        <div className="sec-beats reveal d1">
          {beats.map((b, i) => (
            <div className="beat" key={i}>
              <div className="beat-idx">{String(i + 1).padStart(2, '0')} / {String(beats.length).padStart(2, '0')}</div>
              <div className="beat-body">
                <h3>{b.h}</h3>
                <p>{b.p}</p>
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

// Design-section visual: the concept sketch morphs into the rigged 3D critter —
// one stage, sketch then model, the idea becoming the result.
function DesignVisual() {
  return <UkkieStage />;
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
      <LoopVideo className="mv-fill" src="assets/control-box.mp4" poster="assets/control-box-poster.jpg" />
      <div className="mv-label mv-label-solo">Control box</div>
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
        <span className="vulkan-end">Structure</span>
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
        <span className="vulkan-end">Body</span>
      </div>
      <div className="rotate3d-tag">VULKAN SC11</div>
      <div className="vulkan-hint" aria-hidden="true">Drag to rotate</div>
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
  const vref = useRef(null);
  useEffect(() => {
    const v = vref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          if (!v.getAttribute('src')) v.setAttribute('src', 'assets/finishing-v2.mp4');
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      },
      { rootMargin: '400px 0px' },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <section className="finishing" id="finishing">
      <video
        ref={vref}
        className="finishing-video"
        muted
        loop
        playsInline
        preload="none"
        poster="assets/finishing-v2-poster.jpg"
        aria-hidden="true"
      />
      <div className="finishing-scrim" aria-hidden="true"></div>
      <div className="finishing-inner">
        <div className="sec-head reveal">
          <div className="sec-num">07<span>/ 07</span></div>
          <h2 className="sec-title">And then it <em>comes to life.</em></h2>
        </div>
        <div className="sec-beats finishing-beats reveal d1">
          {beats.map((b, i) => (
            <div className="beat" key={i}>
              <div className="beat-idx">{String(i + 1).padStart(2, '0')} / {String(beats.length).padStart(2, '0')}</div>
              <div className="beat-body">
                <h3>{b.h}</h3>
                <p>{b.p}</p>
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

// Shared contact section — rendered identically on Home and Projects, so any
// edit here reflects on both pages.
function Contact() {
  return (
    <section className="contact" id="contact">
      <div className="contact-inner">
        <div className="reveal">
          <div className="kicker">Contact · Let's make it move</div>
          <h2>Now, we'd love to make it <em>move.</em></h2>
          <p className="lede">
            A queue-line character, a dark ride animatronic, a stunt figure, a parade character, a creature effect, a custom show-action mechanism, or something that has never been built before. Drop a few lines and we'll be in touch within 48 hours with a calendar link and some honest questions.
          </p>
          <div className="info">
            <div className="row"><span className="k">Headquarters</span><span className="v">Vlechter 28<br />5711 LS Someren · NL</span></div>
            <div className="row"><span className="k">Email</span><span className="v">ThemedMotion@ppprojects.com</span></div>
            <div className="row"><span className="k">Phone</span><span className="v">+31 0493 694 511</span></div>
            <div className="row"><span className="k">Hours</span><span className="v">Mon–Friday · 8:30–17:00 CET</span></div>
          </div>
        </div>
        <div className="form-wrap reveal d1">
          <div className="peek peek-mormel">
            <div className="speech">Psst — over here.</div>
            <img className="peek-base" src="assets/mormel.png" alt="" />
            <img className="peek-paw" src="assets/mormel-hand.png" alt="" aria-hidden="true" />
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              alert('Thanks! We’ll be in touch within 48 hours.');
            }}
          >
            <div className="form-title">Brief us in 60 seconds</div>
            <div className="form-sub">No NDA needed yet</div>
            <div className="row-2">
              <div className="field">
                <label htmlFor="cn">Your name</label>
                <input id="cn" type="text" placeholder="Jane Doe" required />
              </div>
              <div className="field">
                <label htmlFor="cc">Company</label>
                <input id="cc" type="text" placeholder="Studio / venue" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="ce">Email</label>
              <input id="ce" type="email" placeholder="you@studio.com" required />
            </div>
            <div className="field">
              <label htmlFor="cl">Project location</label>
              <input id="cl" type="text" placeholder="City / park / country" />
            </div>
            <div className="field">
              <label htmlFor="cm">Tell us what you'd love to make move</label>
              <textarea id="cm" placeholder="A queue-line character, a dark ride animatronic, a creature effect…"></textarea>
            </div>
            <button type="submit" className="cta-btn">
              Send brief <span className="arrow">→</span>
            </button>
            <div className="form-foot">We reply within 48 hours · Your brief stays with us</div>
          </form>
        </div>
      </div>
    </section>
  );
}

// Shared site footer
function SiteFooter() {
  return (
    <footer>
      <div>© 2026 ThemedMotion B.V.</div>
      <a className="footer-back" href={PP_PROJECTS_URL} target="_blank" rel="noopener noreferrer">P&amp;P Projects <span aria-hidden="true">↗</span></a>
      <div>ThemedMotion</div>
    </footer>
  );
}

// ---- Motion Graph Editor: interactive animation-curve editor (Animation §) ----
const MGE_W = 900, MGE_DUR = 5, MGE_FPS = 30;
const MGE_CHANNELS = [
  { key: 'opacity',  name: 'Opacity',    color: 'oklch(0.63 0.20 28)',  freq: 1.6,  phase: 0 },
  { key: 'scale',    name: 'Scale',      color: 'oklch(0.70 0.15 72)',  freq: 1.3,  phase: 2.1 },
  { key: 'posx',     name: 'Position X', color: 'oklch(0.60 0.13 175)', freq: 1.85, phase: 4.0 },
  { key: 'posy',     name: 'Position Y', color: 'oklch(0.55 0.16 256)', freq: 0.9,  phase: 1.0 },
  { key: 'rotation', name: 'Rotation',   color: 'oklch(0.58 0.19 350)', freq: 2.15, phase: 5.0 },
];
const mgeVal = (ch, t) => 0.5 + 0.42 * Math.sin((2 * Math.PI * ch.freq * t) / MGE_DUR + ch.phase);
const mgeX = (t) => (t / MGE_DUR) * MGE_W;
const mgeY = (v) => 22 + (1 - v) * 396;
const mgePath = (ch) => {
  const N = 260; let d = '';
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * MGE_DUR;
    d += (i ? 'L' : 'M') + mgeX(t).toFixed(1) + ' ' + mgeY(mgeVal(ch, t)).toFixed(1) + ' ';
  }
  return d.trim();
};
// Curves are static — precompute paths, fills and keyframe points once.
const MGE_DATA = MGE_CHANNELS.map((ch) => ({
  ...ch,
  d: mgePath(ch),
  fill: mgePath(ch) + ` L${MGE_W} ${mgeY(0)} L0 ${mgeY(0)} Z`,
  keys: [0, 1, 2, 3, 4, 5].map((s) => ({ x: mgeX(s), y: mgeY(mgeVal(ch, s)) })),
}));

// Non-interactive: the playhead sweeps and loops on its own, and each loop the
// focus moves to the next channel — a self-running showcase, not a control.
function MotionGraphEditor() {
  const [sel, setSel] = useState('posx');
  const [time, setTime] = useState(0);
  const [visible, setVisible] = useState(true);
  const wrapRef = useRef(null);
  const lastRef = useRef(0);

  // Pause the loop when the slide is off-screen.
  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Playhead sweep (~0.9 u/s); on each loop, focus the next channel.
  useEffect(() => {
    if (!visible) { lastRef.current = 0; return; }
    let raf;
    const step = (now) => {
      if (!lastRef.current) lastRef.current = now;
      const dt = Math.min(0.05, (now - lastRef.current) / 1000);
      lastRef.current = now;
      setTime((t) => {
        const n = t + dt * 0.9;
        if (n >= MGE_DUR) {
          setSel((cur) => MGE_CHANNELS[(MGE_CHANNELS.findIndex((c) => c.key === cur) + 1) % MGE_CHANNELS.length].key);
          return n - MGE_DUR;
        }
        return n;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  const selCh = MGE_DATA.find((c) => c.key === sel);
  const px = mgeX(time);
  const py = mgeY(mgeVal(selCh, time));

  return (
    <div className="mge-wrap" ref={wrapRef}>
      <div className="mge-card">
        <div className="mge-head">
          <div className="mge-head-l">
            <span className="mge-chip">Animation</span>
            <div className="mge-title">Graph Editor</div>
            <div className="mge-sub">Value channels · 5.00s · 30 fps</div>
          </div>
          <div className="mge-head-r">
            <div className="mge-time">{time.toFixed(2).padStart(5, '0')}s</div>
          </div>
        </div>
        <div className="mge-body">
          <div className="mge-yaxis">{[100, 75, 50, 25, 0].map((v) => <span key={v}>{v}</span>)}</div>
          <svg className="mge-svg" viewBox="0 0 900 440" preserveAspectRatio="none" aria-hidden="true">
            <g className="mge-grid">
              {[0, 25, 50, 75, 100].map((p) => { const y = mgeY(p / 100); return <line key={p} x1="0" y1={y} x2="900" y2={y} className={p === 50 ? 'mid' : ''} />; })}
              {[0, 1, 2, 3, 4, 5].map((s) => <line key={s} className="v" x1={mgeX(s)} y1="0" x2={mgeX(s)} y2="440" />)}
            </g>
            <path className="mge-fill" d={selCh.fill} style={{ fill: selCh.color }} />
            {MGE_DATA.map((ch) => (
              <path key={ch.key} className={'mge-curve' + (ch.key === sel ? ' is-sel' : '')} d={ch.d} style={{ stroke: ch.color, color: ch.color }} />
            ))}
            {selCh.keys.map((k, i) => (
              <rect key={i} className="mge-kf" x={k.x - 6} y={k.y - 6} width="12" height="12" style={{ stroke: selCh.color }} />
            ))}
            <line className="mge-ph" x1={px} y1="0" x2={px} y2={mgeY(0)} />
            <circle className="mge-ph-top" cx={px} cy="22" r="5" />
            <circle className="mge-ph-dot" cx={px} cy={py} r="6" style={{ fill: selCh.color }} />
          </svg>
        </div>
        <div className="mge-taxis">{[0, 1, 2, 3, 4, 5].map((s) => <span key={s}>{String(s).padStart(2, '0')}s</span>)}</div>
        <div className="mge-legend">
          {MGE_DATA.map((ch) => (
            <div key={ch.key} className={'mge-leg' + (ch.key === sel ? ' is-sel' : '')} style={{ '--c': ch.color }}>
              <span className="mge-leg-dot" />
              <span className="mge-leg-name">{ch.name}</span>
              <span className="mge-leg-val">{Math.round(mgeVal(ch, time) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Home() {
  useReveal();
  // When arriving on the home page with a section fragment (e.g. coming back
  // from the Projects page via a nav link), scroll that section into view.
  // Retry a couple of times because the hero iframe and stage images grow the
  // page after first paint, which would otherwise leave us scrolled short.
  useEffect(() => {
    const h = window.location.hash;
    if (!h || h.length <= 1 || h.startsWith('#/')) return;
    const id = h.slice(1);
    const scroll = () => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView();
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

      {/* 01 · DESIGN */}
      <Section
        id="design"
        num="01"
        chapter="Chapter 01 · Design"
        title="It all starts with"
        em="an idea."
        beats={[
          { h: 'We begin wherever you are.', p: <>Every creative process is different. Whether you already have a finished design, a loose sketch, or only the beginning of an idea, we can join the project where it stands today. In collaboration with the design department of P&amp;P Projects, we help shape concepts into defined and buildable characters.</> },
          { h: 'Creative 3D modelling.', p: <>An idea truly starts to take shape once it becomes three-dimensional. During the modelling process, sketches, references or existing models are translated into a detailed digital sculpture that defines the appearance and proportions of the figure.</> },
          { h: 'Movement with intent.', p: <>The purpose of engineering is not to decide how a character should perform, but to make the intended performance possible. By defining movement during the creative stage, motion becomes part of the storytelling process instead of only a technical solution.</> },
        ]}
        visual={<DesignVisual />}
      />

      {/* 02 · ENGINEERING */}
      <Section
        flip
        id="engineering"
        num="02"
        chapter="Chapter 02 · Engineering"
        title="Mechanical"
        em="engineering."
        beats={[
          { h: 'Engineering for performance.', p: <>The figure is developed internally through mechanical engineering. Motors, actuators, linkages, and structures are integrated into the character and documented to the highest standards — the engineering supports the performance of the figure, allowing the mechanics to serve the character rather than reshape it around technical convenience.</> },
          { h: 'Designed for long-term operation.', p: <>Mechanical engineering is not only about making a figure move, but about making it reliable, maintainable, and built for long-term operation. We focus on service accessibility, durable construction, efficient layouts, and components that withstand continuous use in demanding environments.</> },
          { h: 'Built for all conditions.', p: <>Our creations rarely live in ideal environments. Outdoor installations, underwater scenes, chlorinated or salt water, humidity, dust, heat, and continuous indoor operation each place different demands on a character. We design with those conditions in mind from the very beginning.</> },
        ]}
        visual={<VulkanStage />}
      />

      {/* 03 · ANALYSIS */}
      <Section
        id="analysis"
        num="03"
        chapter="Chapter 03 · Analysis"
        title="Calculated beyond"
        em="assumptions."
        beats={[
          { h: 'Engineered for the Real World', p: <>Every figure faces different demands, which is why we apply mechanical analysis based on the specific requirements of each project. Depending on the installation and operating conditions, this can include structural analysis, dynamic analysis, overhead load calculations, fatigue evaluation, wind loading, vibration analysis, or environmental considerations. The goal is not to overengineer every component, but to apply the right level of engineering validation where it truly matters for safety, reliability, and long-term performance.</> },
          { h: 'Verified beyond our workshop.', p: <>Safety and reliability are part of the engineering process from the very beginning. Alongside our internal analysis and validation workflows, we collaborate with specialized third-party reviewers when required, to independently assess structures, safety-critical systems, and installation conditions.</> },
        ]}
        visual={<AnalysisVisual />}
      />

      {/* 04 · ACTUATORS */}
      <Section
        flip
        id="actuators"
        num="04"
        chapter="Chapter 04 · Actuators"
        title=""
        em="Actuators"
        beats={[
          { h: 'Electrical motion, done right.', p: <>The actuator is the heart of every animatronic figure. We primarily work with electrical actuators for their precision, smooth motion, and overall quality of movement. Pneumatics remain in our toolbox where requested or where environmental conditions make them the better solution. Over the years we've worked with many leading actuator manufacturers and developed clear preferences for their most effective use.</> },
          { h: 'Say goodbye to cable strain.', p: <>We use integrated drive actuators — motor, encoder, and drive electronics combined into a single compact unit. Communication and power are daisy-chained directly through the actuators, leaving a <b>single cable path</b> running through the character. Fewer cables means cleaner routing, fewer failure points, and far greater flexibility through compact spaces and moving joints.</> },
          { h: 'Designed for real operation.', p: <>Our systems are engineered with long-term operation and maintenance in mind. Actuators are selected for reliability, serviceability, and availability — positioned for accessibility, with replacement units often available within days rather than months.</> },
        ]}
        visual={<MotorWiringBoard />}
      />

      {/* 05 · CONTROL */}
      <Section
        id="control"
        num="05"
        chapter="Chapter 05 · Control"
        title="Control even the"
        em="finest detail."
        beats={[
          { h: 'The brain behind our characters.', p: <>Every character is powered by our custom-designed <b>CritterControl</b> hardware, installed directly inside the figure's control cabinet. Acting as the main brain, it manages motion, timing, feedback, and communication across the entire figure. Developed fully in-house, it interfaces with integrated drive actuators, pneumatics, industrial equipment, sensors, effects, and show-control infrastructure — a flexible foundation for virtually any animated figure.</> },
          { h: 'Performance monitoring.', p: <>With <b>CritterControl Center</b>, operators monitor the status and performance of characters from a central location and, if desired, remotely from anywhere in the world. The platform surfaces character health, behaviour, and maintenance needs before they become failures. Remote connectivity is always configured to the privacy requirements of the park or operator.</> },
        ]}
        visual={<ControlVisual />}
      />

      {/* 06 · ANIMATION */}
      <Section
        flip
        id="animation"
        num="06"
        chapter="Chapter 06 · Animation"
        title="Choreography"
        em="in code."
        beats={[
          { h: 'Animation without limits.', p: <>Characters are animated using our <b>CritterControl Animation Tool</b>, a software environment designed specifically for animatronics. It lets us craft detailed performances with precise control over motion, timing, and synchronization — and supports hundreds of animations per character, so operators can even create their own.</> },
          { h: 'Control to the finest detail.', p: <>CritterControl lets us prepare performances with precise control over motion curves, keyframes, interpolation, timing, synchronization, triggers, and show sequencing. Using a real-time 3D workflow, we preview, refine, and adjust performances directly around the intended movement of the figure — before and during integration.</> },
        ]}
        visual={<MotionGraphEditor />}
      />

      {/* 07 · FINISHING */}
      <FinishingSection
        beats={[
          { h: 'From a machine to a being.', p: <>The finishing stage is where the mechanical figure becomes a believable character. Rigid shells define the silhouette, proportions, and fine details while integrating carefully around the internal structure. All shells are developed digitally over the validated mechanical assembly — so clearances, movement ranges, and interactions are verified before fabrication, whether through reinforced 3D printing, fiberglass moulding, or both.</> },
          { h: 'Flexible skins.', p: <>Flexible materials are used where a more organic appearance or movement is required — faces, necks, hands, and transition zones. Silicone skins, artificial fur, fabrics, and costume elements are all designed around the motion of the figure itself, balancing expression, durability, and serviceability from the earliest stages.</> },
          { h: 'Built for operation and maintenance.', p: <>A finished character should look convincing on opening day and stay that way for years. Coatings, paint systems, and finishing materials are selected for the intended environment — indoor, outdoor, humid, or high-wear — while removable panels and hidden access points keep it maintainable.</> },
        ]}
      />

      {/* CONTACT */}
      <Contact />

      <SiteFooter />
    </>
  );
}

// Order interleaves landscape/portrait shots so the masonry columns balance.
// `card: true` frames the piece on a cream card (concept art / drawings),
// mixing light tiles into the dark gallery like the reference.
const PROJECTS = [
  { img: 'octopus-hero.png', name: 'Joey', cat: 'Queue-line character' },
  { img: 'peek-animatronic.png', name: 'The Guardian', cat: 'Full-body figure' },
  { img: 'vulkan-concept.png', name: 'Vulkan', cat: 'Show · finale figure', card: true },
  { img: 'vulkan-skeleton.png', name: 'Vulkan Endoskeleton', cat: 'Mechanical engineering' },
  { img: 'joey-front.png', name: 'Joey · Finish', cat: 'Paint & silicone' },
  { img: 'cc-rack-open.png', name: 'CritterControl', cat: 'Show control hardware' },
  { img: 'mech-analysis-joint.png', name: 'Range of Motion', cat: 'Kinematic analysis', card: true },
  { img: 'mw-routing.png', name: 'Drive & Wiring', cat: 'Integrated actuation', card: true },
];

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

function Projects() {
  useReveal();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return (
    <>
      <header className="portfolio-head">
        <div className="portfolio-head-inner reveal">
          <div className="work-title-wrap">
            <MotionMark className="work-mark" />
            <h1>Work<span className="dot">.</span></h1>
          </div>
          <p className="head-sub">
            Characters, show figures and custom show-action mechanisms — designed,
            engineered and built end to end in our studio for theme parks, museums
            and brand experiences around the world.
          </p>
          <div className="portfolio-tags">
            <span>Theme parks</span>
            <span>Museums</span>
            <span>Brand experiences</span>
            <span>Live shows</span>
          </div>
        </div>
      </header>

      <section className="portfolio">
        <div className="portfolio-grid">
          {PROJECTS.map((p, i) => (
            <figure
              key={p.img}
              className={'proj-tile reveal' + (p.card ? ' proj-card' : '') + (i % 3 === 1 ? ' d1' : i % 3 === 2 ? ' d2' : '')}
              data-index={String(i + 1).padStart(2, '0')}
              aria-label={`${p.name} — ${p.cat}`}
            >
              <div className="proj-media">
                <img src={`assets/${p.img}`} alt={p.name} loading="lazy" />
              </div>
              <figcaption className="proj-meta">
                <span className="proj-cat">{p.cat}</span>
                <span className="proj-name">{p.name}</span>
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
function PhotoReel({ dir, count, reverse, onOpen }) {
  const imgs = Array.from({ length: count }, (_, i) => `assets/history/${dir}/${String(i + 1).padStart(2, '0')}.jpg`);
  return (
    <div
      className={'photoreel reveal' + (reverse ? ' reverse' : '')}
      style={{ '--reel-dur': `${Math.round(count * 3.4)}s` }}
    >
      <div className="photoreel-track">
        {[...imgs, ...imgs].map((src, i) => (
          <button
            type="button"
            className="photoreel-item"
            key={i}
            onClick={() => onOpen(imgs, i % count)}
            aria-label="Open photo"
          >
            <img src={src} alt="" loading="lazy" draggable="false" />
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
function HistoryFilm({ name }) {
  return (
    <figure className="history-film reveal">
      <LoopVideo
        className="history-film-video"
        src={`assets/history/${name}.mp4`}
        poster={`assets/history/${name}-poster.jpg`}
      />
    </figure>
  );
}

const HISTORY_STORY = [
  { p: "Back then, motion was already part of who we were. At P&P Projects, we believed that a themed environment should do more than look beautiful. It should breathe. It should surprise. It should tell stories that people remember for years to come." },
  { p: "At a time when animatronics were still rare in Europe, we were already designing and building mechanical characters that captivated audiences. Those early characters helped shape what themed entertainment would become, making us one of the pioneers of animatronics." },
  { p: "Over the decades, our moving creations found homes in theme parks, museums, attractions and experiences across the world. Some of the very first characters we built are still performing today, more than thirty years after they were installed." },
  { reel: 'reel1', count: 19 },
  { p: "Motion has always been woven into the fabric of our company. Sometimes it was a single moving prop hidden within a larger attraction. Others, it was the centrepiece that brought an entire story to life. Every project taught us something new. Every installation added another chapter to our journey." },
  { p: "As P&P Projects grew, so did our team. New buildings were built. New disciplines joined the team. Artists, engineers, programmers, sculptors, electricians, decorators, project managers and more came together under one roof, each contributing their own craft to create unforgettable experiences." },
  { lead: true, p: "And our curiosity never stopped..." },
  { film: 'footage1' },
  { p: "In 2019, born from the ideas of our biggest dreamers, we began designing Mormel: A fully articulated character with more than 23 axes of motion. Mormel was more than a new animatronic. It challenged everything we thought we knew about motion. It pushed us to rethink how characters should move, how they should be maintained, and how technology could better serve storytellers." },
  { lead: true, p: "As development finalized in 2023, one thing became increasingly clear: motion needed its own home." },
  { p: "That realization became ThemedMotion, a new division within our company dedicated exclusively to motion innovation which was presented in IAAPA Europe." },
  { reel: 'reel2', count: 25, reverse: true },
  { p: "From the very beginning, we worked side by side with Europe's leading theme parks and listened carefully to operators, maintenance technicians, creatives and attraction owners from around the world. Their experiences became our blueprint. They told us where traditional animatronics fell short: maintenance that consumed too much time, lack of diagnostics, difficult programming, expensive ownership, and technology that often restricted creative freedom instead of potentializing it." },
  { p: "Based on their experiences, we reimagined the entire ecosystem and process around animatronics. We realized that the technology available on the market no longer met the expectations of modern attractions. Rather than waiting for someone else to solve those challenges, we decided to build the technology ourselves." },
  { p: "Remote monitoring. Intelligent diagnostics. Simplified maintenance. Flexible creative workflows. Reliable performance. Every innovation was developed with one goal in mind: giving storytellers the freedom to focus on creating unforgettable experiences, while making ownership easier throughout the lifetime of every character." },
  { film: 'footage2' },
  { p: "Today, ThemedMotion combines more than four decades of experience with a fresh vision for the future. Although our technology has evolved beyond anything we imagined in the 1980s, our main goal remains unchanged: creating experiences that make people smile, laugh, wonder and believe." },
  { lead: true, p: "Because there is no greater complement than guests believing in a character and not thinking of the technology behind it." },
];

function History() {
  useReveal();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Lightbox state: { images, index } when open, null when closed.
  const [lb, setLb] = useState(null);
  const openLb = (images, index) => setLb({ images, index });
  const closeLb = () => setLb(null);
  const navLb = (d) => setLb((s) => (s ? { ...s, index: (s.index + d + s.images.length) % s.images.length } : s));

  // Group runs of consecutive paragraphs into centred prose columns; reels and
  // films break out of that column full-bleed between the groups.
  const blocks = [];
  let buf = [];
  const flushProse = (key) => {
    if (buf.length) {
      blocks.push(<div className="history-prose reveal" key={'prose-' + key}>{buf}</div>);
      buf = [];
    }
  };
  HISTORY_STORY.forEach((b, i) => {
    if (b.reel) {
      flushProse(i);
      blocks.push(<PhotoReel key={i} dir={b.reel} count={b.count} reverse={b.reverse} onOpen={openLb} />);
    } else if (b.film) {
      flushProse(i);
      blocks.push(<HistoryFilm key={i} name={b.film} />);
    } else {
      buf.push(<p key={i} className={b.lead ? 'lead' : undefined}>{b.p}</p>);
    }
  });
  flushProse('end');

  return (
    <>
      <header className="portfolio-head">
        <div className="portfolio-head-inner reveal">
          <div className="work-title-wrap">
            <MotionMark className="work-mark" />
            <h1>History<span className="dot">.</span></h1>
          </div>
          <p className="head-sub">
            Our story began in 1989, long before the name ThemedMotion ever existed.
          </p>
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
  const onProjects = route === '#/projects';
  const onHistory = route === '#/history';
  // The Work and History pages are normal long pages — never snap decks.
  useEffect(() => {
    document.documentElement.classList.toggle('route-projects', onProjects);
    document.documentElement.classList.toggle('route-history', onHistory);
    return () => {
      document.documentElement.classList.remove('route-projects');
      document.documentElement.classList.remove('route-history');
    };
  }, [onProjects, onHistory]);
  return (
    <>
      <Nav route={route} />
      <SideNav route={route} />
      {onProjects ? <Projects /> : onHistory ? <History /> : <Home />}
    </>
  );
}
