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
            <div id="alpha-bar" style="display:flex;flex-wrap:wrap;gap:4px;padding:8px 14px;background:#fff;border-bottom:1px solid var(--border-light);overflow-x:auto;-webkit-overflow-scrolling:touch"></div>
            <div id="cust-content" class="section" style="padding-top:8px">
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
        const alphaBar = container.querySelector('#alpha-bar');
        content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

        try {
            const list = await api.listCustomers(search);

            // 按拼音首字母分组排序
            const grouped = {};
            list.forEach(c => {
                const initial = getPinyinInitial(c.name);
                if (!grouped[initial]) grouped[initial] = [];
                grouped[initial].push(c);
            });

            const sortedKeys = Object.keys(grouped).sort((a, b) => {
                if (a === '#') return 1;
                if (b === '#') return -1;
                return a.localeCompare(b);
            });

            if (list.length === 0) {
                alphaBar.innerHTML = '';
                content.innerHTML = `<div class="empty"><div style="font-size:40px;margin-bottom:12px;opacity:0.4">—</div><div class="text">暂无客户</div></div>`;
                return;
            }

            // 渲染字母索引条
            const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
            const availableLetters = sortedKeys.filter(k => k !== '#');
            alphaBar.innerHTML = allLetters.map(l => {
                const active = availableLetters.includes(l);
                return `<span class="alpha-chip" data-letter="${l}"
                    style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.15s;flex-shrink:0;
                    background:${active ? 'var(--text)' : '#f0f0f0'};color:${active ? '#fff' : '#ccc'}">${l}</span>`;
            }).join('');

            // 点击字母跳转
            alphaBar.querySelectorAll('.alpha-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    const letter = chip.dataset.letter;
                    const target = content.querySelector(`[data-group="${letter}"]`);
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
            });

            // 渲染分组列表
            let html = '';
            sortedKeys.forEach(key => {
                html += `<div data-group="${key}" style="padding:4px 0 2px;font-size:12px;font-weight:700;color:var(--text-light);letter-spacing:0.5px" id="group-${key}">${key}</div>`;
                grouped[key].forEach(c => {
                    html += `
                        <div class="card" style="cursor:pointer;position:relative;margin-bottom:8px">
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
                        </div>`;
                });
            });
            content.innerHTML = html;

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
                        ${cust.card_type === 'count' ? `
                        <!-- 次卡信息 -->
                        <div style="margin-top:14px;padding:12px;background:#fafafa;border-radius:10px">
                            <div style="font-size:13px;color:var(--text-light);margin-bottom:4px">🔢 次卡 · ${cust.count_service_name || '服务'}</div>
                            <div style="font-size:28px;font-weight:700;color:#000">${cust.count_remaining || 0} <span style="font-size:14px;font-weight:400;color:var(--text-light)">/ ${cust.count_times || 0} 次</span></div>
                            <div style="font-size:11px;color:var(--text-light);margin-top:2px">¥${cust.count_service_price || 0}/次</div>
                        </div>
                        ` : `
                        <!-- 储值卡信息 -->
                        <div style="margin-top:14px;padding:12px;background:#fafafa;border-radius:10px">
                            <div style="font-size:28px;font-weight:700;color:#000">¥${(cust.balance||0).toFixed(0)}</div>
                            <div style="font-size:11px;color:var(--text-light);margin-top:2px">卡内余额</div>
                        </div>
                        `}
                        <div style="display:flex;gap:6px;margin-top:10px">
                            <div style="flex:1;text-align:center;font-size:11px;color:var(--text-light)">
                                <div style="font-size:14px;font-weight:600;color:var(--text)">¥${(cust.total_recharge||0).toFixed(0)}</div>
                                累计充值
                            </div>
                            <div style="flex:1;text-align:center;font-size:11px;color:var(--text-light)">
                                <div style="font-size:14px;font-weight:600;color:var(--text)">¥${(cust.total_consumption||0).toFixed(0)}</div>
                                累计消费
                            </div>
                            <div style="flex:1;text-align:center;font-size:11px;color:var(--text-light)">
                                <div style="font-size:14px;font-weight:600;color:var(--text)">${(cust.consumption_records?.length || 0)}</div>
                                到店次数
                            </div>
                        </div>
                    ` : ''}
                    <div style="display:flex;gap:8px;margin-top:14px">
                        <button class="btn btn-outline btn-sm" style="flex:1" id="edit-cust-btn">编辑</button>
                        ${!cust.is_member ? `<button class="btn btn-primary btn-sm" style="flex:1" id="open-card-btn">开卡</button>` : ''}
                        ${cust.is_member && cust.card_type !== 'count' ? `<button class="btn btn-outline btn-sm" style="flex:1" id="recharge-btn">充值</button>` : ''}
                        <button class="btn btn-primary btn-sm" style="flex:1" id="consume-btn">消费</button>
                    </div>
                    <button class="btn btn-danger btn-sm" style="width:100%;margin-top:8px" id="delete-cust-btn">删除客户</button>
                </div>

                <!-- 心仪款式照片 -->
                <div class="section-title" style="margin-top:16px">💖 心仪款式</div>
                <div id="wish-photos" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px">
                    ${(cust.wish_photos || []).map((p, i) => `
                        <div style="position:relative;width:80px;height:80px;border-radius:8px;overflow:hidden;border:1px solid var(--border)">
                            <img src="${p.url}" style="width:100%;height:100%;object-fit:cover" onclick="this.requestFullscreen?.()">
                            <span style="position:absolute;top:2px;right:2px;width:18px;height:18px;background:rgba(0,0,0,0.6);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;cursor:pointer"
                                  data-del-wish="${i}">×</span>
                        </div>
                    `).join('')}
                </div>
                <button class="btn btn-outline btn-sm" id="add-wish-photo-btn" style="width:100%">+ 添加心仪款式照片</button>

                <!-- 消费记录 -->
                <div class="section-title" style="margin-top:16px">消费记录</div>
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
                        ${r.photo ? `<div style="margin-top:6px"><img src="${r.photo}" style="max-width:120px;max-height:120px;border-radius:6px;cursor:pointer;border:1px solid var(--border)" onclick="this.requestFullscreen?.()"></div>` : ''}
                        ${r.notes ? `<div style="font-size:11px;color:var(--text-light);margin-top:4px">📝 ${r.notes}</div>` : ''}
                        <div style="font-size:10px;color:var(--text-lighter);margin-top:4px">${r.created_at || ''}</div>
                        <div style="position:absolute;right:10px;bottom:8px;display:flex;gap:6px">
                            <button class="btn btn-outline btn-sm" style="font-size:10px;padding:2px 8px" data-add-photo="${r.id}">📷</button>
                            <button class="btn btn-danger btn-sm" style="font-size:10px;padding:2px 8px" data-del-record="${r.id}">删除</button>
                        </div>
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

        // 心仪照片：添加
        container.querySelector('#add-wish-photo-btn')?.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.addEventListener('change', async () => {
                const file = input.files[0];
                if (!file) return;
                try {
                    toast('上传中...');
                    const res = await api.upload(file);
                    await api.addWishPhoto(cust.id, res.url);
                    toast('已添加');
                    reloadFn(cust.id);
                } catch(e) { toast('上传失败'); }
            });
            input.click();
        });

        // 心仪照片：删除
        container.querySelectorAll('[data-del-wish]').forEach(span => {
            span.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!confirm('删除这张心仪照片？')) return;
                const idx = parseInt(span.dataset.delWish);
                try {
                    await api.deleteWishPhoto(cust.id, idx);
                    toast('已删除');
                    reloadFn(cust.id);
                } catch(e) { toast('删除失败'); }
            });
        });

        // 消费记录：添加成品照片
        container.querySelectorAll('[data-add-photo]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const recordId = parseInt(btn.dataset.addPhoto);
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.addEventListener('change', async () => {
                    const file = input.files[0];
                    if (!file) return;
                    try {
                        toast('上传中...');
                        const res = await api.upload(file);
                        await api.updateConsumptionPhoto(recordId, res.url);
                        toast('照片已添加');
                        reloadFn(cust.id);
                    } catch(e) { toast('上传失败'); }
                });
                input.click();
            });
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

// ===== 开卡/充值弹窗 =====
async function showRechargeModal(container, cust, onSuccess, isOpenCard = false) {
    // 加载服务列表用于次卡
    let services = [];
    if (isOpenCard) {
        try { services = await api.listServices(true); } catch(e) {}
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal" style="max-width:420px">
            <div class="modal-header"><h2>${isOpenCard ? '开卡充值' : '会员充值'}</h2><span class="close">×</span></div>

            ${isOpenCard ? `
            <!-- 卡片类型选择 -->
            <div class="form-group">
                <label>卡片类型</label>
                <div style="display:flex;gap:10px;margin-bottom:10px">
                    <label style="flex:1;display:flex;align-items:center;gap:6px;padding:10px;border:2px solid var(--primary);border-radius:8px;cursor:pointer" id="card-type-value">
                        <input type="radio" name="card-type" value="stored" checked style="accent-color:var(--primary)"> 💰 储值卡
                    </label>
                    <label style="flex:1;display:flex;align-items:center;gap:6px;padding:10px;border:2px solid var(--border);border-radius:8px;cursor:pointer" id="card-type-count">
                        <input type="radio" name="card-type" value="count" style="accent-color:var(--primary)"> 🔢 次卡
                    </label>
                </div>
            </div>

            <!-- 储值卡区域 -->
            <div id="stored-card-section">
                <div class="form-group"><label>充值金额</label><input type="number" id="r-amount" value="500" min="1" step="1"></div>
                <div class="form-group"><label>赠送金额</label><input type="number" id="r-bonus" value="100" min="0" step="1"></div>
                <div style="display:flex;gap:8px;margin-bottom:14px">
                    <button class="btn btn-outline btn-sm" style="flex:1" data-preset="500,100">充500送100</button>
                    <button class="btn btn-outline btn-sm" style="flex:1" data-preset="1000,300">充1000送300</button>
                    <button class="btn btn-outline btn-sm" style="flex:1" data-preset="2000,800">充2000送800</button>
                </div>
            </div>

            <!-- 次卡区域 -->
            <div id="count-card-section" style="display:none">
                <div class="form-group">
                    <label>服务项目</label>
                    <select id="r-count-service">
                        ${services.map(s => `<option value="${s.id}" data-name="${s.name}" data-price="${s.price}">${s.name} - ¥${s.price}/次</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>购买次数</label>
                    <input type="number" id="r-count-times" value="10" min="1" step="1">
                </div>
                <div style="padding:10px;background:#fafafa;border-radius:8px;margin-bottom:10px;font-size:13px;text-align:center">
                    总价：<b style="font-size:18px;color:var(--primary)" id="r-count-total">¥1280</b>
                </div>
            </div>

            <div class="form-group"><label>会员等级</label><select id="r-card-type"><option>普通会员</option><option>金卡会员</option><option>钻石会员</option></select></div>
            ` : `
            <div class="form-group"><label>充值金额</label><input type="number" id="r-amount" value="500" min="1" step="1"></div>
            <div class="form-group"><label>赠送金额</label><input type="number" id="r-bonus" value="100" min="0" step="1"></div>
            <div style="display:flex;gap:8px;margin-bottom:14px">
                <button class="btn btn-outline btn-sm" style="flex:1" data-preset="500,100">充500送100</button>
                <button class="btn btn-outline btn-sm" style="flex:1" data-preset="1000,300">充1000送300</button>
                <button class="btn btn-outline btn-sm" style="flex:1" data-preset="2000,800">充2000送800</button>
            </div>
            `}

            <div class="form-group"><label>支付方式</label><select id="r-pay"><option>现金</option><option>微信</option><option>支付宝</option><option>银行卡</option></select></div>
            <button class="btn btn-primary btn-block" id="r-submit">确认充值</button>
        </div>
    `;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('.close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    // 储值卡/次卡切换
    if (isOpenCard) {
        const storedSection = overlay.querySelector('#stored-card-section');
        const countSection = overlay.querySelector('#count-card-section');
        const storedLabel = overlay.querySelector('#card-type-value');
        const countLabel = overlay.querySelector('#card-type-count');

        overlay.querySelectorAll('input[name="card-type"]').forEach(radio => {
            radio.addEventListener('change', () => {
                const isStored = radio.value === 'stored';
                storedSection.style.display = isStored ? 'block' : 'none';
                countSection.style.display = isStored ? 'none' : 'block';
                storedLabel.style.borderColor = isStored ? 'var(--primary)' : 'var(--border)';
                countLabel.style.borderColor = isStored ? 'var(--border)' : 'var(--primary)';
            });
        });

        // 次卡价格实时计算
        const countSvc = overlay.querySelector('#r-count-service');
        const countTimes = overlay.querySelector('#r-count-times');
        const countTotal = overlay.querySelector('#r-count-total');
        function updateCountTotal() {
            const price = parseFloat(countSvc.selectedOptions[0]?.dataset.price) || 0;
            const times = parseInt(countTimes.value) || 0;
            countTotal.textContent = `¥${(price * times).toFixed(0)}`;
        }
        countSvc.addEventListener('change', updateCountTotal);
        countTimes.addEventListener('input', updateCountTotal);
        updateCountTotal();
    }

    // 快速预设
    overlay.querySelectorAll('[data-preset]').forEach(btn => {
        btn.addEventListener('click', () => {
            const [amount, bonus] = btn.dataset.preset.split(',');
            overlay.querySelector('#r-amount').value = amount;
            overlay.querySelector('#r-bonus').value = bonus;
        });
    });

    overlay.querySelector('#r-submit').addEventListener('click', async () => {
        // 判断是储值卡还是次卡
        const cardType = isOpenCard ? (overlay.querySelector('input[name="card-type"]:checked')?.value || 'stored') : 'stored';

        if (cardType === 'count') {
            // 次卡
            const svcSel = overlay.querySelector('#r-count-service');
            const svcName = svcSel.selectedOptions[0]?.dataset.name || '';
            const svcPrice = parseFloat(svcSel.selectedOptions[0]?.dataset.price) || 0;
            const times = parseInt(overlay.querySelector('#r-count-times').value) || 0;
            const totalPaid = svcPrice * times;

            if (times <= 0) { toast('请输入次数'); return; }

            try {
                const res = await api.recharge(cust.id, {
                    amount: totalPaid,
                    bonus: 0,
                    pay_method: overlay.querySelector('#r-pay').value,
                    card_type: 'count',
                    count_service_name: svcName,
                    count_service_price: svcPrice,
                    count_times: times,
                    count_remaining: times,
                });
                await api.updateCustomer(cust.id, {
                    is_member: 1,
                    card_type: 'count',
                    count_service_name: svcName,
                    count_service_price: svcPrice,
                    count_times: times,
                    count_remaining: times,
                    member_card_type: overlay.querySelector('#r-card-type').value,
                });
                toast(`次卡开通成功！${svcName} ×${times}次`);
                close();
                onSuccess(cust.id);
            } catch(e) { toast('操作失败'); }
        } else {
            // 储值卡
            const amount = parseFloat(overlay.querySelector('#r-amount').value) || 0;
            if (amount <= 0) { toast('请输入充值金额'); return; }
            const data = {
                customer_id: cust.id,
                amount: amount,
                bonus: parseFloat(overlay.querySelector('#r-bonus').value) || 0,
                pay_method: overlay.querySelector('#r-pay').value,
                card_type: 'stored',
            };
            try {
                await api.recharge(cust.id, data);
                if (isOpenCard) {
                    await api.updateCustomer(cust.id, { is_member: 1, card_type: 'stored', member_card_type: overlay.querySelector('#r-card-type').value });
                }
                toast('充值成功');
                close();
                onSuccess(cust.id);
            } catch(e) { toast('操作失败'); }
        }
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
                <div style="font-size:12px;color:var(--text-light);margin-bottom:12px">
                    客户：${cust.name}
                    ${cust.card_type === 'count' ? ` | 次卡：${cust.count_service_name || ''} 剩余 ${cust.count_remaining || 0}/${cust.count_times || 0} 次` : ` | 余额：¥${(cust.balance||0).toFixed(0)}`}
                </div>
                <div class="form-group"><label>服务项目</label><select id="c-service">${services.map(s => `<option value="${s.id}" data-price="${s.price}" data-name="${s.name}">${s.name} - ¥${s.price}</option>`).join('')}</select></div>
                <div class="form-group"><label>服务员工</label><select id="c-tech">${technicians.map(t => `<option value="${t.id}" data-name="${t.name}">${t.name} - ${t.title}</option>`).join('')}</select></div>
                <div class="form-group"><label>自定义金额（留空使用服务价格）</label><input type="number" id="c-price" placeholder="自动填充服务价格" step="1"></div>
                ${cust.card_type === 'count' ? `
                <div class="form-group">
                    <label><input type="checkbox" id="c-use-count" checked style="width:auto;margin-right:6px"> 使用次卡抵扣（扣1次）</label>
                </div>
                ` : `
                <div class="form-group"><label>支付方式</label><select id="c-pay"><option value="cash">现金/微信</option><option value="card">会员卡扣款</option><option value="mixed">混合支付</option></select></div>
                <div class="form-group" id="card-deduct-group" style="display:none"><label>卡扣金额</label><input type="number" id="c-card-deduct" placeholder="从余额扣除" step="1"></div>
                `}
                <div class="form-group"><label>备注</label><input type="text" id="c-remark" placeholder="款式、颜色等"></div>
                <div class="form-group">
                    <label>款式成品照</label>
                    <div id="c-photo-area" style="width:100%;min-height:60px;border:2px dashed var(--border);border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:8px">
                        <span style="color:var(--text-lighter);font-size:13px">📸 点击上传做完的款式照片</span>
                    </div>
                    <input type="hidden" id="c-photo-url" value="">
                </div>
                <button class="btn btn-primary btn-block" id="c-submit">确认</button>
            </div>
        `;
        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        overlay.querySelector('.close').addEventListener('click', close);
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

        // 款式照片上传
        const photoArea = overlay.querySelector('#c-photo-area');
        const photoUrlInput = overlay.querySelector('#c-photo-url');
        photoArea.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.addEventListener('change', async () => {
                const file = input.files[0];
                if (!file) return;
                try {
                    const res = await api.upload(file);
                    photoUrlInput.value = res.url;
                    photoArea.innerHTML = `<img src="${res.url}" style="max-width:100%;max-height:200px;border-radius:6px">`;
                } catch(e) { toast('上传失败'); }
            });
            input.click();
        });

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
            const price = parseFloat(overlay.querySelector('#c-price').value) || parseFloat(svcOpt.dataset.price);

            // 次卡客户
            const useCount = cust.card_type === 'count' && overlay.querySelector('#c-use-count')?.checked;

            let payMethod, cardDeduct, cashPay;
            if (useCount) {
                if ((cust.count_remaining || 0) <= 0) {
                    toast('次卡已用完，请选择其他支付方式');
                    return;
                }
                payMethod = 'count';
                cardDeduct = 0;
                cashPay = 0;
            } else {
                payMethod = cust.card_type === 'count' ? 'cash' : (overlay.querySelector('#c-pay')?.value || 'cash');
                cardDeduct = payMethod === 'card' ? price : (payMethod === 'mixed' ? parseFloat(overlay.querySelector('#c-card-deduct')?.value) || 0 : 0);
                cashPay = price - cardDeduct;

                if (cardDeduct > (cust.balance || 0)) {
                    toast(`余额不足，当前余额 ¥${(cust.balance||0).toFixed(0)}`);
                    return;
                }
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
                photo: photoUrlInput.value,
                use_count: useCount,
            };

            try {
                await api.recordConsumption(cust.id, data);
                if (useCount) {
                    // 次卡扣次数
                    const updatedCust = { ...cust };
                    updatedCust.count_remaining = (cust.count_remaining || 0) - 1;
                    await api.updateCustomer(cust.id, { count_remaining: updatedCust.count_remaining });
                }
                toast(useCount ? '次卡消费成功（扣1次）' : '消费记录已保存');
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

/** 获取中文拼音首字母（简易版） */
function getPinyinInitial(name) {
    if (!name) return '#';
    const first = name.charAt(0);
    // 英文字母直接返回大写
    if (/[a-zA-Z]/.test(first)) return first.toUpperCase();
    // 非中文返回 #
    if (!/[\u4e00-\u9fa5]/.test(first)) return '#';

    // 基于 Unicode 范围的拼音首字母映射
    const code = first.charCodeAt(0);
    const ranges = [
        ['A', 0x963F, 0xB0B8], ['B', 0xB0C5, 0xC5FF], ['C', 0xC644, 0xD0FF],
        ['D', 0xD149, 0xDAFF], ['E', 0xDB09, 0xDFFF], ['F', 0xE00A, 0xE5FF],
        ['G', 0xE604, 0xECFF], ['H', 0xED0D, 0xF2FF], ['J', 0xF30A, 0xFAFF],
        ['K', 0xFB07, 0xFDFF], ['L', 0xFE09, 0x101FF], ['M', 0x10209, 0x107FF],
        ['N', 0x1080D, 0x10DFF], ['O', 0x10E09, 0x10F5F], ['P', 0x10F69, 0x115FF],
        ['Q', 0x1160D, 0x11BFF], ['R', 0x11C09, 0x120FF], ['S', 0x1210D, 0x128FF],
        ['T', 0x12909, 0x12FFF], ['W', 0x1300D, 0x134FF], ['X', 0x13509, 0x13BFF],
        ['Y', 0x13C0D, 0x140FF], ['Z', 0x14109, 0x146FF],
    ];

    for (const [letter, start, end] of ranges) {
        if (code >= start && code <= end) return letter;
    }
    return '#';
}
