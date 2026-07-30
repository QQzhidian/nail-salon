/**
 * 预约管理页 - 日历视图
 */
import { api } from '../api.js';
import { toast } from '../auth.js';

const STATUS_MAP = { pending: '待确认', confirmed: '已确认', completed: '已完成', cancelled: '已取消' };
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export function renderAppointments(container) {
    let currentDate = new Date();
    let selectedDate = new Date().toISOString().slice(0, 10);

    container.innerHTML = `
        <div class="page">
            <div class="nav-bar">
                <span class="title">预约管理</span>
                <span class="action" id="add-btn">+ 新增</span>
            </div>
            <div class="section">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
                    <button class="btn btn-sm btn-outline" id="prev-month">‹</button>
                    <div style="font-size:16px;font-weight:600" id="month-label"></div>
                    <button class="btn btn-sm btn-outline" id="next-month">›</button>
                </div>
                <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;text-align:center;margin-bottom:8px;font-size:12px;color:var(--text-light)">
                    ${WEEKDAYS.map(d => `<div>${d}</div>`).join('')}
                </div>
                <div id="calendar-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px"></div>
                <div id="day-appointments" style="margin-top:20px"></div>
            </div>
        </div>
    `;

    async function renderCalendar() {
        const grid = container.querySelector('#calendar-grid');
        const label = container.querySelector('#month-label');
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        label.textContent = `${year}年${month + 1}月`;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date().toISOString().slice(0, 10);

        // 获取当月所有预约
        const monthStr = String(month + 1).padStart(2, '0');
        const allAppointments = await api.listAppointments({
            date_from: `${year}-${monthStr}-01`,
            date_to: `${year}-${monthStr}-${daysInMonth}`,
        });

        const apptMap = {};
        allAppointments.forEach(a => {
            apptMap[a.appointment_date] = (apptMap[a.appointment_date] || 0) + 1;
        });

        let html = '';
        for (let i = 0; i < firstDay; i++) {
            html += `<div style="min-height:44px"></div>`;
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${monthStr}-${String(day).padStart(2, '0')}`;
            const hasAppt = apptMap[dateStr] > 0;
            const isToday = dateStr === today;
            const isSelected = selectedDate === dateStr;
            html += `
                <div class="calendar-day" data-date="${dateStr}"
                     style="min-height:44px;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;font-size:14px;font-weight:500;border:1.5px solid ${isSelected ? 'var(--primary)' : 'transparent'};background:${isSelected ? 'var(--primary)' : (isToday ? 'var(--bg)' : '#fff')};color:${isSelected ? '#fff' : 'var(--text)'};box-shadow:0 1px 3px rgba(0,0,0,0.05)">
                    <span>${day}</span>
                    ${hasAppt ? `<span style="width:4px;height:4px;border-radius:50%;background:${isSelected ? '#fff' : 'var(--primary)'};margin-top:3px"></span>` : ''}
                </div>
            `;
        }
        grid.innerHTML = html;

        grid.querySelectorAll('.calendar-day').forEach(el => {
            el.addEventListener('click', () => {
                selectedDate = el.dataset.date;
                renderCalendar();
                renderDayAppointments(selectedDate);
            });
        });
    }

    async function renderDayAppointments(dateStr) {
        const dayEl = container.querySelector('#day-appointments');
        dayEl.innerHTML = '<div class="loading"><div class="spinner"></div>加载中...</div>';
        try {
            const list = await api.listAppointments({ date: dateStr });
            const dateObj = new Date(dateStr);
            const dateText = `${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;

            dayEl.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                    <span style="font-size:15px;font-weight:600">${dateText} 预约</span>
                    <button class="btn btn-primary btn-sm" id="add-day-btn">+ 添加</button>
                </div>
                ${list.length === 0 ? '<div class="card" style="text-align:center;padding:24px;color:var(--text-lighter)">暂无预约</div>' : list.map(a => `
                    <div class="card" data-id="${a.id}" style="margin-bottom:10px">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start">
                            <div style="flex:1">
                                <div style="font-size:15px;font-weight:600">${a.appointment_time} · ${a.customer_name}</div>
                                <div style="font-size:12px;color:var(--text-light);margin-top:2px">📱 ${a.customer_phone}</div>
                            </div>
                            <span class="tag tag-${a.status}">${STATUS_MAP[a.status]}</span>
                        </div>
                        ${a.photo ? `<img src="${a.photo}" style="max-width:80px;max-height:80px;border-radius:6px;margin-top:8px;cursor:pointer" onclick="this.requestFullscreen?.()">` : ''}
                        <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
                            ${a.status === 'pending' ? `<button class="btn btn-info btn-sm" data-action="confirm" data-id="${a.id}">确认</button>` : ''}
                            ${a.status === 'confirmed' ? `<button class="btn btn-success btn-sm" data-action="complete" data-id="${a.id}">完成</button>` : ''}
                            ${(a.status === 'pending' || a.status === 'confirmed') ? `<button class="btn btn-danger btn-sm" data-action="cancel" data-id="${a.id}">取消</button>` : ''}
                            <button class="btn btn-outline btn-sm" data-action="delete" data-id="${a.id}">删除</button>
                        </div>
                    </div>
                `).join('')}
            `;

            dayEl.querySelector('#add-day-btn')?.addEventListener('click', () => showAddModal(container, dateStr, () => {
                renderCalendar();
                renderDayAppointments(dateStr);
            }));

            dayEl.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const id = parseInt(btn.dataset.id);
                    const action = btn.dataset.action;

                    if (action === 'delete') {
                        if (!confirm('确定删除此预约？')) return;
                        try { await api.deleteAppointment(id); toast('已删除'); }
                        catch(e) { toast('删除失败'); }
                    } else {
                        const statusMap = { confirm: 'confirmed', complete: 'completed', cancel: 'cancelled' };
                        try { await api.updateAppointmentStatus(id, statusMap[action]); toast('操作成功'); }
                        catch(e) { toast('操作失败'); }
                    }
                    renderCalendar();
                    renderDayAppointments(dateStr);
                });
            });
        } catch(e) { dayEl.innerHTML = `<div class="empty"><div class="text">加载失败</div></div>`; }
    }

    container.querySelector('#prev-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });
    container.querySelector('#next-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });
    container.querySelector('#add-btn').addEventListener('click', () => {
        showAddModal(container, selectedDate, () => {
            renderCalendar();
            if (selectedDate) renderDayAppointments(selectedDate);
        });
    });

    renderCalendar();
    renderDayAppointments(selectedDate);
}

async function showAddModal(container, dateStr, onSuccess) {
    try {
        const customers = await api.listCustomers('');

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal" style="max-width:420px">
                <div class="modal-header"><h2>新增预约</h2><span class="close">×</span></div>

                <div class="form-group" style="position:relative">
                    <label>客户姓名 *</label>
                    <input type="text" id="m-name" placeholder="输入姓名或手机号搜索客户" autocomplete="off">
                    <div id="m-cust-dropdown" style="display:none;position:absolute;top:100%;left:0;right:0;max-height:160px;overflow-y:auto;background:#fff;border:1px solid var(--border);border-radius:8px;z-index:100;box-shadow:0 4px 16px rgba(0,0,0,0.1)"></div>
                </div>
                <div class="form-group"><label>手机号 *</label><input type="tel" id="m-phone" placeholder="选中客户自动填充" maxlength="11"></div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
                    <div class="form-group"><label>日期</label><input type="date" id="m-date" value="${dateStr}"></div>
                    <div class="form-group"><label>时间</label><input type="time" id="m-time" value="14:00"></div>
                </div>

                <div class="form-group">
                    <label>款式参考图</label>
                    <div id="m-photo-area" style="width:100%;min-height:80px;border:2px dashed var(--border);border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:8px">
                        <span style="color:var(--text-lighter);font-size:13px">📸 点击上传客户想做的款式图</span>
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

        // 照片上传
        overlay.querySelector('#m-photo-area').addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.addEventListener('change', async () => {
                const file = input.files[0];
                if (!file) return;
                try {
                    toast('上传中...');
                    const res = await api.upload(file);
                    overlay.querySelector('#m-photo-url').value = res.url;
                    overlay.querySelector('#m-photo-area').innerHTML = `<img src="${res.url}" style="max-width:100%;max-height:200px;border-radius:6px">`;
                } catch(e) { toast('上传失败'); }
            });
            input.click();
        });

        // 客户搜索
        const nameInput = overlay.querySelector('#m-name');
        const phoneInput = overlay.querySelector('#m-phone');
        const dropdown = overlay.querySelector('#m-cust-dropdown');

        nameInput.addEventListener('input', () => {
            const q = nameInput.value.toLowerCase().trim();
            if (!q) { dropdown.style.display = 'none'; return; }
            const results = customers
                .filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q))
                .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
                .slice(0, 8);
            if (results.length === 0) { dropdown.style.display = 'none'; return; }

            dropdown.innerHTML = results.map(c => `
                <div style="padding:10px 14px;cursor:pointer;font-size:13px;border-bottom:1px solid #f0f0f0;display:flex;justify-content:space-between;align-items:center"
                     data-name="${c.name}" data-phone="${c.phone}">
                    <span style="font-weight:500">${c.name}</span>
                    <span style="color:var(--text-light);font-size:12px">${c.phone}</span>
                </div>
            `).join('');
            dropdown.style.display = 'block';

            dropdown.querySelectorAll('div[data-name]').forEach(item => {
                item.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    nameInput.value = item.dataset.name;
                    phoneInput.value = item.dataset.phone;
                    dropdown.style.display = 'none';
                });
            });
        });

        overlay.querySelector('#m-submit').addEventListener('click', async () => {
            const data = {
                customer_name: nameInput.value.trim(),
                customer_phone: phoneInput.value.trim(),
                appointment_date: overlay.querySelector('#m-date').value,
                appointment_time: overlay.querySelector('#m-time').value,
                photo: overlay.querySelector('#m-photo-url').value,
                service_name: '',
                technician_name: '',
            };
            if (!data.customer_name || !data.customer_phone) { toast('请填写客户信息'); return; }
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
