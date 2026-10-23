// auth.js — handles login and register pages

document.addEventListener('DOMContentLoaded', () => {
  // Redirect if already logged in
  redirectIfLoggedIn();

  const loginForm    = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  // ── Login ────────────────────────────────────────────────────────────────────
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('login-btn');
      const errorBox = document.getElementById('error-box');
      errorBox.classList.add('hidden');
      setLoading(btn, true);

      try {
        const data = await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email:    document.getElementById('email').value.trim(),
            password: document.getElementById('password').value,
          }),
        });

        setAuth(data.token, data.user);
        window.location.href = data.user.role === 'admin' ? 'admin.html' : 'dashboard.html';
      } catch (err) {
        errorBox.textContent = err.message;
        errorBox.classList.remove('hidden');
      } finally {
        setLoading(btn, false);
      }
    });
  }

  // ── Register ─────────────────────────────────────────────────────────────────
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('register-btn');
      const errorBox = document.getElementById('error-box');
      errorBox.classList.add('hidden');
      setLoading(btn, true);

      try {
        const data = await apiFetch('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name:      document.getElementById('name').value.trim(),
            email:     document.getElementById('email').value.trim(),
            password:  document.getElementById('password').value,
            interests: document.getElementById('interests').value,
          }),
        });

        setAuth(data.token, data.user);
        window.location.href = 'dashboard.html';
      } catch (err) {
        errorBox.textContent = err.message;
        errorBox.classList.remove('hidden');
      } finally {
        setLoading(btn, false);
      }
    });
  }
});
