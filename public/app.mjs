import { calendarDays, dateKey, emptyData, filterPatterns, formats, readData, statistics, statuses, storageKey, universes, upsert, writeData } from './data.mjs';

const byId = id => document.getElementById(id);
const views = ['tableau', 'patrons', 'projets', 'activite'];
const dialog = byId('editor');
const form = byId('edit-form');
const fields = byId('fields');
const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });
let data = emptyData();
let storageReadable = true;
let editor;
let opener;

function load() {
  try {
    data = readData(window.localStorage);
    storageReadable = true;
    byId('storage-error').textContent = '';
  } catch {
    storageReadable = false;
    byId('storage-error').textContent = 'Impossible de lire les données locales. Vérifiez les paramètres du navigateur. Les modifications sont bloquées pour protéger vos données.';
  }
}

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function button(label, action, id) {
  const node = element('button', label, 'secondary');
  node.type = 'button';
  node.dataset.action = action;
  if (id) node.dataset.id = id;
  return node;
}

function empty(container, message) {
  container.append(element('p', message, 'empty'));
}

function renderPatterns() {
  const select = byId('universe');
  const selected = select.value;
  select.replaceChildren(new Option('Tous les univers', ''), ...universes(data.patterns).map(name => new Option(name)));
  select.value = selected;
  if (select.selectedIndex === -1) select.selectedIndex = 0;
  const patterns = filterPatterns(data.patterns, byId('query').value, select.value);
  byId('pattern-count').textContent = patterns.length === 1 ? '1 patron' : `${patterns.length} patrons`;
  const container = byId('pattern-list');
  container.replaceChildren();
  if (!patterns.length) empty(container, data.patterns.length ? 'Aucun patron ne correspond à ces critères.' : 'Votre bibliothèque est vide. Ajoutez votre premier patron.');
  for (const pattern of patterns) {
    const card = element('article', undefined, 'card');
    const actions = element('div', undefined, 'actions');
    const detail = button('Ouvrir la fiche', 'pattern-detail', pattern.id);
    detail.setAttribute('aria-label', `Ouvrir la fiche de ${pattern.model}`);
    actions.append(detail);
    card.append(element('h2', pattern.model), element('p', pattern.brand, 'muted'), element('p', pattern.universe, 'badge'), actions);
    container.append(card);
  }
}

function renderProjects(container, projects, compact = false) {
  container.replaceChildren();
  if (!projects.length) {
    empty(container, compact ? 'Aucun projet en cours.' : 'Aucun projet. Ouvrez une fiche patron pour créer votre première réalisation.');
    return;
  }
  const rows = compact ? element('ul', undefined, 'rows') : container;
  for (const project of projects) {
    const pattern = data.patterns.find(item => item.id === project.patternId);
    const card = element(compact ? 'li' : 'article', undefined, compact ? 'section-bar' : 'card');
    const info = element('div');
    info.append(
      element(compact ? 'h3' : 'h2', project.name),
      element('p', `${pattern.brand} · ${pattern.model} · Taille ${project.size}`, 'muted'),
      element('p', project.status, 'badge'),
    );
    if (!compact && project.notes) info.append(element('p', project.notes, 'notes'));
    const actions = element('div', undefined, 'actions');
    const edit = button('Modifier', 'edit-project', project.id);
    edit.setAttribute('aria-label', `Modifier le projet ${project.name}`);
    actions.append(edit);
    card.append(info, actions);
    rows.append(card);
  }
  if (compact) container.append(rows);
}

function displayDate(key) {
  return dateFormat.format(new Date(key + 'T12:00:00'));
}

function renderActivity() {
  const days = calendarDays(data.activities);
  const calendar = byId('calendar');
  calendar.replaceChildren();
  for (const { date, count } of days) {
    const cell = element('span', undefined, 'day');
    cell.dataset.level = Math.min(count, 3);
    cell.title = `${displayDate(date)} · ${count} activité${count > 1 ? 's' : ''}`;
    calendar.append(cell);
  }
  const count = days.reduce((total, day) => total + day.count, 0);
  byId('calendar-summary').textContent = `${count} activité${count > 1 ? 's' : ''} du ${displayDate(days[0].date)} au ${displayDate(days.at(-1).date)}.`;
  const container = byId('activity-list');
  container.replaceChildren();
  if (!data.activities.length) empty(container, 'Aucune activité déclarée. Ajoutez votre première séance de couture.');
  const groups = new Map();
  for (const activity of [...data.activities].sort((a, b) => b.date.localeCompare(a.date))) {
    if (!groups.has(activity.date)) groups.set(activity.date, []);
    groups.get(activity.date).push(activity.description);
  }
  for (const [date, descriptions] of groups) {
    const group = element('div', undefined, 'journal');
    const time = element('time', displayDate(date));
    time.dateTime = date;
    const heading = element('h3');
    heading.append(time, ` · ${descriptions.length} activité${descriptions.length > 1 ? 's' : ''}`);
    const rows = element('ul', undefined, 'rows');
    for (const description of descriptions) rows.append(element('li', description, 'notes'));
    group.append(heading, rows);
    container.append(group);
  }
}

