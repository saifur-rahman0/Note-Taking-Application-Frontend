// admin.js — admin panel (users, all notes, aggregations)

if (!requireAdmin()) throw new Error('Not admin');

const adminUser = getUser() || {};

//   State             
let usersPage = 1, allNotesPage = 1, lookupPage = 1;
let editingUserId = null;
let currentLookupUserId = null;
let allInterestGroups = [];
let activeInterestPill = 'all';

//   Helpers                       
const escHtml = (s = '') => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
const show = (id) => { const el = document.getElementById(id); if (el) el.classList.remove('hidden'); };
const hide = (id) => { const el = document.getElementById(id); if (el) el.classList.add('hidden'); };

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

//   Init                        
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('nav-username').textContent = `👤 ${adminUser.name || 'Admin'}`;
  document.getElementById('logout-btn').addEventListener('click', () => { clearAuth(); window.location.href = 'login.html'; });

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const tab = document.getElementById(`tab-${btn.dataset.tab}`);
      if (tab) tab.classList.add('active');

      // Lazy load tabs
      if (btn.dataset.tab === 'notes' && !allNotesPage._loaded) { loadAllNotes(1); allNotesPage._loaded = true; }
      if (btn.dataset.tab === 'interests') { loadGroupedInterests(); }
    });
  });

  // User form
  document.getElementById('add-user-btn').addEventListener('click', openNewUserForm);
  document.getElementById('cancel-user-btn').addEventListener('click', closeUserForm);
  document.getElementById('save-user-btn').addEventListener('click', saveUser);

  // Lookup
  document.getElementById('lookup-btn').addEventListener('click', () => runLookup(1));
  const userSelect = document.getElementById('lookup-user-select');
  if (userSelect) {
    userSelect.addEventListener('change', (e) => {
      if (e.target.value) {
        document.getElementById('lookup-user-id').value = e.target.value;
        runLookup(1);
      }
    });
  }
  const lookupInput = document.getElementById('lookup-user-id');
  if (lookupInput) {
    lookupInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') runLookup(1);
    });
  }

  // Interests Toolbar
  const filterInput = document.getElementById('interests-filter-input');
  if (filterInput) {
    filterInput.addEventListener('input', applyInterestsFilter);
  }
  const refreshInterestsBtn = document.getElementById('refresh-interests-btn');
  if (refreshInterestsBtn) {
    refreshInterestsBtn.addEventListener('click', () => loadGroupedInterests());
  }

  loadUsers(1);
});

//   USERS                        
const loadUsers = async (page = 1) => {
  usersPage = page;
  show('users-loading'); hide('users-table-wrap'); hide('users-empty'); hide('users-pagination');
  try {
    const data = await apiFetch(`/admin/users?page=${page}&limit=10`);
    hide('users-loading');
    if (!data.data.length) { show('users-empty'); return; }
    renderUsersTable(data.data);
    populateLookupUserDropdown(data.data);
    renderPagination('users-pagination', data.pagination, loadUsers);
  } catch (err) { hide('users-loading'); showToast(err.message, 'error'); }
};

const populateLookupUserDropdown = (users) => {
  const select = document.getElementById('lookup-user-select');
  if (!select) return;
  const currentVal = select.value;
  select.innerHTML = '<option value="">-- Choose User from List --</option>';
  users.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u._id;
    opt.textContent = `${u.name} (${u.email})`;
    select.appendChild(opt);
  });
  if (currentVal) select.value = currentVal;
};

