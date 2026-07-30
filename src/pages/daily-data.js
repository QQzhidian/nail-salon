/**
 * 每日数据页 - 展示今日核心经营数据（右侧内容区）
 */
import { api } from '../api.js';

export function renderDailyData(container) {
    container.innerHTML = `
        <div class="page">
            <div class="nav-bar">
                <span class="title">每日数据</span>
            </div>
            <div class="section">
                <div class="loading"><div class="spinner"></div>加载中...</div>
            </div>
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
            const today = new Date().toLocaleDateString('zh-CN');
            
            container.querySelector('.section').innerHTML = `
                <div class="dashboard-card hero-card" style="margin-bottom:12px">
                    <div class="card-icon-bg">💰</div>
                    <div class="card-content">
                        <div class="card-label">${today} 今日收入</div>
                        <div class="card-value">¥${fmtMoney(stats.today_revenue)}</div>
                        <div class="card-sub">${stats.today_consumption || 0} 笔消费</div>
                    </div>
                </div>
                
                <div class="dashboard-card-grid">
                    <div class="dashboard-card small-card card-blue">
                        <div class="card-icon-bg small">📅</div>
                        <div class="card-content">
                            <div class="card-label">今日预约</div>
                            <div class="card-value">${stats.today_total || 0}</div>
                        </div>
                    </div>
                    <div class="dashboard-card small-card card-orange">
                        <div class="card-icon-bg small">⏳</div>
                        <div class="card-content">
                            <div class="card-label">待确认</div>
                            <div class="card-value">${stats.pending_total || 0}</div>
                        </div>
                    </div>
                    <div class="dashboard-card small-card card-teal">
                        <div class="card-icon-bg small">👥</div>
                        <div class="card-content">
                            <div class="card-label">客户总数</div>
                            <div class="card-value">${stats.customer_total || 0}</div>
                        </div>
                    </div>
                    <div class="dashboard-card small-card card-rose">
                        <div class="card-icon-bg small">💳</div>
                        <div class="card-content">
                            <div class="card-label">会员余额</div>
                            <div class="card-value">¥${fmtMoney(stats.total_balance)}</div>
                        </div>
                    </div>
                </div>
                
                <div style="margin-top:20px">
                    <div class="section-title">今日预约明细</div>
                    <div id="today-list"></div>
                </div>
            `;
            
            const listEl = container.querySelector('#today-list');
            if (!stats.today_appointments || stats.today_appointments.length === 0) {
                listEl.innerHTML = `
                    <div class="card" style="text-align:center;padding:32px;color:var(--text-lighter)">
                        <div style="font-size:32px;margin-bottom:10px;opacity:0.4">—</div>
                        <div style="font-size:13px">今日暂无预约</div>
                    </div>`;
            } else {
                listEl.innerHTML = stats.today_appointments.map(a => `
                    <div class="card">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
                            <div style="flex:1">
                                <div style="font-size:15px;font-weight:600">${a.customer_name}</div>
                                <div style="font-size:12px;color:var(--text-light);margin-top:2px">${a.service_name || ''}</div>
                            </div>
                            <span class="tag tag-${a.status}">${statusText(a.status)}</span>
                        </div>
                        <div style="display:flex;gap:16px;font-size:12px;color:var(--text-light)">
                            <span>🕐 ${a.appointment_time}</span>
                            <span>👩‍🎨 ${a.technician_name || '未指定'}</span>
                        </div>
                    </div>
                `).join('');
            }
        } catch (e) {
            container.querySelector('.section').innerHTML = `
                <div class="empty"><div class="icon">⚠️</div><div class="text">加载失败</div></div>
            `;
        }
    })();
}

function statusText(s) {
    return { pending: '待确认', confirmed: '已确认', completed: '已完成', cancelled: '已取消' }[s] || s;
}
