/**
 * 会员扣卡页 - 快速为客户扣卡消费
 */
import { api } from '../api.js';
import { toast, confirm } from '../auth.js';

export function renderCardDeduct(container) {
    container.innerHTML = `
        <div class="page">
            <div class="nav-bar"><span class="title">会员扣卡</span></div>
            <div class="section">
                <div class="form-group">
                    <label>选择会员</label>
                    <select id="member-select" style="width:100%;padding:12px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);background:#fafafa;font-size:14px">
                        <option value="">请选择会员</option>
                    </select>
                </div>
                <div id="member-info" style="display:none" class="card" style="margin-bottom:16px">
                    <div style="display:flex;justify-content:space-between;align-items:center">
                        <div><div style="font-size:15px;font-weight:600" id="mi-name">—</div><div style="font-size:12px;color:var(--text-light)" id="mi-phone">—</div></div>
                        <div style="text-align:right"><div style="font-size:11px;color:var(--text-light)">当前余额</div><div style="font-size:20px;font-weight:700" id="mi-balance">¥0</div></div>
                    </div>
                </div>
                <div class="form-group">
                    <label>服务项目</label>
                    <select id="service-select" style="width:100%;padding:12px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);background:#fafafa;font-size:14px">
                        <option value="">请选择服务</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>服务美甲师</label>
                    <select id="tech-select" style="width:100%;padding:12px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);background:#fafafa;font-size:14px">
                        <option value="">请选择美甲师</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>扣卡金额</label>
                    <input type="number" id="deduct-amount" placeholder="输入扣卡金额" style="width:100%;padding:12px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);background:#fafafa;font-size:14px">
                </div>
                <div class="form-group">
                    <label>备注</label>
                    <input type="text" id="deduct-remark" placeholder="可选：如做的款式、颜色等" style="width:100%;padding:12px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);background:#fafafa;font-size:14px">
                </div>
                <button class="btn btn-primary btn-block" id="deduct-submit">确认扣卡</button>
            </div>
        </div>
    `;
    
    let members = [], services = [], technicians = [];
    
    (async () => {
        try {
            [members, services, technicians] = await Promise.all([
                api.listCustomers(''), api.listServices(true), api.listTechnicians(true),
            ]);
            
            container.querySelector('#member-select').innerHTML = `
                <option value="">请选择会员</option>
                ${members.filter(m => m.is_member).map(m => `<option value="${m.id}" data-balance="${m.balance}">${m.name} ${m.phone} (余额¥${m.balance})</option>`).join('')}
            `;
            container.querySelector('#service-select').innerHTML = `
                <option value="">请选择服务</option>
                ${services.map(s => `<option value="${s.id}" data-price="${s.price}" data-name="${s.name}">${s.name} ¥${s.price}</option>`).join('')}
            `;
            container.querySelector('#tech-select').innerHTML = `
                <option value="">请选择美甲师</option>
                ${technicians.map(t => `<option value="${t.id}" data-name="${t.name}">${t.name}</option>`).join('')}
            `;
        } catch (e) { toast('数据加载失败'); }
    })();
    
    container.querySelector('#member-select').addEventListener('change', () => {
        const id = parseInt(container.querySelector('#member-select').value);
        const m = members.find(x => x.id === id);
        if (m) {
            container.querySelector('#mi-name').textContent = m.name;
            container.querySelector('#mi-phone').textContent = m.phone;
            container.querySelector('#mi-balance').textContent = `¥${parseFloat(m.balance).toFixed(0)}`;
            container.querySelector('#member-info').style.display = 'block';
        } else {
            container.querySelector('#member-info').style.display = 'none';
        }
    });
    
    container.querySelector('#service-select').addEventListener('change', () => {
        const sel = container.querySelector('#service-select');
        const price = parseFloat(sel.options[sel.selectedIndex].dataset.price) || 0;
        if (price > 0) container.querySelector('#deduct-amount').value = price;
    });
    
    container.querySelector('#deduct-submit').addEventListener('click', async () => {
        const custId = parseInt(container.querySelector('#member-select').value);
        const svcSel = container.querySelector('#service-select');
        const techSel = container.querySelector('#tech-select');
        const amount = parseFloat(container.querySelector('#deduct-amount').value) || 0;
        const remark = container.querySelector('#deduct-remark').value.trim();
        if (!custId) { toast('请选择会员'); return; }
        if (amount <= 0) { toast('请输入扣卡金额'); return; }
        const member = members.find(m => m.id === custId);
        if (!member) { toast('会员不存在'); return; }
        if (amount > member.balance) { toast(`余额不足，当前余额 ¥${member.balance}`); return; }
        if (!confirm(`确定为 ${member.name} 扣卡 ¥${amount} 吗？`)) return;
        try {
            await api.recordConsumption(custId, {
                customer_name: member.name, customer_phone: member.phone,
                service_id: parseInt(svcSel.value) || 0, service_name: svcSel.options[svcSel.selectedIndex].dataset.name || '',
                service_price: amount,
                technician_id: parseInt(techSel.value) || 0, technician_name: techSel.options[techSel.selectedIndex].dataset.name || '',
                pay_method: 'card', card_deduct: amount, cash_pay: 0, remark,
            });
            toast('扣卡成功');
            // 刷新数据
            const updated = await api.getCustomer(custId);
            const idx = members.findIndex(m => m.id === custId);
            if (idx >= 0) members[idx] = updated;
            container.querySelector('#mi-balance').textContent = `¥${parseFloat(updated.balance).toFixed(0)}`;
            container.querySelector('#deduct-amount').value = '';
            container.querySelector('#deduct-remark').value = '';
        } catch (e) { toast('扣卡失败'); }
    });
}
