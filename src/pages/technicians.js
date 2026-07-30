/**
 * 美甲师管理页
 */
import { api } from '../api.js';
import { auth, toast, confirm } from '../auth.js';

export async function renderTechnicians(container) {
    if (!auth.isLoggedIn()) { location.hash = '#/login'; return; }
    
    container.innerHTML = `
        <div class="page">
            <div class="nav-bar">
                <span class="back" data-route="#/dashboard">‹</span>
                <span class="title">美甲师管理</span>
                <span class="action" id="add-btn">+ 新增</span>
            </div>
            <div id="list" class="section">
                <div class="loading"><div class="spinner"></div>加载中...</div>
            </div>
        </div>
    `;
    
    async function loadList() {
        const listEl = container.querySelector('#list');
        listEl.innerHTML = '<div class="loading"><div class="spinner"></div>加载中...</div>';
        try {
            const list = await api.listTechnicians();
            if (list.length === 0) {
                listEl.innerHTML = `<div class="empty"><div class="icon">👩‍🎨</div><div class="text">暂无美甲师</div></div>`;
                return;
            }
            listEl.innerHTML = list.map(t => `
                <div class="card" data-id="${t.id}">
                    <div style="display:flex;align-items:center;gap:12px">
                        <div style="width:48px;height:48px;border-radius:50%;background:var(--primary-light);display:flex;align-items:center;justify-content:center;font-size:24px;overflow:hidden;flex-shrink:0">
                            ${t.avatar ? `<img src="${t.avatar}" style="width:100%;height:100%;object-fit:cover">` : '👩‍🎨'}
                        </div>
                        <div style="flex:1">
                            <div style="font-size:15px;font-weight:600">${t.name} <span style="font-size:12px;color:var(--text-light);font-weight:400">${t.title}</span></div>
                            <div style="font-size:12px;color:var(--text-light);margin-top:2px">${t.intro || '暂无介绍'}</div>
                            <div style="font-size:11px;color:var(--text-lighter);margin-top:2px">作品 ${t.artwork_count} 个</div>
                        </div>
                        <span class="tag tag-${t.is_active ? 'active' : 'inactive'}">${t.is_active ? '在职' : '离职'}</span>
                    </div>
                    <div style="display:flex;gap:8px;margin-top:10px">
                        <button class="btn btn-outline btn-sm" style="flex:1" data-edit="${t.id}">编辑</button>
                        <button class="btn btn-danger btn-sm" style="flex:1" data-del="${t.id}">删除</button>
                    </div>
                </div>
            `).join('');
            
            listEl.querySelectorAll('[data-edit]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = parseInt(btn.dataset.edit);
                    const tech = list.find(t => t.id === id);
                    showEditModal(container, tech, loadList);
                });
            });
            
            listEl.querySelectorAll('[data-del]').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const id = parseInt(btn.dataset.del);
                    if (!confirm('删除美甲师将同时删除其排班和作品，确定？')) return;
                    try {
                        await api.deleteTechnician(id);
                        toast('已删除');
                        loadList();
                    } catch(e) { toast('删除失败'); }
                });
            });
        } catch(e) {
            container.querySelector('#list').innerHTML = `<div class="empty"><div class="icon">⚠️</div><div class="text">加载失败</div></div>`;
        }
    }
    
    container.querySelector('#add-btn').addEventListener('click', () => showEditModal(container, null, loadList));
    container.querySelector('.back').addEventListener('click', () => { location.hash = '#/dashboard'; });
    
    loadList();
}

async function showEditModal(container, tech, onSuccess) {
    const isEdit = !!tech;
    let avatarUrl = tech?.avatar || '';
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>${isEdit ? '编辑美甲师' : '新增美甲师'}</h2>
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
                <input type="text" id="t-name" value="${tech?.name || ''}" placeholder="美甲师姓名">
            </div>
            <div class="form-group">
                <label>职称</label>
                <input type="text" id="t-title" value="${tech?.title || ''}" placeholder="如：资深美甲师">
            </div>
            <div class="form-group">
                <label>简介</label>
                <textarea id="t-intro" placeholder="从业经验、擅长风格等">${tech?.intro || ''}</textarea>
            </div>
            ${isEdit ? `
            <div class="form-group">
                <label>状态</label>
                <select id="t-active">
                    <option value="1" ${tech.is_active?'selected':''}>在职</option>
                    <option value="0" ${!tech.is_active?'selected':''}>离职</option>
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
            } catch(e) { toast('上传失败'); }
        });
        fileInput.click();
    });
    
    overlay.querySelector('#t-submit').addEventListener('click', async () => {
        const data = {
            name: overlay.querySelector('#t-name').value.trim(),
            title: overlay.querySelector('#t-title').value.trim() || '美甲师',
            intro: overlay.querySelector('#t-intro').value.trim(),
            avatar: avatarUrl,
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
        } catch(e) { toast('操作失败'); }
    });
}
