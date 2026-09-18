// ---- Site content schema ----------------------------------------------------
// The single source of truth for everything an admin can change: copy, media,
// page visibility and lists. The site renders the defaults below; whatever is
// saved from `#/admin` is stored on the hosting as overrides (data/content.json)
// and layered on top at load time — see content.jsx.
//
// Field kinds
//   text   one-line plain copy              rich   copy that may hold <b>, <em>, <br>
//   image  replaceable picture              video  replaceable clip
//   flag   on/off switch                    list   add / remove / reorder items
//
// KEYS ARE PERMANENT. A saved override is matched by key, so renaming a key (or
// a list item's id) silently drops the client's edit. Add new ones freely.

// The seven storytelling sections of the home page, in order.
export const SECTIONS = [
  {
    id: 'design', label: 'Design', title: 'It all starts with', em: 'an idea.',
    media: [['video', 'assets/ukkie-transition.mp4'], ['poster', 'assets/ukkie-transition-poster.jpg']],
    tags: [['tag', 'Ukkie · Sketch → Model']],
    beats: [
      ['We begin wherever you are.', 'Every creative process is different. Whether you already have a finished design, a loose sketch, or only the beginning of an idea, we can join the project where it stands today. In collaboration with the design department of P&amp;P Projects, we help shape concepts into defined and buildable characters.'],
      ['Creative 3D modelling.', 'An idea truly starts to take shape once it becomes three-dimensional. During the modelling process, sketches, references or existing models are translated into a detailed digital sculpture that defines the appearance and proportions of the figure.'],
      ['Movement with intent.', 'The purpose of engineering is not to decide how a character should perform, but to make the intended performance possible. By defining movement during the creative stage, motion becomes part of the storytelling process instead of only a technical solution.'],
    ],
  },
  {
    id: 'engineering', label: 'Engineering', title: 'Mechanical', em: 'engineering.',
    tags: [['structure', 'Structure'], ['body', 'Body'], ['tag', 'VULKAN SC11'], ['hint', 'Drag to rotate']],
    beats: [
      ['Engineering for performance.', 'The figure is developed internally through mechanical engineering. Motors, actuators, linkages, and structures are integrated into the character and documented to the highest standards — the engineering supports the performance of the figure, allowing the mechanics to serve the character rather than reshape it around technical convenience.'],
      ['Designed for long-term operation.', 'Mechanical engineering is not only about making a figure move, but about making it reliable, maintainable, and built for long-term operation. We focus on service accessibility, durable construction, efficient layouts, and components that withstand continuous use in demanding environments.'],
      ['Built for all conditions.', 'Our creations rarely live in ideal environments. Outdoor installations, underwater scenes, chlorinated or salt water, humidity, dust, heat, and continuous indoor operation each place different demands on a character. We design with those conditions in mind from the very beginning.'],
    ],
  },
  {
    id: 'analysis', label: 'Analysis', title: 'Calculated beyond', em: 'assumptions.',
    media: [['video', 'assets/analysis-fea.mp4'], ['poster', 'assets/analysis-fea-poster.jpg']],
    tags: [['stamp', 'Load case · ME-08'], ['code', 'ANALYSIS · FEA']],
    beats: [
      ['Engineered for the Real World', 'Every figure faces different demands, which is why we apply mechanical analysis based on the specific requirements of each project. Depending on the installation and operating conditions, this can include structural analysis, dynamic analysis, overhead load calculations, fatigue evaluation, wind loading, vibration analysis, or environmental considerations. The goal is not to overengineer every component, but to apply the right level of engineering validation where it truly matters for safety, reliability, and long-term performance.'],
      ['Verified beyond our workshop.', 'Safety and reliability are part of the engineering process from the very beginning. Alongside our internal analysis and validation workflows, we collaborate with specialized third-party reviewers when required, to independently assess structures, safety-critical systems, and installation conditions.'],
    ],
  },
  {
    id: 'actuators', label: 'Actuators', title: '', em: 'Actuators',
    media: [['video', 'assets/mw-routing-anim.mp4'], ['poster', 'assets/mw-routing-anim-poster.jpg']],
    tags: [['tag', 'Routing study · MW-A']],
    beats: [
      ['Electrical motion, done right.', "The actuator is the heart of every animatronic figure. We primarily work with electrical actuators for their precision, smooth motion, and overall quality of movement. Pneumatics remain in our toolbox where requested or where environmental conditions make them the better solution. Over the years we've worked with many leading actuator manufacturers and developed clear preferences for their most effective use."],
      ['Say goodbye to cable strain.', 'We use integrated drive actuators — motor, encoder, and drive electronics combined into a single compact unit. Communication and power are daisy-chained directly through the actuators, leaving a <b>single cable path</b> running through the character. Fewer cables means cleaner routing, fewer failure points, and far greater flexibility through compact spaces and moving joints.'],
      ['Designed for real operation.', 'Our systems are engineered with long-term operation and maintenance in mind. Actuators are selected for reliability, serviceability, and availability — positioned for accessibility, with replacement units often available within days rather than months.'],
    ],
  },
  {
    id: 'control', label: 'Control', title: 'Control even the', em: 'finest detail.',
    media: [['video', 'assets/control-box.mp4'], ['poster', 'assets/control-box-poster.jpg']],
    tags: [['tag', 'Control box']],
    beats: [
      ['The brain behind our characters.', "Every character is powered by our custom-designed <b>CritterControl</b> hardware, installed directly inside the figure's control cabinet. Acting as the main brain, it manages motion, timing, feedback, and communication across the entire figure. Developed fully in-house, it interfaces with integrated drive actuators, pneumatics, industrial equipment, sensors, effects, and show-control infrastructure — a flexible foundation for virtually any animated figure."],
      ['Performance monitoring.', 'With <b>CritterControl Center</b>, operators monitor the status and performance of characters from a central location and, if desired, remotely from anywhere in the world. The platform surfaces character health, behaviour, and maintenance needs before they become failures. Remote connectivity is always configured to the privacy requirements of the park or operator.'],
    ],
  },
  {
    id: 'animation', label: 'Animation', title: 'Choreography', em: 'in code.',
    tags: [['chip', 'Animation'], ['title', 'Graph Editor'], ['sub', 'Value channels · 5.00s · 30 fps'], ['ch.opacity', 'Head Tilt'], ['ch.scale', 'Jaw'], ['ch.posx', 'Top Blink'], ['ch.posy', 'R Shoulder'], ['ch.rotation', 'L Elbow'], ['hint', 'Try it: tap a channel, drag its diamonds to reshape the curve, drag across the graph to scrub.']],
    beats: [
      ['Animation without limits.', 'Characters are animated using our <b>CritterControl Animation Tool</b>, a software environment designed specifically for animatronics. It lets us craft detailed performances with precise control over motion, timing, and synchronization — and supports hundreds of animations per character, so operators can even create their own.'],
      ['Control to the finest detail.', 'CritterControl lets us prepare performances with precise control over motion curves, keyframes, interpolation, timing, synchronization, triggers, and show sequencing. Using a real-time 3D workflow, we preview, refine, and adjust performances directly around the intended movement of the figure — before and during integration.'],
    ],
  },
  {
    id: 'finishing', label: 'Finishing', title: 'And then it', em: 'comes to life.',
    media: [['video', 'assets/finishing-v2.mp4'], ['poster', 'assets/finishing-v2-poster.jpg']],
    beats: [
      ['From a machine to a being.', 'The finishing stage is where the mechanical figure becomes a believable character. Rigid shells define the silhouette, proportions, and fine details while integrating carefully around the internal structure. All shells are developed digitally over the validated mechanical assembly — so clearances, movement ranges, and interactions are verified before fabrication, whether through reinforced 3D printing, fiberglass moulding, or both.'],
      ['Flexible skins.', 'Flexible materials are used where a more organic appearance or movement is required — faces, necks, hands, and transition zones. Silicone skins, artificial fur, fabrics, and costume elements are all designed around the motion of the figure itself, balancing expression, durability, and serviceability from the earliest stages.'],
      ['Built for operation and maintenance.', 'A finished character should look convincing on opening day and stay that way for years. Coatings, paint systems, and finishing materials are selected for the intended environment — indoor, outdoor, humid, or high-wear — while removable panels and hidden access points keep it maintainable.'],
    ],
  },
];

