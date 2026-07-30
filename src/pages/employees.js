/**
 * 员工管理页 - 整合员工信息、排班、工资明细
 */
import { api } from '../api.js';
import { toast, confirm } from '../auth.js';

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function renderEmployees(container) {

    container.innerHTML = `
        <div class="page">
            <div class="nav-bar">
                <span class="title">员工管理</span>
                <span class="action" id="add-employee-btn">+ 新增</span>
            </div>
            <div class="filter-bar" id="employee-tabs">
                <span class="chip active" data-tab="list">员工列表</span>
                <span class="chip" data-tab="salary">工资管理</span>
            </div>
            <div id="tab-content" class="section">
                <div class="loading"><div class="spinner"></div>加载中...</div>
            </div>
        </div>
    `;

    const tabContent = container.querySelector('#tab-content');
    let currentTab = 'list';

    // Tab 切换
    container.querySelector('#employee-tabs').addEventListener('click', (e) => {
        if (e.target.classList.contains('chip')) {
            container.querySelectorAll('#employee-tabs .chip').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            currentTab = e.target.dataset.tab;
            if (currentTab === 'list') renderEmployeeList(tabContent);
            else renderSalaryView(tabContent);
        }
    });

    container.querySelector('#add-employee-btn').addEventListener('click', () => showEmployeeEditModal(container, null, () => renderEmployeeList(tabContent)));

    renderEmployeeList(tabContent);
}

// ===================== 员工列表 =====================
async function renderEmployeeList(container) {
    container.innerHTML = '<div class="loading"><div class="spinner"></div>加载中...</div>';

    try {
        const list = await api.listTechnicians();
        if (list.length === 0) {
            container.innerHTML = `<div class="empty"><div class="icon">👩‍🎨</div><div class="text">暂无员工</div></div>`;
            return;
        }

        container.innerHTML = list.map(t => `
            <div class="card emp-card" data-id="${t.id}">
                <div class="emp-header" data-action="toggle" data-id="${t.id}">
                    <div class="emp-avatar">
                        ${t.avatar ? `<img src="${t.avatar}">` : '👩‍🎨'}
                    </div>
                    <div class="emp-info">
                        <div class="emp-name">${t.name}
                            <span class="emp-title">${t.title}</span>
                            <span class="tag tag-${t.is_active ? 'active' : 'inactive'}">${t.is_active ? '在职' : '离职'}</span>
                        </div>
                        <div class="emp-meta">
                            ${(t.salary_type === 'commission_only') ? `纯提成 ${t.commission_rate || 0}%` : `底薪 ¥${t.base_salary || 0} · 提成 ${t.commission_rate || 0}%`}
                        </div>
                    </div>
                    <span class="emp-arrow" id="arrow-${t.id}">▾</span>
                </div>
                <div class="emp-detail" id="detail-${t.id}" style="display:none">
                    <div class="emp-tabs">
                        <span class="sub-chip active" data-sub="schedule" data-emp="${t.id}">排班</span>
                        <span class="sub-chip" data-sub="salary" data-emp="${t.id}">工资</span>
                        <span class="sub-chip" data-sub="edit" data-emp="${t.id}">编辑</span>
                    </div>
                    <div class="emp-sub-content" id="sub-${t.id}"></div>
                </div>
            </div>
        `).join('');

        // 展开/折叠
        container.querySelectorAll('[data-action="toggle"]').forEach(header => {
            header.addEventListener('click', () => {
                const id = header.dataset.id;
                const detail = container.querySelector(`#detail-${id}`);
                const arrow = container.querySelector(`#arrow-${id}`);
                const isOpen = detail.style.display !== 'none';
                detail.style.display = isOpen ? 'none' : 'block';
                arrow.textContent = isOpen ? '▾' : '▴';
                if (!isOpen) {
                    // 默认加载排班
                    const scheduleChip = container.querySelector(`[data-sub="schedule"][data-emp="${id}"]`);
                    scheduleChip.click();
                }
            });
        });

        // 子Tab
        container.querySelectorAll('.sub-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.stopPropagation();
                const empId = chip.dataset.emp;
                const sub = chip.dataset.sub;
                // 高亮当前
                const parent = chip.parentElement;
                parent.querySelectorAll('.sub-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');

                const subContent = container.querySelector(`#sub-${empId}`);
                if (sub === 'schedule') renderSchedule(subContent, empId);
                else if (sub === 'salary') renderEmpSalary(subContent, empId);
                else if (sub === 'edit') {
                    const tech = list.find(t => t.id === parseInt(empId));
                    if (tech) {
                        // 需要在全局容器上弹窗
                        const appContainer = document.getElementById('app');
                        showEmployeeEditModal(appContainer, tech, () => renderEmployeeList(container));
                    }
                }
            });
        });

    } catch (e) {
        container.innerHTML = `<div class="empty"><div class="icon">⚠️</div><div class="text">加载失败</div></div>`;
    }
}

