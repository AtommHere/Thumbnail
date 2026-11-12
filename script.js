let visibleClientsExpanded = false;
let savedClients = [];

const fetchWithStaticFallback = async (apiPath, staticPath) => {
  try {
    const response = await fetch(apiPath);
    if (response.ok) return await response.json();
  } catch {
    // Static GitHub Pages build has no local API.
  }
  const fallback = await fetch(staticPath);
  if (!fallback.ok) throw new Error(`Static content returned ${fallback.status}`);
  return fallback.json();
};

const collectionFrom = (payload, key) => Array.isArray(payload) ? payload : (payload?.[key] || []);
const setContentStatus = (name, message, canRetry = false) => {
  const status = document.querySelector(`#${name}-status`);
  const retry = document.querySelector(`#retry-${name}`);
  if (status) {
    status.textContent = message;
    status.hidden = !message;
  }
  if (retry) retry.hidden = !canRetry;
};

const clientSubscriberCount = (client) => {
  const exactCount = Number(client?.subscriberCount);
  if (Number.isFinite(exactCount) && exactCount > 0) return exactCount;
  const match = String(client?.subscriberLabel || '').match(/([\d,.]+)\s*([KMB])?/i);
  if (!match) return 0;
  const amount = Number(match[1].replace(/,/g, ''));
  const multiplier = { K: 1e3, M: 1e6, B: 1e9 }[String(match[2] || '').toUpperCase()] || 1;
  return amount * multiplier;
};

const createYouClient = () => {
  const profile = document.createElement('a');
  profile.className = 'client-profile client-profile-you';
  profile.href = '#contact';
  const avatar = document.createElement('span');
  avatar.className = 'client-avatar avatar-you';
  const question = document.createElement('span');
  question.textContent = '?';
  avatar.append(question);
  const name = document.createElement('strong');
  name.textContent = 'YOU';
  const subscribers = document.createElement('small');
  subscribers.textContent = '? SUBS';
  profile.append(avatar, name, subscribers);
  return profile;
};

const renderClients = () => {
  const roster = document.querySelector('.client-roster');
  if (!roster) return;
  roster.querySelectorAll('.client-profile').forEach((profile) => profile.remove());
  const empty = roster.querySelector('.clients-empty');
  if (empty) empty.hidden = savedClients.length !== 0;
  const visibleRealClients = visibleClientsExpanded ? savedClients : savedClients.slice(0, 7);
  const youCard = createYouClient();
  const youIndex = visibleRealClients.length;
  visibleRealClients.forEach((client, index) => {
    const profile = document.createElement('a');
    profile.className = 'client-profile';
    profile.href = '#contact';
    const avatar = document.createElement('span');
    avatar.className = 'client-avatar';
    const initial = document.createElement('span');
    initial.className = 'client-initial';
    initial.textContent = (client.name || '?').trim().charAt(0).toUpperCase();
    avatar.append(initial);
    if (client.thumbnail) {
      const image = document.createElement('img');
      image.className = 'client-logo';
      image.src = client.thumbnail;
      image.alt = `${client.name} YouTube channel logo`;
      image.addEventListener('load', () => avatar.classList.add('has-youtube-logo'), { once: true });
      image.addEventListener('error', () => image.remove(), { once: true });
      avatar.append(image);
    }
    const name = document.createElement('strong');
    name.textContent = client.name;
    const subscribers = document.createElement('small');
    subscribers.textContent = client.subscriberLabel || '? SUBS';
    profile.append(avatar, name, subscribers);
    if (index === youIndex) roster.append(youCard);
    roster.append(profile);
  });
  if (youIndex >= visibleRealClients.length) roster.append(youCard);
  const showMore = document.querySelector('#show-more-clients');
  if (showMore) {
    showMore.hidden = savedClients.length <= 7;
    showMore.setAttribute('aria-expanded', String(visibleClientsExpanded));
    showMore.innerHTML = visibleClientsExpanded ? 'Show fewer clients <span aria-hidden="true">↗</span>' : 'Show more clients <span aria-hidden="true">↗</span>';
  }
};

const loadClients = async () => {
  setContentStatus('clients', 'Loading clients…');
  try {
    const payload = await fetchWithStaticFallback('/api/clients', 'data/clients.json');
    savedClients = collectionFrom(payload, 'clients').sort((a, b) => clientSubscriberCount(b) - clientSubscriberCount(a));
    renderClients();
    setContentStatus('clients', '');
  } catch (error) {
    console.warn('Client API unavailable. No client profiles were rendered.', error);
    setContentStatus('clients', 'Clients could not load. Check your connection and try again.', true);
  }
};

