/**
 * PillNav — Vanilla JS port of the React Bits PillNav component
 * Requires GSAP (loaded via CDN in each HTML page)
 *
 * Usage:
 *   initPillNav({
 *     activeHref: '/features.html',
 *     baseColor: '#0d0d1a',
 *     pillColor: 'rgba(255,255,255,0.07)',
 *     pillTextColor: '#f0f0f8',
 *     hoveredPillTextColor: '#000',
 *   });
 */

function initPillNav(options = {}) {
  const {
    activeHref     = window.location.pathname,
    ease           = 'power3.out',
    baseColor      = '#0d0d1a',
    pillColor      = 'rgba(255,255,255,0.06)',
    pillTextColor  = '#f0f0f8',
    hoveredPillTextColor = '#ffffff',
    initialLoad    = true,
  } = options;

  const items = [
    { label: 'Home',     href: '/' },
    { label: 'Features', href: '/features.html' },
    { label: 'Commands', href: '/commands.html' },
    { label: 'Console',  href: '/demo.html' },
  ];

  // ── Build DOM ──────────────────────────────────────────────────────────────
  const container = document.createElement('div');
  container.className = 'pill-nav-container';

  const nav = document.createElement('nav');
  nav.className = 'pill-nav';
  nav.setAttribute('aria-label', 'Primary');
  nav.style.setProperty('--base', baseColor);
  nav.style.setProperty('--pill-bg', pillColor);
  nav.style.setProperty('--pill-text', pillTextColor);
  nav.style.setProperty('--hover-text', hoveredPillTextColor);

  // Logo
  const logoLink = document.createElement('a');
  logoLink.href = '/';
  logoLink.className = 'pill-logo';
  logoLink.setAttribute('aria-label', 'Huginn Home');
  logoLink.innerHTML = `
    <span class="pill-logo-text">Huginn</span>
  `;
  nav.appendChild(logoLink);

  // Desktop nav items
  const navItemsWrapper = document.createElement('div');
  navItemsWrapper.className = 'pill-nav-items desktop-only';

  const ul = document.createElement('ul');
  ul.className = 'pill-list';
  ul.setAttribute('role', 'menubar');

  const circleEls = [];
  const tlRefs    = [];
  const tweenRefs = [];

  items.forEach((item, i) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'none');

    const a = document.createElement('a');
    a.href = item.href;
    a.className = 'pill';
    a.setAttribute('role', 'menuitem');
    a.setAttribute('aria-label', item.label);

    // Normalise active detection: match /index.html and /
    const normActive = activeHref.replace(/\/index\.html$/, '/');
    const normItem   = item.href.replace(/\/index\.html$/, '/');
    if (normActive === normItem || window.location.pathname === item.href) {
      a.classList.add('is-active');
    }

    const circle = document.createElement('span');
    circle.className = 'hover-circle';
    circle.setAttribute('aria-hidden', 'true');

    const stack = document.createElement('span');
    stack.className = 'label-stack';

    const label = document.createElement('span');
    label.className = 'pill-label';
    label.textContent = item.label;

    const labelHover = document.createElement('span');
    labelHover.className = 'pill-label-hover';
    labelHover.setAttribute('aria-hidden', 'true');
    labelHover.textContent = item.label;

    stack.appendChild(label);
    stack.appendChild(labelHover);
    a.appendChild(circle);
    a.appendChild(stack);
    li.appendChild(a);
    ul.appendChild(li);

    circleEls.push(circle);
    tlRefs.push(null);
    tweenRefs.push(null);

    a.addEventListener('mouseenter', () => handleEnter(i));
    a.addEventListener('mouseleave', () => handleLeave(i));
  });

  navItemsWrapper.appendChild(ul);
  nav.appendChild(navItemsWrapper);

  // Mobile hamburger
  const hamburger = document.createElement('button');
  hamburger.className = 'mobile-menu-button mobile-only';
  hamburger.setAttribute('aria-label', 'Toggle menu');
  hamburger.innerHTML = `<span class="hamburger-line"></span><span class="hamburger-line"></span>`;
  nav.appendChild(hamburger);

  container.appendChild(nav);

  // Mobile popover
  const popover = document.createElement('div');
  popover.className = 'mobile-menu-popover mobile-only';
  popover.style.setProperty('--base', baseColor);
  popover.style.setProperty('--pill-bg', pillColor);
  popover.style.setProperty('--pill-text', pillTextColor);
  popover.style.setProperty('--hover-text', hoveredPillTextColor);

  const mobileUl = document.createElement('ul');
  mobileUl.className = 'mobile-menu-list';
  items.forEach(item => {
    const li = document.createElement('li');
    const a  = document.createElement('a');
    a.href = item.href;
    a.className = 'mobile-menu-link';
    a.textContent = item.label;
    if (window.location.pathname === item.href) a.classList.add('is-active');
    a.addEventListener('click', () => closeMobile());
    li.appendChild(a);
    mobileUl.appendChild(li);
  });
  popover.appendChild(mobileUl);
  container.appendChild(popover);

  document.body.prepend(container);

  // ── Layout circles (GSAP) ─────────────────────────────────────────────────
  function layoutCircles() {
    circleEls.forEach((circle, i) => {
      if (!circle?.parentElement) return;
      const pill = circle.parentElement;
      const { width: w, height: h } = pill.getBoundingClientRect();
      const R     = ((w * w) / 4 + h * h) / (2 * h);
      const D     = Math.ceil(2 * R) + 2;
      const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;
      const originY = D - delta;

      circle.style.width  = `${D}px`;
      circle.style.height = `${D}px`;
      circle.style.bottom = `-${delta}px`;

      gsap.set(circle, { xPercent: -50, scale: 0, transformOrigin: `50% ${originY}px` });

      const label = pill.querySelector('.pill-label');
      const hover = pill.querySelector('.pill-label-hover');

      if (label) gsap.set(label, { y: 0 });
      if (hover)  gsap.set(hover, { y: h + 12, opacity: 0 });

      tlRefs[i]?.kill();

      const tl = gsap.timeline({ paused: true });
      tl.to(circle, { scale: 1.2, xPercent: -50, duration: 2, ease, overwrite: 'auto' }, 0);
      if (label) tl.to(label, { y: -(h + 8), duration: 2, ease, overwrite: 'auto' }, 0);
      if (hover) {
        gsap.set(hover, { y: Math.ceil(h + 100), opacity: 0 });
        tl.to(hover, { y: 0, opacity: 1, duration: 2, ease, overwrite: 'auto' }, 0);
      }
      tlRefs[i] = tl;
    });
  }

  function handleEnter(i) {
    const pill = circleEls[i]?.parentElement;
    if (pill?.classList.contains('is-active')) return;
    const tl = tlRefs[i];
    if (!tl) return;
    tweenRefs[i]?.kill();
    tweenRefs[i] = tl.tweenTo(tl.duration(), { duration: 0.3, ease, overwrite: 'auto' });
  }

  function handleLeave(i) {
    const pill = circleEls[i]?.parentElement;
    if (pill?.classList.contains('is-active')) return;
    const tl = tlRefs[i];
    if (!tl) return;
    tweenRefs[i]?.kill();
    tweenRefs[i] = tl.tweenTo(0, { duration: 0.2, ease, overwrite: 'auto' });
  }

  // ── Initial load animation ────────────────────────────────────────────────
  if (initialLoad) {
    gsap.set(logoLink, { opacity: 0, y: -8 });
    gsap.set(navItemsWrapper, { opacity: 0, y: -8 });
    gsap.to(logoLink, { opacity: 1, y: 0, duration: 0.5, ease, delay: 0.1 });
    gsap.to(navItemsWrapper, { opacity: 1, y: 0, duration: 0.5, ease, delay: 0.2 });
  }

  // ── Mobile toggle ─────────────────────────────────────────────────────────
  let mobileOpen = false;
  gsap.set(popover, { visibility: 'hidden', opacity: 0, y: -6 });

  function closeMobile() {
    mobileOpen = false;
    const lines = hamburger.querySelectorAll('.hamburger-line');
    gsap.to(lines[0], { rotation: 0, y: 0, duration: 0.3, ease });
    gsap.to(lines[1], { rotation: 0, y: 0, duration: 0.3, ease });
    gsap.to(popover, {
      opacity: 0, y: -6, duration: 0.2, ease,
      onComplete: () => gsap.set(popover, { visibility: 'hidden' }),
    });
  }

  hamburger.addEventListener('click', () => {
    mobileOpen = !mobileOpen;
    const lines = hamburger.querySelectorAll('.hamburger-line');
    if (mobileOpen) {
      gsap.to(lines[0], { rotation: 45, y: 3.5, duration: 0.3, ease });
      gsap.to(lines[1], { rotation: -45, y: -3.5, duration: 0.3, ease });
      gsap.set(popover, { visibility: 'visible' });
      gsap.fromTo(popover, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.3, ease });
    } else {
      closeMobile();
    }
  });

  // ── Run & listen to resize ────────────────────────────────────────────────
  layoutCircles();
  window.addEventListener('resize', layoutCircles);
  if (document.fonts?.ready) document.fonts.ready.then(layoutCircles).catch(() => {});

  // ── Header Text Animation (Staggered Entrance) ──────────────────────────
  // H1: Character-level fade-in blur stagger (keeping words intact)
  const h1s = document.querySelectorAll('h1.display');
  h1s.forEach(header => {
    const text = header.textContent.trim();
    header.innerHTML = '';
    
    // Split into words first
    const words = text.split(/\s+/);
    words.forEach((word, wIdx) => {
      const wordSpan = document.createElement('span');
      wordSpan.style.display = 'inline-block';
      wordSpan.style.whiteSpace = 'nowrap';
      
      // Split word into characters
      Array.from(word).forEach(char => {
        const charSpan = document.createElement('span');
        charSpan.textContent = char;
        charSpan.style.display = 'inline-block';
        charSpan.style.opacity = '0';
        charSpan.style.filter = 'blur(8px)';
        charSpan.className = 'anim-char';
        wordSpan.appendChild(charSpan);
      });
      
      header.appendChild(wordSpan);
      
      // Add space between words
      if (wIdx < words.length - 1) {
        const space = document.createTextNode(' ');
        header.appendChild(space);
      }
    });

    const chars = header.querySelectorAll('.anim-char');
    gsap.to(chars, {
      opacity: 1,
      filter: 'blur(0px)',
      stagger: 0.02,
      duration: 0.8,
      ease: 'power3.out',
      delay: 0.25
    });
  });

  // H2 & H3: Word-level clean fade-in reveal stagger
  const h2s = document.querySelectorAll('h2.display, h3.display, .section-title');
  h2s.forEach(header => {
    // Skip if it's an H1 already covered
    if (header.tagName === 'H1') return;
    const text = header.textContent.trim();
    header.innerHTML = '';
    const words = text.split(/\s+/);
    words.forEach((word, index) => {
      const span = document.createElement('span');
      span.textContent = word;
      span.style.display = 'inline-block';
      span.style.opacity = '0';
      span.style.transform = 'translateY(8px)';
      header.appendChild(span);
      if (index < words.length - 1) {
        const space = document.createTextNode(' ');
        header.appendChild(space);
      }
    });
    gsap.to(header.children, {
      opacity: 1,
      y: 0,
      stagger: 0.04,
      duration: 0.6,
      ease: 'power2.out',
      delay: 0.35
    });
  });
}
