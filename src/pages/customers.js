/**
 * 客户管理页 - 会员系统 + 消费记录
 */
import { api } from '../api.js';
import { toast } from '../auth.js';

export function renderCustomers(container) {

    let currentView = 'list';
    let currentCustomerId = 0;

    container.innerHTML = `
        <div class="page">
            <div class="nav-bar">
                <span class="title">客户管理</span>
                <span class="action" id="add-cust-btn">+ 新增</span>
            </div>
            <div class="search-bar">
                <input type="text" id="cust-search" placeholder="搜索客户姓名或手机号">
            </div>
            <div id="cust-content" class="section">
                <div class="loading"><div class="spinner"></div></div>
            </div>
        </div>
    `;

    container.querySelector('.back')?.addEventListener('click', () => {
        if (currentView === 'detail') { currentView = 'list'; currentCustomerId = 0; loadList(); }
    });
    container.querySelector('#add-cust-btn').addEventListener('click', () => showAddModal(container, loadList));

    let searchTimer;
    container.querySelector('#cust-search').addEventListener('input', (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => loadList(e.target.value), 300);
    });

    async function loadList(search = '') {
        currentView = 'list';
        currentCustomerId = 0;
        const content = container.querySelector('#cust-content');
        content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

        try {
            const list = await api.listCustomers(search);
            if (list.length === 0) {
                content.innerHTML = `<div class="empty"><div style="font-size:40px;margin-bottom:12px;opacity:0.4">—</div><div class="text">暂无客户</div></div>`;
                return;
            }

            content.innerHTML = list.map(c => `
                <div class="card" style="cursor:pointer;position:relative">
                    <div style="display:flex;align-items:center;justify-content:space-between" data-cust="${c.id}">
                        <div style="flex:1">
                            <div style="font-size:15px;font-weight:600">${c.name}
                                ${c.is_member ? '<span class="tag tag-confirmed" style="margin-left:6px">会员</span>' : ''}
                            </div>
                            <div style="font-size:12px;color:var(--text-light);margin-top:2px">📱 ${c.phone}</div>
                        </div>
                        <div style="text-align:right">
                            ${c.is_member ? `<div style="font-size:14px;font-weight:700;color:var(--primary)">¥${(c.balance||0).toFixed(0)}</div>` : ''}
                            <div style="font-size:11px;color:var(--text-lighter);margin-top:2px">到店 ${c.visit_count||0} 次</div>
                        </div>
                    </div>
                    <button class="btn btn-danger btn-sm" style="position:absolute;right:12px;bottom:10px" data-del-cust="${c.id}">删除</button>
                </div>
            `).join('');

            content.querySelectorAll('[data-cust]').forEach(card => {
                card.addEventListener('click', () => {
                    currentCustomerId = parseInt(card.dataset.cust);
                    loadDetail(currentCustomerId);
                });
            });

            // 删除按钮
            content.querySelectorAll('[data-del-cust]').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const custId = parseInt(btn.dataset.delCust);
                    const name = btn.closest('.card').querySelector('[data-cust]').textContent.trim().split('\n')[0];
                    if (!confirm(`确定删除客户「${name}」？\n其消费记录也将一并删除，此操作不可撤销。`)) return;
                    try {
                        await api.deleteCustomer(custId);
                        toast('已删除');
                        loadList();
                    } catch(e) { toast('删除失败'); }
                });
            });
        } catch (e) { content.innerHTML = `<div class="empty"><div class="text">加载失败</div></div>`; }
    }

    async function loadDetail(custId) {
        currentView = 'detail';
        currentCustomerId = custId;
        const content = container.querySelector('#cust-content');
        content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

        try {
            const cust = await api.getCustomer(custId);
            content.innerHTML = `
                <div class="card" style="text-align:center;padding:24px">
                    <div style="width:64px;height:64px;border-radius:50%;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;margin:0 auto 12px">${cust.name[0]}</div>
                    <div style="font-size:18px;font-weight:600">${cust.name}
                        ${cust.is_member ? '<span class="tag tag-confirmed" style="margin-left:6px">会员</span>' : ''}
                    </div>
                    <div style="font-size:13px;color:var(--text-light);margin-top:4px">📱 ${cust.phone}</div>
                    ${cust.is_member ? `
                        <div style="margin-top:14px;padding:12px;background:#fafafa;border-radius:10px">
                            <div style="font-size:28px;font-weight:700;color:#000">¥${(cust.balance||0).toFixed(0)}</div>
                            <div style="font-size:11px;color:var(--text-light);margin-top:2px">卡内余额</div>
                        </div>
                        <div style="display:flex;gap:6px;margin-top:10px">
                            <div style="flex:1;text-align:center;font-size:11px;color:var(--text-light)">
                                <div style="font-size:14px;font-weight:600;color:var(--text)">¥${(cust.total_charged||0).toFixed(0)}</div>
                                累计充值
                            </div>
                            <div style="flex:1;text-align:center;font-size:11px;color:var(--text-light)">
                                <div style="font-size:14px;font-weight:600;color:var(--text)">¥${(cust.total_spent||0).toFixed(0)}</div>
                                累计消费
                            </div>
                            <div style="flex:1;text-align:center;font-size:11px;color:var(--text-light)">
                                <div style="font-size:14px;font-weight:600;color:var(--text)">${cust.visit_count||0}</div>
                                到店次数
                            </div>
                        </div>
                    ` : ''}
                    <div style="display:flex;gap:8px;margin-top:14px">
                        <button class="btn btn-outline btn-sm" style="flex:1" id="edit-cust-btn">编辑</button>
                        ${!cust.is_member ? `<button class="btn btn-primary btn-sm" style="flex:1" id="open-card-btn">开卡</button>` : ''}
                        <button class="btn btn-outline btn-sm" style="flex:1" id="recharge-btn">充值</button>
                        <button class="btn btn-primary btn-sm" style="flex:1" id="consume-btn">消费</button>
                    </div>
                    <button class="btn btn-danger btn-sm" style="width:100%;margin-top:8px" id="delete-cust-btn">删除客户</button>
                </div>

                <!-- 消费记录 -->
                <div class="section-title">消费记录</div>
                ${cust.consumption_records && cust.consumption_records.length > 0 ? cust.consumption_records.map(r => `
                    <div class="card" style="padding:12px 14px;position:relative">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start">
                            <div style="flex:1">
                                <div style="font-size:13px;font-weight:600">${r.service_name || '手动扣款'}</div>
                                <div style="font-size:11px;color:var(--text-light);margin-top:2px">👤 ${r.technician_name || ''}</div>
                            </div>
                            <div style="text-align:right">
                                <div style="font-size:14px;font-weight:700">¥${(r.amount || r.service_price || 0).toFixed(0)}</div>
                                <div style="font-size:10px;color:var(--text-lighter)">${(r.payment_method || r.pay_method) === 'card' ? '会员卡' : (r.payment_method || r.pay_method) === 'mixed' ? '混合' : '现金'}</div>
                            </div>
                        </div>
                        <div style="font-size:10px;color:var(--text-lighter);margin-top:4px">${r.created_at || ''}</div>
                        <button class="btn btn-danger btn-sm" style="position:absolute;right:10px;bottom:8px;font-size:10px;padding:2px 8px" data-del-record="${r.id}">删除</button>
                    </div>
                `).join('') : `<div class="card" style="text-align:center;padding:24px;color:var(--text-lighter)">暂无消费记录</div>`}

                <!-- 充值记录 -->
                ${cust.recharge_records && cust.recharge_records.length > 0 ? `
                    <div class="section-title" style="margin-top:16px">充值记录</div>
                    ${cust.recharge_records.map(r => `
                        <div class="card" style="padding:10px 14px">
                            <div style="display:flex;justify-content:space-between">
                                <div style="font-size:13px">充值 ¥${r.amount}${r.bonus > 0 ? ` + 赠送 ¥${r.bonus}` : ''}</div>
                                <div style="font-size:11px;color:var(--text-lighter)">${r.created_at || ''}</div>
                            </div>
                        </div>
                    `).join('')}
                ` : ''}
            `;

            bindDetailButtons(container, cust, loadDetail);
        } catch (e) { content.innerHTML = `<div class="empty"><div class="text">加载失败</div></div>`; }
    }

    function bindDetailButtons(container, cust, reloadFn) {
        container.querySelector('#edit-cust-btn')?.addEventListener('click', () => showEditModal(container, cust, reloadFn));
        container.querySelector('#open-card-btn')?.addEventListener('click', () => showRechargeModal(container, cust, reloadFn, true));
        container.querySelector('#recharge-btn')?.addEventListener('click', () => showRechargeModal(container, cust, reloadFn, false));
        container.querySelector('#consume-btn')?.addEventListener('click', () => showConsumeModal(container, cust, reloadFn));
        container.querySelector('#delete-cust-btn')?.addEventListener('click', async () => {
            if (!confirm(`确定删除客户「${cust.name}」？\n其消费记录也将一并删除，此操作不可撤销。`)) return;
            try {
                await api.deleteCustomer(cust.id);
                toast('已删除');
                loadList();
            } catch(e) { toast('删除失败'); }
        });
        // 删除消费记录
        container.querySelectorAll('[data-del-record]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const recordId = parseInt(btn.dataset.delRecord);
                if (!confirm('确定删除此消费记录？')) return;
                try {
                    await api.deleteConsumption(recordId);
                    toast('已删除');
                    reloadFn(cust.id);
                } catch(e) { toast('删除失败'); }
            });
        });
    }

    loadList();
}