// ===================== 排班子视图 =====================
async function renderSchedule(container, empId) {
    container.innerHTML = '<div class="loading" style="padding:16px"><div class="spinner"></div></div>';

    try {
        const list = await api.listSchedules(empId);
        const scheduleMap = {};
        list.forEach(s => { scheduleMap[s.weekday] = s; });

        const days = [];
        for (let i = 0; i < 7; i++) {
            const s = scheduleMap[i] || { weekday: i, start_time: '09:00', end_time: '21:00', is_working: i < 6 ? 1 : 0 };
            days.push(s);
        }

        container.innerHTML = `
            <div class="schedule-table" id="schedule-table-${empId}">
                ${days.map(d => `
                    <div class="schedule-row" data-weekday="${d.weekday}">
                        <div class="day">${WEEKDAYS[d.weekday]}</div>
                        <div class="time-inputs">
                            <input type="time" class="start-time" value="${d.start_time}" ${!d.is_working ? 'disabled' : ''}>
                            <span>至</span>
                            <input type="time" class="end-time" value="${d.end_time}" ${!d.is_working ? 'disabled' : ''}>
                        </div>
                        <label class="switch">
                            <input type="checkbox" class="working-check" ${d.is_working ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                `).join('')}
            </div>
            <button class="btn btn-primary btn-block" id="save-schedule-${empId}" style="margin-top:10px">保存排班</button>
        `;

        // 开关联动
        container.querySelectorAll('.schedule-row').forEach(row => {
            const check = row.querySelector('.working-check');
            const inputs = row.querySelectorAll('input[type="time"]');
            check.addEventListener('change', () => {
                inputs.forEach(i => i.disabled = !check.checked);
            });
        });

        container.querySelector(`#save-schedule-${empId}`).addEventListener('click', async () => {
            const schedules = [];
            container.querySelectorAll('.schedule-row').forEach(row => {
                schedules.push({
                    weekday: parseInt(row.dataset.weekday),
                    start_time: row.querySelector('.start-time').value || '09:00',
                    end_time: row.querySelector('.end-time').value || '21:00',
                    is_working: row.querySelector('.working-check').checked,
                });
            });
            try {
                await api.updateSchedules(empId, schedules);
                toast('排班已保存');
            } catch (e) { toast('保存失败'); }
        });

    } catch (e) {
        container.innerHTML = `<div class="empty" style="padding:20px"><div class="text">加载失败</div></div>`;
    }
}

// ===================== 工资子视图 =====================
async function renderEmpSalary(container, empId) {
    container.innerHTML = '<div class="loading" style="padding:16px"><div class="spinner"></div></div>';

    try {
        const salaries = await api.getSalaries(empId);

        // 月份选择
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        container.innerHTML = `
            <div style="display:flex;gap:8px;margin-bottom:12px">
                <input type="month" id="salary-month-${empId}" value="${currentMonth}" class="form-group" style="margin:0;flex:1;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;background:#fafafa">
                <button class="btn btn-primary btn-sm" id="calc-salary-${empId}">计算工资</button>
            </div>
            <div id="salary-result-${empId}">
                ${salaries.length > 0 ? salaries.map(s => renderSalaryCard(s, empId)).join('') : '<div style="text-align:center;padding:20px;color:var(--text-light);font-size:12px">暂无工资记录</div>'}
            </div>
        `;

        container.querySelector(`#calc-salary-${empId}`).addEventListener('click', async () => {
            const month = container.querySelector(`#salary-month-${empId}`).value;
            if (!month) { toast('请选择月份'); return; }
            try {
                toast('计算中...');
                const result = await api.calculateSalary(empId, month);
                const resultDiv = container.querySelector(`#salary-result-${empId}`);
                resultDiv.innerHTML = renderSalaryCard(result, empId);
                toast('计算完成');
            } catch (e) { toast('计算失败：' + (e.message || '未知错误')); }
        });

    } catch (e) {
        container.innerHTML = `<div class="empty" style="padding:20px"><div class="text">加载失败</div></div>`;
    }
}

function renderSalaryCard(s, empId) {
    const statusMap = { pending: '未发放', paid: '已发放' };
    const statusClass = s.status === 'paid' ? 'tag-completed' : 'tag-pending';
    const isCommissionOnly = s.salary_type === 'commission_only';
    return `
        <div class="card salary-card" style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                <div style="font-weight:600;font-size:14px">${s.salary_month} 工资</div>
                <span class="tag ${statusClass}">${statusMap[s.status] || s.status}</span>
            </div>
            <div style="font-size:11px;color:var(--text-light);margin-bottom:8px">${isCommissionOnly ? `纯提成模式 · 提成比例 ${s.commission_rate || 0}%` : `底薪+提成模式 · 提成比例 ${s.commission_rate || 0}%`}</div>
            <div class="salary-rows">
                ${isCommissionOnly ? '' : `<div class="salary-row"><span>底薪</span><span>¥${(s.base_salary || 0).toFixed(0)}</span></div>`}
                <div class="salary-row"><span>服务金额</span><span>¥${(s.total_consumption || s.total_service_amount || 0).toFixed(0)}</span></div>
                <div class="salary-row"><span>提成 (${s.commission_rate || 0}%)</span><span>¥${(s.commission || 0).toFixed(0)}</span></div>
                <div class="salary-row"><span>奖金</span><span>¥${(s.bonus || 0).toFixed(0)}</span></div>
                <div class="salary-row"><span>扣款</span><span>¥${(s.deduction || 0).toFixed(0)}</span></div>
                <div class="salary-row" style="font-weight:700;border-top:1px solid #eee;padding-top:8px;margin-top:4px">
                    <span>实发合计</span><span style="font-size:16px;color:#000">¥${(s.total_salary || 0).toFixed(0)}</span>
                </div>
            </div>
            ${s.status === 'pending' ? `
            <div style="margin-top:10px;display:flex;gap:8px">
                <input type="number" id="bonus-${s.id || empId}" placeholder="调整奖金" value="${s.bonus || 0}" style="flex:1;padding:8px;border:1.5px solid var(--border);border-radius:8px;font-size:12px;width:0">
                <input type="number" id="deduction-${s.id || empId}" placeholder="调整扣款" value="${s.deduction || 0}" style="flex:1;padding:8px;border:1.5px solid var(--border);border-radius:8px;font-size:12px;width:0">
                <button class="btn btn-success btn-sm" id="mark-paid-${s.id || empId}">发放</button>
            </div>` : ''}
            ${s.remark ? `<div style="font-size:11px;color:var(--text-light);margin-top:6px">备注：${s.remark}</div>` : ''}
        </div>
    `;
}

// ===================== 全局工资管理视图 =====================
async function renderSalaryView(container) {
    container.innerHTML = '<div class="loading"><div class="spinner"></div>加载中...</div>';

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    try {
        const [technicians, salaries] = await Promise.all([
            api.listTechnicians(),
            api.allSalaries(currentMonth)
        ]);

        container.innerHTML = `
            <div style="display:flex;gap:8px;margin-bottom:14px">
                <input type="month" id="global-salary-month" value="${currentMonth}" style="flex:1;padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;background:#fafafa">
                <button class="btn btn-primary" id="global-calc-all">批量计算</button>
            </div>
            <div id="global-salary-list"></div>
        `;

        const renderGlobalList = () => {
            const listDiv = container.querySelector('#global-salary-list');
            const month = container.querySelector('#global-salary-month').value;

            if (salaries.length === 0 && technicians.length === 0) {
                listDiv.innerHTML = `<div class="empty"><div class="text">暂无数据</div></div>`;
                return;
            }

            const salaryMap = {};
            salaries.forEach(s => { salaryMap[s.technician_id] = s; });

            listDiv.innerHTML = technicians.filter(t => t.is_active).map(t => {
                const s = salaryMap[t.id];
                if (s) return renderSalaryCard(s, t.id);
                return `
                    <div class="card" style="display:flex;justify-content:space-between;align-items:center;padding:16px">
                        <div>
                            <div style="font-weight:600">${t.name}</div>
                            <div style="font-size:12px;color:var(--text-light)">${t.title || t.position || ''} · ${(t.salary_type === 'commission_only') ? `纯提成 ${t.commission_rate || 0}%` : `底薪${t.base_salary || 0} 提成${t.commission_rate || 0}%`}</div>
                        </div>
                        <button class="btn btn-outline btn-sm" data-calc-one="${t.id}">计算</button>
                    </div>
                `;
            }).join('');

            // 单个计算
            listDiv.querySelectorAll('[data-calc-one]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const techId = btn.dataset.calcOne;
                    try {
                        toast('计算中...');
                        await api.calculateSalary(techId, month);
                        // 重新加载
                        const newSalaries = await api.allSalaries(month);
                        salaries.length = 0;
                        salaries.push(...newSalaries);
                        renderGlobalList();
                        toast('计算完成');
                    } catch (e) { toast('计算失败'); }
                });
            });

            // 标记发放按钮事件
            listDiv.querySelectorAll('[id^="mark-paid-"]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const salaryId = parseInt(btn.id.replace('mark-paid-', ''));
                    const bonusInput = listDiv.querySelector(`#bonus-${salaryId}`);
                    const deductionInput = listDiv.querySelector(`#deduction-${salaryId}`);
                    const bonus = parseFloat(bonusInput?.value || 0);
                    const deduction = parseFloat(deductionInput?.value || 0);

                    // 找到对应的 salary 记录
                    const salary = salaries.find(s => s.id === salaryId);
                    if (!salary) return;

                    try {
                        await api.updateSalary(salary.technician_id, salary.salary_month, {
                            bonus, deduction, status: 'paid'
                        });
                        toast('已标记发放');
                        const newSalaries = await api.allSalaries(month);
                        salaries.length = 0;
                        salaries.push(...newSalaries);
                        renderGlobalList();
                    } catch (e) { toast('操作失败'); }
                });
            });
        };

        renderGlobalList();

        container.querySelector('#global-calc-all').addEventListener('click', async () => {
            const month = container.querySelector('#global-salary-month').value;
            if (!month) { toast('请选择月份'); return; }
            const activeTechs = technicians.filter(t => t.is_active);
            if (activeTechs.length === 0) { toast('没有在职员工'); return; }

            toast('正在批量计算...');
            try {
                for (const t of activeTechs) {
                    await api.calculateSalary(t.id, month);
                }
                const newSalaries = await api.allSalaries(month);
                salaries.length = 0;
                salaries.push(...newSalaries);
                renderGlobalList();
                toast('全部计算完成');
            } catch (e) { toast('部分计算失败'); }
        });

        // 月份切换重新加载
        container.querySelector('#global-salary-month').addEventListener('change', async () => {
            const month = container.querySelector('#global-salary-month').value;
            try {
                const newSalaries = await api.allSalaries(month);
                salaries.length = 0;
                salaries.push(...newSalaries);
                renderGlobalList();
            } catch (e) { }
        });

    } catch (e) {
        container.innerHTML = `<div class="empty"><div class="icon">⚠️</div><div class="text">加载失败</div></div>`;
    }
}

