/**
 * 会员扣卡页 - 快速搜索客户，一键扣卡
 */
import { api } from '../api.js';
import { toast } from '../auth.js';

export function renderCardDeduct(container) {
    let allCustomers = [];
    let selectedCustomer = null;

    container.innerHTML = `
        <div class="page">
            <div class="nav-bar"><span class="title">会员扣卡</span></div>
            <div class="section">
                <!-- 搜索区 -->
                <div style="position:relative;margin-bottom:14px">
                    <input type="text" id="search-input" placeholder="🔍 输入手机尾号或客户姓名" autocomplete="off"
                        style="width:100%;padding:14px 16px;border:2px solid var(--border);border-radius:14px;font-size:16px;background:#fff;outline:none;transition:border-color 0.2s">
                    <div id="search-dropdown" style="display:none;position:absolute;top:100%;left:0;right:0;max-height:240px;overflow-y:auto;background:#fff;border:1.5px solid var(--border);border-radius:12px;z-index:100;box-shadow:0 4px 20px rgba(0,0,0,0.08);margin-top:4px"></div>
                </div>

                <!-- 选中客户卡片 -->
                <div id="customer-card" style="display:none">
                    <div class="card" style="padding:20px;margin-bottom:14px;border:2px solid var(--latte);background:linear-gradient(135deg,#fff,var(--latte-light))">
                        <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">
                            <div style="width:56px;height:56px;border-radius:50%;background:var(--text);color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;flex-shrink:0" id="card-avatar">客</div>
                            <div style="flex:1">
                                <div style="font-size:18px;font-weight:700" id="card-name">—</div>
                                <div style="font-size:13px;color:var(--text-light);margin-top:2px" id="card-phone">—</div>
                            </div>
                            <button id="clear-customer" style="background:none;border:none;font-size:20px;color:var(--text-lighter);cursor:pointer;padding:4px">✕</button>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
                            <div id="card-balance-box" style="background:rgba(255,255,255,0.7);border-radius:12px;padding:14px;text-align:center">
                                <div style="font-size:11px;color:var(--text-light)">💰 储值余额</div>
                                <div style="font-size:24px;font-weight:700;color:var(--text)" id="card-balance">¥0</div>
                            </div>
                            <div id="card-count-box" style="background:rgba(255,255,255,0.7);border-radius:12px;padding:14px;text-align:center">
                                <div style="font-size:11px;color:var(--text-light)">🎫 剩余次数</div>
                                <div style="font-size:24px;font-weight:700;color:var(--text)" id="card-count">0次</div>
                            </div>
                        </div>
                    </div>

                    <!-- 扣卡操作区 -->
                    <div class="card" style="padding:18px;margin-bottom:14px">
                        <div style="font-size:13px;font-weight:600;margin-bottom:12px;color:var(--text-secondary)">本次消费</div>

                        <!-- 快速金额按钮 -->
                        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px" id="quick-amounts"></div>

                        <div class="form-group" style="margin-bottom:12px">
                            <label>自定义金额</label>
                            <input type="number" id="deduct-amount" placeholder="输入金额" style="width:100%;padding:14px;border:2px solid var(--border);border-radius:12px;font-size:18px;font-weight:600;text-align:center;background:#fff">
                        </div>

                        <!-- 次卡扣次 -->
                        <div id="count-deduct-row" style="display:none;margin-bottom:12px">
                            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:var(--text-secondary)">
                                <input type="checkbox" id="use-count-card" style="width:18px;height:18px;accent-color:var(--text)">
                                使用次卡（扣 1 次）
                            </label>
                        </div>

                        <div class="form-group" style="margin-bottom:12px">
                            <label>美甲师</label>
                            <select id="deduct-tech" style="width:100%;padding:12px 14px;border:1.5px solid var(--border);border-radius:12px;font-size:14px;background:#fff"></select>
                        </div>

                        <div class="form-group" style="margin-bottom:14px">
                            <label>备注</label>
                            <input type="text" id="deduct-remark" placeholder="款式、颜色等" style="width:100%;padding:12px 14px;border:1.5px solid var(--border);border-radius:12px;font-size:14px;background:#fff">
                        </div>

                        <div class="form-group" style="margin-bottom:14px">
                            <label>款式照片</label>
                            <div id="deduct-photo-area" style="width:100%;min-height:70px;border:2px dashed var(--border);border-radius:12px;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:10px;background:#fafafa;transition:border-color 0.2s">
                                <span style="color:var(--text-lighter);font-size:13px">📸 点击上传做完的款式照片</span>
                            </div>
                            <input type="hidden" id="deduct-photo-url" value="">
                        </div>

                        <button class="btn btn-primary btn-block" id="deduct-submit" style="padding:16px;font-size:16px;font-weight:700;border-radius:14px">✅ 确认扣卡</button>
                    </div>
                </div>

                <!-- 未选客户提示 -->
                <div id="no-customer-hint" style="text-align:center;padding:60px 20px;color:var(--text-lighter)">
                    <div style="font-size:56px;margin-bottom:16px">💳</div>
                    <div style="font-size:15px">输入手机尾号或姓名搜索会员</div>
                </div>
            </div>
        </div>
    `;

    // 加载数据
    (async () => {
        try {
            allCustomers = await api.listCustomers('');
            const techs = await api.listTechnicians(true);
            container.querySelector('#deduct-tech').innerHTML = techs.map(t => `<option value="${t.id}" data-name="${t.name}">${t.name}</option>`).join('');

            // 快捷金额
            const amounts = [58, 88, 128, 168, 198, 258, 298, 388];
            container.querySelector('#quick-amounts').innerHTML = amounts.map(a =>
                `<button class="quick-amount-btn" data-amount="${a}" style="padding:12px 6px;border:1.5px solid var(--border);border-radius:12px;background:#fff;font-size:14px;font-weight:600;color:var(--text);cursor:pointer;transition:all 0.15s">¥${a}</button>`
            ).join('');
        } catch (e) { toast('数据加载失败'); }
    })();

    // ===== 搜索 =====
    const searchInput = container.querySelector('#search-input');
    const dropdown = container.querySelector('#search-dropdown');

    searchInput.addEventListener('focus', () => doSearch());
    searchInput.addEventListener('input', () => doSearch());

    function doSearch() {
        const q = searchInput.value.trim().toLowerCase();
        if (!q) {
            // 显示最近会员
            const members = allCustomers.filter(c => c.is_member).slice(0, 6);
            if (members.length === 0) { dropdown.style.display = 'none'; return; }
            renderDropdown(members);
            return;
        }
        const results = allCustomers
            .filter(c => c.is_member && (c.name.toLowerCase().includes(q) || c.phone.includes(q)))
            .slice(0, 8);
        if (results.length === 0) {
            dropdown.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-lighter);font-size:13px">未找到匹配会员</div>';
            dropdown.style.display = 'block';
            return;
        }
        renderDropdown(results);
    }

    function renderDropdown(customers) {
        dropdown.innerHTML = customers.map(c => `
            <div class="search-result-item" data-id="${c.id}"
                style="padding:14px 16px;cursor:pointer;border-bottom:1px solid #f5f5f5;display:flex;justify-content:space-between;align-items:center;transition:background 0.1s">
                <div>
                    <div style="font-size:15px;font-weight:600">${c.name}</div>
                    <div style="font-size:12px;color:var(--text-light);margin-top:2px">📱 ${c.phone}</div>
                </div>
                <div style="text-align:right">
                    <div style="font-size:15px;font-weight:700">¥${parseFloat(c.balance || 0).toFixed(0)}</div>
                    ${c.card_type === 'count' ? `<div style="font-size:11px;color:var(--text-light)">剩余${c.count_remaining || 0}次</div>` : ''}
                </div>
            </div>
        `).join('');
        dropdown.style.display = 'block';

        dropdown.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.dataset.id);
                selectCustomer(id);
                dropdown.style.display = 'none';
                searchInput.value = '';
            });
        });
    }

    // 点击外部关闭下拉
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) dropdown.style.display = 'none';
    });

    // ===== 选中客户 =====
    function selectCustomer(id) {
        selectedCustomer = allCustomers.find(c => c.id === id);
        if (!selectedCustomer) return;

        container.querySelector('#customer-card').style.display = 'block';
        container.querySelector('#no-customer-hint').style.display = 'none';
        container.querySelector('#card-name').textContent = selectedCustomer.name;
        container.querySelector('#card-phone').textContent = selectedCustomer.phone;
        container.querySelector('#card-avatar').textContent = selectedCustomer.name.charAt(0);
        container.querySelector('#card-balance').textContent = `¥${parseFloat(selectedCustomer.balance || 0).toFixed(0)}`;
        container.querySelector('#card-count').textContent = `${selectedCustomer.count_remaining || 0}次`;

        // 次卡扣次显示
        const isCountCard = selectedCustomer.card_type === 'count';
        container.querySelector('#count-deduct-row').style.display = isCountCard ? 'block' : 'none';
        container.querySelector('#card-count-box').style.display = isCountCard ? 'block' : 'none';
        container.querySelector('#card-balance-box').style.display = isCountCard ? 'none' : 'block';

        // 次卡模式默认勾选
        if (isCountCard) {
            container.querySelector('#use-count-card').checked = true;
            container.querySelector('#deduct-amount').disabled = true;
            container.querySelector('#deduct-amount').value = '';
        } else {
            container.querySelector('#deduct-amount').disabled = false;
        }

        container.querySelector('#deduct-amount').value = '';
        container.querySelector('#deduct-remark').value = '';
    }

    // 清除选中
    container.querySelector('#clear-customer').addEventListener('click', () => {
        selectedCustomer = null;
        container.querySelector('#customer-card').style.display = 'none';
        container.querySelector('#no-customer-hint').style.display = 'block';
        container.querySelector('#deduct-amount').value = '';
        container.querySelector('#deduct-remark').value = '';
    });

    // 次卡勾选联动
    container.querySelector('#use-count-card').addEventListener('change', function () {
        container.querySelector('#deduct-amount').disabled = this.checked;
        if (this.checked) container.querySelector('#deduct-amount').value = '';
    });

    // ===== 快捷金额 =====
    container.querySelector('#quick-amounts').addEventListener('click', (e) => {
        if (e.target.classList.contains('quick-amount-btn')) {
            const amount = e.target.dataset.amount;
            container.querySelector('#deduct-amount').value = amount;
            // 高亮选中
            container.querySelectorAll('.quick-amount-btn').forEach(b => {
                b.style.background = '#fff';
                b.style.borderColor = 'var(--border)';
            });
            e.target.style.background = 'var(--text)';
            e.target.style.color = '#fff';
            e.target.style.borderColor = 'var(--text)';
        }
    });

    // ===== 照片上传 =====
    container.querySelector('#deduct-photo-area').addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.addEventListener('change', async () => {
            const file = input.files[0];
            if (!file) return;
            try {
                const res = await api.upload(file);
                container.querySelector('#deduct-photo-url').value = res.url;
                container.querySelector('#deduct-photo-area').innerHTML = `<img src="${res.url}" style="max-width:100%;max-height:200px;border-radius:8px">`;
            } catch (e) { toast('上传失败'); }
        });
        input.click();
    });

    // ===== 提交扣卡 =====
    container.querySelector('#deduct-submit').addEventListener('click', async () => {
        if (!selectedCustomer) { toast('请先搜索并选择会员'); return; }

        const techSel = container.querySelector('#deduct-tech');
        const useCount = container.querySelector('#use-count-card').checked;
        const amount = parseFloat(container.querySelector('#deduct-amount').value) || 0;
        const remark = container.querySelector('#deduct-remark').value.trim();
        const photoUrl = container.querySelector('#deduct-photo-url').value;

        if (!useCount && amount <= 0) { toast('请输入扣卡金额'); return; }
        if (!useCount && amount > selectedCustomer.balance) { toast(`余额不足！当前余额 ¥${selectedCustomer.balance}`); return; }
        if (useCount && (selectedCustomer.count_remaining || 0) <= 0) { toast('次卡次数已用完'); return; }

        const confirmMsg = useCount
            ? `确认为 ${selectedCustomer.name} 扣除 1 次服务吗？剩余 ${(selectedCustomer.count_remaining || 1) - 1} 次`
            : `确认为 ${selectedCustomer.name} 扣卡 ¥${amount} 吗？`;

        if (!confirm(confirmMsg)) return;

        try {
            await api.recordConsumption(selectedCustomer.id, {
                customer_name: selectedCustomer.name,
                customer_phone: selectedCustomer.phone,
                service_name: '',
                service_price: useCount ? 0 : amount,
                amount: useCount ? 0 : amount,
                technician_id: parseInt(techSel.value) || 0,
                technician_name: techSel.options[techSel.selectedIndex]?.dataset?.name || '',
                pay_method: 'card',
                card_deduct: useCount ? 0 : amount,
                cash_pay: 0,
                use_count_card: useCount,
                remark,
                photo: photoUrl,
            });
            toast('扣卡成功');

            // 刷新余额
            const updated = await api.getCustomer(selectedCustomer.id);
            const idx = allCustomers.findIndex(c => c.id === selectedCustomer.id);
            if (idx >= 0) allCustomers[idx] = updated;
            selectedCustomer = updated;

            container.querySelector('#card-balance').textContent = `¥${parseFloat(updated.balance || 0).toFixed(0)}`;
            container.querySelector('#card-count').textContent = `${updated.count_remaining || 0}次`;
            container.querySelector('#deduct-amount').value = '';
            container.querySelector('#deduct-remark').value = '';
            container.querySelector('#deduct-photo-url').value = '';
            container.querySelector('#deduct-photo-area').innerHTML = '<span style="color:var(--text-lighter);font-size:13px">📸 点击上传做完的款式照片</span>';
            // 重置快捷按钮
            container.querySelectorAll('.quick-amount-btn').forEach(b => {
                b.style.background = '#fff';
                b.style.color = 'var(--text)';
                b.style.borderColor = 'var(--border)';
            });
        } catch (e) { toast('扣卡失败'); }
    });

    // 初始加载时显示最近会员
    setTimeout(() => {
        if (allCustomers.length > 0) doSearch();
    }, 300);
}
