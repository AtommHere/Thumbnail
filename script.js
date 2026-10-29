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
    showMore.innerHTML = visibleClientsExpanded ? 'Show fewer clients <span aria-hidden="true">↗</span>' : 'Show more clients <span aria-hidden="true">↗</span>';
  }
};

const loadClients = async () => {
  try {
    const payload = await fetchWithStaticFallback('/api/clients', 'data/clients.json');
    savedClients = collectionFrom(payload, 'clients').sort((a, b) => Number(b.subscriberCount || 0) - Number(a.subscriberCount || 0));
    renderClients();
  } catch (error) {
    console.warn('Client API unavailable. No client profiles were rendered.', error);
  }
};

document.querySelector('#show-more-clients')?.addEventListener('click', () => {
  visibleClientsExpanded = !visibleClientsExpanded;
  renderClients();
});

loadClients();

const menuToggle = document.querySelector('.menu-toggle');
const siteMenu = document.querySelector('#site-menu');

menuToggle?.addEventListener('click', () => {
  const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!isOpen));
  siteMenu?.classList.toggle('is-open', !isOpen);
});

siteMenu?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    menuToggle?.setAttribute('aria-expanded', 'false');
    siteMenu.classList.remove('is-open');
  });
});

let cards = [...document.querySelectorAll('.project-card')];
const emptyState = document.querySelector('.empty-state');

const showGalleryEmptyState = () => {
  if (emptyState) emptyState.hidden = cards.length !== 0;
};

const createUploadedProjectCard = (project) => {
  const card = document.createElement('article');
  card.className = 'project-card reveal';
  card.dataset.category = project.category || 'other';
  card.dataset.title = project.title;

  const link = document.createElement('a');
  link.className = 'project-link';
  link.href = '#contact';
  link.setAttribute('aria-label', `Ask about ${project.title} thumbnail`);

  const thumbnail = document.createElement('div');
  thumbnail.className = 'thumbnail uploaded-thumbnail';
  const image = document.createElement('img');
  image.src = project.imageUrl;
  image.alt = `${project.title} Minecraft thumbnail`;
  image.loading = 'lazy';
  thumbnail.append(image);

  const info = document.createElement('div');
  info.className = 'project-info';
  const copy = document.createElement('div');
  const title = document.createElement('h3');
  title.textContent = project.title;
  const subtitle = document.createElement('p');
  subtitle.textContent = project.description || (project.tags || []).join(' · ');
  copy.append(title, subtitle);
  const arrow = document.createElement('span');
  arrow.className = 'arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '↗';
  info.append(copy, arrow);
  link.append(thumbnail, info);
  card.append(link);
  return card;
};

const loadProjects = async () => {
  const projectGrid = document.querySelector('.gallery-grid');
  if (!projectGrid) return;
  try {
    const payload = await fetchWithStaticFallback('/api/projects', 'data/projects.json');
    projectGrid.querySelectorAll('.api-project').forEach((card) => card.remove());
    const uploadedProjects = collectionFrom(payload, 'projects').filter((project) => project.imageUrl);
    uploadedProjects.reverse().forEach((project) => {
      const card = createUploadedProjectCard(project);
      card.classList.add('api-project');
      card.dataset.projectId = project.id || '';
      projectGrid.append(card);
    });
    cards = [...document.querySelectorAll('.project-card')];
    showGalleryEmptyState();
  } catch (error) {
    console.warn('Project API unavailable. Fallback gallery remains visible.', error);
  }
};

loadProjects();

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
  try {
    const payload = await fetchWithStaticFallback('/api/reviews', 'data/reviews.json');
    reviewList.replaceChildren(...collectionFrom(payload, 'reviews').map(createReviewCard));
  } catch (error) {
    console.warn('Review API unavailable. No reviews were rendered.', error);
  }
};

loadReviews();

const lightbox = document.querySelector('#thumbnail-lightbox');
const lightboxImage = document.querySelector('#lightbox-image');
const lightboxTitle = document.querySelector('#lightbox-title');
const zoomLevel = document.querySelector('#zoom-level');
let lightboxScale = 1;

const updateLightboxZoom = () => {
  if (!lightboxImage || !zoomLevel) return;
  lightboxImage.style.transform = `scale(${lightboxScale})`;
  zoomLevel.textContent = `${Math.round(lightboxScale * 100)}%`;
};

const changeLightboxZoom = (amount) => {
  lightboxScale = Math.min(3, Math.max(0.5, Math.round((lightboxScale + amount) * 10) / 10));
  updateLightboxZoom();
};

const closeLightbox = () => {
  if (!lightbox) return;
  lightbox.hidden = true;
  document.body.classList.remove('lightbox-open');
  if (lightboxImage) {
    lightboxImage.removeAttribute('src');
    lightboxImage.style.transform = '';
  }
};

const openLightbox = (card) => {
  const image = card.querySelector('.thumbnail img');
  if (!lightbox || !lightboxImage || !image) return;
  lightboxScale = 1;
  lightboxImage.src = image.currentSrc || image.src;
  lightboxImage.alt = image.alt || `${card.querySelector('h3')?.textContent || 'Thumbnail'} preview`;
  if (lightboxTitle) lightboxTitle.textContent = card.querySelector('h3')?.textContent || 'Thumbnail preview';
  updateLightboxZoom();
  lightbox.hidden = false;
  document.body.classList.add('lightbox-open');
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

document.querySelector('#zoom-in')?.addEventListener('click', () => changeLightboxZoom(0.25));
document.querySelector('#zoom-out')?.addEventListener('click', () => changeLightboxZoom(-0.25));
document.querySelector('#lightbox-close')?.addEventListener('click', closeLightbox);
document.querySelector('[data-lightbox-close]')?.addEventListener('click', closeLightbox);
document.querySelector('#lightbox-stage')?.addEventListener('wheel', (event) => {
  event.preventDefault();
  changeLightboxZoom(event.deltaY < 0 ? 0.1 : -0.1);
}, { passive: false });
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && lightbox && !lightbox.hidden) closeLightbox();
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