const pad = (n) => String(n).padStart(2, '0');

// ---- Lists ------------------------------------------------------------------
// `types` describes what an item can be; an item is { id, type?, …fields }.
export const LISTS = {
  'work.projects': {
    label: 'Projects',
    noun: 'project',
    title: (it) => it.name || 'Untitled project',
    types: {
      item: {
        label: 'Project',
        fields: [
          { f: 'img', kind: 'image', label: 'Picture' },
          { f: 'name', kind: 'text', label: 'Name' },
          { f: 'cat', kind: 'text', label: 'Category' },
          { f: 'card', kind: 'flag', label: 'Frame it on a light card (for drawings / concept art)' },
        ],
      },
    },
    def: [
      { id: 'joey', img: 'assets/octopus-hero.png', name: 'Joey', cat: 'Queue-line character' },
      { id: 'guardian', img: 'assets/peek-animatronic.png', name: 'The Guardian', cat: 'Full-body figure' },
      { id: 'vulkan', img: 'assets/vulkan-concept.png', name: 'Vulkan', cat: 'Show · finale figure', card: true },
      { id: 'vulkan-endo', img: 'assets/vulkan-skeleton.png', name: 'Vulkan Endoskeleton', cat: 'Mechanical engineering' },
      { id: 'joey-finish', img: 'assets/joey-front.png', name: 'Joey · Finish', cat: 'Paint &amp; silicone' },
      { id: 'crittercontrol', img: 'assets/cc-rack-open.png', name: 'CritterControl', cat: 'Show control hardware' },
      { id: 'range-of-motion', img: 'assets/mech-analysis-joint.png', name: 'Range of Motion', cat: 'Kinematic analysis', card: true },
      { id: 'drive-wiring', img: 'assets/mw-routing.png', name: 'Drive &amp; Wiring', cat: 'Integrated actuation', card: true },
    ],
  },

  // The History page story, top to bottom. Paragraphs group into prose columns;
  // films and the photo reel break out full-bleed between them.
  'history.blocks': {
    label: 'Story',
    noun: 'block',
    title: (it) => (it.type === 'film' ? 'Film' : it.type === 'reel' ? 'Photo reel (shows every photo below)' : (it.text || '').replace(/<[^>]+>/g, '').slice(0, 70) || 'Empty paragraph'),
    types: {
      p: { label: 'Paragraph', fields: [{ f: 'text', kind: 'rich', label: 'Text' }] },
      lead: { label: 'Highlighted line', fields: [{ f: 'text', kind: 'rich', label: 'Text' }] },
      film: { label: 'Film', fields: [{ f: 'video', kind: 'video', label: 'Video' }, { f: 'poster', kind: 'image', label: 'Poster (shown before it plays)' }] },
      reel: { label: 'Photo reel', fields: [] },
    },
    def: [
      { id: 'p01', type: 'p', text: 'Back then, motion was already part of who we were. At P&amp;P Projects, we believed that a themed environment should do more than look beautiful. It should breathe. It should surprise. It should tell stories that people remember for years to come.' },
      { id: 'film1', type: 'film', video: 'assets/history/footage1.mp4', poster: 'assets/history/footage1-poster.jpg' },
      { id: 'p02', type: 'p', text: 'At a time when animatronics were still rare in Europe, we were already designing and building mechanical characters that captivated audiences. Those early characters helped shape what themed entertainment would become, making us one of the pioneers of animatronics.' },
      { id: 'p03', type: 'p', text: 'Over the decades, our moving creations found homes in theme parks, museums, attractions and experiences across the world. Some of the very first characters we built are still performing today, more than thirty years after they were installed.' },
      { id: 'reel', type: 'reel' },
      { id: 'p04', type: 'p', text: 'Motion has always been woven into the fabric of our company. Sometimes it was a single moving prop hidden within a larger attraction. Others, it was the centrepiece that brought an entire story to life. Every project taught us something new. Every installation added another chapter to our journey.' },
      { id: 'p05', type: 'p', text: 'As P&amp;P Projects grew, so did our team. New buildings were built. New disciplines joined the team. Artists, engineers, programmers, sculptors, electricians, decorators, project managers and more came together under one roof, each contributing their own craft to create unforgettable experiences.' },
      { id: 'film2', type: 'film', video: 'assets/history/footage2.mp4', poster: 'assets/history/footage2-poster.jpg' },
      { id: 'p06', type: 'lead', text: 'And our curiosity never stopped...' },
      { id: 'p07', type: 'p', text: 'In 2019, born from the ideas of our biggest dreamers, we began designing Mormel: A fully articulated character with more than 23 axes of motion. Mormel was more than a new animatronic. It challenged everything we thought we knew about motion. It pushed us to rethink how characters should move, how they should be maintained, and how technology could better serve storytellers.' },
      { id: 'p08', type: 'lead', text: 'As development finalized in 2023, one thing became increasingly clear: motion needed its own home.' },
      { id: 'p09', type: 'p', text: 'That realization became ThemedMotion, a new division within our company dedicated exclusively to motion innovation which was presented in IAAPA Europe.' },
      { id: 'p10', type: 'p', text: "From the very beginning, we worked side by side with Europe's leading theme parks and listened carefully to operators, maintenance technicians, creatives and attraction owners from around the world. Their experiences became our blueprint. They told us where traditional animatronics fell short: maintenance that consumed too much time, lack of diagnostics, difficult programming, expensive ownership, and technology that often restricted creative freedom instead of potentializing it." },
      { id: 'p11', type: 'p', text: 'Based on their experiences, we reimagined the entire ecosystem and process around animatronics. We realized that the technology available on the market no longer met the expectations of modern attractions. Rather than waiting for someone else to solve those challenges, we decided to build the technology ourselves.' },
      { id: 'p12', type: 'p', text: 'Remote monitoring. Intelligent diagnostics. Simplified maintenance. Flexible creative workflows. Reliable performance. Every innovation was developed with one goal in mind: giving storytellers the freedom to focus on creating unforgettable experiences, while making ownership easier throughout the lifetime of every character.' },
      { id: 'p13', type: 'p', text: 'Today, ThemedMotion combines more than four decades of experience with a fresh vision for the future. Although our technology has evolved beyond anything we imagined in the 1980s, our main goal remains unchanged: creating experiences that make people smile, laugh, wonder and believe.' },
      { id: 'p14', type: 'lead', text: 'Because there is no greater complement than guests believing in a character and not thinking of the technology behind it.' },
    ],
  },

  'history.photos': {
    label: 'Photo reel',
    noun: 'photo',
    gallery: true,
    title: () => 'Photo',
    types: { item: { label: 'Photo', fields: [{ f: 'full', kind: 'image', label: 'Photo', thumbTo: 'thumb' }] } },
    def: [
      ...Array.from({ length: 19 }, (_, i) => ({ id: `r1-${pad(i + 1)}`, full: `assets/history/reel1/${pad(i + 1)}.jpg`, thumb: `assets/history/reel1/thumb/${pad(i + 1)}.jpg` })),
      ...Array.from({ length: 25 }, (_, i) => ({ id: `r2-${pad(i + 1)}`, full: `assets/history/reel2/${pad(i + 1)}.jpg`, thumb: `assets/history/reel2/thumb/${pad(i + 1)}.jpg` })),
    ],
  },
};

