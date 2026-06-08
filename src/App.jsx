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
  return (
    <nav className={'nav' + (scrolled ? ' is-scrolled' : '')}>
      <a className="brand" href="#top" aria-label="ThemedMotion home">
        <img className="brand-logo" src="assets/themedmotion-logo.png" alt="ThemedMotion by P&P Projects" />
      </a>

      <div className="nav-actions">
        <a className="nav-back" href={PP_PROJECTS_URL} target="_blank" rel="noopener noreferrer" aria-label="Go to P&P Projects (opens in a new tab)" title="P&P Projects">
          <span className="nav-back-label">P&amp;P Projects</span>
          <span className="nav-back-arrow" aria-hidden="true">↗</span>
        </a>
        <a href="#/projects" className={'nav-projects' + (onProjects ? ' is-active' : '')}>
          Work
        </a>
        <a className="nav-cta" href="#contact" onClick={scrollToContact}>Let's Make It Move →</a>
      </div>
    </nav>
  );
}

// Vertical section slider on the right edge — a "you are here" dot rail that
// tracks scroll and jumps to a section on click. Home only, desktop only.
function SideNav({ route }) {
  const items = [{ id: 'top', label: 'Intro' }, ...SECTIONS, { id: 'contact', label: 'Contact' }];
  const active = useActive(items.map((i) => i.id));
  const scrolled = useScrolled(0.5);
  if (route === '#/projects') return null;
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
      <iframe
        src="https://www.youtube-nocookie.com/embed/Xd1TWkdMRRs?autoplay=1&mute=1&loop=1&playlist=Xd1TWkdMRRs&controls=0&modestbranding=1&rel=0&playsinline=1&iv_load_policy=3&disablekb=1&fs=0"
        title="ThemedMotion reel"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        tabIndex={-1}
        aria-hidden="true"
      />
      <div className="copy">
        <div>
          <h1>Quality motion for <em>powerful stories</em>.</h1>
          <p className="banner-sub">Animatronics, animated figures and show action equipment</p>
        </div>
      </div>
      <div className="scroll-cue">
        <span>Scroll</span>
        <span className="line"></span>
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

function MotorWiringBoard() {
  return (
    <div className="cc-board mw-board">
      <div className="cc-board-grid-bg" aria-hidden="true"></div>
      <div className="mw-cells">
        <div className="cc-cell mw-cell-hero">
          <img src="assets/mw-routing.png" alt="Drive routing study with arrows" />
          <div className="cc-cell-tag">Routing study · MW-A</div>
        </div>
        <div className="cc-cell mw-cell-detail">
          <img src="assets/mw-detail.png" alt="Joint detail with integrated cable run" />
          <div className="cc-cell-tag">Joint detail · MW-B</div>
        </div>
      </div>
      <div className="cc-board-meta">
        <div className="cc-board-title">Drive · MW-04</div>
        <div className="cc-board-sub">Integrated drive actuators · in-bone wiring</div>
      </div>
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
function Section({ id, num, chapter, title, em, beats, visual, flip }) {
  return (
    <section className={'sec' + (flip ? ' flip' : '')} id={id}>
      <div className="sec-visual">{visual}</div>
      <div className="sec-panel">
        <div className="sec-head reveal">
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
      <div className="ukkie-svg" dangerouslySetInnerHTML={{ __html: ukkieModelSvg }} />
      <div className="ukkie-floor" aria-hidden="true"></div>
      <div className="ukkie-tag">UKKIE · SKETCH → MODEL</div>
    </div>
  );
}

// Control-section visual: the real CritterControl hardware as 3D models
// (converted from the supplied STEP CAD). Both pieces — the control box and the
// FSCS module that lives inside it — are shown together, each independently
// draggable. Auto radius lets model-viewer frame each model so neither clips.
function ControlVisual() {
  return (
    <div className="mv-stage mv-duo">
      <div className="mv-item">
        <model-viewer
          className="mv"
          src="assets/control-box.glb"
          alt="CritterControl control box — 3D"
          orientation="0deg -90deg 0deg"
          camera-controls
          interaction-prompt="none"
          disable-zoom
          touch-action="pan-y"
          loading="lazy"
          environment-image="neutral"
          shadow-intensity="0.9"
          shadow-softness="0.85"
          exposure="1.05"
          camera-orbit="22deg 75deg 3.4m"
          camera-target="1.12m 0.14m -0.05m"
        ></model-viewer>
        <div className="mv-label">Control box</div>
      </div>
      <div className="mv-item">
        <model-viewer
          className="mv"
          src="assets/fscs.glb"
          alt="CritterControl FSCS module — 3D"
          orientation="0deg 0deg 0deg"
          camera-controls
          interaction-prompt="none"
          disable-zoom
          touch-action="pan-y"
          loading="lazy"
          environment-image="neutral"
          shadow-intensity="0.9"
          shadow-softness="0.85"
          exposure="1.05"
          camera-orbit="22deg 75deg auto"
          camera-target="auto auto auto"
        ></model-viewer>
        <div className="mv-label">FSCS module</div>
      </div>
      <div className="mv-hint" aria-hidden="true">Drag to rotate</div>
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
  // theta 102° = rotated 90° from the side view so the figure faces front.
  const TARGET = '6.585m 119.8m -3.3m';
  const ORBIT = '102deg 80deg 560m';

  // Lock the structure's animation time to the body's, every frame.
  useEffect(() => {
    let raf;
    const sync = () => {
      const s = shellsRef.current, f = frameRef.current;
      if (s && f && s.loaded && f.loaded) {
        const st = s.currentTime || 0;
        if (Math.abs((f.currentTime || 0) - st) > 0.03) f.currentTime = st;
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
          loading="lazy"
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
          camera-target={TARGET}
          camera-orbit={ORBIT}
          loading="lazy"
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
    </div>
  );
}

// Animation-section visual: an artsy, abstract representation of motion curves on
// a timeline (we can't show the real CritterControl software for IP reasons).
function CurvesVisual() {
  return (
    <div className="curves-stage">
      <svg className="curves-svg" viewBox="0 0 600 440" fill="none" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <g className="curves-grid">
          {[80, 160, 240, 320].map((y) => <line key={y} x1="40" y1={y} x2="560" y2={y} />)}
          {[120, 240, 360, 480].map((x) => <line key={x} x1={x} y1="50" x2={x} y2="360" className="v" />)}
        </g>
        <path className="curve c1" d="M40 250 C 150 110, 250 300, 350 180 S 520 120, 560 220" />
        <path className="curve c2" d="M40 180 C 140 240, 240 130, 340 250 S 500 280, 560 170" />
        <g className="curve-keys">
          {[[40,250],[180,150],[350,180],[480,150],[560,220]].map(([x,y],i)=>(
            <rect key={i} x={x-4} y={y-4} width="8" height="8" transform={`rotate(45 ${x} ${y})`} />
          ))}
        </g>
        <line className="curves-playhead" x1="0" y1="44" x2="0" y2="366" />
        <g className="curves-ruler">
          {[0,1,2,3,4,5].map((s)=>(<text key={s} x={40 + s*104} y="392">0{s}s</text>))}
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
          if (!v.getAttribute('src')) v.setAttribute('src', 'assets/finishing.mp4');
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
        poster="assets/finishing-poster.jpg"
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
            <div className="row"><span className="k">Studio</span><span className="v">Vlechter 28<br />5711 LS Someren · NL</span></div>
            <div className="row"><span className="k">Email</span><span className="v">info@ppprojects.com</span></div>
            <div className="row"><span className="k">Phone</span><span className="v">+31 0493 694 511</span></div>
            <div className="row"><span className="k">Hours</span><span className="v">Mon–Fri · 09:00–17:30 CET</span></div>
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
            <div className="row-2">
              <div className="field">
                <label htmlFor="cl">Project location</label>
                <input id="cl" type="text" placeholder="City / park / country" />
              </div>
              <div className="field">
                <label htmlFor="cb">Budget range</label>
                <select id="cb" defaultValue="">
                  <option value="" disabled>Select…</option>
                  <option>Under €50k</option>
                  <option>€50k – €150k</option>
                  <option>€150k – €500k</option>
                  <option>€500k+</option>
                  <option>Need guidance</option>
                </select>
              </div>
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
      <div>© 2026 P&amp;P Projects B.V.</div>
      <a className="footer-back" href={PP_PROJECTS_URL} target="_blank" rel="noopener noreferrer">P&amp;P Projects <span aria-hidden="true">↗</span></a>
      <div>ThemedMotion</div>
    </footer>
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
        visual={<UkkieStage />}
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
          { h: 'Engineered for the real world.', p: <>Every figure faces different demands, so we apply mechanical analysis based on the specific requirements of each project — structural analysis, dynamic analysis, overhead load calculations, fatigue evaluation, wind loading, vibration, or environmental considerations. The goal is not to overengineer everything equally, but to apply the right validation where it matters for safety, reliability, and long-term performance.</> },
          { h: 'Verified beyond our workshop.', p: <>Safety and reliability are part of the engineering process from the very beginning. Alongside our internal analysis and validation workflows, we collaborate with specialized third-party reviewers when required, to independently assess structures, safety-critical systems, and installation conditions.</> },
        ]}
        visual={
          <Bp title="Load case · ME-08" code="ANALYSIS · FEA">
            <img src="assets/mech-analysis-joint.png" alt="Mechanical analysis with load visualizations" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '24px' }} />
          </Bp>
        }
      />

      {/* 04 · ACTUATORS */}
      <Section
        flip
        id="actuators"
        num="04"
        chapter="Chapter 04 · Actuators"
        title="The"
        em="powerhouse."
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
        visual={<CurvesVisual />}
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

const PROJECTS = [
  { img: 'octopus-hero.png', name: 'Joey', cat: 'Queue-line character', wide: true },
  { img: 'vulkan-concept.png', name: 'Vulkan', cat: 'Show · finale figure', wide: true },
  { img: 'cc-rack-open.png', name: 'CritterControl', cat: 'Show control hardware', wide: true },
  { img: 'peek-animatronic.png', name: 'The Guardian', cat: 'Full-body figure' },
  { img: 'vulkan-skeleton.png', name: 'Vulkan Endoskeleton', cat: 'Mechanical engineering' },
  { img: 'joey-front.png', name: 'Joey · Finish', cat: 'Paint & silicone' },
  { img: 'mw-routing.png', name: 'Drive & Wiring', cat: 'Integrated actuation', wide: true },
  { img: 'mech-analysis-joint.png', name: 'Range of Motion', cat: 'Kinematic analysis' },
];

function Projects() {
  useReveal();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return (
    <>
      <header className="portfolio-head">
        <div className="portfolio-head-bg" aria-hidden="true">
          <img className="portfolio-head-img" src="assets/octopus-hero.png" alt="" />
        </div>
        <div className="portfolio-head-inner reveal">
          <div className="kicker">Selected work · 2016—2026</div>
          <h1>Projects.</h1>
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
            <a
              key={p.img}
              className={'proj-tile reveal' + (p.wide ? ' proj-wide' : '') + (i % 3 === 1 ? ' d1' : i % 3 === 2 ? ' d2' : '')}
              href="#contact"
              onClick={scrollToContact}
              data-index={String(i + 1).padStart(2, '0')}
              aria-label={`${p.name} — ${p.cat}`}
            >
              <img src={`assets/${p.img}`} alt={p.name} loading="lazy" />
              <span className="proj-explore">Explore →</span>
              <div className="proj-overlay">
                <div className="proj-cat">{p.cat}</div>
                <div className="proj-name">{p.name}</div>
              </div>
            </a>
          ))}
        </div>
      </section>

      <Contact />

      <SiteFooter />
    </>
  );
}

export default function App() {
  const route = useHashRoute();
  const onProjects = route === '#/projects';
  // The Work/Projects page is a normal long page — never a snap deck.
  useEffect(() => {
    document.documentElement.classList.toggle('route-projects', onProjects);
    return () => document.documentElement.classList.remove('route-projects');
  }, [onProjects]);
  return (
    <>
      <Nav route={route} />
      <SideNav route={route} />
      {onProjects ? <Projects /> : <Home />}
    </>
  );
}
