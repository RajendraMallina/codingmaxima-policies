(() => {
  const body = document.body;
  const panels = [...document.querySelectorAll('.document-panel')];
  const tabs = [...document.querySelectorAll('.document-tab')];
  const contents = document.getElementById('table-of-contents');
  const search = document.getElementById('policy-search');
  const clear = document.getElementById('clear-search');
  const status = document.getElementById('search-status');
  const empty = document.getElementById('empty-search');
  if (!panels.length || !tabs.length) return;

  body.classList.add('js');
  const normalise = value => value.normalize('NFKD').toLocaleLowerCase('en-IN').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const entries = new Map(panels.map(panel => [panel.id, [...panel.querySelectorAll('.legal-section')]]));
  let active = 'policies';

  function renderNavigation(panelId) {
    const sections = entries.get(panelId) || [];
    contents.replaceChildren(...sections.map((section, index) => {
      const link = document.createElement('a');
      link.href = `#${section.id}`;
      link.dataset.sectionId = section.id;
      const number = document.createElement('span');
      number.textContent = String(index + 1).padStart(2, '0');
      const label = document.createElement('span');
      label.textContent = section.querySelector('h3')?.textContent.trim() || '';
      link.append(number, label);
      return link;
    }));
  }

  function selectPanel(id, focus = false) {
    if (!entries.has(id)) id = 'policies';
    active = id;
    panels.forEach(panel => {
      const selected = panel.id === id;
      panel.hidden = !selected;
      panel.setAttribute('aria-hidden', String(!selected));
    });
    tabs.forEach(tab => {
      const selected = tab.dataset.panel === id;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    renderNavigation(id);
    filterSections();
    if (focus) tabs.find(tab => tab.hash === `#${id}`)?.focus();
  }

  function filterSections() {
    const sections = entries.get(active) || [];
    const query = normalise(search.value);
    const terms = query.split(/\s+/).filter(Boolean);
    let visible = 0;
    sections.forEach(section => {
      const haystack = normalise(section.textContent);
      const matches = terms.every(term => haystack.includes(term));
      section.hidden = !matches;
      const link = contents.querySelector(`[data-section-id="${section.id}"]`);
      if (link) link.hidden = !matches;
      if (matches) visible += 1;
    });
    const noQuery = terms.length === 0;
    document.querySelector(`#${active} .document-intro`).hidden = !noQuery;
    empty.hidden = noQuery || visible > 0;
    clear.hidden = noQuery;
    status.textContent = noQuery ? '' : `${visible} of ${sections.length} sections match “${search.value.trim()}”.`;
    if (!noQuery) setCurrentSection();
  }

  function setCurrentSection() {
    const links = [...contents.querySelectorAll('a:not([hidden])')];
    let current = null;
    links.forEach(link => {
      const section = document.getElementById(link.dataset.sectionId);
      if (section && section.getBoundingClientRect().top <= 230) current = link;
    });
    links.forEach(link => {
      if (link === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  tabs.forEach((tab, index) => {
    tab.setAttribute('role', 'tab');
    tab.addEventListener('click', () => {
      selectPanel(tab.dataset.panel);
      history.pushState(null, '', `#${tab.dataset.panel}`);
    });
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
      const id = tabs[next].dataset.panel;
      selectPanel(id, true);
      history.pushState(null, '', `#${id}`);
    });
  });

  contents.addEventListener('click', event => {
    const link = event.target.closest('a[data-section-id]');
    if (!link) return;
    const section = document.getElementById(link.dataset.sectionId);
    if (section) requestAnimationFrame(() => { section.setAttribute('tabindex', '-1'); section.focus({ preventScroll: true }); });
  });

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const id = decodeURIComponent(link.hash.slice(1));
    if (entries.has(id)) selectPanel(id);
    const section = document.getElementById(id);
    if (section?.classList.contains('legal-section') && section.closest('.document-panel')?.id !== active) {
      selectPanel(section.closest('.document-panel').id);
    }
    if (section?.classList.contains('legal-section')) requestAnimationFrame(() => { section.setAttribute('tabindex', '-1'); section.focus({ preventScroll: true }); });
  });
  window.addEventListener('hashchange', () => {
    const id = decodeURIComponent(location.hash.slice(1));
    const section = document.getElementById(id);
    const panel = entries.has(id) ? id : section?.closest('.document-panel')?.id;
    if (panel && panel !== active) selectPanel(panel);
  });

  search.addEventListener('input', filterSections);
  clear.addEventListener('click', () => { search.value = ''; filterSections(); search.focus(); });
  document.getElementById('reset-search').addEventListener('click', () => { search.value = ''; filterSections(); search.focus(); });
  document.getElementById('print-documents').addEventListener('click', () => window.print());
  window.addEventListener('scroll', setCurrentSection, { passive: true });
  window.addEventListener('resize', setCurrentSection, { passive: true });

  document.querySelectorAll('.reading-time').forEach(label => {
    const panel = label.closest('.document-panel');
    const words = panel.textContent.trim().split(/\s+/).length;
    label.textContent = `${Math.max(1, Math.ceil(words / 200))} min read`;
  });
  document.getElementById('copyright-year').textContent = new Date().getFullYear();

  const initialHash = decodeURIComponent(location.hash.slice(1));
  const initialSection = document.getElementById(initialHash);
  selectPanel(entries.has(initialHash) ? initialHash : initialSection?.closest('.document-panel')?.id || 'policies');
})();
