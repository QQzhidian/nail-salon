/**
 * 管理端 - 路由与入口（简化版：统一由 dashboard 左右分栏承载）
 */
import { auth } from './auth.js';
import { renderLogin } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';

const app = document.getElementById('app');

function router() {
    const hash = location.hash.slice(1) || '/dashboard';
    
    // 未登录时强制跳登录页（除了登录页本身）
    if (hash !== '/login' && !auth.isLoggedIn()) {
        location.hash = '#/login';
        return;
    }
    
    // 已登录时访问登录页，跳到首页
    if (hash === '/login' && auth.isLoggedIn()) {
        location.hash = '#/dashboard';
        return;
    }
    
    // 所有页面统一由 dashboard 的左右分栏承载
    if (hash === '/login') {
        renderLogin(app);
    } else {
        renderDashboard(app);
    }
}

// 监听路由变化
window.addEventListener('hashchange', router);

// 首次加载
router();
