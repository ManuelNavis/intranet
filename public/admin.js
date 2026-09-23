const form = document.getElementById('form');
const list = document.getElementById('list');
const workspace = document.getElementById('workspace');
const globalMessage = document.getElementById('global-message');
const formMessage = document.getElementById('form-message');
const saveButton = document.getElementById('save');
const cancelButton = document.getElementById('cancel');
const newButton = document.getElementById('new');
const dateInput = document.getElementById('date');
const photoInput = document.getElementById('photos');
const existingPhotos = document.getElementById('existing-photos');
const selectedPhotos = document.getElementById('selected-photos');
const accessCard = document.getElementById('access-card');
const accessForm = document.getElementById('access-form');
const accessMessage = document.getElementById('access-message');
const editorList = document.getElementById('editor-list');
let items = [];
let editingId = null;
let previewUrls = [];

function showAccessMessage(message, error = false) {
  accessMessage.textContent = message;
  accessMessage.classList.toggle('error', error);
  accessMessage.hidden = !message;
}
async function loadAccess() {
  const response = await fetch('/api/news/editors', { cache:'no-store' });
  if (response.status === 403) { accessCard.hidden = true; return; }
  if (!response.ok) throw new Error('Impossible de charger les personnes autorisées.');
  const data = await response.json();
  accessCard.hidden = false;
  editorList.replaceChildren();
  const ownerRow = elt('div', 'editor-row');
  ownerRow.append(elt('strong', '', data.owner), elt('span', '', 'Propriétaire · accès permanent'));
  editorList.append(ownerRow);
  for (const editor of data.editors) {
    const row = elt('div', 'editor-row');
    row.append(elt('strong', '', editor.email));
    const remove = elt('button', 'danger', 'Retirer l’accès');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Retirer l’accès de ${editor.email}`);
    remove.addEventListener('click', async () => {
      if (!confirm(`Retirer l’accès à la gestion des actualités pour ${editor.email} ?`)) return;
      remove.disabled = true;
      try {
        const response = await fetch('/api/news/editors', {
          method:'DELETE', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ email:editor.email }),
        });
        if (!response.ok) throw new Error((await response.json()).error || 'Retrait impossible.');
        await loadAccess();
        showAccessMessage(`Accès retiré pour ${editor.email}.`);
      } catch (error) { showAccessMessage(error.message, true); remove.disabled = false; }
    });
    row.append(remove);
    editorList.append(row);
  }
}

function localToday() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function setMessage(message) { formMessage.textContent = message; formMessage.hidden = !message; }
function resetForm(focus = false) {
  editingId = null;
  form.reset();
  dateInput.value = localToday();
  document.getElementById('published').checked = true;
  document.getElementById('form-title').textContent = 'Nouvelle actualité';
  document.getElementById('edit-status').textContent = '';
  saveButton.textContent = 'Publier l’actualité';
  cancelButton.hidden = true;
  setMessage('');
  renderExistingPhotos();
  renderSelectedPhotos();
  if (focus) document.getElementById('title').focus();
}
function elt(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}
function renderExistingPhotos() {
  existingPhotos.replaceChildren();
  const article = items.find(item => item.id === editingId);
  for (const image of article?.images || []) {
    const tile = elt('div', 'photo-tile');
    const img = elt('img');
    img.src = image.url;
    img.alt = `Photo de l’actualité « ${article.title} »`;
    img.loading = 'lazy';
    const remove = elt('button', 'remove-photo', 'Retirer');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Retirer cette photo de « ${article.title} »`);
    remove.addEventListener('click', async () => {
      if (!confirm('Retirer cette photo de l’actualité ?')) return;
      remove.disabled = true;
      try {
        const response = await fetch(`/api/news/${encodeURIComponent(article.id)}/images/${encodeURIComponent(image.id)}`, { method:'DELETE' });
        if (!response.ok) throw new Error((await response.json()).error || 'Suppression impossible.');
        await loadList();
        renderExistingPhotos();
        renderSelectedPhotos();
      } catch (error) { setMessage(error.message); remove.disabled = false; }
    });
    tile.append(img, remove);
    existingPhotos.append(tile);
  }
}
function renderSelectedPhotos() {
  for (const url of previewUrls) URL.revokeObjectURL(url);
  previewUrls = [];
  selectedPhotos.replaceChildren();
  for (const file of photoInput.files) {
    const url = URL.createObjectURL(file);
    previewUrls.push(url);
    const tile = elt('div', 'photo-tile selected');
    const img = elt('img');
    img.src = url;
    img.alt = `Nouvelle photo : ${file.name}`;
    tile.append(img, elt('span', 'selected-label', 'À ajouter'));
    selectedPhotos.append(tile);
  }
}
function renderList() {
  list.replaceChildren();
  document.getElementById('count').textContent = `${items.length} actualité${items.length > 1 ? 's' : ''}`;
  if (!items.length) { list.append(elt('p', 'empty', 'Aucune actualité enregistrée.')); return; }
  for (const item of items) {
    const row = elt('article', 'news-row');
    const meta = elt('div', 'news-meta');
    meta.append(elt('span', `badge${item.published ? '' : ' draft'}`, item.published ? 'Publiée' : 'Brouillon'));
    meta.append(elt('span', '', item.category));
    meta.append(elt('span', '', new Intl.DateTimeFormat('fr-FR', {day:'numeric',month:'long',year:'numeric'}).format(new Date(`${item.date}T00:00:00`))));
    row.append(meta, elt('h3', '', item.title), elt('p', '', item.summary));
    if (item.images?.length) {
      const gallery = elt('div', 'row-photos');
      for (const image of item.images) {
        const preview = elt('img');
        preview.src = image.url;
        preview.alt = `Photo de « ${item.title} »`;
        preview.loading = 'lazy';
        gallery.append(preview);
      }
      row.append(gallery);
    }
    const actions = elt('div', 'row-actions');
    const edit = elt('button', 'edit-button', 'Modifier');
    edit.type = 'button';
    edit.addEventListener('click', () => {
      editingId = item.id;
      for (const key of ['title', 'summary', 'category', 'date', 'link']) form.elements[key].value = item[key] || '';
      form.elements.published.checked = Boolean(item.published);
      document.getElementById('form-title').textContent = 'Modifier l’actualité';
      document.getElementById('edit-status').textContent = item.published ? 'Publiée' : 'Brouillon';
      saveButton.textContent = 'Enregistrer les modifications';
      cancelButton.hidden = false;
      setMessage('');
      photoInput.value = '';
      renderExistingPhotos();
      renderSelectedPhotos();
      document.querySelector('.edit-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
      form.elements.title.focus({ preventScroll: true });
    });
    const remove = elt('button', 'danger', 'Supprimer');
    remove.type = 'button';
    remove.addEventListener('click', async () => {
      if (!confirm(`Supprimer l’actualité « ${item.title} » ?`)) return;
      remove.disabled = true;
      try {
        const response = await fetch(`/api/news/${encodeURIComponent(item.id)}`, { method:'DELETE' });
        if (!response.ok) throw new Error((await response.json()).error || 'Suppression impossible.');
        if (editingId === item.id) resetForm();
        await loadList();
      } catch (error) { setMessage(error.message); remove.disabled = false; }
    });
    actions.append(edit, remove);
    row.append(actions);
    list.append(row);
  }
}
async function loadList() {
  const response = await fetch('/api/news?all=1', { cache:'no-store' });
  if (!response.ok) throw new Error(response.status === 403 ? 'Cette page est réservée à l’administrateur des actualités.' : 'Impossible de charger les actualités. Réessayez plus tard.');
  const data = await response.json();
  items = data.items;
  renderList();
  renderExistingPhotos();
  globalMessage.hidden = true;
  workspace.hidden = false;
  newButton.hidden = false;
}
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  setMessage('');
  const files = [...photoInput.files];
  const existingCount = items.find(item => item.id === editingId)?.images?.length || 0;
  if (existingCount + files.length > 4) { setMessage('Quatre photos maximum par actualité. Retirez une photo ou choisissez moins de fichiers.'); return; }
  saveButton.disabled = true;
  let contentSaved = false;
  const payload = {
    title: form.elements.title.value,
    summary: form.elements.summary.value,
    category: form.elements.category.value,
    date: form.elements.date.value,
    link: form.elements.link.value,
    published: form.elements.published.checked,
  };
  try {
    const response = await fetch(editingId ? `/api/news/${encodeURIComponent(editingId)}` : '/api/news', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error((await response.json()).error || 'Enregistrement impossible.');
    const saved = await response.json();
    editingId = saved.item.id;
    contentSaved = true;
    for (let index = 0; index < files.length; index++) {
      globalMessage.textContent = `Envoi de la photo ${index + 1} sur ${files.length}…`;
      globalMessage.hidden = false;
      const data = new FormData();
      data.append('photo', files[index]);
      const upload = await fetch(`/api/news/${encodeURIComponent(editingId)}/images`, { method:'POST', body:data });
      if (!upload.ok) {
        const detail = await upload.json().catch(() => ({}));
        throw new Error(`Actualité enregistrée. ${index} photo${index > 1 ? 's' : ''} ajoutée${index > 1 ? 's' : ''} sur ${files.length}. ${detail.error || 'Envoi interrompu.'} Choisissez à nouveau les photos manquantes.`);
      }
    }
    await loadList();
    resetForm();
    globalMessage.textContent = payload.published ? 'Actualité publiée sur l’accueil avec ses photos.' : 'Brouillon enregistré avec ses photos.';
    globalMessage.hidden = false;
    globalMessage.focus();
  } catch (error) {
    if (contentSaved) {
      photoInput.value = '';
      renderSelectedPhotos();
      await loadList().catch(() => {});
      document.getElementById('form-title').textContent = 'Modifier l’actualité';
      cancelButton.hidden = false;
    }
    globalMessage.hidden = true;
    setMessage(error.message);
  }
  finally { saveButton.disabled = false; }
});
form.elements.published.addEventListener('change', () => {
  if (!editingId) saveButton.textContent = form.elements.published.checked ? 'Publier l’actualité' : 'Enregistrer le brouillon';
});
photoInput.addEventListener('change', () => {
  const files = [...photoInput.files];
  const existingCount = items.find(item => item.id === editingId)?.images?.length || 0;
  if (existingCount + files.length > 4) {
    setMessage(`Il reste ${4 - existingCount} emplacement${4 - existingCount > 1 ? 's' : ''} pour cette actualité.`);
    photoInput.value = '';
  } else if (files.some(file => file.size > 8 * 1024 * 1024 || !['image/jpeg','image/png','image/webp'].includes(file.type))) {
    setMessage('Choisissez des photos JPEG, PNG ou WebP de 8 Mo maximum.');
    photoInput.value = '';
  } else setMessage('');
  renderSelectedPhotos();
});
cancelButton.addEventListener('click', () => resetForm(true));
newButton.addEventListener('click', () => {
  resetForm(true);
  document.querySelector('.edit-card').scrollIntoView({ behavior:'smooth', block:'start' });
});
accessForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!accessForm.reportValidity()) return;
  const email = accessForm.elements.email.value.trim().toLowerCase();
  const button = document.getElementById('add-editor');
  button.disabled = true;
  showAccessMessage('');
  try {
    const response = await fetch('/api/news/editors', {
      method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ email }),
    });
    if (!response.ok) throw new Error((await response.json()).error || 'Autorisation impossible.');
    accessForm.reset();
    await loadAccess();
    showAccessMessage(`${email} peut maintenant gérer les actualités, dès que cette personne a accès à l’intranet.`);
  } catch (error) { showAccessMessage(error.message, true); }
  finally { button.disabled = false; }
});
resetForm();
loadList().then(() => loadAccess().catch(error => { globalMessage.textContent = error.message; globalMessage.hidden = false; }))
  .catch(error => { globalMessage.textContent = error.message; });
