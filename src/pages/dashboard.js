/**
 * 工作台首页 - 左右分栏布局：左侧固定菜单 + 右侧内容区
 */
import { api } from '../api.js';
import { auth } from '../auth.js';

// 导入所有子页面渲染函数
import { renderDailyData } from './daily-data.js';
import { renderMonthlyData } from './monthly-data.js';
import { renderYearlyData } from './yearly-data.js';
import { renderAppointments } from './appointments.js';
import { renderEmployees } from './employees.js';
import { renderCardDeduct } from './card-deduct.js';
import { renderCheckin } from './checkin.js';
import { renderCustomers } from './customers.js';
import { renderServices } from './services.js';
import { renderArtworks } from './artworks.js';
import { renderShopSettings } from './shop-settings.js';
import { renderBusinessCard } from './business-card.js';

const pageMap = {
    'daily-data':     { render: renderDailyData,     group: 'data' },
    'monthly-data':   { render: renderMonthlyData,   group: 'data' },
    'yearly-data':    { render: renderYearlyData,    group: 'data' },
    'appointments':   { render: renderAppointments,  group: 'store' },
    'employees':      { render: renderEmployees,     group: 'store' },
    'card-deduct':    { render: renderCardDeduct,    group: 'store' },
    'services':       { render: renderServices,      group: 'store' },
    'customers':      { render: renderCustomers,     group: 'customer' },
    'checkin':        { render: renderCheckin,       group: 'customer' },
    'business-card':  { render: renderBusinessCard,  group: 'marketing' },
    'artworks':       { render: renderArtworks,      group: 'marketing' },
    'shop-settings':  { render: renderShopSettings,  group: 'marketing' },
};

let currentPage = 'daily-data';

