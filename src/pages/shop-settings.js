/**
 * 店铺设置页
 */
import { api } from '../api.js';
import { toast } from '../auth.js';

export async function renderShopSettings(container) {
    
    container.innerHTML = `
        <div class="page">
            <div class="nav-bar">
                
                <span class="title">店铺设置</span>
            </div>
            <div class="section">
                <div class="loading"><div class="spinner"></div>加载中...</div>
            </div>
        </div>
    `;
    
    try {
        const shop = await api.getShop();
        let logoUrl = shop.logo || '';
        
        const section = container.querySelector('.section');
        section.innerHTML = `
            <div class="card">
                <div class="form-group">
                    <label>店铺Logo</label>
                    <div class="upload-area" id="logo-upload" style="width:100px;height:100px">
                        ${logoUrl ? `<img src="${logoUrl}">` : '🖼️'}
                    </div>
                </div>
                <div class="form-group">
                    <label>店铺名称 *</label>
                    <input type="text" id="shop-name" value="${shop.name || ''}">
                </div>
                <div class="form-group">
                    <label>联系电话</label>
                    <input type="tel" id="shop-phone" value="${shop.phone || ''}">
                </div>
                <div class="form-group">
                    <label>营业时间</label>
                    <input type="text" id="shop-hours" value="${shop.business_hours || ''}" placeholder="如 09:00-21:00">
                </div>
                <div class="form-group">
                    <label>店铺地址</label>
                    <textarea id="shop-address" placeholder="详细地址">${shop.address || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>店铺简介</label>
                    <textarea id="shop-intro" placeholder="一句话介绍店铺">${shop.intro || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>公告</label>
                    <textarea id="shop-announce" placeholder="显示在客户端首页的公告">${shop.announcement || ''}</textarea>
                </div>
                <button class="btn btn-primary btn-block" id="save-btn">保存设置</button>
            </div>
            
            <div class="card">
                <div class="section-title">账户</div>
                <button class="btn btn-outline btn-block" id="logout-btn">退出登录</button>
                <div style="font-size:12px;color:var(--text-lighter);text-align:center;margin-top:8px">
                    管理密码可通过环境变量 ADMIN_PASSWORD 修改
                </div>
            </div>
        `;
        
        // Logo上传
        const logoArea = container.querySelector('#logo-upload');
        logoArea.addEventListener('click', () => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.addEventListener('change', async () => {
                const file = fileInput.files[0];
                if (!file) return;
                try {
                    toast('上传中...');
                    const res = await api.upload(file);
                    logoUrl = res.url;
                    logoArea.innerHTML = `<img src="${logoUrl}" style="width:100%;height:100%;object-fit:cover">`;
                    toast('上传成功');
                } catch(e) { toast('上传失败'); }
            });
            fileInput.click();
        });
        
        // 保存
        container.querySelector('#save-btn').addEventListener('click', async () => {
            const data = {
                name: container.querySelector('#shop-name').value.trim(),
                phone: container.querySelector('#shop-phone').value.trim(),
                business_hours: container.querySelector('#shop-hours').value.trim(),
                address: container.querySelector('#shop-address').value.trim(),
                intro: container.querySelector('#shop-intro').value.trim(),
                announcement: container.querySelector('#shop-announce').value.trim(),
                logo: logoUrl,
            };
            if (!data.name) { toast('请输入店铺名称'); return; }
            try {
                await api.updateShop(data);
                toast('保存成功');
            } catch(e) { toast('保存失败'); }
        });
        
        // 退出登录
        container.querySelector('#logout-btn').addEventListener('click', () => {
            auth.logout();
        });
        
    } catch(e) {
        container.querySelector('.section').innerHTML = `<div class="empty"><div class="icon">⚠️</div><div class="text">加载失败</div></div>`;
    }
    
}
