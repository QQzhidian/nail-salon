/**
 * 预约管理页
 */
import { api } from '../api.js';
import { toast, confirm } from '../auth.js';

const STATUS_MAP = { pending: '待确认', confirmed: '已确认', completed: '已完成', cancelled: '已取消' };

export function renderAppointments(container) {
    let currentStatus = '';
    let currentDate = '';
    
    container.innerHTML = `
        <div class="page">
            <div class="nav-bar">
                <span class="title">预约管理</span>
                <span class="action" id="add-btn">+ 新增</span>
            </div>
            <div class="search-bar">
                <input type="date" id="date-filter" value="" style="margin-bottom:8px">
            </div>
            <div class="filter-bar" id="status-filter">
                <span class="chip active" data-status="">全部</span>
                <span class="chip" data-status="pending">待确认</span>
                <span class="chip" data-status="confirmed">已确认</span>
                <span class="chip" data-status="completed">已完成</span>
                <span class="chip" data-status="cancelled">已取消</span>
            </div>
            <div id="list" class="section">
                <div class="loading"><div class="spinner"></div>加载中...</div>
            </div>
        </div>
    `;
    
    const listEl = container.querySelector('#list');
    
    async function loadList() {
        listEl.innerHTML = '<div class="loading"><div class="spinner"></div>加载中...</div>';
        try {
            const params = {};
            if (currentStatus) params.status = currentStatus;
            if (currentDate) params.date = currentDate;
            const res = await api.listAppointments(params);
            
            if (res.length === 0) {
                listEl.innerHTML = `<div class="empty"><div class="icon">📭</div><div class="text">暂无预约</div></div>`;
                return;
            }
            
            listEl.innerHTML = res.map(a => `
                <div class="card" data-id="${a.id}">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
                        <div>
                            <div style="font-size:15px;font-weight:600">${a.customer_name}</div>
                            <div style="font-size:12px;color:var(--text-light)">${a.customer_phone}</div>
                        </div>
                        <span class="tag tag-${a.status}">${STATUS_MAP[a.status]}</span>
                    </div>
                    <div style="font-size:13px;color:var(--text);margin-bottom:6px">
                        📅 ${a.appointment_date} ${a.appointment_time}
                    </div>
                    <div style="font-size:13px;color:var(--text-light)">
                        💅 ${a.service_name || ''} · 👩‍🎨 ${a.technician_name || '未指定'}
                        ${a.service_price ? ` · ¥${a.service_price}` : ''}
                    </div>
                    ${a.photo ? `<div style="margin-top:6px"><img src="${a.photo}" style="max-width:100px;max-height:100px;border-radius:6px;cursor:pointer;border:1px solid var(--border)" onclick="event.stopPropagation();this.requestFullscreen?.()"></div>` : ''}
                    ${a.notes ? `<div style="font-size:12px;color:var(--text-light);margin-top:6px;padding:6px 8px;background:var(--bg);border-radius:6px">备注：${a.notes}</div>` : ''}
                    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
                        ${a.status === 'pending' ? `<button class="btn btn-info btn-sm" data-action="confirm" data-id="${a.id}">确认</button>` : ''}
                        ${a.status === 'confirmed' ? `<button class="btn btn-success btn-sm" data-action="complete" data-id="${a.id}">完成</button>` : ''}
                        ${(a.status === 'pending' || a.status === 'confirmed') ? `<button class="btn btn-danger btn-sm" data-action="cancel" data-id="${a.id}">取消</button>` : ''}
                        <button class="btn btn-outline btn-sm" data-action="delete" data-id="${a.id}">删除</button>
                    </div>
                </div>
            `).join('');
            
            // 绑定操作按钮
            listEl.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const id = parseInt(btn.dataset.id);
                    const action = btn.dataset.action;
                    
                    const actionMap = {
                        confirm: { status: 'confirmed', msg: '确认此预约？' },
                        complete: { status: 'completed', msg: '标记为已完成？' },
                        cancel: { status: 'cancelled', msg: '确定取消此预约？' },
                    };
                    
                    if (action === 'delete') {
                        if (!confirm('确定删除此预约记录？此操作不可撤销。')) return;
                        try {
                            await api.deleteAppointment(id);
                            toast('已删除');
                            loadList();
                        } catch(e) { toast('操作失败'); }
                        return;
                    }
                    
                    const conf = actionMap[action];
                    if (!confirm(conf.msg)) return;
                    try {
                        await api.updateAppointmentStatus(id, conf.status);
                        toast('操作成功');
                        loadList();
                    } catch(e) { toast('操作失败'); }
                });
            });
            
        } catch(e) {
            listEl.innerHTML = `<div class="empty"><div class="icon">⚠️</div><div class="text">加载失败</div></div>`;
        }
    }
    
    // 状态筛选
    container.querySelectorAll('#status-filter .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            container.querySelectorAll('#status-filter .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentStatus = chip.dataset.status;
            loadList();
        });
    });
    
    // 日期筛选
    container.querySelector('#date-filter').addEventListener('change', (e) => {
        currentDate = e.target.value;
        loadList();
    });
    
    // 新增预约
    container.querySelector('#add-btn').addEventListener('click', () => {
        showAddModal(container, loadList);
    });
    
    loadList();
}

