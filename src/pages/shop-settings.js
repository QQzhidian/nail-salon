/**
 * 店铺设置页 - 包含数据备份恢复、密码修改
 */
import { api } from '../api.js';
import { toast, auth } from '../auth.js';

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
            <!-- 店铺信息 -->
            <div class="card">
                <div class="section-title">店铺信息</div>
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

            <!-- 数据备份 -->
            <div class="card" style="margin-top:16px">
                <div class="section-title">📦 数据备份与恢复</div>
                <div style="font-size:12px;color:var(--text-light);margin-bottom:14px;line-height:1.6">
                    备份包含所有数据：客户、会员、预约、消费记录、员工、服务、作品、排班、工资等。<br>
                    建议每周备份一次，换手机或清缓存后可快速恢复。
                </div>
                <div style="display:flex;gap:10px">
                    <button class="btn btn-primary" style="flex:1" id="export-btn">📤 导出备份</button>
                    <button class="btn btn-outline" style="flex:1" id="import-btn">📥 导入恢复</button>
                </div>
                <div style="font-size:11px;color:var(--text-lighter);margin-top:8px;text-align:center" id="backup-info"></div>
                <input type="file" id="import-file" accept=".json" style="display:none">
            </div>

            <!-- 密码修改 -->
            <div class="card" style="margin-top:16px">
                <div class="section-title">🔐 修改管理密码</div>
                <div class="form-group">
                    <label>当前密码</label>
                    <input type="password" id="old-pwd" placeholder="输入当前密码">
                </div>
                <div class="form-group">
                    <label>新密码</label>
                    <input type="password" id="new-pwd" placeholder="输入新密码（至少4位）">
                </div>
                <div class="form-group">
                    <label>确认新密码</label>
                    <input type="password" id="confirm-pwd" placeholder="再次输入新密码">
                </div>
                <button class="btn btn-primary btn-block" id="change-pwd-btn">修改密码</button>
            </div>

            <!-- 账户 -->
            <div class="card" style="margin-top:16px">
                <div class="section-title">账户</div>
                <button class="btn btn-outline btn-block" id="logout-btn">退出登录</button>
                <div style="font-size:12px;color:var(--text-lighter);text-align:center;margin-top:8px">
                    所有数据存储在浏览器本地，请定期备份
                </div>
            </div>
        `;

        // ===== Logo上传 =====
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

        // ===== 保存设置 =====
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

        // ===== 导出备份 =====
        updateBackupInfo(container);
        container.querySelector('#export-btn').addEventListener('click', () => {
            const db = JSON.parse(localStorage.getItem('nail_salon_db') || '{}');
            const backup = {
                version: 1,
                exported_at: new Date().toISOString(),
                shop_name: db.shop?.name || '未知店铺',
                data: db,
            };
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const dateStr = new Date().toISOString().slice(0, 10);
            a.download = `支点美甲_备份_${dateStr}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast('备份文件已下载');
            updateBackupInfo(container);
        });

        // ===== 导入恢复 =====
        const importFile = container.querySelector('#import-file');
        container.querySelector('#import-btn').addEventListener('click', () => {
            importFile.click();
        });
        importFile.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                const text = await file.text();
                const backup = JSON.parse(text);
                if (!backup.data || !backup.version) {
                    toast('无效的备份文件');
                    return;
                }
                if (!confirm(
                    `确定要恢复备份数据吗？\n\n` +
                    `备份时间：${backup.exported_at || '未知'}\n` +
                    `店铺名称：${backup.shop_name || '未知'}\n\n` +
                    `⚠️ 当前所有数据将被覆盖，此操作不可撤销！`
                )) return;

                // 保存当前密码（不覆盖）
                const currentDB = JSON.parse(localStorage.getItem('nail_salon_db') || '{}');
                const currentPassword = currentDB.password;
                backup.data.password = currentPassword;

                localStorage.setItem('nail_salon_db', JSON.stringify(backup.data));
                toast('数据恢复成功！页面即将刷新');
                updateBackupInfo(container);
                setTimeout(() => location.reload(), 1500);
            } catch(err) {
                toast('文件格式错误，无法导入');
            }
            importFile.value = '';
        });

        // ===== 修改密码 =====
        container.querySelector('#change-pwd-btn').addEventListener('click', async () => {
            const oldPwd = container.querySelector('#old-pwd').value.trim();
            const newPwd = container.querySelector('#new-pwd').value.trim();
            const confirmPwd = container.querySelector('#confirm-pwd').value.trim();

            if (!oldPwd) { toast('请输入当前密码'); return; }
            if (!newPwd || newPwd.length < 4) { toast('新密码至少4位'); return; }
            if (newPwd !== confirmPwd) { toast('两次密码不一致'); return; }

            const db = JSON.parse(localStorage.getItem('nail_salon_db') || '{}');
            if (oldPwd !== db.password) { toast('当前密码错误'); return; }

            db.password = newPwd;
            localStorage.setItem('nail_salon_db', JSON.stringify(db));
            toast('密码修改成功');
            container.querySelector('#old-pwd').value = '';
            container.querySelector('#new-pwd').value = '';
            container.querySelector('#confirm-pwd').value = '';
        });

        // ===== 退出登录 =====
        container.querySelector('#logout-btn').addEventListener('click', () => {
            auth.logout();
        });

    } catch(e) {
        container.querySelector('.section').innerHTML = `<div class="empty"><div class="icon">⚠️</div><div class="text">加载失败</div></div>`;
    }
}

/** 更新备份信息提示 */
function updateBackupInfo(container) {
    const infoEl = container.querySelector('#backup-info');
    if (!infoEl) return;
    const db = JSON.parse(localStorage.getItem('nail_salon_db') || '{}');
    const customers = db.customers?.length || 0;
    const appointments = db.appointments?.length || 0;
    const records = db.consumption_records?.length || 0;
    const total = customers + appointments + records;
    infoEl.textContent = total > 0
        ? `当前数据：${customers} 位客户 · ${appointments} 条预约 · ${records} 条消费记录`
        : '暂无数据，快去添加客户吧';
}
