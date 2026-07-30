/**
 * 本月数据页
 */
import { api } from '../api.js';

export function renderMonthlyData(container) {
    container.innerHTML = `
        <div class="page">
            <div class="nav-bar"><span class="title">本月数据</span></div>
            <div class="section"><div class="loading"><div class="spinner"></div>加载中...</div></div>
        </div>
    `;
    
    const fmtMoney = (n) => {
        n = parseFloat(n) || 0;
        if (n >= 10000) return (n / 10000).toFixed(1) + '万';
        return n.toFixed(0);
    };
    
    (async () => {
        try {
            const stats = await api.todayStats();
            const month = `${new Date().getFullYear()}年${new Date().getMonth()+1}月`;
            
            container.querySelector('.section').innerHTML = `
                <div class="dashboard-card hero-card" style="margin-bottom:12px">
                    <div class="card-icon-bg">📈</div>
                    <div class="card-content">
                        <div class="card-label">${month} 本月收入</div>
                        <div class="card-value">¥${fmtMoney(stats.month_revenue)}</div>
                        <div class="card-sub">消费 + 充值合计</div>
                    </div>
                </div>
                <div class="dashboard-card-grid">
                    <div class="dashboard-card small-card"><div class="card-icon-bg small">👥</div><div class="card-content"><div class="card-label">客户总数</div><div class="card-value">${stats.customer_total || 0}</div></div></div>
                    <div class="dashboard-card small-card"><div class="card-icon-bg small">⭐</div><div class="card-content"><div class="card-label">会员数</div><div class="card-value">${stats.member_total || 0}</div></div></div>
                    <div class="dashboard-card small-card"><div class="card-icon-bg small">💳</div><div class="card-content"><div class="card-label">会员储值</div><div class="card-value">¥${fmtMoney(stats.total_balance)}</div></div></div>
                    <div class="dashboard-card small-card"><div class="card-icon-bg small">👩‍🎨</div><div class="card-content"><div class="card-label">在职员工</div><div class="card-value">${stats.tech_count || 0}</div></div></div>
                </div>
            `;
        } catch (e) {
            container.querySelector('.section').innerHTML = `<div class="empty"><div class="icon">⚠️</div><div class="text">加载失败</div></div>`;
        }
    })();
}
