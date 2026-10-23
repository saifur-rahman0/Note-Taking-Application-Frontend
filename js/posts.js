// posts.js — public posts listing page

let postsPage = 1;

const escHtml = (s = '') => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
const show = (id) => { const el = document.getElementById(id); if (el) el.classList.remove('hidden'); };
const hide = (id) => { const el = document.getElementById(id); if (el) el.classList.add('hidden'); };

document.addEventListener('DOMContentLoaded', () => {
  const token = getToken();
  const user = getUser();

  if (token) {
    document.getElementById('login-link')?.classList.add('hidden');
    document.getElementById('logout-btn')?.classList.remove('hidden');
    document.getElementById('dashboard-link')?.classList.remove('hidden');
    if (user?.role === 'admin') {
      document.getElementById('admin-link')?.classList.remove('hidden');
    }
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => { clearAuth(); window.location.href = 'login.html'; });
  }
  loadPosts(1);
});

const loadPosts = async (page = 1) => {
  postsPage = page;
  show('posts-loading'); hide('posts-list'); hide('posts-empty'); hide('posts-pagination');
  try {
    const data = await apiFetch(`/posts?page=${page}&limit=9`);
    hide('posts-loading');
    if (!data.data.length) { show('posts-empty'); return; }
    renderPosts(data.data);
    renderPagination('posts-pagination', data.pagination, loadPosts);
  } catch (err) {
    hide('posts-loading');
    showToast(err.message, 'error');
  }
};

const renderPosts = (posts) => {
  const grid = document.getElementById('posts-list');
  grid.innerHTML = '';
  posts.forEach(p => {
    const div = document.createElement('div');
    div.className = 'note-card';
    div.innerHTML = `
      <div class="note-card-title">${escHtml(p.title)}</div>
      <div class="note-card-content">${escHtml(p.body)}</div>
      ${p.author ? `<div class="note-owner-badge">✍️ ${escHtml(p.author.name)}</div>` : ''}
      <div class="note-card-meta">${fmtDate(p.createdAt)}</div>`;
    grid.appendChild(div);
  });
  show('posts-list');
};

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