const renderUsersTable = (users) => {
  const tbody = document.getElementById('users-tbody');
  tbody.innerHTML = '';
  users.forEach(u => {
    const roleClass = u.role === 'admin' ? 'badge-role-admin' : 'badge-role-user';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escHtml(u.name)}</td>
      <td>${escHtml(u.email)}</td>
      <td><span class="badge-role ${roleClass}">${u.role}</span></td>
      <td>${(u.interests || []).map(i => `<span style="color:var(--accent2);font-size:0.75rem;">${escHtml(i)}</span>`).join(' ')}</td>
      <td>${fmtDate(u.createdAt)}</td>
      <td class="td-actions">
        <button class="btn btn-ghost btn-xs" onclick="openEditUserForm('${u._id}','${escHtml(u.name)}','${u.email}','${u.role}','${(u.interests||[]).join(', ')}')">Edit</button>
        <button class="btn btn-danger btn-xs" onclick="deleteUser('${u._id}')">Delete</button>
        <button class="btn btn-ghost btn-xs" onclick="setLookupAndFetch('${u._id}')">Posts</button>
      </td>`;
    tbody.appendChild(tr);
  });
  show('users-table-wrap');
};

const openNewUserForm = () => {
  editingUserId = null;
  document.getElementById('user-form-title').textContent = 'Add User';
  clearUserForm();
  document.getElementById('u-password').placeholder = '••••••••';
  show('user-form-card');
};

const openEditUserForm = (id, name, email, role, interests) => {
  editingUserId = id;
  document.getElementById('user-form-title').textContent = 'Edit User';
  document.getElementById('u-name').value = name;
  document.getElementById('u-email').value = email;
  document.getElementById('u-role').value = role;
  document.getElementById('u-interests').value = interests;
  document.getElementById('u-password').value = '';
  document.getElementById('u-password').placeholder = 'Leave blank to keep';
  hide('user-form-error');
  show('user-form-card');
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const closeUserForm = () => {
  editingUserId = null;
  clearUserForm();
  hide('user-form-card');
};

const clearUserForm = () => {
  ['u-name','u-email','u-password','u-interests'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('u-role').value = 'user';
  hide('user-form-error');
};

const saveUser = async () => {
  const btn = document.getElementById('save-user-btn');
  const errBox = document.getElementById('user-form-error');
  hide('user-form-error');

  const payload = {
    name:      document.getElementById('u-name').value.trim(),
    email:     document.getElementById('u-email').value.trim(),
    role:      document.getElementById('u-role').value,
    interests: document.getElementById('u-interests').value,
  };
  const pw = document.getElementById('u-password').value;
  if (pw) payload.password = pw;

  setLoading(btn, true);
  try {
    if (editingUserId) {
      await apiFetch(`/admin/users/${editingUserId}`, { method: 'PUT', body: JSON.stringify(payload) });
      showToast('User updated!');
    } else {
      if (!pw) { errBox.textContent = 'Password is required for new users.'; show('user-form-error'); setLoading(btn, false); return; }
      await apiFetch('/admin/users', { method: 'POST', body: JSON.stringify(payload) });
      showToast('User created!');
    }
    closeUserForm(); loadUsers(usersPage);
  } catch (err) {
    errBox.textContent = err.message; show('user-form-error');
  } finally {
    setLoading(btn, false);
  }
};

const deleteUser = async (id) => {
  if (!confirm('Delete this user and all their notes?')) return;
  try {
    await apiFetch(`/admin/users/${id}`, { method: 'DELETE' });
    showToast('User deleted.'); loadUsers(usersPage);
  } catch (err) { showToast(err.message, 'error'); }
};

//   ALL NOTES                      ─
const loadAllNotes = async (page = 1) => {
  allNotesPage = page;
  show('all-notes-loading'); hide('all-notes-table-wrap'); hide('all-notes-empty'); hide('all-notes-pagination');
  try {
    const data = await apiFetch(`/admin/notes?page=${page}&limit=15`);
    hide('all-notes-loading');
    if (!data.data.length) { show('all-notes-empty'); return; }
    renderAllNotesTable(data.data);
    renderPagination('all-notes-pagination', data.pagination, loadAllNotes);
  } catch (err) { hide('all-notes-loading'); showToast(err.message, 'error'); }
};

const renderAllNotesTable = (notes) => {
  const tbody = document.getElementById('all-notes-tbody');
  tbody.innerHTML = '';
  notes.forEach(n => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escHtml(n.title)}</strong></td>
      <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(n.content)}</td>
      <td>${n.owner ? `<span class="note-owner-badge">${escHtml(n.owner.name)}</span>` : '—'}</td>
      <td>${fmtDate(n.createdAt)}</td>
      <td class="td-actions">
        <button class="btn btn-danger btn-xs" onclick="deleteNoteAsAdmin('${n._id}')">Delete</button>
      </td>`;
    tbody.appendChild(tr);
  });
  show('all-notes-table-wrap');
};

