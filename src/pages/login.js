/**
 * 登录页
 */
import { api } from '../api.js';
import { auth, toast } from '../auth.js';

export function renderLogin(container) {
    container.innerHTML = `
        <div class="login-page">
            <div class="logo">◼</div>
            <h1>支 点</h1>
            <div class="subtitle">美甲店工作台</div>
            <div class="login-card">
                <div class="form-group">
                    <input type="password" id="pwd-input" placeholder="请输入管理密码" value="">
                </div>
                <button class="btn btn-primary btn-block" id="login-btn" style="padding:13px;letter-spacing:2px">登 录</button>
            </div>
        </div>
    `;
    
    const input = container.querySelector('#pwd-input');
    const btn = container.querySelector('#login-btn');
    
    async function doLogin() {
        const password = input.value.trim();
        if (!password) { toast('请输入密码'); return; }
        try {
            btn.textContent = '登录中...';
            const res = await api.login(password);
            auth.setToken(res.token);
            toast('登录成功');
            location.hash = '#/dashboard';
        } catch (e) {
            toast('密码错误');
            input.value = '';
            input.focus();
        } finally {
            btn.textContent = '登 录';
        }
    }
    
    btn.addEventListener('click', doLogin);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
    input.focus();
}