// ---- Dashboard groups ---------------------------------------------------------
const text = (k, label, def) => ({ kind: 'text', k, label, def });
const rich = (k, label, def) => ({ kind: 'rich', k, label, def });
const image = (k, label, def) => ({ kind: 'image', k, label, def });
const video = (k, label, def) => ({ kind: 'video', k, label, def });
const flag = (k, label, def, help) => ({ kind: 'flag', k, label, def, help });
const list = (k) => ({ kind: 'list', k, label: LISTS[k].label });
const choice = (k, label, def, options, help) => ({ kind: 'choice', k, label, def, options, help });

// Typefaces the admin can switch to. `gf` is the Google Fonts request (only
// weights that family really has — the API rejects unknown ones); the default
// pair ships in index.html so it needs no request.
export const FONTS = {
  heading: {
    'barlow-condensed': { label: 'Barlow Condensed (default)', family: '"Barlow Condensed"' },
    oswald: { label: 'Oswald', family: 'Oswald', gf: 'Oswald:wght@400;500;600;700' },
    'bebas-neue': { label: 'Bebas Neue', family: '"Bebas Neue"', gf: 'Bebas+Neue' },
    anton: { label: 'Anton', family: 'Anton', gf: 'Anton' },
    teko: { label: 'Teko', family: 'Teko', gf: 'Teko:wght@400;500;600;700' },
    'saira-condensed': { label: 'Saira Condensed', family: '"Saira Condensed"', gf: 'Saira+Condensed:wght@500;600;700;800' },
    'roboto-condensed': { label: 'Roboto Condensed', family: '"Roboto Condensed"', gf: 'Roboto+Condensed:wght@400;500;600;700;800' },
    archivo: { label: 'Archivo', family: 'Archivo', gf: 'Archivo:wght@500;600;700;800' },
    montserrat: { label: 'Montserrat', family: 'Montserrat', gf: 'Montserrat:wght@500;600;700;800' },
  },
  body: {
    barlow: { label: 'Barlow (default)', family: 'Barlow' },
    inter: { label: 'Inter', family: 'Inter', gf: 'Inter:wght@300;400;500;600' },
    roboto: { label: 'Roboto', family: 'Roboto', gf: 'Roboto:wght@300;400;500;600' },
    'open-sans': { label: 'Open Sans', family: '"Open Sans"', gf: 'Open+Sans:wght@300;400;500;600' },
    'work-sans': { label: 'Work Sans', family: '"Work Sans"', gf: 'Work+Sans:wght@300;400;500;600' },
    'dm-sans': { label: 'DM Sans', family: '"DM Sans"', gf: 'DM+Sans:wght@300;400;500;600' },
    manrope: { label: 'Manrope', family: 'Manrope', gf: 'Manrope:wght@300;400;500;600' },
    'source-sans-3': { label: 'Source Sans 3', family: '"Source Sans 3"', gf: 'Source+Sans+3:wght@300;400;500;600' },
    lato: { label: 'Lato', family: 'Lato', gf: 'Lato:wght@300;400;700' },
  },
};
const fontOptions = (set) => Object.entries(FONTS[set]).map(([v, f]) => ({ v, label: f.label }));