// ===================== 员工编辑弹窗 =====================
async function showEmployeeEditModal(container, tech, onSuccess) {
    const isEdit = !!tech;
    let avatarUrl = tech?.avatar || '';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>${isEdit ? '编辑员工' : '新增员工'}</h2>
                <span class="close">×</span>
            </div>
            <div class="form-group">
                <label>头像</label>
                <div class="upload-area" id="avatar-upload">
                    ${avatarUrl ? `<img src="${avatarUrl}" id="avatar-img">` : '+'}
                </div>
            </div>
            <div class="form-group">
                <label>姓名 *</label>
                <input type="text" id="t-name" value="${tech?.name || ''}" placeholder="员工姓名">
            </div>
            <div class="form-group">
                <label>手机号</label>
                <input type="text" id="t-phone" value="${tech?.phone || ''}" placeholder="手机号">
            </div>
            <div class="form-group">
                <label>职称</label>
                <input type="text" id="t-title" value="${tech?.title || ''}" placeholder="如：资深美甲师">
            </div>
            <div class="form-group">
                <label>简介</label>
                <textarea id="t-intro" placeholder="从业经验、擅长风格等">${tech?.intro || ''}</textarea>
            </div>
            <div class="form-group">
                <label>薪资模式</label>
                <select id="t-salary-type">
                    <option value="fixed" ${(!tech || tech.salary_type === 'fixed') ? 'selected' : ''}>底薪 + 提成</option>
                    <option value="commission_only" ${(tech && tech.salary_type === 'commission_only') ? 'selected' : ''}>纯提成（无底薪）</option>
                </select>
            </div>
            <div class="form-row">
                <div class="form-group" style="flex:1" id="t-base-salary-group">
                    <label>底薪</label>
                    <input type="number" id="t-base-salary" value="${tech?.base_salary ?? 3000}" placeholder="底薪">
                </div>
                <div class="form-group" style="flex:1">
                    <label>提成率(%)</label>
                    <input type="number" id="t-commission" value="${tech?.commission_rate ?? 30}" placeholder="如：50（五五分成）">
                </div>
            </div>
            ${isEdit ? `
            <div class="form-group">
                <label>状态</label>
                <select id="t-active">
                    <option value="1" ${tech.is_active ? 'selected' : ''}>在职</option>
                    <option value="0" ${!tech.is_active ? 'selected' : ''}>离职</option>
                </select>
            </div>` : ''}
            <button class="btn btn-primary btn-block" id="t-submit">${isEdit ? '保存' : '添加'}</button>
        </div>
    `;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('.close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    // 头像上传
    const uploadArea = overlay.querySelector('#avatar-upload');
    uploadArea.addEventListener('click', () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.addEventListener('change', async () => {
            const file = fileInput.files[0];
            if (!file) return;
            try {
                toast('上传中...');
                const res = await api.upload(file);
                avatarUrl = res.url;
                uploadArea.innerHTML = `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover">`;
                toast('上传成功');
            } catch (e) { toast('上传失败'); }
        });
        fileInput.click();
    });

    // 薪资模式切换联动
    const salaryTypeSelect = overlay.querySelector('#t-salary-type');
    const baseSalaryGroup = overlay.querySelector('#t-base-salary-group');
    const baseSalaryInput = overlay.querySelector('#t-base-salary');
    salaryTypeSelect.addEventListener('change', () => {
        if (salaryTypeSelect.value === 'commission_only') {
            baseSalaryGroup.style.opacity = '0.4';
            baseSalaryInput.value = '0';
            baseSalaryInput.disabled = true;
        } else {
            baseSalaryGroup.style.opacity = '1';
            baseSalaryInput.disabled = false;
            if (baseSalaryInput.value === '0') baseSalaryInput.value = '';
        }
    });
    if (tech?.salary_type === 'commission_only') {
        baseSalaryGroup.style.opacity = '0.4';
        baseSalaryInput.disabled = true;
    }

    overlay.querySelector('#t-submit').addEventListener('click', async () => {
        const salaryType = overlay.querySelector('#t-salary-type').value;
        const data = {
            name: overlay.querySelector('#t-name').value.trim(),
            phone: overlay.querySelector('#t-phone').value.trim(),
            title: overlay.querySelector('#t-title').value.trim() || '美甲师',
            intro: overlay.querySelector('#t-intro').value.trim(),
            avatar: avatarUrl,
            salary_type: salaryType,
            base_salary: parseFloat(overlay.querySelector('#t-base-salary').value) || 0,
            commission_rate: parseFloat(overlay.querySelector('#t-commission').value) || 0,
        };
        if (!data.name) { toast('请输入姓名'); return; }
        if (isEdit) {
            data.is_active = parseInt(overlay.querySelector('#t-active').value);
        }
        try {
            if (isEdit) {
                await api.updateTechnician(tech.id, data);
                toast('修改成功');
            } else {
                await api.createTechnician(data);
                toast('添加成功');
            }
            close();
            onSuccess();
        } catch (e) { toast('操作失败'); }
    });
}