async function showAddModal(container, onSuccess) {
    try {
        const [technicians, services, customers] = await Promise.all([
            api.listTechnicians(true),
            api.listServices(true),
            api.listCustomers(''),
        ]);

        const now = new Date();
        const today = now.toISOString().split('T')[0];

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal" style="max-width:420px">
                <div class="modal-header">
                    <h2>新增预约</h2>
                    <span class="close">×</span>
                </div>
                <div class="form-group" style="position:relative">
                    <label>搜索客户</label>
                    <input type="text" id="m-search" placeholder="输入姓名或手机号搜索已有客户…" autocomplete="off">
                    <div id="m-cust-dropdown" style="display:none;position:absolute;top:100%;left:0;right:0;max-height:180px;overflow-y:auto;background:#fff;border:1px solid var(--border);border-radius:8px;z-index:100;box-shadow:0 4px 16px rgba(0,0,0,0.1)"></div>
                </div>
                <div class="form-group">
                    <label>客户姓名</label>
                    <input type="text" id="m-name" placeholder="选中客户自动填充">
                </div>
                <div class="form-group">
                    <label>手机号</label>
                    <input type="tel" id="m-phone" placeholder="选中客户自动填充" maxlength="11">
                </div>
                <div class="form-group">
                    <label>服务项目</label>
                    <select id="m-service">
                        ${services.map(s => `<option value="${s.id}">${s.name} - ¥${s.price} (${s.duration}分钟)</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>美甲师</label>
                    <select id="m-tech">
                        ${technicians.map(t => `<option value="${t.id}">${t.name} - ${t.position || ''}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>预约日期</label>
                    <input type="date" id="m-date" value="${today}">
                </div>
                <div class="form-group">
                    <label>预约时间</label>
                    <input type="time" id="m-time" value="14:00">
                </div>
                <div class="form-group">
                    <label>备注</label>
                    <textarea id="m-remark" placeholder="可选"></textarea>
                </div>
                <div class="form-group">
                    <label>客户想要做的款式图</label>
                    <div id="m-photo-area" style="width:100%;min-height:60px;border:2px dashed var(--border);border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:8px">
                        <span style="color:var(--text-lighter);font-size:13px">📸 点击上传客户想要的款式照片</span>
                    </div>
                    <input type="hidden" id="m-photo-url" value="">
                </div>
                <button class="btn btn-primary btn-block" id="m-submit">提交预约</button>
            </div>
        `;
        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        overlay.querySelector('.close').addEventListener('click', close);
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

        // 款式照片上传
        overlay.querySelector('#m-photo-area').addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.addEventListener('change', async () => {
                const file = input.files[0];
                if (!file) return;
                try {
                    const res = await api.upload(file);
                    overlay.querySelector('#m-photo-url').value = res.url;
                    overlay.querySelector('#m-photo-area').innerHTML = `<img src="${res.url}" style="max-width:100%;max-height:200px;border-radius:6px">`;
                } catch(e) { toast('上传失败'); }
            });
            input.click();
        });

        // 客户搜索下拉
        const searchInput = overlay.querySelector('#m-search');
        const dropdown = overlay.querySelector('#m-cust-dropdown');
        const nameInput = overlay.querySelector('#m-name');
        const phoneInput = overlay.querySelector('#m-phone');

        function filterCustomers(query) {
            const q = query.toLowerCase().trim();
            if (!q) return [];
            // 按姓氏拼音排序（中文默认按 Unicode 排序基本就是拼音序）
            return customers
                .filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q))
                .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
                .slice(0, 8);
        }

        function selectCustomer(c) {
            nameInput.value = c.name;
            phoneInput.value = c.phone;
            searchInput.value = `${c.name} · ${c.phone}`;
            dropdown.style.display = 'none';
        }

        searchInput.addEventListener('input', () => {
            const results = filterCustomers(searchInput.value);
            if (results.length === 0) {
                dropdown.style.display = 'none';
                return;
            }
            dropdown.innerHTML = results.map(c => `
                <div style="padding:10px 14px;cursor:pointer;font-size:13px;border-bottom:1px solid #f0f0f0;display:flex;justify-content:space-between;align-items:center"
                     data-cust-id="${c.id}" data-cust-name="${c.name}" data-cust-phone="${c.phone}">
                    <span style="font-weight:500">${c.name}</span>
                    <span style="color:var(--text-light);font-size:12px">📱 ${c.phone}</span>
                </div>
            `).join('');
            dropdown.style.display = 'block';

            dropdown.querySelectorAll('div[data-cust-id]').forEach(item => {
                item.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    selectCustomer({
                        name: item.dataset.custName,
                        phone: item.dataset.custPhone
                    });
                });
            });
        });

        // 点击其他地方关闭下拉
        document.addEventListener('click', function closeDropdown(e) {
            if (!overlay.contains(e.target)) dropdown.style.display = 'none';
        }, { once: true });

        overlay.querySelector('#m-submit').addEventListener('click', async () => {
            const serviceId = parseInt(overlay.querySelector('#m-service').value);
            const techId = parseInt(overlay.querySelector('#m-tech').value);
            const serviceOpt = overlay.querySelector('#m-service').selectedOptions[0];
            const techOpt = overlay.querySelector('#m-tech').selectedOptions[0];
            const data = {
                customer_name: nameInput.value.trim(),
                customer_phone: phoneInput.value.trim(),
                service_id: serviceId,
                service_name: serviceOpt ? serviceOpt.text.split(' - ')[0] : '',
                technician_id: techId,
                technician_name: techOpt ? techOpt.text.split(' - ')[0] : '',
                appointment_date: overlay.querySelector('#m-date').value,
                appointment_time: overlay.querySelector('#m-time').value,
                notes: overlay.querySelector('#m-remark').value.trim(),
                photo: overlay.querySelector('#m-photo-url').value,
            };
            if (!data.customer_name || !data.customer_phone) { toast('请选择或输入客户信息'); return; }
            if (!/^1\d{10}$/.test(data.customer_phone)) { toast('手机号格式不正确'); return; }
            try {
                await api.createAppointment(data);
                toast('预约创建成功');
                close();
                onSuccess();
            } catch(e) { toast('创建失败'); }
        });
    } catch(e) { toast('加载失败'); }
}
