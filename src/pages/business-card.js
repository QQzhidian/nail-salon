/**
 * 名片中心页 - 生成二维码、分享链接
 */
import { api } from '../api.js';
import { toast } from '../auth.js';

export function renderBusinessCard(container) {
    
    container.innerHTML = `
        <div class="page">
            <div class="nav-bar">
                
                <span class="title">名片中心</span>
            </div>
            <div id="content" class="section">
                <div class="loading"><div class="spinner"></div>加载中...</div>
            </div>
        </div>
    `;
    
    try {
        const [shop, technicians] = await Promise.all([
            api.getShop(),
            api.listTechnicians(true),
        ]);
        
        const content = container.querySelector('#content');
        content.innerHTML = `
            <!-- 店铺名片 -->
            <div class="card">
                <div class="section-title">店铺预约二维码</div>
                <div class="qr-display">
                    <img src="${api.qrcodeImageUrl('shop')}" alt="店铺二维码">
                    <div class="qr-label">客户扫码即可预约</div>
                    <div class="qr-link" id="shop-link"></div>
                </div>
                <div style="display:flex;gap:8px">
                    <button class="btn btn-primary" style="flex:1" id="copy-shop-link">复制链接</button>
                    <a class="btn btn-outline" style="flex:1" href="${api.qrcodeImageUrl('shop')}" download="店铺二维码.png">下载二维码</a>
                </div>
            </div>
            
            <!-- 店铺名片预览 -->
            <div class="card" style="background:linear-gradient(135deg,var(--primary),var(--primary-dark));color:#fff;text-align:center">
                <div style="font-size:14px;opacity:0.9">${shop.name || '美甲店'}</div>
                <div style="font-size:12px;opacity:0.7;margin-top:4px">${shop.intro || ''}</div>
                <div style="margin:12px 0">
                    <img src="${api.qrcodeImageUrl('shop')}" style="width:140px;height:140px;border-radius:8px;background:#fff;padding:4px">
                </div>
                <div style="font-size:12px;opacity:0.8">📱 ${shop.phone || ''} · 🕐 ${shop.business_hours || ''}</div>
                <div style="font-size:11px;opacity:0.7;margin-top:4px">📍 ${shop.address || ''}</div>
            </div>
            
            <!-- 美甲师专属二维码 -->
            ${technicians.length > 0 ? `
                <div class="section-title" style="margin-top:16px">美甲师专属二维码</div>
                ${technicians.map(t => `
                    <div class="card">
                        <div style="display:flex;align-items:center;gap:12px">
                            <img src="${api.qrcodeImageUrl('technician', t.id)}" style="width:80px;height:80px;border-radius:8px;background:#fff;padding:2px">
                            <div style="flex:1">
                                <div style="font-size:15px;font-weight:600">${t.name}</div>
                                <div style="font-size:12px;color:var(--text-light)">${t.title}</div>
                                <div style="font-size:11px;color:var(--text-lighter);margin-top:2px">客户扫码直接预约该美甲师</div>
                            </div>
                        </div>
                        <div style="display:flex;gap:8px;margin-top:10px">
                            <button class="btn btn-outline btn-sm" style="flex:1" data-copy="${t.id}">复制链接</button>
                            <a class="btn btn-outline btn-sm" style="flex:1" href="${api.qrcodeImageUrl('technician', t.id)}" download="${t.name}二维码.png">下载</a>
                        </div>
                    </div>
                `).join('')}
            ` : ''}
            
            <!-- 使用说明 -->
            <div class="card" style="background:#fff3e0">
                <div style="font-size:13px;color:#e65100;line-height:1.8">
                    💡 <strong>使用说明</strong><br>
                    1. 将二维码图片保存或打印，放在店铺显眼位置<br>
                    2. 客户扫码后打开预约页面，填写信息即可预约<br>
                    3. 复制链接可发送到微信、朋友圈等<br>
                    4. 客户端H5支持添加到手机桌面，像APP一样使用<br>
                    5. 微信小程序端需用微信开发者工具打开 miniprogram 目录发布
                </div>
            </div>
        `;
        
        // 显示店铺链接
        const origin = location.origin;
        const shopLink = `${origin}/client/#/booking`;
        container.querySelector('#shop-link').textContent = shopLink;
        
        // 复制店铺链接
        container.querySelector('#copy-shop-link').addEventListener('click', () => {
            copyText(shopLink);
        });
        
        // 复制美甲师链接
        container.querySelectorAll('[data-copy]').forEach(btn => {
            btn.addEventListener('click', () => {
                const tid = btn.dataset.copy;
                copyText(`${origin}/client/#/booking?technician_id=${tid}`);
            });
        });
        
    } catch(e) {
        container.querySelector('#content').innerHTML = `<div class="empty"><div class="icon">⚠️</div><div class="text">加载失败</div></div>`;
    }
    
}

function copyText(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => toast('链接已复制')).catch(() => fallbackCopy(text));
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand('copy');
        toast('链接已复制');
    } catch(e) {
        toast('复制失败，请手动复制');
    }
    document.body.removeChild(ta);
}
