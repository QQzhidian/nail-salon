/**
 * 服务项目管理页
 */
import { api } from '../api.js';
import { toast, confirm } from '../auth.js';

export function renderServices(container) {
    
    container.innerHTML = `
        <div class="page">
            <div class="nav-bar">
                
                <span class="title">服务项目管理</span>
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
            const list = await api.listServices();
            if (list.length === 0) {
                listEl.innerHTML = `<div class="empty"><div class="icon">💅</div><div class="text">暂无服务项目</div></div>`;
                return;
            }
            listEl.innerHTML = list.map(s => `
                <div class="card" data-id="${s.id}">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start">
                        <div style="flex:1">
                            <div style="font-size:15px;font-weight:600">${s.name}</div>
                            <div style="font-size:13px;color:var(--primary);margin-top:4px">¥${s.price} · ${s.duration}分钟</div>
                            ${s.description ? `<div style="font-size:12px;color:var(--text-light);margin-top:4px">${s.description}</div>` : ''}
                        </div>
                        <span class="tag tag-${s.is_active ? 'active' : 'inactive'}">${s.is_active ? '上架' : '下架'}</span>
                    </div>
                    <div style="display:flex;gap:8px;margin-top:10px">
                        <button class="btn btn-outline btn-sm" style="flex:1" data-edit="${s.id}">编辑</button>
                        <button class="btn btn-danger btn-sm" style="flex:1" data-del="${s.id}">删除</button>
                    </div>
                </div>
            `).join('');
            
            listEl.querySelectorAll('[data-edit]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = parseInt(btn.dataset.edit);
                    const svc = list.find(s => s.id === id);
                    showEditModal(container, svc, loadList);
                });
            });
            
            listEl.querySelectorAll('[data-del]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = parseInt(btn.dataset.del);
                    if (!confirm('确定删除此服务项目？')) return;
                    try {
                        await api.deleteService(id);
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
    
    loadList();
}

async function showEditModal(container, svc, onSuccess) {
    const isEdit = !!svc;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>${isEdit ? '编辑服务' : '新增服务'}</h2>
                <span class="close">×</span>
            </div>
            <div class="form-group">
                <label>服务名称 *</label>
                <input type="text" id="s-name" value="${svc?.name || ''}" placeholder="如：经典单色甲">
            </div>
            <div class="form-group">
                <label>价格（元）*</label>
                <input type="number" id="s-price" value="${svc?.price || ''}" placeholder="0" min="0" step="1">
            </div>
            <div class="form-group">
                <label>时长（分钟）*</label>
                <input type="number" id="s-duration" value="${svc?.duration || 60}" placeholder="60" min="10" step="10">
            </div>
            <div class="form-group">
                <label>描述</label>
                <textarea id="s-desc" placeholder="服务内容描述">${svc?.description || ''}</textarea>
            </div>
            ${isEdit ? `
            <div class="form-group">
                <label>状态</label>
                <select id="s-active">
                    <option value="1" ${svc.is_active?'selected':''}>上架</option>
                    <option value="0" ${!svc.is_active?'selected':''}>下架</option>
                </select>
            </div>` : ''}
            <button class="btn btn-primary btn-block" id="s-submit">${isEdit ? '保存' : '添加'}</button>
        </div>
    `;
    document.body.appendChild(overlay);
    
    const close = () => overlay.remove();
    overlay.querySelector('.close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    
    overlay.querySelector('#s-submit').addEventListener('click', async () => {
        const data = {
            name: overlay.querySelector('#s-name').value.trim(),
            price: parseFloat(overlay.querySelector('#s-price').value) || 0,
            duration: parseInt(overlay.querySelector('#s-duration').value) || 60,
            description: overlay.querySelector('#s-desc').value.trim(),
        };
        if (!data.name) { toast('请输入服务名称'); return; }
        if (isEdit) data.is_active = parseInt(overlay.querySelector('#s-active').value);
        try {
            if (isEdit) {
                await api.updateService(svc.id, data);
                toast('修改成功');
            } else {
                await api.createService(data);
                toast('添加成功');
            }
            close();
            onSuccess();
        } catch(e) { toast('操作失败'); }
    });
}