const TAG_LABELS = {
  tag: 'Label on the visual', hint: 'Hint on the visual', structure: 'Slider · left end', body: 'Slider · right end',
  stamp: 'Stamp · title', code: 'Stamp · code', chip: 'Graph · chip', title: 'Graph · title', sub: 'Graph · subtitle',
  'ch.opacity': 'Graph · channel 1', 'ch.scale': 'Graph · channel 2', 'ch.posx': 'Graph · channel 3', 'ch.posy': 'Graph · channel 4', 'ch.rotation': 'Graph · channel 5',
};

const sectionGroup = (s, i) => ({
  id: 'sec-' + s.id,
  page: 'Home',
  title: `${pad(i + 1)} · ${s.label}`,
  fields: [
    text(`sec.${s.id}.label`, 'Name in the menus', s.label),
    text(`sec.${s.id}.title`, 'Headline', s.title),
    text(`sec.${s.id}.em`, 'Headline · orange part', s.em),
    ...s.beats.flatMap(([h, p], b) => [
      text(`sec.${s.id}.b${b + 1}.h`, `Block ${b + 1} · title`, h),
      rich(`sec.${s.id}.b${b + 1}.p`, `Block ${b + 1} · text`, p),
    ]),
    ...(s.media || []).map(([m, def]) => (m === 'video' ? video : image)(`sec.${s.id}.${m}`, m === 'video' ? 'Video' : 'Video poster (shown before it plays)', def)),
    ...(s.tags || []).map(([t, def]) => text(`sec.${s.id}.${t}`, TAG_LABELS[t] || t, def)),
  ],
});