// ===== 充值弹窗 =====
async function showRechargeModal(container, cust, onSuccess, isOpenCard = false) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal">
            <div class="modal-header"><h2>${isOpenCard ? '开卡充值' : '会员充值'}</h2><span class="close">×</span></div>
            ${isOpenCard ? '<div class="form-group"><label>会员卡类型</label><select id="r-card-type"><option>普通会员</option><option>金卡会员</option><option>钻石会员</option></select></div>' : ''}
            <div class="form-group"><label>充值金额</label><input type="number" id="r-amount" value="500" min="1" step="1"></div>
            <div class="form-group"><label>赠送金额</label><input type="number" id="r-bonus" value="100" min="0" step="1"></div>
            <div style="display:flex;gap:8px;margin-bottom:14px">
                <button class="btn btn-outline btn-sm" style="flex:1" data-preset="500,100">充500送100</button>
                <button class="btn btn-outline btn-sm" style="flex:1" data-preset="1000,300">充1000送300</button>
                <button class="btn btn-outline btn-sm" style="flex:1" data-preset="2000,800">充2000送800</button>
            </div>
            <div class="form-group"><label>支付方式</label><select id="r-pay"><option>现金</option><option>微信</option><option>支付宝</option><option>银行卡</option></select></div>
            <button class="btn btn-primary btn-block" id="r-submit">确认充值</button>
        </div>
    `;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('.close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    overlay.querySelectorAll('[data-preset]').forEach(btn => {
        btn.addEventListener('click', () => {
            const [amount, bonus] = btn.dataset.preset.split(',');
            overlay.querySelector('#r-amount').value = amount;
            overlay.querySelector('#r-bonus').value = bonus;
        });
    });

    overlay.querySelector('#r-submit').addEventListener('click', async () => {
        const data = {
            customer_id: cust.id,
            amount: parseFloat(overlay.querySelector('#r-amount').value) || 0,
            bonus: parseFloat(overlay.querySelector('#r-bonus').value) || 0,
            pay_method: overlay.querySelector('#r-pay').value,
        };
        if (data.amount <= 0) { toast('请输入充值金额'); return; }
        try {
            const res = await api.recharge(cust.id, data);
            if (isOpenCard && overlay.querySelector('#r-card-type')) {
                await api.updateCustomer(cust.id, { is_member: 1, member_card_type: overlay.querySelector('#r-card-type').value });
            }
            toast(res.msg || '充值成功');
            close();
            onSuccess(cust.id);
        } catch (e) { toast('操作失败'); }
    });
}

// ===== 消费弹窗 =====
async function showConsumeModal(container, cust, onSuccess) {
    try {
        const [services, technicians] = await Promise.all([
            api.listServices(true), api.listTechnicians(true)
        ]);

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header"><h2>记录消费</h2><span class="close">×</span></div>
                <div style="font-size:12px;color:var(--text-light);margin-bottom:12px">客户：${cust.name} | 余额：¥${(cust.balance||0).toFixed(0)}</div>
                <div class="form-group"><label>服务项目</label><select id="c-service">${services.map(s => `<option value="${s.id}" data-price="${s.price}" data-name="${s.name}">${s.name} - ¥${s.price}</option>`).join('')}</select></div>
                <div class="form-group"><label>服务员工</label><select id="c-tech">${technicians.map(t => `<option value="${t.id}" data-name="${t.name}">${t.name} - ${t.title}</option>`).join('')}</select></div>
                <div class="form-group"><label>自定义金额（留空使用服务价格）</label><input type="number" id="c-price" placeholder="自动填充服务价格" step="1"></div>
                <div class="form-group"><label>支付方式</label><select id="c-pay"><option value="cash">现金/微信</option><option value="card">会员卡扣款</option><option value="mixed">混合支付</option></select></div>
                <div class="form-group" id="card-deduct-group" style="display:none"><label>卡扣金额</label><input type="number" id="c-card-deduct" placeholder="从余额扣除" step="1"></div>
                <div class="form-group"><label>备注</label><input type="text" id="c-remark" placeholder="款式、颜色等"></div>
                <button class="btn btn-primary btn-block" id="c-submit">确认</button>
            </div>
        `;
        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        overlay.querySelector('.close').addEventListener('click', close);
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

        // 服务选择自动填价格
        const svcSelect = overlay.querySelector('#c-service');
        svcSelect.addEventListener('change', () => {
            const opt = svcSelect.selectedOptions[0];
            overlay.querySelector('#c-price').value = opt.dataset.price;
        });
        // 初始触发
        svcSelect.dispatchEvent(new Event('change'));

        // 支付方式切换
        overlay.querySelector('#c-pay').addEventListener('change', (e) => {
            const cardGroup = overlay.querySelector('#card-deduct-group');
            cardGroup.style.display = (e.target.value === 'card' || e.target.value === 'mixed') ? 'block' : 'none';
            if (e.target.value === 'card') {
                overlay.querySelector('#c-card-deduct').value = overlay.querySelector('#c-price').value;
            }
        });

        overlay.querySelector('#c-submit').addEventListener('click', async () => {
            const svcOpt = svcSelect.selectedOptions[0];
            const techOpt = overlay.querySelector('#c-tech').selectedOptions[0];
            const payMethod = overlay.querySelector('#c-pay').value;
            const price = parseFloat(overlay.querySelector('#c-price').value) || parseFloat(svcOpt.dataset.price);
            const cardDeduct = payMethod === 'card' ? price : (payMethod === 'mixed' ? parseFloat(overlay.querySelector('#c-card-deduct').value) || 0 : 0);
            const cashPay = price - cardDeduct;

            if (cardDeduct > (cust.balance || 0)) {
                toast(`余额不足，当前余额 ¥${(cust.balance||0).toFixed(0)}`);
                return;
            }

            const data = {
                customer_id: cust.id,
                customer_name: cust.name,
                customer_phone: cust.phone,
                technician_id: parseInt(techOpt.value),
                technician_name: techOpt.dataset.name,
                service_id: parseInt(svcOpt.value),
                service_name: svcOpt.dataset.name,
                service_price: price,
                pay_method: payMethod,
                card_deduct: cardDeduct,
                cash_pay: cashPay,
                remark: overlay.querySelector('#c-remark').value.trim(),
            };

            try {
                await api.recordConsumption(cust.id, data);
                toast('消费记录已保存');
                close();
                onSuccess(cust.id);
            } catch (e) { toast('操作失败'); }
        });
    } catch (e) { toast('加载失败'); }
}

