import { useState, useEffect } from 'react';
import { SoftSketch } from './Sketches.jsx';

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
  { id: 'concept', label: 'Concept' },
  { id: 'design', label: 'Design' },
  { id: 'mechanical', label: 'Mechanical' },
  { id: 'controls', label: 'Analysis' },
  { id: 'motors', label: 'Motor' },
  { id: 'hardware', label: 'Hardware' },
  { id: 'animation', label: 'Animation' },
  { id: 'software', label: 'Software' },
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

function Nav({ route }) {
  const onProjects = route === '#/projects';
  const active = useActive(SECTIONS.map((s) => s.id));
  const scrolled = useScrolled();
  // The tracker is a "you are here" indicator for the process — show it only on
  // the home page and only once the hero has been scrolled past.
  const showSteps = scrolled && !onProjects;
  return (
    <nav className="nav">
      <a className="brand" href="#top" aria-label="ThemedMotion home">
        <img className="brand-logo" src="assets/themedmotion-logo.png" alt="ThemedMotion by P&P Projects" />
      </a>

      <ul
        className={'nav-steps' + (showSteps ? ' is-visible' : '')}
        aria-label="Process — scroll to move through each stage"
        aria-hidden={!showSteps}
      >
        <li className="nav-steps-label" aria-hidden="true">Our process</li>
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <a
              href={'#' + s.id}
              className={active === s.id ? 'is-active' : ''}
              tabIndex={showSteps ? 0 : -1}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>

      <div className="nav-actions">
        <a className="nav-back" href={PP_PROJECTS_URL} aria-label="Back to P&P Projects" title="Back to P&P Projects">
          <span className="nav-back-arrow" aria-hidden="true">←</span>
          <span className="nav-back-label">P&amp;P Projects</span>
        </a>
        <a href="#/projects" className={'nav-projects' + (onProjects ? ' is-active' : '')}>
          Projects
        </a>
        <a className="nav-cta" href="#contact">Start a project →</a>
      </div>
    </nav>
  );
}

