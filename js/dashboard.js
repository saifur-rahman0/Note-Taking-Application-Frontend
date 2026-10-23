// dashboard.js — user dashboard (notes CRUD + own posts)

if (!requireAuth()) throw new Error('Not authenticated');

const user = getUser() || {};

// ─── State ────────────────────────────────────────────────────────────────────
let notePage = 1, noteEditId = null;
let postPage = 1;

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('nav-username').textContent = `👤 ${user.name || 'User'}`;

  if (user?.role === 'admin') {
    const adminLink = document.getElementById('admin-panel-link');
    if (adminLink) adminLink.classList.remove('hidden');
  }

  document.getElementById('logout-btn').addEventListener('click', () => {
    clearAuth(); window.location.href = 'login.html';
  });

  // Note form events
  document.getElementById('new-note-btn').addEventListener('click', openNewNoteForm);
  document.getElementById('cancel-note-btn').addEventListener('click', closeNoteForm);
  document.getElementById('save-note-btn').addEventListener('click', saveNote);

  // Post form events
  document.getElementById('new-post-btn').addEventListener('click', () => {
    document.getElementById('post-form-card').classList.remove('hidden');
  });
  document.getElementById('cancel-post-btn').addEventListener('click', () => {
    document.getElementById('post-form-card').classList.add('hidden');
    clearPostForm();
  });
  document.getElementById('save-post-btn').addEventListener('click', savePost);

  loadNotes(1);
  loadMyPosts(1);
});

// ─── Notes ────────────────────────────────────────────────────────────────────
const loadNotes = async (page = 1) => {
  notePage = page;
  show('notes-loading'); hide('notes-list'); hide('notes-empty'); hide('notes-pagination');
  try {
    const data = await apiFetch(`/notes?page=${page}&limit=9`);
    hide('notes-loading');
    if (!data.data.length) { show('notes-empty'); return; }
    renderNotes(data.data);
    renderPagination('notes-pagination', data.pagination, loadNotes);
  } catch (err) {
    hide('notes-loading');
    showToast(err.message, 'error');
  }
};

const renderNotes = (notes) => {
  const grid = document.getElementById('notes-list');
  grid.innerHTML = '';
  notes.forEach(n => {
    const div = document.createElement('div');
    div.className = 'note-card';
    div.innerHTML = `
      <div class="note-card-title">${escHtml(n.title)}</div>
      <div class="note-card-content">${escHtml(n.content)}</div>
      <div class="note-card-meta">${fmtDate(n.createdAt)}</div>
      <div class="note-card-actions">
        <button class="btn btn-ghost btn-xs" onclick="openEditNoteForm('${n._id}','${escAttr(n.title)}','${escAttr(n.content)}')">Edit</button>
        <button class="btn btn-danger btn-xs" onclick="deleteNote('${n._id}')">Delete</button>
      </div>`;
    grid.appendChild(div);
  });
  show('notes-list');
};

const openNewNoteForm = () => {
  noteEditId = null;
  document.getElementById('form-title').textContent = 'New Note';
  document.getElementById('note-title').value = '';
  document.getElementById('note-content').value = '';
  document.getElementById('form-error').classList.add('hidden');
  document.getElementById('note-form-card').classList.remove('hidden');
};

