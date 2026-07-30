/**
 * 打卡顾客页 - 今日到店签到记录
 */
import { api } from '../api.js';
import { toast } from '../auth.js';

export function renderCheckin(container) {
    container.innerHTML = `
        <div class="page">
            <div class="nav-bar"><span class="title">打卡顾客</span></div>
            <div class="section">
                <div class="card" style="margin-bottom:16px">
                    <div style="font-size:15px;font-weight:600;margin-bottom:12px">今日到店打卡</div>
                    <div class="form-group" style="margin-bottom:12px">
                        <input type="text" id="checkin-phone" placeholder="输入客户手机号后4位或完整手机号" style="width:100%;padding:12px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);background:#fafafa;font-size:14px">
                    </div>
                    <button class="btn btn-primary btn-block" id="checkin-search">查询并打卡</button>
                </div>
                <div class="section-title">今日已打卡</div>
                <div id="checkin-list"><div class="loading"><div class="spinner"></div>加载中...</div></div>
            </div>
        </div>
    `;
    
    const listEl = container.querySelector('#checkin-list');
    
    async function loadTodayAppointments() {
        listEl.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
        try {
            const today = new Date().toISOString().slice(0, 10);
            const res = await api.listAppointments({ date: today });
            const list = res.list || [];
            const confirmed = list.filter(a => a.status === 'confirmed' || a.status === 'pending');
            
            if (confirmed.length === 0) {
                listEl.innerHTML = `<div class="card" style="text-align:center;padding:32px;color:var(--text-lighter)"><div style="font-size:32px;margin-bottom:10px;opacity:0.4">—</div><div style="font-size:13px">今日暂无待打卡预约</div></div>`;
                return;
            }
            
            listEl.innerHTML = confirmed.map(a => `
                <div class="card" style="display:flex;align-items:center;gap:12px">
                    <div style="width:44px;height:44px;border-radius:50%;background:#f5f5f5;display:flex;align-items:center;justify-content:center;font-size:20px">👤</div>
                    <div style="flex:1">
                        <div style="font-size:15px;font-weight:600">${a.customer_name}</div>
                        <div style="font-size:12px;color:var(--text-light)">${a.appointment_time} · ${a.service_name || '未指定服务'}</div>
                    </div>
                    <button class="btn btn-outline btn-sm" data-checkin="${a.id}">打卡</button>
                </div>
            `).join('');
            
            listEl.querySelectorAll('[data-checkin]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    try {
                        await api.updateAppointmentStatus(btn.dataset.checkin, 'completed');
                        toast('打卡成功');
                        loadTodayAppointments();
                    } catch (e) { toast('打卡失败'); }
                });
            });
        } catch (e) {
            listEl.innerHTML = `<div class="empty"><div class="icon">⚠️</div><div class="text">加载失败</div></div>`;
        }
    }
    
    container.querySelector('#checkin-search').addEventListener('click', async () => {
        const phone = container.querySelector('#checkin-phone').value.trim();
        if (!phone) { toast('请输入手机号'); return; }
        try {
            const customers = await api.listCustomers(phone);
            if (customers.length === 0) { toast('未找到客户'); return; }
            const cust = customers[0];
            await api.recordConsumption(cust.id, {
                customer_name: cust.name, customer_phone: cust.phone,
                service_name: '到店打卡', service_price: 0,
                pay_method: 'cash', card_deduct: 0, cash_pay: 0,
                remark: '顾客到店打卡',
            });
            toast(`${cust.name} 打卡成功`);
            container.querySelector('#checkin-phone').value = '';
            loadTodayAppointments();
        } catch (e) { toast('打卡失败'); }
    });
    
    loadTodayAppointments();
}