function Banner() {
  return (
    <section className="banner" id="top">
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
          <h1>Bringing your ideas to life through <em>Animatronics</em>.</h1>
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

function PullQuote({ who, role, text }) {
  return (
    <section className="pullquote">
      <div className="who reveal">
        <div>{who}</div>
        <div style={{ opacity: 0.6, marginTop: 6 }}>{role}</div>
      </div>
      <blockquote className="reveal d1">{text}</blockquote>
      <div className="who reveal d2" style={{ textAlign: 'right' }}>
        <div>Studio note</div>
        <div style={{ opacity: 0.6, marginTop: 6 }}>2026</div>
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

      {/* CONCEPT */}
      <Chapter id="concept" num="01" kicker="Chapter 01 · Concept" title="It starts with" em="a feeling." />
      <Stage
        beats={[
          { h: 'The brief is a one-pager.', p: <>Clients don't ask for a robot. They ask for <b>a moment</b>: a child meeting a sea creature in a queue line, or a guest stepping into a forge and meeting its keeper.</> },
          { h: 'A name before a body.', p: <><span className="tag joey">JOEY</span>was named the day before his first sketch. <span className="tag vulkan">VULKAN</span>came named — the client wrote it on a sticky note and never let it go.</> },
          { h: 'Constraints, written down.', p: <>Cycle time, sight-lines, audience age, what we never want it to do. Every figure that follows has to fit on this single sheet of paper.</> },
        ]}
        specs={[]}
        visual={
          <div className="crane-stage">
            <div className="crane-camera">
              <div className="crane-frame"><img className="crane-img s3" src="assets/concept-step-3-head.png" alt="" /></div>
              <div className="crane-frame"><img className="crane-img s2" src="assets/concept-step-2-torso.png" alt="" /></div>
              <div className="crane-frame"><img className="crane-img s1" src="assets/concept-step-1-feet.png" alt="" /></div>
            </div>
            <div className="crane-tag">CONCEPT · CRANE UP · 0:06</div>
            <div className="crane-progress"><div className="crane-progress-fill"></div></div>
          </div>
        }
      />

      <PullQuote
        who="Studio note"
        role="Lead designer"
        text="Build the character before you build the mechanism. The mechanism follows."
      />

      {/* DESIGN */}
      <Chapter id="design" num="02" kicker="Chapter 02 · Design" title="Mechanical" em="design." />
      <Stage
        flip
        beats={[
          { h: 'Silhouette tests, by the dozen.', p: <>First passes are scribbles — head-to-eye ratios, posture, weight. <span className="tag joey">JOEY</span>oversizes the eyes by ~40%. <span className="tag vulkan">VULKAN</span>leans heavy: shoulders forward, jaw low.</> },
          { h: 'A turnaround, in the round.', p: <>Once the silhouette holds at thumbnail size we lock a turnaround: front, three-quarter, side, back. Every team downstream sketches against this grid.</> },
          { h: 'Scale on a stick.', p: <>We print at 1:1 on foamcore and stand it next to a six-year-old (Joey) or a six-foot-tall adult (Vulkan). If it's wrong here, it's <b>cheap to fix</b>.</> },
        ]}
        specs={[
          { k: 'Joey · height', v: '650 mm' },
          { k: 'Vulkan · height', v: '2.1 m' },
          { k: 'Eye ratio', v: '1.4× / 0.9×' },
          { k: 'Approval', v: 'Round 03' },
        ]}
        visual={
          <div className="rotate3d-stage">
            <div className="rotate3d-figure">
              <img className="face front" src="assets/vulkan-rotate-1.png" alt="Vulkan concept · 3/4 view" />
              <img className="face back" src="assets/vulkan-rotate-2.png" alt="Vulkan concept · front view" />
            </div>
            <div className="rotate3d-floor"></div>
            <div className="rotate3d-tag">VULKAN · CD-04 · ROT 360°</div>
          </div>
        }
      />

      {/* MECHANICAL */}
      <Chapter id="mechanical" num="03" kicker="Chapter 03 · Mechanical" title="Bones under" em="the skin." />
      <Stage
        beats={[
          { h: 'The skeleton is the character.', p: <>Mechanical engineers don't draw an octopus or a forge-keeper — they draw a kinematic chain that has to live inside one. <span className="tag joey">JOEY</span>9 DOF, lightweight aluminium. <span className="tag vulkan">VULKAN</span>14 DOF, structural steel + AL.</> },
          { h: 'Servos that can lie still.', p: <>Show animatronics spend most of their life holding a pose. We pick servos rated for <b>continuous holding torque</b>, not just peak — and de-rate by 30% for a 10-year service life.</> },
          { h: 'FEA on every load path.', p: <>Every bracket goes through finite-element analysis. Joey's brass collar is a structural ring. Vulkan's torso bears the weight of a 30 kg steel head.</> },
        ]}
        specs={[
          { k: 'Joey · DOF', v: '9 axes' },
          { k: 'Vulkan · DOF', v: '14 axes' },
          { k: 'Material', v: 'AL 6061 / steel' },
          { k: 'Service life', v: '10 yr' },
        ]}
        visual={
          <div className="mech-stage">
            <div className="mech-figure">
              <img src="assets/vulkan-skeleton.png" alt="Vulkan skeleton" />
            </div>
            <div className="mech-floor"></div>
            <div className="rotate3d-tag">VULKAN · ME-12 · TURNTABLE</div>
          </div>
        }
      />

      {/* MECHANICAL ANALYSIS */}
      <Chapter id="controls" num="04" kicker="Chapter 04 · Mechanical analysis" title="Range of" em="motion." />
      <Stage
        flip
        beats={[
          { h: 'Every joint, mapped.', p: <>Before a single bracket is cut we sketch the kinematic envelope joint by joint — pivot points, swept arcs, hard stops. <b>If a hand can clip the head, we find out on paper.</b></> },
          { h: 'Load paths in color.', p: <>We highlight the load path through each limb in a flat color: pink for compression members, yellow for the live pivot, blue for the cantilever. Engineering and fab read the same drawing.</> },
          { h: 'Margins, not maximums.', p: <>Every articulation is sized to its <b>worst-case pose</b>, then de-rated 30%. The figure is never working at the edge of its envelope — only ever in the comfortable middle.</> },
        ]}
        specs={[
          { k: 'Joey · joints', v: '9 analyzed' },
          { k: 'Vulkan · joints', v: '14 analyzed' },
          { k: 'FEA factor', v: '1.6× peak' },
          { k: 'Cycles', v: '10⁶ tested' },
        ]}
        visual={
          <Bp title="Joint envelope · ME-08" code="ROM · 04-12">
            <img src="assets/mech-analysis-joint.png" alt="Joint range-of-motion analysis sketch" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '24px' }} />
          </Bp>
        }
      />

      {/* MOTOR & WIRING */}
      <Chapter id="motors" num="05" kicker="Chapter 05 · Motor & wiring" title="Goodbye to" em="cable strain." />
      <Stage
        flip
        beats={[
          { h: 'Integrated drive actuators.', p: <>Drive units sit <b>at the joint they move</b>, not three links away. The torque path is short and the wiring runs <b>inside the bone</b>, not stretched across it.</> },
          { h: 'Service loops, not service nightmares.', p: <>Every harness is color-coded — <b>orange power, blue feedback, green safety</b> — with proper bend radii and a service loop at every joint. Open a panel and you can read what's going where.</> },
          { h: 'Five-minute swaps.', p: <>Connectors are keyed and labelled. A drive module swaps in <b>under five minutes</b> with one tool, no soldering, no head-scratching at 2 a.m. before a soft-open.</> },
        ]}
        specs={[
          { k: 'Actuators', v: 'Integrated, per joint' },
          { k: 'Wiring', v: 'In-bone routing' },
          { k: 'Harness', v: 'Color-coded, keyed' },
          { k: 'Swap time', v: '<5 min, one tool' },
        ]}
        visual={<MotorWiringBoard />}
      />

      {/* CRITTER CONTROL */}
      <Chapter id="hardware" num="06" kicker="Chapter 06 · Critter Control" title="Designed for" em="performance." />
      <Stage
        beats={[
          { h: 'Controlled by Critter Control.', p: <>Every figure ships under our <b>CritterControl</b> hardware — a deterministic rack that reads the show file and drives every axis. <b>Designed for optimal performance, refined for monitoring.</b></> },
          { h: 'FSCS modules, per joint.', p: <>Inside the box, stacked <b>FSCS hardware modules</b> handle servo and pneumatic drives. Each module reports position back so the controller knows what's actually happening, not just what it asked for.</> },
          { h: 'One brain. One show file.', p: <>Cues, audio, lighting and effects flow through a single rack. Bench, studio, site — the same hardware plays the same show, with hardwired e-stop and on-board fault logging.</> },
        ]}
        specs={[
          { k: 'Rack', v: 'CritterControl box' },
          { k: 'Modules', v: 'FSCS · per joint' },
          { k: 'E-stop', v: 'Hardwired · <80 ms' },
          { k: 'Telemetry', v: 'On-board, portable' },
        ]}
        visual={<CCSketchBoard />}
      />

      {/* ANIMATION */}
      <Chapter id="animation" num="07" kicker="Chapter 07 · Animation" title="Choreography" em="in code." />
      <Stage
        beats={[
          { h: 'A timeline, not a script.', p: <>We don't write code that says "wave hello." We <b>animate curves</b> on a timeline. <span className="tag joey">JOEY</span>blinks at 02:18, mouth opens at 02:21. <span className="tag vulkan">VULKAN</span>raises the hammer at 01:04 and lets it hang for two beats.</> },
          { h: 'Easing is the performance.', p: <>Linear motion looks like a robot. Cubic ease-in-out looks alive. The character lives in the <b>last 10%</b> of every move — the settle, the breath, the look-away.</> },
          { h: 'Cues that obey the room.', p: <>Show cues are triggered by the venue: a sensor, a button, a clock. The figures stay asleep until needed and never repeat themselves in front of the same guest.</> },
        ]}
        specs={[
          { k: 'Show file', v: '.tmot v3' },
          { k: 'Frame rate', v: '30 fps' },
          { k: 'Joey · cues', v: '14 unique' },
          { k: 'Vulkan · cues', v: '9 unique' },
        ]}
        visual={
          <Bp title="Show · Cue 14 · 'Hello'" code="SE-14 · 04-26">
            <SoftSketch />
          </Bp>
        }
      />

      <PullQuote
        who="Studio note"
        role="Lead programmer"
        text="A robot waits. A character breathes. The difference is twenty milliseconds and a lot of opinions."
      />

      {/* ANIMATION SOFTWARE */}
      <Chapter id="software" num="08" kicker="Chapter 08 · Animation software" title="Curves on a" em="timeline." />
      <Stage
        flip
        beats={[
          { h: 'A timeline you can scrub.', p: <>Our in-house animation suite shows every axis as an editable curve. Animators <b>scrub, loop and tune</b> in real time — the figure on the bench mirrors what's on screen, frame by frame.</> },
          { h: 'Curves are the performance.', p: <>Linear is robotic; the personality lives in the easing. We work in cubic and custom Bézier curves on every joint so a head-turn settles, a shoulder breathes, a hand <b>hesitates before it lands</b>.</> },
          { h: 'One file, every figure.', p: <>Cues, audio, lighting and effects export to a single show file the rack reads on power-up. <b>Bench, studio, site</b> — the show plays the same in all three.</> },
        ]}
        specs={[
          { k: 'Editor', v: 'In-house · .tmot' },
          { k: 'Curves', v: 'Cubic / Bézier' },
          { k: 'Frame rate', v: '30 fps' },
          { k: 'Round-trip', v: 'Live to bench' },
        ]}
        visual={
          <VideoStage
            src="https://drive.google.com/file/d/13DV0kF0sM9moxur6m9tBVRCFPJZaZgKx/preview?autoplay=1&mute=1"
            tag="ANIM SUITE · SE-22 · LIVE"
          />
        }
      />

      <Slab meta={['8 chapters', 'One studio', 'Every figure']}>
        The final stage.
      </Slab>

      {/* FINALE */}
      <section className="finale" id="finale">
        <div className="head reveal">
          <div
            className="kicker"
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--ink-dim)',
            }}
          >
            Section 09 · Figure finishing
          </div>
          <h2>And then a child <em>says hello.</em></h2>
          <p className="head-sub">
            High detail, realistic to cartoonish — and everything in between. The final reveal is where engineering disappears and a character begins.
          </p>
        </div>
        <div className="reveal-grid reveal d1">
          <figure className="reveal-pane">
            <div className="reveal-img">
              <img src="assets/joey-front.png" alt="Joey — front view" style={{ transform: 'scale(1.02)' }} />
            </div>
          </figure>
          <figure className="reveal-pane">
            <div className="reveal-img">
              <img
                src="assets/joey-front.png"
                alt="Joey — close-up"
                style={{ transform: 'scale(2.0) translate(-4%, 8%)', transformOrigin: 'center' }}
              />
            </div>
          </figure>
        </div>
      </section>

      {/* CONTACT */}
      <section className="contact" id="contact">
        <div className="contact-inner">
          <div className="reveal">
            <div className="kicker">Chapter 07 · Start a project</div>
            <h2>Tell us about the <em>moment</em> you want to build.</h2>
            <p className="lede">
              A queue-line meet, a finale figure, a custom show-action mechanism — drop a few lines below and we'll be in touch within 48 hours with a calendar link and some honest questions.
            </p>
            <div className="info">
              <div className="row"><span className="k">Studio</span><span className="v">Vlechter 28<br />5711 LS Someren · NL</span></div>
              <div className="row"><span className="k">Email</span><span className="v">info@ppprojects.com</span></div>
              <div className="row"><span className="k">Phone</span><span className="v">+31 0493 694 511</span></div>
              <div className="row"><span className="k">Hours</span><span className="v">Mon–Fri · 09:00–17:30 CET</span></div>
            </div>
          </div>
          <div className="form-wrap reveal d1">
            <div className="peek">
              <div className="speech">Psst — over here.</div>
              <img src="assets/peek-animatronic.png" alt="" />
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
                  <label htmlFor="ct">Project type</label>
                  <select id="ct" defaultValue="">
                    <option value="" disabled>Select…</option>
                    <option>Queue-line character</option>
                    <option>Show / finale figure</option>
                    <option>Custom show-action equipment</option>
                    <option>Refurbish / re-program</option>
                    <option>Not sure yet</option>
                  </select>
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
                <label htmlFor="cm">The moment you want to build</label>
                <textarea id="cm" placeholder="A child meets a sea creature in a queue line…"></textarea>
              </div>
              <button type="submit" className="cta-btn">
                Send brief <span className="arrow">→</span>
              </button>
              <div className="form-foot">We reply within 48 hours · Your brief stays with us</div>
            </form>
          </div>
        </div>
      </section>

      <footer>
        <div>© 2026 P&amp;P Projects B.V.</div>
        <a className="footer-back" href={PP_PROJECTS_URL}>← Back to P&amp;P Projects</a>
        <div>ThemedMotion</div>
      </footer>
    </>
  );
}

const PROJECTS = [
  { img: 'octopus-hero.png', name: 'Joey', cat: 'Queue-line character' },
  { img: 'vulkan-concept.png', name: 'Vulkan', cat: 'Show · finale figure' },
  { img: 'vulkan-skeleton.png', name: 'Vulkan Endoskeleton', cat: 'Mechanical engineering' },
  { img: 'peek-animatronic.png', name: 'The Guardian', cat: 'Full-body figure' },
  { img: 'cc-rack-open.png', name: 'CritterControl', cat: 'Show control hardware' },
  { img: 'joey-front.png', name: 'Joey · Finish', cat: 'Paint & silicone' },
  { img: 'mech-analysis-joint.png', name: 'Range of Motion', cat: 'Kinematic analysis' },
  { img: 'mw-routing.png', name: 'Drive & Wiring', cat: 'Integrated actuation' },
];

function Projects() {
  useReveal();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return (
    <>
      <header className="portfolio-head">
        <div className="reveal">
          <div className="kicker">Selected work · 2016—2026</div>
          <h1>Projects.</h1>
          <p className="head-sub">
            A one-stop shop for the entire leisure industry — characters, show
            figures and custom show-action mechanisms, built end to end in our
            studio. A selection of the figures we've brought to life.
          </p>
        </div>
      </header>
      <section className="portfolio">
        <div className="portfolio-grid">
          {PROJECTS.map((p, i) => (
            <a
              key={p.img}
              className={'proj-tile reveal' + (i % 3 === 1 ? ' d1' : i % 3 === 2 ? ' d2' : '')}
              href="#contact"
              aria-label={`${p.name} — ${p.cat}`}
            >
              <img src={`assets/${p.img}`} alt={p.name} loading="lazy" />
              <div className="proj-overlay">
                <div className="proj-meta">
                  <div className="proj-cat">{p.cat}</div>
                  <div className="proj-name">{p.name}</div>
                </div>
                <span className="proj-explore">Explore →</span>
              </div>
            </a>
          ))}
        </div>
      </section>
      <footer>
        <div>© 2026 P&amp;P Projects B.V.</div>
        <a className="footer-back" href={PP_PROJECTS_URL}>← Back to P&amp;P Projects</a>
        <div>ThemedMotion</div>
      </footer>
    </>
  );
}

export default function App() {
  const route = useHashRoute();
  const onProjects = route === '#/projects';
  return (
    <>
      <Nav route={route} />
      {onProjects ? <Projects /> : <Home />}
    </>
  );
}