const deleteNoteAsAdmin = async (id) => {
  if (!confirm('Delete this note as admin?')) return;
  try {
    await apiFetch(`/notes/${id}`, { method: 'DELETE' });
    showToast('Note deleted.');
    loadAllNotes(allNotesPage);
  } catch (err) {
    showToast(err.message, 'error');
  }
};

//   AGGREGATION 1: Group by Interests              
const loadGroupedInterests = async () => {
  show('interests-loading'); hide('interests-list'); hide('interests-empty');
  try {
    const data = await apiFetch('/admin/users/grouped-by-interests');
    hide('interests-loading');
    allInterestGroups = data.data || [];
    if (!allInterestGroups.length) { show('interests-empty'); return; }
    renderInterestTagPills(allInterestGroups);
    applyInterestsFilter();
  } catch (err) { hide('interests-loading'); showToast(err.message, 'error'); }
};

const renderInterestTagPills = (groups) => {
  const container = document.getElementById('interests-tag-pills');
  if (!container) return;
  container.innerHTML = '';

  const allBtn = document.createElement('div');
  allBtn.className = `interest-pill${activeInterestPill === 'all' ? ' active' : ''}`;
  allBtn.textContent = `All Topics (${groups.length})`;
  allBtn.onclick = () => {
    activeInterestPill = 'all';
    document.querySelectorAll('.interest-pill').forEach(p => p.classList.remove('active'));
    allBtn.classList.add('active');
    applyInterestsFilter();
  };
  container.appendChild(allBtn);

  groups.forEach(g => {
    const pill = document.createElement('div');
    pill.className = `interest-pill${activeInterestPill === g.interest ? ' active' : ''}`;
    pill.textContent = `${g.interest} (${g.count})`;
    pill.onclick = () => {
      activeInterestPill = (activeInterestPill === g.interest) ? 'all' : g.interest;
      document.querySelectorAll('.interest-pill').forEach(p => p.classList.remove('active'));
      if (activeInterestPill === g.interest) {
        pill.classList.add('active');
      } else {
        allBtn.classList.add('active');
      }
      applyInterestsFilter();
    };
    container.appendChild(pill);
  });
};

const applyInterestsFilter = () => {
  const query = (document.getElementById('interests-filter-input')?.value || '').toLowerCase().trim();

  let filtered = allInterestGroups;
  if (activeInterestPill !== 'all') {
    filtered = filtered.filter(g => g.interest === activeInterestPill);
  }

  if (query) {
    filtered = filtered.filter(g => {
      const matchInterest = (g.interest || '').toLowerCase().includes(query);
      const matchUser = (g.users || []).some(u => 
        (u.name || '').toLowerCase().includes(query) || 
        (u.email || '').toLowerCase().includes(query)
      );
      return matchInterest || matchUser;
    });
  }

  if (!filtered.length) {
    hide('interests-list');
    show('interests-empty');
    const emptyEl = document.getElementById('interests-empty');
    if (emptyEl) emptyEl.innerHTML = `<p>No interests or users match "<strong>${escHtml(query)}</strong>".</p>`;
  } else {
    hide('interests-empty');
    renderInterests(filtered);
  }
};

