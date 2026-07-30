/**
 * 登录态管理
 */
export const auth = {
    getToken() {
        return localStorage.getItem('admin_token') || '';
    },
    
    setToken(token) {
        localStorage.setItem('admin_token', token);
    },
    
    logout() {
        localStorage.removeItem('admin_token');
        location.hash = '#/login';
    },
    
    isLoggedIn() {
        return !!this.getToken();
    },
};

// Toast 通知
export function toast(msg, duration = 2000) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), duration);
}

// 确认弹窗
export function confirm(msg) {
    return window.confirm(msg);
}
