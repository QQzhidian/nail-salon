/**
 * 作品管理页
 */
import { api } from '../api.js';
import { toast, confirm } from '../auth.js';

export function renderArtworks(container) {
    
    container.innerHTML = `
        <div class="page">
            <div class="nav-bar">
                
                <span class="title">作品管理</span>
                <span class="action" id="add-btn">+ 上传</span>
            </div>
            <div class="section">
                <div class="form-group">
                    <label>选择美甲师</label>
                    <select id="tech-select">
                        <option value="0">全部美甲师</option>
                    </select>
                </div>
            </div>
            <div id="gallery" class="gallery">
                <div class="loading"><div class="spinner"></div>加载中...</div>
            </div>
        </div>
    `;
    
    let technicians = [];
    try {
        technicians = await api.listTechnicians();
        const sel = container.querySelector('#tech-select');
        sel.innerHTML = '<option value="0">全部美甲师</option>' + 
            technicians.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
        sel.addEventListener('change', () => loadGallery(parseInt(sel.value)));
    } catch(e) {}
    
    async function loadGallery(techId = 0) {
        const gal = container.querySelector('#gallery');
        gal.innerHTML = '<div class="loading"><div class="spinner"></div>加载中...</div>';
        try {
            const list = await api.listArtworks(techId);
            if (list.length === 0) {
                gal.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="icon">🖼️</div><div class="text">暂无作品</div></div>`;
                return;
            }
            gal.innerHTML = list.map(a => `
                <div class="gallery-item" data-id="${a.id}">
                    <img src="${a.image_url}" alt="${a.title}">
                    <button class="del-btn" data-del="${a.id}">×</button>
                    ${a.title ? `<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.5);color:#fff;font-size:10px;padding:2px 4px;text-align:center">${a.title}</div>` : ''}
                </div>
            `).join('');
            
            gal.querySelectorAll('[data-del]').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const id = parseInt(btn.dataset.del);
                    if (!confirm('确定删除此作品？')) return;
                    try {
                        await api.deleteArtwork(id);
                        toast('已删除');
                        loadGallery(parseInt(container.querySelector('#tech-select').value));
                    } catch(e) { toast('删除失败'); }
                });
            });
        } catch(e) {
            gal.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="icon">⚠️</div><div class="text">加载失败</div></div>`;
        }
    }
    
    container.querySelector('#add-btn').addEventListener('click', () => {
        showUploadModal(container, technicians, () => loadGallery(parseInt(container.querySelector('#tech-select').value)));
    });
    
    
    loadGallery(0);
}

function showUploadModal(container, technicians, onSuccess) {
    if (technicians.length === 0) { toast('请先添加美甲师'); return; }
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>上传作品</h2>
                <span class="close">×</span>
            </div>
            <div class="form-group">
                <label>选择美甲师 *</label>
                <select id="a-tech">
                    ${technicians.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>作品图片 *</label>
                <div class="upload-area" id="img-upload" style="width:100%;height:120px;border-radius:8px">+</div>
            </div>
            <div class="form-group">
                <label>标题</label>
                <input type="text" id="a-title" placeholder="作品名称（可选）">
            </div>
            <div class="form-group">
                <label>描述</label>
                <textarea id="a-desc" placeholder="作品描述（可选）"></textarea>
            </div>
            <button class="btn btn-primary btn-block" id="a-submit">上传作品</button>
        </div>
    `;
    document.body.appendChild(overlay);
    
    const close = () => overlay.remove();
    overlay.querySelector('.close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    
    let imageUrl = '';
    const uploadArea = overlay.querySelector('#img-upload');
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
                imageUrl = res.url;
                uploadArea.innerHTML = `<img src="${imageUrl}" style="width:100%;height:100%;object-fit:cover">`;
                toast('图片已选择');
            } catch(e) { toast('上传失败'); }
        });
        fileInput.click();
    });
    
    overlay.querySelector('#a-submit').addEventListener('click', async () => {
        if (!imageUrl) { toast('请先选择图片'); return; }
        const data = {
            technician_id: parseInt(overlay.querySelector('#a-tech').value),
            image_url: imageUrl,
            title: overlay.querySelector('#a-title').value.trim(),
            description: overlay.querySelector('#a-desc').value.trim(),
        };
        try {
            await api.createArtwork(data);
            toast('上传成功');
            close();
            onSuccess();
        } catch(e) { toast('上传失败'); }
    });
}
