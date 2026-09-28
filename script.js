(() => {
  'use strict';
  // Chapter links restore to the sheet's natural position, including reloads.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  document.body.classList.add('js-ready');
  const header = document.querySelector('.site-header');
  const menu = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#site-navigation');
  const book = document.querySelector('.book');
  const pages = [...document.querySelectorAll('.paper')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const motionButton = document.querySelector('.motion-toggle');
  let paused = false;
  try { paused = sessionStorage.getItem('aoi-inko-poetry-motion-paused') === 'true'; } catch { /* Optional storage. */ }
  let pageFrame = 0;
  let pageTops = [];
  const clamp = value => Math.max(0, Math.min(1, value));

  menu.hidden = false;
  function closeMenu(returnFocus = false) {
    menu.setAttribute('aria-expanded', 'false');
    navigation.classList.remove('is-open');
    if (returnFocus) menu.focus();
  }
  menu.addEventListener('click', () => {
    const expanded = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(expanded));
    navigation.classList.toggle('is-open', expanded);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') closeMenu(true);
  });
  document.addEventListener('click', event => { if (!event.target.closest('.site-header')) closeMenu(); });
  matchMedia('(min-width: 761px)').addEventListener('change', event => { if (event.matches) closeMenu(); });

  function measurePages() {
    let top = book.getBoundingClientRect().top + scrollY;
    const headerHeight = header.offsetHeight;
    pageTops = pages.map(page => {
      const pageTop = top;
      const height = page.offsetHeight;
      top += height + parseFloat(getComputedStyle(page).marginBottom);
      page.style.setProperty('--pin-top', `${Math.min(headerHeight + 18, innerHeight - height - 26)}px`);
      return pageTop;
    });
    schedulePages();
  }
  function renderPages() {
    pageFrame = 0;
    const maxScroll = document.documentElement.scrollHeight - innerHeight;
    header.style.setProperty('--reading-progress', String(clamp(scrollY / Math.max(1, maxScroll))));
    const rects = pages.map(page => page.getBoundingClientRect());
    pages.forEach((page, index) => {
      const next = rects[index + 1];
      const progress = next ? clamp((innerHeight * .92 - next.top) / (innerHeight * .72)) : 0;
      page.style.setProperty('--recede', paused || reducedMotion.matches ? '0' : progress.toFixed(4));
    });
    let current = 0;
    pageTops.forEach((top, index) => { if (scrollY + header.offsetHeight + 180 >= top) current = index; });
    navigation.querySelectorAll('a').forEach(link => {
      if (link.hash === '#' + pages[current].id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function schedulePages() { if (!pageFrame) pageFrame = requestAnimationFrame(renderPages); }
  function updateMotion() {
    const stopped = paused || reducedMotion.matches;
    document.body.classList.toggle('motion-paused', stopped);
    document.body.classList.toggle('book-motion', !stopped);
    document.body.classList.toggle('reveal-motion', !stopped && 'IntersectionObserver' in window);
    motionButton.hidden = reducedMotion.matches;
    motionButton.setAttribute('aria-pressed', String(paused));
    motionButton.querySelector('.motion-label').textContent = paused ? '動きを再生する' : '動きを止める';
    motionButton.querySelector('.motion-icon').textContent = paused ? '▷' : 'Ⅱ';
    if (stopped) document.querySelectorAll('.reveal').forEach(element => element.classList.add('is-visible'));
    measurePages();
  }
  motionButton.addEventListener('click', () => {
    paused = !paused;
    try { sessionStorage.setItem('aoi-inko-poetry-motion-paused', String(paused)); } catch { /* Storage is optional. */ }
    updateMotion();
  });
  reducedMotion.addEventListener('change', updateMotion);
  addEventListener('scroll', schedulePages, {passive: true});
  addEventListener('resize', measurePages, {passive: true});
  if ('ResizeObserver' in window) {
    const sizeObserver = new ResizeObserver(measurePages);
    pages.forEach(page => sizeObserver.observe(page.querySelector('.paper-face')));
    sizeObserver.observe(header);
  }
  if ('IntersectionObserver' in window) {
    const pageObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-open'); pageObserver.unobserve(entry.target); }
      });
    }, {threshold: 0, rootMargin: '0px 0px -15px 0px'});
    pages.forEach(page => pageObserver.observe(page));
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); }
      });
    }, {threshold: .06, rootMargin: '0px 0px -34px 0px'});
    document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));
  }
  updateMotion();

  // Use the sheets' natural positions: a previously pinned sheet is no longer
  // at its original DOM rectangle when the reader chooses an earlier chapter.
  function goToPage(id, focus = false, instant = false) {
    const index = pages.findIndex(page => page.id === id);
    if (index < 0) return;
    measurePages();
    const page = pages[index];
    page.classList.add('is-open');
    if (focus) {
      page.setAttribute('tabindex', '-1');
      page.focus({preventScroll: true});
    }
    scrollTo({top: Math.max(0, pageTops[index] - header.offsetHeight - 18), behavior: instant || paused || reducedMotion.matches ? 'instant' : 'smooth'});
  }
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    const id = link.hash.slice(1);
    if (!pages.some(page => page.id === id)) return;
    link.addEventListener('click', event => {
      event.preventDefault();
      closeMenu();
      history.pushState(null, '', '#' + id);
      goToPage(id, event.detail === 0);
    });
  });
  addEventListener('popstate', () => goToPage(location.hash.slice(1) || 'hero', false, true));
  addEventListener('load', () => {
    measurePages();
    if (location.hash) goToPage(location.hash.slice(1), false, true);
  }, {once: true});
  document.fonts?.ready.then(measurePages);

  const config = window.AOI_INKO_CONFIG || {};
  const contactButton = document.querySelector('#contact-button');
  const contactStatus = document.querySelector('#contact-status');
  const dialog = document.querySelector('#contact-dialog');
  let hasContact = false;
  try {
    const url = new URL(config.contactUrl);
    hasContact = (url.protocol === 'https:' && !!url.hostname) || (url.protocol === 'mailto:' && /.+@.+\..+/.test(url.pathname));
    if (hasContact) contactButton.href = url.href;
  } catch { /* The contact address will be provided later. */ }
  if (hasContact) contactStatus.hidden = true;
  else {
    contactButton.setAttribute('aria-haspopup', 'dialog');
    contactButton.addEventListener('click', event => {
      if (typeof dialog.showModal !== 'function') return;
      event.preventDefault();
      dialog.showModal();
    });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
  }
  const gallery = document.querySelector('#publication-gallery');
  for (const item of Array.isArray(config.publications) ? config.publications : []) {
    if (!item || !item.image || !item.alt || !item.title) continue;
    let url;
    try { url = new URL(item.image, location.href); } catch { continue; }
    if (!['http:', 'https:', 'file:'].includes(url.protocol)) continue;
    const figure = document.createElement('figure');
    figure.className = 'gallery-entry';
    const image = document.createElement('img');
    image.src = url.href; image.alt = String(item.alt); image.loading = 'lazy'; image.decoding = 'async';
    const caption = document.createElement('figcaption');
    const title = document.createElement('h3'); title.textContent = String(item.title); caption.append(title);
    if (item.caption) { const p = document.createElement('p'); p.textContent = String(item.caption); caption.append(p); }
    if (item.haiku) { const poem = document.createElement('blockquote'); poem.className = 'haiku' + (item.vertical ? ' is-vertical' : ''); poem.textContent = String(item.haiku); caption.append(poem); }
    figure.append(image, caption); gallery.append(figure);
  }
  gallery.hidden = !gallery.childElementCount;
})();
