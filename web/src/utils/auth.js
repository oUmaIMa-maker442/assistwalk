export const saveAuth = (token, role, userId) => {
  localStorage.setItem('jwt_token', token);
  localStorage.setItem('user_role', role);
  localStorage.setItem('user_id',   String(userId));
};

export const getToken  = () => localStorage.getItem('jwt_token');
export const getRole   = () => localStorage.getItem('user_role');
export const getUserId = () => localStorage.getItem('user_id');

export const isAuthenticated = () => !!getToken();

export const logout = () => {
  localStorage.clear();
  window.location.href = '/login';
};