// ===== 添加客户弹窗 =====
async function showAddModal(container, onSuccess) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal">
            <div class="modal-header"><h2>新增客户</h2><span class="close">×</span></div>
            <div class="form-group"><label>姓名 *</label><input type="text" id="a-name" placeholder="客户姓名"></div>
            <div class="form-group"><label>手机号 *</label><input type="tel" id="a-phone" placeholder="手机号" maxlength="11"></div>
            <div class="form-group"><label>性别</label><select id="a-gender"><option value="">未设置</option><option>女</option><option>男</option></select></div>
            <div class="form-group"><label>生日</label><input type="date" id="a-birthday"></div>
            <div class="form-group"><label>备注</label><input type="text" id="a-remark" placeholder="备注信息"></div>
            <div class="form-group"><label><input type="checkbox" id="a-member" style="width:auto;margin-right:6px"> 同时开会员卡</label></div>
            <button class="btn btn-primary btn-block" id="a-submit">确认添加</button>
        </div>
    `;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('.close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    overlay.querySelector('#a-submit').addEventListener('click', async () => {
        const name = overlay.querySelector('#a-name').value.trim();
        const phone = overlay.querySelector('#a-phone').value.trim();
        if (!name || !phone) { toast('请填写姓名和手机号'); return; }
        if (!/^1\d{10}$/.test(phone)) { toast('手机号格式不正确'); return; }

        try {
            const data = {
                name, phone,
                gender: overlay.querySelector('#a-gender').value,
                birthday: overlay.querySelector('#a-birthday').value,
                remark: overlay.querySelector('#a-remark').value.trim(),
                is_member: overlay.querySelector('#a-member').checked,
            };
            await api.createCustomer(data);
            toast('添加成功');
            close();
            onSuccess();
        } catch (e) { toast('添加失败，可能手机号已存在'); }
    });
}

async function showEditModal(container, cust, onSuccess) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal">
            <div class="modal-header"><h2>编辑客户</h2><span class="close">×</span></div>
            <div class="form-group"><label>姓名</label><input type="text" id="e-name" value="${cust.name}"></div>
            <div class="form-group"><label>手机号</label><input type="tel" id="e-phone" value="${cust.phone}" maxlength="11"></div>
            <div class="form-group"><label>生日</label><input type="date" id="e-birthday" value="${cust.birthday || ''}"></div>
            <div class="form-group"><label>备注</label><input type="text" id="e-remark" value="${cust.remark || ''}"></div>
            <button class="btn btn-primary btn-block" id="e-submit">保存</button>
        </div>
    `;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('.close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    overlay.querySelector('#e-submit').addEventListener('click', async () => {
        const data = {
            name: overlay.querySelector('#e-name').value.trim(),
            phone: overlay.querySelector('#e-phone').value.trim(),
            birthday: overlay.querySelector('#e-birthday').value,
            remark: overlay.querySelector('#e-remark').value.trim(),
        };
        try {
            await api.updateCustomer(cust.id, data);
            toast('已保存');
            close();
            onSuccess(cust.id);
        } catch (e) { toast('保存失败'); }
    });
}
