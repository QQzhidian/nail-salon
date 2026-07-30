/**
 * 排班管理页
 */
import { api } from '../api.js';
import { auth, toast } from '../auth.js';

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export async function renderSchedules(container) {
    if (!auth.isLoggedIn()) { location.hash = '#/login'; return; }
    
    container.innerHTML = `
        <div class="page">
            <div class="nav-bar">
                <span class="back" data-route="#/dashboard">‹</span>
                <span class="title">排班管理</span>
            </div>
            <div class="section">
                <div class="form-group">
                    <label>选择美甲师</label>
                    <select id="tech-select"></select>
                </div>
            </div>
            <div id="schedule-area" class="section">
                <div class="loading"><div class="spinner"></div>加载中...</div>
            </div>
        </div>
    `;
    
    let technicians = [];
    let currentTechId = 0;
    
    try {
        technicians = await api.listTechnicians();
        const sel = container.querySelector('#tech-select');
        sel.innerHTML = technicians.map(t => `<option value="${t.id}">${t.name} - ${t.title}</option>`).join('');
        
        currentTechId = technicians[0]?.id || 0;
        sel.addEventListener('change', () => {
            currentTechId = parseInt(sel.value);
            loadSchedule();
        });
        
        if (currentTechId) loadSchedule();
        else container.querySelector('#schedule-area').innerHTML = `<div class="empty"><div class="text">请先添加美甲师</div></div>`;
    } catch(e) {
        container.querySelector('#schedule-area').innerHTML = `<div class="empty"><div class="icon">⚠️</div><div class="text">加载失败</div></div>`;
    }
    
    async function loadSchedule() {
        const area = container.querySelector('#schedule-area');
        area.innerHTML = '<div class="loading"><div class="spinner"></div>加载中...</div>';
        try {
            const list = await api.listSchedules(currentTechId);
            const scheduleMap = {};
            list.forEach(s => { scheduleMap[s.weekday] = s; });
            
            // 确保0-6都有
            const days = [];
            for (let i = 0; i < 7; i++) {
                const s = scheduleMap[i] || { weekday: i, start_time: '09:00', end_time: '21:00', is_working: i < 6 ? 1 : 0 };
                days.push(s);
            }
            
            area.innerHTML = `
                <div class="schedule-table" id="schedule-table">
                    ${days.map(d => `
                        <div class="schedule-row" data-weekday="${d.weekday}">
                            <div class="day">${WEEKDAYS[d.weekday]}</div>
                            <div class="time-inputs">
                                <input type="time" class="start-time" value="${d.start_time}" ${!d.is_working?'disabled':''}>
                                <span style="font-size:12px;color:var(--text-light)">至</span>
                                <input type="time" class="end-time" value="${d.end_time}" ${!d.is_working?'disabled':''}>
                            </div>
                            <label class="switch">
                                <input type="checkbox" class="working-check" ${d.is_working?'checked':''}>
                                <span class="slider"></span>
                            </label>
                        </div>
                    `).join('')}
                </div>
                <button class="btn btn-primary btn-block" id="save-schedule" style="margin-top:14px">保存排班</button>
            `;
            
            // 开关联动
            area.querySelectorAll('.schedule-row').forEach(row => {
                const check = row.querySelector('.working-check');
                const inputs = row.querySelectorAll('input[type="time"]');
                check.addEventListener('change', () => {
                    inputs.forEach(i => i.disabled = !check.checked);
                });
            });
            
            // 保存
            area.querySelector('#save-schedule').addEventListener('click', async () => {
                const schedules = [];
                area.querySelectorAll('.schedule-row').forEach(row => {
                    schedules.push({
                        weekday: parseInt(row.dataset.weekday),
                        start_time: row.querySelector('.start-time').value || '09:00',
                        end_time: row.querySelector('.end-time').value || '21:00',
                        is_working: row.querySelector('.working-check').checked,
                    });
                });
                try {
                    await api.updateSchedules(currentTechId, schedules);
                    toast('排班已保存');
                } catch(e) { toast('保存失败'); }
            });
        } catch(e) {
            area.innerHTML = `<div class="empty"><div class="icon">⚠️</div><div class="text">加载失败</div></div>`;
        }
    }
    
    container.querySelector('.back').addEventListener('click', () => { location.hash = '#/dashboard'; });
}
