/**
 * 本年数据页
 */
import { api } from '../api.js';

export function renderYearlyData(container) {
    container.innerHTML = `
        <div class="page">
            <div class="nav-bar"><span class="title">本年数据</span></div>
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
            const year = new Date().getFullYear();
            
            container.querySelector('.section').innerHTML = `
                <div class="dashboard-card hero-card" style="margin-bottom:12px">
                    <div class="card-icon-bg">📉</div>
                    <div class="card-content">
                        <div class="card-label">${year}年 累计经营数据</div>
                        <div class="card-value">¥${fmtMoney(stats.month_revenue)}</div>
                        <div class="card-sub">当前可统计收入（本年累计需数据库扩展）</div>
                    </div>
                </div>
                <div class="dashboard-card-grid">
                    <div class="dashboard-card small-card"><div class="card-icon-bg small">👥</div><div class="card-content"><div class="card-label">累计客户</div><div class="card-value">${stats.customer_total || 0}</div></div></div>
                    <div class="dashboard-card small-card"><div class="card-icon-bg small">⭐</div><div class="card-content"><div class="card-label">累计会员</div><div class="card-value">${stats.member_total || 0}</div></div></div>
                </div>
                <div class="card" style="margin-top:16px;padding:16px;color:var(--text-light);font-size:12px;line-height:1.8">
                    <div style="font-weight:600;color:var(--text);margin-bottom:8px">说明</div>
                    <p>本年数据目前展示实时累计。后续可接入按月汇总图表、年度趋势分析等高级报表功能。</p>
                </div>
            `;
        } catch (e) {
            container.querySelector('.section').innerHTML = `<div class="empty"><div class="icon">⚠️</div><div class="text">加载失败</div></div>`;
        }
    })();
}