export async function renderDashboard(container) {
    if (!auth.isLoggedIn()) { location.hash = '#/login'; return; }

    const now = new Date();
    const weekdays = ['周日','周一','周二','周三','周四','周五','周六'];
    const dateStr = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日 ${weekdays[now.getDay()]}`;

    container.innerHTML = `
        <div class="workspace-layout">
            <!-- 左侧菜单 -->
            <nav class="workspace-sidebar" id="sidebar">
                <div class="sidebar-brand">
                    <div class="brand-logo">支点</div>
                    <span class="brand-name" id="brand-name-text">美甲工作台</span>
                    <button class="sidebar-toggle" id="sidebar-toggle-btn" title="折叠菜单">
                        <span class="toggle-icon">«</span>
                    </button>
                </div>
                
                <div class="sidebar-date" id="sidebar-date-text">${dateStr}</div>
                
                <div class="sidebar-menu">
                    <!-- 数据看板 -->
                    <div class="sidebar-group">
                        <div class="sidebar-group-title">数据看板</div>
                        <div class="sidebar-item active" data-page="daily-data">
                            <span class="sidebar-icon">📊</span>
                            <span class="sidebar-label">每日数据</span>
                        </div>
                        <div class="sidebar-item" data-page="monthly-data">
                            <span class="sidebar-icon">📈</span>
                            <span class="sidebar-label">本月数据</span>
                        </div>
                        <div class="sidebar-item" data-page="yearly-data">
                            <span class="sidebar-icon">📉</span>
                            <span class="sidebar-label">本年数据</span>
                        </div>
                    </div>
                    
                    <!-- 门店管理 -->
                    <div class="sidebar-group">
                        <div class="sidebar-group-title">门店管理</div>
                        <div class="sidebar-item" data-page="appointments">
                            <span class="sidebar-icon">📝</span>
                            <span class="sidebar-label">预约管理</span>
                        </div>
                        <div class="sidebar-item" data-page="employees">
                            <span class="sidebar-icon">👩‍🎨</span>
                            <span class="sidebar-label">员工排班</span>
                        </div>
                        <div class="sidebar-item" data-page="card-deduct">
                            <span class="sidebar-icon">💳</span>
                            <span class="sidebar-label">会员扣卡</span>
                        </div>
                        <div class="sidebar-item" data-page="services">
                            <span class="sidebar-icon">💅</span>
                            <span class="sidebar-label">服务项目</span>
                        </div>
                    </div>
                    
                    <!-- 顾客中心 -->
                    <div class="sidebar-group">
                        <div class="sidebar-group-title">顾客中心</div>
                        <div class="sidebar-item" data-page="customers">
                            <span class="sidebar-icon">👥</span>
                            <span class="sidebar-label">顾客管理</span>
                        </div>
                        <div class="sidebar-item" data-page="checkin">
                            <span class="sidebar-icon">👋</span>
                            <span class="sidebar-label">打卡顾客</span>
                        </div>
                    </div>
                    
                    <!-- 营销中心 -->
                    <div class="sidebar-group">
                        <div class="sidebar-group-title">营销中心</div>
                        <div class="sidebar-item" data-page="business-card">
                            <span class="sidebar-icon">📱</span>
                            <span class="sidebar-label">名片中心</span>
                        </div>
                        <div class="sidebar-item" data-page="artworks">
                            <span class="sidebar-icon">🖼️</span>
                            <span class="sidebar-label">作品管理</span>
                        </div>
                        <div class="sidebar-item" data-page="shop-settings">
                            <span class="sidebar-icon">⚙️</span>
                            <span class="sidebar-label">店铺设置</span>
                        </div>
                    </div>
                </div>
                
                <div class="sidebar-footer">
                    <div class="sidebar-item" data-page="logout">
                        <span class="sidebar-icon">🚪</span>
                        <span class="sidebar-label">退出登录</span>
                    </div>
                </div>
            </nav>
            
            <!-- 右侧内容区 -->
            <main class="workspace-content" id="workspace-content">
                <div class="loading"><div class="spinner"></div></div>
            </main>
        </div>
    `;

    // 折叠/展开切换
    const sidebar = container.querySelector('#sidebar');
    const toggleBtn = container.querySelector('#sidebar-toggle-btn');
    const toggleIcon = toggleBtn.querySelector('.toggle-icon');
    
    // 恢复折叠状态
    if (localStorage.getItem('sidebar_collapsed') === 'true') {
        sidebar.classList.add('collapsed');
        toggleIcon.textContent = '»';
    }
    
    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        const isCollapsed = sidebar.classList.contains('collapsed');
        toggleIcon.textContent = isCollapsed ? '»' : '«';
        localStorage.setItem('sidebar_collapsed', isCollapsed ? 'true' : 'false');
    });

    // 菜单点击事件
    container.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            if (page === 'logout') {
                auth.logout();
                return;
            }
            navigateTo(container, page);
        });
    });

    // 加载默认页面（或从 hash 读取）
    const hash = location.hash.slice(1).replace('/', '');
    if (hash && pageMap[hash]) {
        navigateTo(container, hash);
    } else {
        navigateTo(container, 'daily-data');
    }

    // 监听外部 hash 变化
    window.addEventListener('hashchange', () => {
        const h = location.hash.slice(1).replace('/', '');
        if (h && pageMap[h]) {
            navigateTo(container, h);
        }
    });
}

function navigateTo(container, pageName) {
    const page = pageMap[pageName];
    if (!page) return;
    currentPage = pageName;

    // 更新菜单高亮
    container.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === pageName);
    });

    // 更新 hash（不触发重渲染）
    const oldHash = location.hash;
    const newHash = `#/${pageName}`;
    if (oldHash !== newHash) {
        history.replaceState(null, '', newHash);
    }

    // 渲染到右侧内容区
    const contentArea = container.querySelector('#workspace-content');
    contentArea.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
        // 子页面渲染函数接收 contentArea 作为容器
        // 需要移除原有的 back 按钮逻辑（因为现在有侧边栏了）
        page.render(contentArea);
    } catch (e) {
        console.error(`页面渲染失败 [${pageName}]:`, e);
        contentArea.innerHTML = `
            <div class="empty"><div class="icon">⚠️</div><div class="text">页面加载失败</div></div>
        `;
    }
}