const openEditNoteForm = (id, title, content) => {
  noteEditId = id;
  document.getElementById('form-title').textContent = 'Edit Note';
  document.getElementById('note-title').value = title;
  document.getElementById('note-content').value = content;
  document.getElementById('form-error').classList.add('hidden');
  document.getElementById('note-form-card').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const closeNoteForm = () => {
  noteEditId = null;
  document.getElementById('note-form-card').classList.add('hidden');
};

const saveNote = async () => {
  const btn = document.getElementById('save-note-btn');
  const errBox = document.getElementById('form-error');
  errBox.classList.add('hidden');
  const title   = document.getElementById('note-title').value.trim();
  const content = document.getElementById('note-content').value.trim();
  if (!title || !content) { errBox.textContent = 'Title and content are required.'; errBox.classList.remove('hidden'); return; }

  setLoading(btn, true);
  try {
    if (noteEditId) {
      await apiFetch(`/notes/${noteEditId}`, { method: 'PUT', body: JSON.stringify({ title, content }) });
      showToast('Note updated!');
    } else {
      await apiFetch('/notes', { method: 'POST', body: JSON.stringify({ title, content }) });
      showToast('Note created!');
    }
    closeNoteForm(); loadNotes(notePage);
  } catch (err) {
    errBox.textContent = err.message; errBox.classList.remove('hidden');
  } finally {
    setLoading(btn, false);
  }
};

const deleteNote = async (id) => {
  if (!confirm('Delete this note?')) return;
  try {
    await apiFetch(`/notes/${id}`, { method: 'DELETE' });
    showToast('Note deleted.');
    loadNotes(notePage);
  } catch (err) { showToast(err.message, 'error'); }
};

// ─── Posts ────────────────────────────────────────────────────────────────────
const loadMyPosts = async (page = 1) => {
  postPage = page;
  show('my-posts-loading'); hide('my-posts-list'); hide('my-posts-empty'); hide('my-posts-pagination');
  try {
    const data = await apiFetch(`/posts/user/${user.id}?page=${page}&limit=6`);
    hide('my-posts-loading');
    if (!data.data.length) { show('my-posts-empty'); return; }
    renderMyPosts(data.data);
    renderPagination('my-posts-pagination', data.pagination, loadMyPosts);
  } catch (err) { hide('my-posts-loading'); }
};

const renderMyPosts = (posts) => {
  const grid = document.getElementById('my-posts-list');
  grid.innerHTML = '';
  posts.forEach(p => {
    const div = document.createElement('div');
    div.className = 'note-card';
    div.innerHTML = `
      <div class="note-card-title">${escHtml(p.title)}</div>
      <div class="note-card-content">${escHtml(p.body)}</div>
      <div class="note-card-meta">${fmtDate(p.createdAt)}</div>`;
    grid.appendChild(div);
  });
  show('my-posts-list');
};

const clearPostForm = () => {
  document.getElementById('post-title').value = '';
  document.getElementById('post-body').value = '';
};

const savePost = async () => {
  const btn = document.getElementById('save-post-btn');
  const errBox = document.getElementById('post-form-error');
  errBox.classList.add('hidden');
  const title = document.getElementById('post-title').value.trim();
  const body  = document.getElementById('post-body').value.trim();
  if (!title || !body) { errBox.textContent = 'Title and body required.'; errBox.classList.remove('hidden'); return; }

  setLoading(btn, true);
  try {
    await apiFetch('/posts', { method: 'POST', body: JSON.stringify({ title, body }) });
    showToast('Post published!');
    document.getElementById('post-form-card').classList.add('hidden');
    clearPostForm();
    loadMyPosts(1);
  } catch (err) {
    errBox.textContent = err.message; errBox.classList.remove('hidden');
  } finally {
    setLoading(btn, false);
  }
};

// ─── Shared Helpers ───────────────────────────────────────────────────────────
const renderPagination = (containerId, pag, loadFn) => {
  const el = document.getElementById(containerId);
  if (!el || pag.totalPages <= 1) { hide(containerId); return; }
  el.innerHTML = '';
  for (let i = 1; i <= pag.totalPages; i++) {
    const btn = document.createElement('button');
    btn.className = `page-btn${i === pag.page ? ' active' : ''}`;
    btn.textContent = i;
    btn.onclick = () => loadFn(i);
    el.appendChild(btn);
  }
  const info = document.createElement('span');
  info.className = 'page-info';
  info.textContent = `${pag.total} total`;
  el.appendChild(info);
  show(containerId);
};

const escHtml  = (s = '') => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const escAttr  = (s = '') => String(s).replace(/'/g,'&#39;').replace(/"/g,'&quot;');
const fmtDate  = (d)      => new Date(d).toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
const show     = (id)     => { const el = document.getElementById(id); if (el) el.classList.remove('hidden'); };
const hide     = (id)     => { const el = document.getElementById(id); if (el) el.classList.add('hidden'); };