function render() {
  const { patterns, active, finished } = statistics(data);
  byId('stats').replaceChildren(...[['Patrons', patterns], ['Projets en cours', active], ['Projets terminés', finished]].map(([label, count]) => {
    const item = element('div');
    item.append(element('dt', label), element('dd', count));
    return item;
  }));
  renderPatterns();
  renderProjects(byId('active-projects'), data.projects.filter(project => project.status !== 'Terminé'), true);
  renderProjects(byId('project-list'), data.projects);
  renderActivity();
}

function showView(moveFocus = false) {
  const hash = location.hash.slice(1);
  if (hash === 'contenu') return;
  const view = views.includes(hash) ? hash : 'tableau';
  for (const id of views) byId(id).hidden = id !== view;
  for (const link of document.querySelectorAll('nav a')) {
    if (link.hash === '#' + view) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  if (moveFocus) {
    const heading = byId(view).querySelector('h1');
    heading.tabIndex = -1;
    heading.focus();
  }
}

function field(label, name, { value = '', type = 'text', choices, required = true, maxLength = 100 } = {}) {
  const wrapper = element('div');
  const caption = element('label', label);
  const node = element(choices ? 'select' : type === 'textarea' ? 'textarea' : 'input');
  node.name = name;
  node.id = 'field-' + name;
  caption.htmlFor = node.id;
  node.required = required;
  if (choices) node.append(...choices.map(([id, text]) => new Option(text, id)));
  else if (type === 'textarea') node.rows = 4;
  else node.type = type;
  if (type === 'date') node.max = dateKey(new Date());
  else if (!choices) node.maxLength = maxLength;
  if (required && (type === 'text' || type === 'textarea') && !choices) {
    node.addEventListener('input', () => node.setCustomValidity(''));
  }
  node.value = value;
  wrapper.append(caption, node);
  fields.append(wrapper);
}

function formatField(selected) {
  const group = element('fieldset');
  group.append(element('legend', 'Formats possédés (au moins un)'));
  for (const format of formats) {
    const label = element('label');
    const checkbox = element('input');
    checkbox.type = 'checkbox';
    checkbox.name = 'formats';
    checkbox.value = format;
    checkbox.checked = selected.includes(format);
    label.append(checkbox, format);
    group.append(label);
  }
  fields.append(group);
}

function openEditor(action, id, trigger) {
  if (!dialog.open) opener = trigger;
  const pattern = data.patterns.find(item => item.id === id);
  const project = data.projects.find(item => item.id === id);
  editor = { action, id };
  fields.replaceChildren();
  byId('form-error').textContent = '';
  const save = byId('save');
  save.hidden = action === 'pattern-detail';
  save.disabled = !storageReadable;
  let title;
  switch (action) {
    case 'pattern-detail': {
      title = pattern.model;
      const details = element('dl');
      for (const [label, value] of [['Marque', pattern.brand], ['Univers', pattern.universe], ['Formats', pattern.formats.join(', ')], ['Tailles', pattern.sizes]]) {
        details.append(element('dt', label, 'muted'), element('dd', value));
      }
      fields.append(details, button('Modifier le patron', 'edit-pattern', id), button('Créer un projet avec ce patron', 'new-project', id));
      break;
    }
    case 'new-pattern':
    case 'edit-pattern':
      title = pattern ? 'Modifier le patron' : 'Ajouter un patron';
      field('Marque', 'brand', { value: pattern?.brand });
      field('Modèle', 'model', { value: pattern?.model });
      field('Univers (ex. Vêtements, Accessoires)', 'universe', { value: pattern?.universe });
      formatField(pattern?.formats ?? []);
      field('Tailles disponibles (ex. 34–46)', 'sizes', { value: pattern?.sizes });
      break;
    case 'new-project':
    case 'edit-project':
      title = project ? 'Modifier le projet' : 'Créer un projet';
      if (!data.patterns.length) {
        fields.append(element('p', 'Ajoutez un patron avant de créer un projet.'), button('Ajouter un patron', 'new-pattern'));
        save.hidden = true;
        break;
      }
      field('Patron', 'patternId', {
        value: project?.patternId ?? pattern?.id ?? '',
        choices: [['', 'Choisir un patron'], ...data.patterns.map(item => [item.id, `${item.brand} · ${item.model}`])],
      });
      field('Nom du projet', 'name', { value: project?.name });
      field('Taille choisie', 'size', { value: project?.size, maxLength: 60 });
      field('Avancement', 'status', { value: project?.status ?? statuses[0], choices: statuses.map(status => [status, status]) });
      field('Notes (facultatif)', 'notes', { value: project?.notes, type: 'textarea', required: false, maxLength: 2000 });
      break;
    case 'new-activity':
      title = 'Déclarer une activité';
      field('Date de l’activité', 'date', { type: 'date', value: dateKey(new Date()) });
      field('Qu’avez-vous fait ?', 'description', { type: 'textarea', maxLength: 500 });
      break;
  }
  byId('editor-title').textContent = title;
  if (!dialog.open) dialog.showModal();
  fields.querySelector('input, select, textarea, button')?.focus();
}

function restoreFocus() {
  if (opener?.isConnected) {
    opener.focus();
    return;
  }
  const replacement = opener?.dataset.id && [...document.querySelectorAll('main button')].find(node =>
    !node.closest('[hidden]') && node.dataset.id === opener.dataset.id && node.dataset.action === opener.dataset.action);
  if (replacement) replacement.focus();
  else showView(true);
}

form.addEventListener('submit', event => {
  event.preventDefault();
  if (byId('save').hidden || !storageReadable) return;
  const { action, id } = editor;
  const values = new FormData(form);
  const record = Object.fromEntries([...values].map(([name, value]) => [name, value.trim()]));
  const invalid = [...fields.querySelectorAll('[required]')].find(node => !node.value.trim());
  if (invalid) {
    invalid.setCustomValidity('Veuillez renseigner ce champ.');
    invalid.reportValidity();
    return;
  }
  const selectedFormats = values.getAll('formats');
  if (action.endsWith('-pattern') && !selectedFormats.length) {
    byId('form-error').textContent = 'Sélectionnez au moins un format.';
    fields.querySelector('[name="formats"]').focus();
    return;
  }
  const next = { ...data };
  let confirmation;
  if (action.endsWith('-pattern')) {
    next.patterns = upsert(data.patterns, { ...record, id: id ?? crypto.randomUUID(), formats: selectedFormats });
    confirmation = id ? 'Patron modifié.' : 'Patron ajouté.';
  } else if (action.endsWith('-project')) {
    const projectId = action === 'edit-project' ? id : crypto.randomUUID();
    if (!data.patterns.some(pattern => pattern.id === record.patternId)) {
      byId('form-error').textContent = 'Ce patron est indisponible. Choisissez un autre patron.';
      return;
    }
    next.projects = upsert(data.projects, { ...record, id: projectId });
    confirmation = action === 'edit-project' ? 'Projet modifié.' : 'Projet créé.';
  } else {
    next.activities = upsert(data.activities, { ...record, id: crypto.randomUUID() });
    confirmation = 'Activité enregistrée.';
  }
  try {
    writeData(window.localStorage, next);
  } catch {
    byId('form-error').textContent = 'Enregistrement impossible. Vérifiez l’espace et les paramètres de stockage du navigateur, puis réessayez.';
    return;
  }
  data = next;
  render();
  dialog.close();
  byId('message').textContent = confirmation;
});

dialog.addEventListener('close', restoreFocus);
document.addEventListener('click', event => {
  const trigger = event.target.closest('button[data-action]');
  if (!trigger) return;
  if (trigger.dataset.action === 'close') dialog.close();
  else {
    byId('message').textContent = '';
    openEditor(trigger.dataset.action, trigger.dataset.id, trigger);
  }
});

byId('query').addEventListener('input', renderPatterns);
byId('universe').addEventListener('change', renderPatterns);
window.addEventListener('hashchange', () => showView(true));
window.addEventListener('storage', event => {
  if (event.key !== null && event.key !== storageKey) return;
  if (dialog.open) {
    dialog.close();
    byId('message').textContent = 'Les données ont changé dans un autre onglet. Rouvrez le formulaire pour reprendre la saisie.';
  }
  load();
  render();
});

load();
render();
showView();