export const GROUPS = [
  {
    id: 'site', page: 'Site', title: 'Pages & settings',
    fields: [
      flag('page.work', 'Show the “Work” page', false, 'Off = hidden from the menus and not reachable by visitors.'),
      flag('page.history', 'Show the “History” page', true, 'Off = hidden from the menus and not reachable by visitors.'),
      choice('font.heading', 'Headings font', 'barlow-condensed', fontOptions('heading'), 'Titles, numbers and buttons.'),
      choice('font.body', 'Text font', 'barlow', fontOptions('body'), 'Paragraphs, menus and labels.'),
      text('seo.title', 'Browser tab title', 'ThemedMotion'),
      text('link.pp', 'P&P Projects link (full https:// address)', 'https://www.ppprojects.com/'),
      image('brand.logo', 'Logo · on light backgrounds', 'assets/themedmotion-logo.png'),
      image('brand.logoLight', 'Logo · over the hero video', 'assets/themedmotion-logo-light.png'),
    ],
  },
  {
    id: 'nav', page: 'Site', title: 'Menu',
    fields: [
      text('nav.pp', 'P&P Projects link', 'P&P Projects'),
      text('nav.process', 'Home link', 'Process'),
      text('nav.work', 'Work link', 'Work'),
      text('nav.history', 'History link', 'History'),
      text('nav.cta', 'Contact button', "Let's Make It Move →"),
      text('nav.menu', 'Mobile menu · heading', 'Menu'),
      text('nav.intro', 'Menu entry for the hero', 'Intro'),
      text('nav.contact', 'Side rail entry for contact', 'Contact'),
    ],
  },
  {
    id: 'footer', page: 'Site', title: 'Footer',
    fields: [
      text('footer.copy', 'Copyright line', '© 2026 ThemedMotion B.V.'),
      text('footer.pp', 'P&P Projects link', 'P&P Projects'),
      text('footer.brand', 'Right-hand label', 'ThemedMotion'),
    ],
  },
  {
    id: 'hero', page: 'Home', title: 'Hero',
    fields: [
      text('hero.kicker', 'Small line above the headline', 'Animatronics, animated figures and show action equipment'),
      text('hero.title', 'Headline', 'Quality motion for'),
      text('hero.em', 'Headline · orange part', 'powerful stories.'),
      text('hero.scroll', 'Scroll cue', 'Scroll'),
      video('hero.video', 'Background video', 'assets/banner-reel.mp4'),
      image('hero.poster', 'Video poster (shown while it loads)', 'assets/banner-reel-poster.jpg'),
      image('hero.fallback', 'Fallback picture (if video can’t play)', 'assets/octopus-hero.png'),
    ],
  },
  ...SECTIONS.map(sectionGroup),
  {
    id: 'cta', page: 'Home', title: 'Contact banner',
    fields: [
      text('cta.title', 'Headline', 'Contact us for more'),
      text('cta.button', 'Button', "Let's make it move"),
      image('cta.image', 'Background picture (shown blurred)', 'assets/joey-front.png'),
    ],
  },
  {
    id: 'contact', page: 'Home', title: 'Contact',
    fields: [
      text('contact.kicker', 'Small line above the headline', "Contact · Let's make it move"),
      text('contact.title', 'Headline', "Now, we'd love to make it"),
      text('contact.em', 'Headline · orange part', 'move.'),
      rich('contact.lede', 'Intro text', "A queue-line character, a dark ride animatronic, a stunt figure, a parade character, a creature effect, a custom show-action mechanism, or something that has never been built before. Drop a few lines and we'll be in touch within 48 hours with a calendar link and some honest questions."),
      text('contact.hq.k', 'Address · label', 'Headquarters'),
      rich('contact.hq.v', 'Address', 'Vlechter 28<br>5711 LS Someren · NL'),
      text('contact.email.k', 'Email · label', 'Email'),
      text('contact.email.v', 'Email', 'ThemedMotion@ppprojects.com'),
      text('contact.phone.k', 'Phone · label', 'Phone'),
      text('contact.phone.v', 'Phone', '+31 0493 694 511'),
      text('contact.hours.k', 'Hours · label', 'Hours'),
      text('contact.hours.v', 'Hours', 'Mon–Friday · 8:30–17:00 CET'),
      text('contact.speech', 'Mormel’s speech bubble', 'Psst — over here.'),
      image('contact.mormel', 'Mormel', 'assets/mormel.png'),
      image('contact.mormelHand', 'Mormel’s hand', 'assets/mormel-hand.png'),
    ],
  },
  {
    id: 'form', page: 'Home', title: 'Contact form',
    fields: [
      text('form.title', 'Form title', 'Brief us in 60 seconds'),
      text('form.sub', 'Form subtitle', 'No NDA needed yet'),
      text('form.name', 'Label · name', 'Your name'),
      text('form.company', 'Label · company', 'Company'),
      text('form.email', 'Label · email', 'Email'),
      text('form.location', 'Label · location', 'Project location'),
      text('form.message', 'Label · message', "Tell us what you'd love to make move"),
      text('form.submit', 'Send button', 'Send brief'),
      text('form.foot', 'Line under the button', 'We reply within 48 hours · Your brief stays with us'),
    ],
  },
  {
    id: 'work', page: 'Work', title: 'Header',
    fields: [
      text('work.title', 'Page title', 'Work'),
      rich('work.sub', 'Intro text', 'Characters, show figures and custom show-action mechanisms — designed, engineered and built end to end in our studio for theme parks, museums and brand experiences around the world.'),
      text('work.tag1', 'Tag 1', 'Theme parks'),
      text('work.tag2', 'Tag 2', 'Museums'),
      text('work.tag3', 'Tag 3', 'Brand experiences'),
      text('work.tag4', 'Tag 4', 'Live shows'),
    ],
  },
  { id: 'work-projects', page: 'Work', title: 'Projects', fields: [list('work.projects')] },
  {
    id: 'history', page: 'History', title: 'Header',
    fields: [
      text('history.title', 'Page title', 'History'),
      rich('history.sub', 'Intro text', 'Our story began in 1989, long before the name ThemedMotion ever existed.'),
    ],
  },
  { id: 'history-blocks', page: 'History', title: 'Story', fields: [list('history.blocks')] },
  { id: 'history-photos', page: 'History', title: 'Photo reel', fields: [list('history.photos')] },
];

// Flat lookup: key → field definition (kind + default).
export const FIELDS = Object.fromEntries(GROUPS.flatMap((g) => g.fields).map((f) => [f.k, f]));

// Only these paths may ever be used as media: files shipped with the build or
// files the upload endpoint stored. Anything else falls back to the default.
const MEDIA_RE = /^(assets|data\/uploads)\/[A-Za-z0-9][A-Za-z0-9._/-]{0,200}\.(jpe?g|png|webp|gif|mp4|webm)$/i;
export const isMediaPath = (v) => typeof v === 'string' && MEDIA_RE.test(v) && !v.includes('..');