document.querySelector('#show-more-clients')?.addEventListener('click', () => {
  visibleClientsExpanded = !visibleClientsExpanded;
  renderClients();
});
document.querySelector('#retry-clients')?.addEventListener('click', loadClients);

loadClients();

const menuToggle = document.querySelector('.menu-toggle');
const siteMenu = document.querySelector('#site-menu');

const closeMenu = ({ returnFocus = false } = {}) => {
  if (!menuToggle || !siteMenu) return;
  menuToggle.setAttribute('aria-expanded', 'false');
  siteMenu.classList.remove('is-open');
  if (returnFocus) menuToggle.focus();
};

menuToggle?.addEventListener('click', () => {
  const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!isOpen));
  siteMenu?.classList.toggle('is-open', !isOpen);
});

siteMenu?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => closeMenu());
});

document.addEventListener('click', (event) => {
  if (menuToggle?.getAttribute('aria-expanded') === 'true'
    && !siteMenu?.contains(event.target)
    && !menuToggle.contains(event.target)) closeMenu();
});

const sectionLinks = [...document.querySelectorAll('.nav-links a[href^="#"]')];
const observedSections = sectionLinks
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

if ('IntersectionObserver' in window) {
  const sectionObserver = new IntersectionObserver((entries) => {
    const current = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!current) return;
    sectionLinks.forEach((link) => {
      if (link.getAttribute('href') === `#${current.target.id}`) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }, { rootMargin: '-20% 0px -65% 0px', threshold: [0, 0.1, 0.25, 0.5] });
  observedSections.forEach((section) => sectionObserver.observe(section));
}

let cards = [...document.querySelectorAll('.project-card')];
const emptyState = document.querySelector('.empty-state');

const showGalleryEmptyState = () => {
  if (emptyState) emptyState.hidden = cards.length !== 0;
};

const createUploadedProjectCard = (project, index) => {
  const projectTitle = project.title && project.title !== 'Untitled thumbnail'
    ? project.title
    : `Thumbnail ${String(index + 1).padStart(2, '0')}`;
  const card = document.createElement('article');
  card.className = 'project-card reveal';
  card.dataset.category = project.category || 'other';
  card.dataset.title = projectTitle;

  const link = document.createElement('button');
  link.className = 'project-link';
  link.type = 'button';
  link.setAttribute('aria-label', `Open ${projectTitle} thumbnail preview`);

  const thumbnail = document.createElement('div');
  thumbnail.className = 'thumbnail uploaded-thumbnail';
  const image = document.createElement('img');
  image.src = project.imageUrl;
  image.alt = `${projectTitle} Minecraft thumbnail`;
  image.loading = 'lazy';
  thumbnail.append(image);

  const info = document.createElement('div');
  info.className = 'project-info';
  const copy = document.createElement('div');
  const title = document.createElement('h3');
  title.textContent = projectTitle;
  const subtitle = document.createElement('p');
  subtitle.textContent = project.description || (project.tags || []).join(' · ');
  copy.append(title, subtitle);
  const arrow = document.createElement('span');
  arrow.className = 'arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '↗';
  info.append(copy, arrow);
  link.append(thumbnail);
  card.append(link, info);
  return card;
};

const loadProjects = async () => {
  const projectGrid = document.querySelector('.gallery-grid');
  if (!projectGrid) return;
  setContentStatus('projects', 'Loading thumbnails…');
  try {
    const payload = await fetchWithStaticFallback('/api/projects', 'data/projects.json');
    projectGrid.querySelectorAll('.api-project').forEach((card) => card.remove());
    const uploadedProjects = collectionFrom(payload, 'projects').filter((project) => project.imageUrl);
    uploadedProjects.reverse().forEach((project, index) => {
      const card = createUploadedProjectCard(project, index);
      card.classList.add('api-project');
      card.dataset.projectId = project.id || '';
      projectGrid.append(card);
    });
    cards = [...document.querySelectorAll('.project-card')];
    showGalleryEmptyState();
    setContentStatus('projects', '');
  } catch (error) {
    console.warn('Project API unavailable. Fallback gallery remains visible.', error);
    setContentStatus('projects', 'Thumbnails could not load. Check your connection and try again.', true);
  }
};

loadProjects();
document.querySelector('#retry-projects')?.addEventListener('click', loadProjects);

const createReviewCard = (review, index) => {
  const card = document.createElement('blockquote');
  card.className = `testimonial-card glass-panel reveal${index ? ` reveal-delay-${Math.min(index, 2)}` : ''}`;
  const mark = document.createElement('div');
  mark.className = 'quote-mark';
  mark.textContent = '“';
  const text = document.createElement('p');
  text.textContent = review.text || '';
  const footer = document.createElement('footer');
  const author = review.authorUrl ? document.createElement('a') : document.createElement('strong');
  author.textContent = review.author || 'Client';
  if (review.authorUrl) {
    author.href = review.authorUrl;
    author.target = '_blank';
    author.rel = 'noreferrer';
  }
  const role = document.createElement('span');
  role.textContent = review.role || '';
  footer.append(author, role);
  card.append(mark, text, footer);
  return card;
};

const loadReviews = async () => {
  const reviewList = document.querySelector('#review-list');
  if (!reviewList) return;
  setContentStatus('reviews', 'Loading reviews…');
  try {
    const payload = await fetchWithStaticFallback('/api/reviews', 'data/reviews.json');
    reviewList.replaceChildren(...collectionFrom(payload, 'reviews').map(createReviewCard));
    setContentStatus('reviews', reviewList.childElementCount ? '' : 'No reviews have been added yet.');
  } catch (error) {
    console.warn('Review API unavailable. No reviews were rendered.', error);
    setContentStatus('reviews', 'Reviews could not load. Check your connection and try again.', true);
  }
};

loadReviews();
document.querySelector('#retry-reviews')?.addEventListener('click', loadReviews);

const lightbox = document.querySelector('#thumbnail-lightbox');
const lightboxImage = document.querySelector('#lightbox-image');
const lightboxTitle = document.querySelector('#lightbox-title');
const lightboxStage = document.querySelector('#lightbox-stage');
const lightboxZoomStatus = document.querySelector('#lightbox-zoom-status');
let lightboxScale = 1;
let lightboxBaseWidth = 0;
let lightboxBaseHeight = 0;
let lightboxPanX = 0;
let lightboxPanY = 0;
let lightboxOpener = null;
const lightboxPanel = lightbox?.querySelector('.lightbox-panel');
const lightboxFocusableSelector = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';
const lightboxBackground = [document.querySelector('.skip-link'), document.querySelector('.site-header'), document.querySelector('main')].filter(Boolean);
let lightboxBackgroundState = [];
const lightboxPointers = new Map();
let pinchOrigin = null;
let panPointer = null;
const MIN_LIGHTBOX_SCALE = 1;
const MAX_LIGHTBOX_SCALE = 6;

const clampLightboxPan = () => {
  if (!lightboxStage) return;
  const maxX = Math.max(0, (lightboxBaseWidth * lightboxScale - lightboxStage.clientWidth) / 2);
  const maxY = Math.max(0, (lightboxBaseHeight * lightboxScale - lightboxStage.clientHeight) / 2);
  lightboxPanX = Math.max(-maxX, Math.min(maxX, lightboxPanX));
  lightboxPanY = Math.max(-maxY, Math.min(maxY, lightboxPanY));
};

const renderLightboxView = (announce = false) => {
  if (!lightboxImage || !lightboxStage) return;
  clampLightboxPan();
  lightboxImage.style.transform = `translate3d(${lightboxPanX}px, ${lightboxPanY}px, 0) scale(${lightboxScale})`;
  lightboxStage.classList.toggle('is-zoomed', lightboxScale > MIN_LIGHTBOX_SCALE);
  if (announce && lightboxZoomStatus) {
    lightboxZoomStatus.textContent = lightboxScale === MIN_LIGHTBOX_SCALE
      ? 'Image fitted to the preview.'
      : `Image zoom ${Math.round(lightboxScale * 100)} percent.`;
  }
};

const fitLightboxImage = (reset = false) => {
  if (!lightboxImage?.naturalWidth || !lightboxStage?.clientWidth || !lightboxStage.clientHeight) return;
  const fitScale = Math.min(
    lightboxStage.clientWidth / lightboxImage.naturalWidth,
    lightboxStage.clientHeight / lightboxImage.naturalHeight,
  );
  lightboxBaseWidth = lightboxImage.naturalWidth * fitScale;
  lightboxBaseHeight = lightboxImage.naturalHeight * fitScale;
  lightboxImage.style.width = `${lightboxBaseWidth}px`;
  lightboxImage.style.height = `${lightboxBaseHeight}px`;
  if (reset) {
    lightboxScale = MIN_LIGHTBOX_SCALE;
    lightboxPanX = 0;
    lightboxPanY = 0;
  }
  renderLightboxView();
};

const setLightboxScaleAt = (nextScale, pointX, pointY, announce = false) => {
  if (!lightboxStage) return;
  const next = Math.max(MIN_LIGHTBOX_SCALE, Math.min(MAX_LIGHTBOX_SCALE, nextScale));
  if (next === MIN_LIGHTBOX_SCALE) {
    lightboxScale = MIN_LIGHTBOX_SCALE;
    lightboxPanX = 0;
    lightboxPanY = 0;
  } else if (next !== lightboxScale) {
    const ratio = next / lightboxScale;
    lightboxPanX += (pointX - lightboxStage.clientWidth / 2 - lightboxPanX) * (1 - ratio);
    lightboxPanY += (pointY - lightboxStage.clientHeight / 2 - lightboxPanY) * (1 - ratio);
    lightboxScale = next;
  }
  renderLightboxView(announce);
};

const resetLightboxView = () => {
  lightboxScale = MIN_LIGHTBOX_SCALE;
  lightboxPanX = 0;
  lightboxPanY = 0;
  renderLightboxView(true);
};

const closeLightbox = () => {
  if (!lightbox) return;
  lightbox.hidden = true;
  document.body.classList.remove('lightbox-open');
  lightboxBackground.forEach((element, index) => {
    element.inert = lightboxBackgroundState[index] || false;
  });
  lightboxBackgroundState = [];
  lightboxPointers.clear();
  pinchOrigin = null;
  panPointer = null;
  if (lightboxImage) {
    lightboxImage.onload = null;
    lightboxImage.removeAttribute('src');
    lightboxImage.style.width = '';
    lightboxImage.style.height = '';
    lightboxImage.style.transform = '';
  }
  lightboxStage?.classList.remove('is-zoomed', 'is-panning');
  if (lightboxOpener?.isConnected) lightboxOpener.focus();
  else document.querySelector('.gallery-grid .project-link')?.focus();
  lightboxOpener = null;
};

const openLightbox = (card) => {
  const image = card.querySelector('.thumbnail img');
  if (!lightbox || !lightboxImage || !image) return;
  lightboxOpener = card.querySelector('.project-link');
  lightboxScale = MIN_LIGHTBOX_SCALE;
  lightboxPanX = 0;
  lightboxPanY = 0;
  lightboxBaseWidth = 0;
  lightboxBaseHeight = 0;
  if (lightboxZoomStatus) lightboxZoomStatus.textContent = '';
  lightboxImage.alt = image.alt || `${card.querySelector('h3')?.textContent || 'Thumbnail'} preview`;
  if (lightboxTitle) lightboxTitle.textContent = card.querySelector('h3')?.textContent || 'Thumbnail preview';
  lightbox.hidden = false;
  document.body.classList.add('lightbox-open');
  lightboxBackgroundState = lightboxBackground.map((element) => element.inert);
  lightboxBackground.forEach((element) => { element.inert = true; });
  lightboxImage.onload = () => fitLightboxImage(true);
  lightboxImage.src = image.currentSrc || image.src;
  if (lightboxImage.complete && lightboxImage.naturalWidth) requestAnimationFrame(() => fitLightboxImage(true));
  document.querySelector('#lightbox-close')?.focus();
};

document.querySelector('.gallery-grid')?.addEventListener('click', (event) => {
  const link = event.target.closest('.project-link');
  if (!link) return;
  const card = link.closest('.project-card');
  if (!card?.querySelector('.thumbnail img')) return;
  event.preventDefault();
  openLightbox(card);
});

document.querySelector('#lightbox-close')?.addEventListener('click', closeLightbox);
document.querySelector('[data-lightbox-close]')?.addEventListener('click', closeLightbox);
lightboxStage?.addEventListener('wheel', (event) => {
  if (!(event.target instanceof Element) || !event.target.closest('#lightbox-image')) return;
  event.preventDefault();
  const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? lightboxStage.clientHeight : 1;
  const rect = lightboxStage.getBoundingClientRect();
  const nextScale = lightboxScale * Math.exp(-event.deltaY * unit * 0.0015);
  setLightboxScaleAt(nextScale, event.clientX - rect.left, event.clientY - rect.top);
}, { passive: false });
lightboxStage?.addEventListener('pointerdown', (event) => {
  if (event.pointerType !== 'touch' && (event.button !== 0 || lightboxScale <= MIN_LIGHTBOX_SCALE)) return;
  event.preventDefault();
  lightboxStage.setPointerCapture(event.pointerId);
  lightboxPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (lightboxPointers.size >= 2) {
    const [first, second] = [...lightboxPointers.values()].slice(0, 2);
    const rect = lightboxStage.getBoundingClientRect();
    pinchOrigin = {
      scale: lightboxScale,
      panX: lightboxPanX,
      panY: lightboxPanY,
      distance: Math.hypot(second.x - first.x, second.y - first.y),
      midpointX: (first.x + second.x) / 2 - rect.left,
      midpointY: (first.y + second.y) / 2 - rect.top,
    };
    panPointer = null;
  } else {
    panPointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    if (event.pointerType !== 'touch' && lightboxScale > MIN_LIGHTBOX_SCALE) lightboxStage.classList.add('is-panning');
  }
});
lightboxStage?.addEventListener('pointermove', (event) => {
  if (!lightboxPointers.has(event.pointerId)) return;
  event.preventDefault();
  lightboxPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pinchOrigin && lightboxPointers.size >= 2) {
    const [first, second] = [...lightboxPointers.values()].slice(0, 2);
    const rect = lightboxStage.getBoundingClientRect();
    const distance = Math.hypot(second.x - first.x, second.y - first.y);
    const midpointX = (first.x + second.x) / 2 - rect.left;
    const midpointY = (first.y + second.y) / 2 - rect.top;
    const nextScale = Math.max(MIN_LIGHTBOX_SCALE, Math.min(MAX_LIGHTBOX_SCALE, pinchOrigin.scale * distance / Math.max(pinchOrigin.distance, 1)));
    const imagePointX = (pinchOrigin.midpointX - lightboxStage.clientWidth / 2 - pinchOrigin.panX) / pinchOrigin.scale;
    const imagePointY = (pinchOrigin.midpointY - lightboxStage.clientHeight / 2 - pinchOrigin.panY) / pinchOrigin.scale;
    lightboxScale = nextScale;
    lightboxPanX = midpointX - lightboxStage.clientWidth / 2 - imagePointX * nextScale;
    lightboxPanY = midpointY - lightboxStage.clientHeight / 2 - imagePointY * nextScale;
    renderLightboxView();
    return;
  }
  if (panPointer?.id === event.pointerId) {
    lightboxPanX += event.clientX - panPointer.x;
    lightboxPanY += event.clientY - panPointer.y;
    panPointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    renderLightboxView();
  }
});
const endLightboxPointer = (event) => {
  lightboxPointers.delete(event.pointerId);
  if (event.pointerType !== 'touch') lightboxStage?.classList.remove('is-panning');
  if (lightboxPointers.size < 2) pinchOrigin = null;
  if (lightboxPointers.size === 1) {
    const [id, point] = [...lightboxPointers.entries()][0];
    panPointer = { id, ...point };
  } else {
    panPointer = null;
  }
};
lightboxStage?.addEventListener('pointerup', endLightboxPointer);
lightboxStage?.addEventListener('pointercancel', endLightboxPointer);
window.addEventListener('resize', () => {
  if (lightbox && !lightbox.hidden) fitLightboxImage();
});
document.addEventListener('keydown', (event) => {
  if (lightbox && !lightbox.hidden) {
    const targetIsEditable = event.target instanceof HTMLElement && event.target.matches('input, textarea, select, [contenteditable="true"]');
    if (!targetIsEditable) {
      const centerX = lightboxStage?.clientWidth / 2 || 0;
      const centerY = lightboxStage?.clientHeight / 2 || 0;
      if (event.key === 'Escape') {
        closeLightbox();
        return;
      }
      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        setLightboxScaleAt(lightboxScale * 1.25, centerX, centerY, true);
      } else if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        setLightboxScaleAt(lightboxScale / 1.25, centerX, centerY, true);
      } else if (event.key === '0') {
        event.preventDefault();
        resetLightboxView();
      } else if (lightboxScale > MIN_LIGHTBOX_SCALE && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        const amount = event.shiftKey ? 72 : 36;
        if (event.key === 'ArrowUp') lightboxPanY += amount;
        if (event.key === 'ArrowDown') lightboxPanY -= amount;
        if (event.key === 'ArrowLeft') lightboxPanX += amount;
        if (event.key === 'ArrowRight') lightboxPanX -= amount;
        renderLightboxView();
      }
    }
  }

  if (event.key === 'Escape' && menuToggle?.getAttribute('aria-expanded') === 'true') {
    closeMenu({ returnFocus: true });
    return;
  }

  if (event.key === 'Tab' && lightbox && !lightbox.hidden && lightboxPanel) {
    const focusable = [...lightboxPanel.querySelectorAll(lightboxFocusableSelector)];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!focusable.length) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
});

if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
  const liveUpdates = new EventSource('/api/updates');
  liveUpdates.addEventListener('content', async (event) => {
    try {
      const update = JSON.parse(event.data);
      if (update.type === 'projects') await loadProjects();
      if (update.type === 'clients') await loadClients();
      if (update.type === 'reviews') await loadReviews();
    } catch (error) {
      console.warn('Live content update could not be applied.', error);
    }
  });
}

