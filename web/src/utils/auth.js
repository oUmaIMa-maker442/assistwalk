// src/utils/auth.js
// Toujours localStorage — la durée d'expiration est gérée côté backend (JWT).

export function saveAuth(token, role, userId, mustChangePassword = false) {
  localStorage.setItem('token',              token);
  localStorage.setItem('role',               role);
  localStorage.setItem('userId',             String(userId));
  localStorage.setItem('mustChangePassword', String(mustChangePassword));
}

export function getToken()           { return localStorage.getItem('token'); }
export function getRole()            { return localStorage.getItem('role'); }
export function getUserId()          {
  const id = localStorage.getItem('userId');
  return id ? parseInt(id) : null;
}
export function mustChangePassword() {
  return localStorage.getItem('mustChangePassword') === 'true';
}
export function isAuthenticated()    { return !!getToken(); }

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('userId');
  localStorage.removeItem('mustChangePassword');
  window.location.href = '/login';
}
