const paneGrid = document.getElementById('pane-grid');
const detailPane = document.getElementById('detail-pane');
const detailScrim = document.getElementById('detail-scrim');
const detailClose = document.getElementById('detail-close');
const detailTitle = document.getElementById('detail-title');
const detailTag = document.getElementById('detail-tag');
const detailSummary = document.getElementById('detail-summary');
const detailDescription = document.getElementById('detail-description');
const detailHighlights = document.getElementById('detail-highlights');
const detailTech = document.getElementById('detail-tech');
const detailActions = document.getElementById('detail-actions');

let lastActiveTrigger = null;

async function loadApplications() {
  let applications = [];

  try {
    const response = await fetch('./applications/catalog.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const payload = await response.json();
    if (Array.isArray(payload)) {
      applications = payload;
    } else if (Array.isArray(payload.applications)) {
      applications = payload.applications;
    } else {
      console.warn('Unknown catalog format. Expected array of applications.');
    }
  } catch (error) {
    console.error('Unable to load application catalog:', error);
  }

  if (!applications.length && Array.isArray(window.__APPLICATION_CATALOG__)) {
    return window.__APPLICATION_CATALOG__;
  }

  return applications;
}

function createPane(application, index) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `pane${application.paneClass ? ` ${application.paneClass}` : ''}`;
  button.dataset.appId = application.id;
  button.setAttribute('aria-label', `${application.title}: ${application.summary}`);

  button.innerHTML = `
    <div class="pane__meta">
      <span>${String(index + 1).padStart(2, '0')}</span>
      <span>${application.tag}</span>
    </div>
    <h3 class="pane__title">${application.title}</h3>
    <p class="pane__summary">${application.summary}</p>
    <span class="pane__cta">Explore
      <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path fill="currentColor" d="M3 8.25h7.19L7.22 11.2l1.06 1.06 4.72-4.72-4.72-4.72-1.06 1.06L10.19 6.75H3v1.5z" />
      </svg>
    </span>
  `;

  button.addEventListener('click', () => openDetail(application, button));
  button.addEventListener('keyup', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      openDetail(application, button);
    }
  });

  return button;
}

function renderPanes(applications) {
  paneGrid.innerHTML = '';

  applications.forEach((application, index) => {
    const pane = createPane(application, index);
    paneGrid.appendChild(pane);
  });
}

function populateList(listNode, items) {
  listNode.innerHTML = '';
  items.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    listNode.appendChild(li);
  });
}

function populateActions(actions = []) {
  detailActions.innerHTML = '';
  if (!actions.length) {
    const fallback = document.createElement('p');
    fallback.textContent = 'Contact us for additional materials.';
    detailActions.appendChild(fallback);
    return;
  }

  actions.forEach((action) => {
    const link = document.createElement('a');
    link.className = 'detail-link';
    link.href = action.href;
    link.target = action.target ?? (action.href.startsWith('http') ? '_blank' : '_self');
    if (link.target === '_blank') {
      link.rel = action.rel ?? 'noopener noreferrer';
    } else if (action.rel) {
      link.rel = action.rel;
    }
    link.textContent = action.label;
    detailActions.appendChild(link);
  });
}

function openDetail(application, trigger) {
  lastActiveTrigger = trigger;
  detailPane.classList.remove('hidden');
  detailPane.setAttribute('data-app-id', application.id);

  detailTitle.textContent = application.title;
  detailTag.textContent = application.tag;
  detailSummary.textContent = application.summary;
  detailDescription.textContent = application.description.replace(/\s+/g, ' ').trim();

  populateList(detailHighlights, application.highlights);
  populateList(detailTech, application.tech);
  populateActions(application.links);

  document.body.style.overflow = 'hidden';
  window.requestAnimationFrame(() => {
    detailClose.focus();
  });
}

function closeDetail() {
  if (detailPane.classList.contains('hidden')) return;
  detailPane.classList.add('hidden');
  detailPane.removeAttribute('data-app-id');
  document.body.style.overflow = '';

  if (lastActiveTrigger && typeof lastActiveTrigger.focus === 'function') {
    lastActiveTrigger.focus();
  }
}

detailClose.addEventListener('click', closeDetail);
detailScrim.addEventListener('click', closeDetail);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeDetail();
  }
});

const briefLink = document.querySelector('[data-action="request-brief"]');
if (briefLink) {
  briefLink.addEventListener('click', (event) => {
    event.preventDefault();
    window.location.href = 'mailto:jakecast@hawaii.edu?subject=New%20Codex%20Application%20Brief';
  });
}

loadApplications().then((applications) => {
  if (!applications.length) {
    const message = document.createElement('p');
    message.className = 'pane-grid__empty';
    message.textContent = 'New builds are in progress. Check back soon for fresh launches.';
    paneGrid.appendChild(message);
    return;
  }

  renderPanes(applications);
});