const renderInterests = (groups) => {
  const grid = document.getElementById('interests-list');
  grid.innerHTML = '';
  groups.forEach(g => {
    const card = document.createElement('div');
    card.className = 'interest-card';

    const header = document.createElement('div');
    header.className = 'interest-card-header';
    header.innerHTML = `
      <div class="interest-name">🏷️ ${escHtml(g.interest)}</div>
      <span class="interest-count-badge">${g.count} user${g.count !== 1 ? 's' : ''}</span>
    `;
    card.appendChild(header);

    const usersList = document.createElement('div');
    usersList.className = 'interest-users';

    (g.users || []).forEach(u => {
      const initial = (u.name || 'U').charAt(0).toUpperCase();
      const roleBadge = u.role === 'admin' ? '<span class="badge-role badge-role-admin">admin</span>' : '';
      const userItem = document.createElement('div');
      userItem.className = 'interest-user-item';
      userItem.innerHTML = `
        <div class="user-item-left">
          <div class="user-item-avatar">${initial}</div>
          <div class="user-item-info">
            <div class="user-item-name">${escHtml(u.name)} ${roleBadge}</div>
            <div class="user-item-email">${escHtml(u.email)}</div>
          </div>
        </div>
        <div class="user-item-actions">
          <button class="btn btn-ghost btn-xs" title="View posts via $lookup" onclick="setLookupAndFetch('${u.id}')">📢 Posts</button>
        </div>
      `;
      usersList.appendChild(userItem);
    });

    card.appendChild(usersList);
    grid.appendChild(card);
  });
  show('interests-list');
};

//   AGGREGATION 2: $lookup User Posts              
const setLookupAndFetch = (userId) => {
  // Switch to user-posts tab
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector('[data-tab="user-posts"]').classList.add('active');
  document.getElementById('tab-user-posts').classList.add('active');

  document.getElementById('lookup-user-id').value = userId;
  const select = document.getElementById('lookup-user-select');
  if (select) select.value = userId;
  runLookup(1);
};

const runLookup = async (page = 1) => {
  let identifier = document.getElementById('lookup-user-id').value.trim();
  const select = document.getElementById('lookup-user-select');
  if (!identifier && select && select.value) {
    identifier = select.value;
    document.getElementById('lookup-user-id').value = identifier;
  }
  if (!identifier) { showToast('Please select a user or enter an ID / Email', 'error'); return; }
  currentLookupUserId = identifier;

  hide('lookup-result'); hide('lookup-error');
  show('lookup-loading');
  try {
    const data = await apiFetch(`/posts/user/${encodeURIComponent(identifier)}?page=${page}&limit=6`);
    hide('lookup-loading');

    // Sync dropdown if matched
    if (select && data.user?.id) {
      select.value = data.user.id;
    }

    // User info
    const u = data.user;
    document.getElementById('lookup-user-info').innerHTML = `
      <h3>${escHtml(u.name)} <span class="badge-role badge-role-${u.role}">${u.role}</span></h3>
      <p>${escHtml(u.email)}</p>
      ${u.interests?.length ? `<p style="margin-top:0.4rem;">Interests: ${u.interests.map(i => `<span style="color:var(--accent2);">${escHtml(i)}</span>`).join(', ')}</p>` : ''}
      <p style="margin-top:0.4rem;font-size:0.78rem;color:var(--text2);">Total posts: ${data.pagination.total}</p>`;

    // Posts
    const postsEl = document.getElementById('lookup-posts-list');
    postsEl.innerHTML = '';
    if (data.data.length === 0) {
      postsEl.innerHTML = '<p style="color:var(--text2);padding:1rem 0;">This user has no posts.</p>';
    } else {
      data.data.forEach(p => {
        const div = document.createElement('div');
        div.className = 'note-card';
        div.innerHTML = `
          <div class="note-card-title">${escHtml(p.title)}</div>
          <div class="note-card-content">${escHtml(p.body)}</div>
          <div class="note-card-meta">${fmtDate(p.createdAt)}</div>`;
        postsEl.appendChild(div);
      });
    }

    // Pagination
    renderLookupPagination(data.pagination);
    show('lookup-result');
  } catch (err) {
    hide('lookup-loading');
    const errEl = document.getElementById('lookup-error');
    errEl.textContent = err.message;
    show('lookup-error');
  }
};

const renderLookupPagination = (pag) => {
  const el = document.getElementById('lookup-pagination');
  el.innerHTML = '';
  if (pag.totalPages <= 1) return;
  for (let i = 1; i <= pag.totalPages; i++) {
    const btn = document.createElement('button');
    btn.className = `page-btn${i === pag.page ? ' active' : ''}`;
    btn.textContent = i;
    btn.onclick = () => runLookup(i);
    el.appendChild(btn);
  }
};
