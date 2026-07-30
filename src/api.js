/**
 * 纯前端 API 封装 - localStorage 版本
 * 所有数据存储在浏览器本地，无需后端服务
 */

// ==================== 本地数据库 ====================

function getDB() {
    const raw = localStorage.getItem('nail_salon_db');
    return raw ? JSON.parse(raw) : initDB();
}

function saveDB(db) {
    localStorage.setItem('nail_salon_db', JSON.stringify(db));
}

function initDB() {
    const db = {
        shop: {
            name: '支点美甲',
            phone: '138-0000-0000',
            address: '请输入店铺地址',
            logo: '',
            description: '专注精致美甲，用专业成就美丽',
            business_hours: '10:00 - 22:00',
        },
        password: '123456',
        customers: [],
        technicians: [
            { id: 1, name: '小美', phone: '13800001001', position: '高级美甲师', base_salary: 5000, commission_rate: 30, avatar: '', active: 1 },
            { id: 2, name: '小丽', phone: '13800001002', position: '美甲师',     base_salary: 4000, commission_rate: 25, avatar: '', active: 1 },
            { id: 3, name: '小雅', phone: '13800001003', position: '资深美甲师', base_salary: 6000, commission_rate: 35, avatar: '', active: 1 },
        ],
        services: [
            { id: 1, name: '基础修甲',       price: 58,  duration: 30, category: '护理',  active: 1 },
            { id: 2, name: '纯色甲油胶',     price: 128, duration: 60, category: '单色',  active: 1 },
            { id: 3, name: '渐变美甲',       price: 188, duration: 75, category: '款式',  active: 1 },
            { id: 4, name: '猫眼美甲',       price: 218, duration: 90, category: '款式',  active: 1 },
            { id: 5, name: '法式美甲',       price: 168, duration: 60, category: '款式',  active: 1 },
            { id: 6, name: '雕花美甲',       price: 288, duration: 100,category: '款式',  active: 1 },
            { id: 7, name: '甲片延长',       price: 168, duration: 60, category: '延长',  active: 1 },
            { id: 8, name: '手部护理',       price: 88,  duration: 40, category: '护理',  active: 1 },
        ],
        appointments: [],
        artworks: [],
        schedules: [],
        salaries: [],
        consumption_records: [],
        // ID 计数器
        _nextIds: { customer: 1, appointment: 1, artwork: 1, service: 9, technician: 4, consumption: 1 },
    };
    saveDB(db);
    return db;
}

function nextId(db, type) {
    if (!db._nextIds) db._nextIds = {};
    if (!db._nextIds[type]) db._nextIds[type] = 1;
    return db._nextIds[type]++;
}

// ==================== 工具函数 ====================

function delay(ms = 0) {
    return new Promise(r => setTimeout(r, ms));
}

/** 简单 hash 生成 token */
function makeToken(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const ch = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + ch;
        hash |= 0;
    }
    return 'tok_' + Math.abs(hash).toString(36) + '_' + Date.now().toString(36);
}

/** 读文件为 base64 data URL */
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/** 生成简单二维码 SVG（用表格画，纯前端可用） */
function generateQRCodeSVG(text, size = 200) {
    // 简化版：生成一个带文本的方块占位，实际可用 qrcode 库
    // 这里生成一个可识别的小方块表示二维码
    const encoded = encodeURIComponent(text);
    const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`;
    return apiUrl;
}

// ==================== 公开 API ====================

export const api = {
    // ========== 认证 ==========
    login: async (password) => {
        await delay(100);
        const db = getDB();
        if (password === db.password) {
            const token = makeToken(password);
            localStorage.setItem('admin_token', token);
            return { token };
        }
        throw new Error('密码错误');
    },

    // ========== 店铺 ==========
    getShop: async () => {
        await delay(50);
        return getDB().shop;
    },

    updateShop: async (data) => {
        await delay(50);
        const db = getDB();
        Object.assign(db.shop, data);
        saveDB(db);
        return db.shop;
    },

    // ========== 客户 ==========
    listCustomers: async (search = '') => {
        await delay(50);
        const db = getDB();
        let list = db.customers;
        if (search) {
            const s = search.toLowerCase();
            list = list.filter(c =>
                c.name.toLowerCase().includes(s) ||
                c.phone.includes(s)
            );
        }
        return list;
    },

    createCustomer: async (data) => {
        await delay(50);
        const db = getDB();
        const cust = {
            id: nextId(db, 'customer'),
            name: data.name || '',
            phone: data.phone || '',
            gender: data.gender || '女',
            birthday: data.birthday || '',
            notes: data.notes || '',
            is_member: data.is_member || 0,
            member_card_type: data.member_card_type || '',
            balance: data.balance || 0,
            total_recharge: 0,
            total_consumption: 0,
            created_at: new Date().toISOString(),
        };
        db.customers.push(cust);
        saveDB(db);
        return cust;
    },

    getCustomer: async (id) => {
        await delay(50);
        const db = getDB();
        const cust = db.customers.find(c => c.id === id);
        if (!cust) throw new Error('客户不存在');
        // 附加消费记录
        const records = db.consumption_records.filter(r => r.customer_id === id);
        return { ...cust, consumption_records: records };
    },

    updateCustomer: async (id, data) => {
        await delay(50);
        const db = getDB();
        const idx = db.customers.findIndex(c => c.id === id);
        if (idx === -1) throw new Error('客户不存在');
        Object.assign(db.customers[idx], data);
        saveDB(db);
        return db.customers[idx];
    },

    recharge: async (custId, data) => {
        await delay(50);
        const db = getDB();
        const idx = db.customers.findIndex(c => c.id === custId);
        if (idx === -1) throw new Error('客户不存在');
        const amount = parseFloat(data.amount) || 0;
        db.customers[idx].balance = (db.customers[idx].balance || 0) + amount;
        db.customers[idx].total_recharge = (db.customers[idx].total_recharge || 0) + amount;
        if (!db.customers[idx].is_member) {
            db.customers[idx].is_member = 1;
        }
        saveDB(db);
        return db.customers[idx];
    },

    recordConsumption: async (custId, data) => {
        await delay(50);
        const db = getDB();
        const idx = db.customers.findIndex(c => c.id === custId);
        if (idx === -1) throw new Error('客户不存在');

        const amount = parseFloat(data.amount) || 0;
        const record = {
            id: nextId(db, 'consumption'),
            customer_id: custId,
            service_name: data.service_name || '',
            technician_name: data.technician_name || '',
            amount: amount,
            payment_method: data.payment_method || 'card',
            notes: data.notes || '',
            created_at: new Date().toISOString(),
        };

        if (!db.consumption_records) db.consumption_records = [];
        db.consumption_records.push(record);

        // 如果是会员卡扣款
        if (data.payment_method === 'card') {
            db.customers[idx].balance = (db.customers[idx].balance || 0) - amount;
        }
        db.customers[idx].total_consumption = (db.customers[idx].total_consumption || 0) + amount;

        saveDB(db);
        return record;
    },

    allConsumptionRecords: async (params = {}) => {
        await delay(50);
        const db = getDB();
        let records = [...(db.consumption_records || [])];

        if (params.date) {
            records = records.filter(r => r.created_at.startsWith(params.date));
        }
        if (params.month) {
            records = records.filter(r => r.created_at.startsWith(params.month));
        }
        if (params.year) {
            records = records.filter(r => r.created_at.startsWith(params.year));
        }
        if (params.customer_id) {
            records = records.filter(r => r.customer_id === parseInt(params.customer_id));
        }
        if (params.technician_name) {
            records = records.filter(r => r.technician_name === params.technician_name);
        }

        // 按时间倒序
        records.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return records;
    },

    // ========== 员工/技师 ==========
    listTechnicians: async (activeOnly = false) => {
        await delay(50);
        const db = getDB();
        let list = db.technicians;
        if (activeOnly) list = list.filter(t => t.active === 1);
        return list;
    },

    createTechnician: async (data) => {
        await delay(50);
        const db = getDB();
        const tech = {
            id: nextId(db, 'technician'),
            name: data.name || '',
            phone: data.phone || '',
            position: data.position || '美甲师',
            base_salary: parseFloat(data.base_salary) || 0,
            commission_rate: parseFloat(data.commission_rate) || 30,
            avatar: data.avatar || '',
            active: data.active !== undefined ? data.active : 1,
        };
        db.technicians.push(tech);
        saveDB(db);
        return tech;
    },

    updateTechnician: async (id, data) => {
        await delay(50);
        const db = getDB();
        const idx = db.technicians.findIndex(t => t.id === id);
        if (idx === -1) throw new Error('技师不存在');
        Object.assign(db.technicians[idx], data);
        saveDB(db);
        return db.technicians[idx];
    },

    deleteTechnician: async (id) => {
        await delay(50);
        const db = getDB();
        const idx = db.technicians.findIndex(t => t.id === id);
        if (idx === -1) throw new Error('技师不存在');
        db.technicians[idx].active = 0;
        saveDB(db);
        return { success: true };
    },

    // ========== 排班 ==========
    listSchedules: async (techId = 0) => {
        await delay(50);
        const db = getDB();
        if (techId && techId !== '0') {
            return (db.schedules || []).filter(s => s.technician_id === parseInt(techId));
        }
        return db.schedules || [];
    },

    updateSchedules: async (techId, schedules) => {
        await delay(50);
        const db = getDB();
        if (!db.schedules) db.schedules = [];
        // 删除旧的
        db.schedules = db.schedules.filter(s => s.technician_id !== parseInt(techId));
        // 添加新的
        for (const s of schedules) {
            db.schedules.push({
                technician_id: parseInt(techId),
                day_of_week: s.day_of_week,
                start_time: s.start_time,
                end_time: s.end_time,
            });
        }
        saveDB(db);
        return { success: true };
    },

    // ========== 工资 ==========
    getSalaries: async (techId) => {
        await delay(50);
        const db = getDB();
        return (db.salaries || []).filter(s => s.technician_id === parseInt(techId));
    },

    calculateSalary: async (techId, month = '') => {
        await delay(50);
        const db = getDB();
        const tech = db.technicians.find(t => t.id === parseInt(techId));
        if (!tech) throw new Error('技师不存在');

        if (!month) {
            const now = new Date();
            month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }

        // 计算当月消费总额
        const records = (db.consumption_records || []).filter(r =>
            r.technician_name === tech.name && r.created_at.startsWith(month)
        );
        const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);
        const commission = Math.round(totalAmount * tech.commission_rate / 100);
        const totalSalary = tech.base_salary + commission;

        // 查找已有工资记录
        const existingIdx = (db.salaries || []).findIndex(
            s => s.technician_id === parseInt(techId) && s.salary_month === month
        );

        const salaryRecord = {
            technician_id: parseInt(techId),
            technician_name: tech.name,
            salary_month: month,
            base_salary: tech.base_salary,
            commission: commission,
            total_consumption: totalAmount,
            total_salary: totalSalary,
            status: 'calculated',
        };

        if (!db.salaries) db.salaries = [];
        if (existingIdx >= 0) {
            db.salaries[existingIdx] = salaryRecord;
        } else {
            db.salaries.push(salaryRecord);
        }

        saveDB(db);
        return salaryRecord;
    },

    updateSalary: async (techId, month, data) => {
        await delay(50);
        const db = getDB();
        if (!db.salaries) db.salaries = [];
        const idx = db.salaries.findIndex(
            s => s.technician_id === parseInt(techId) && s.salary_month === month
        );
        if (idx >= 0) {
            Object.assign(db.salaries[idx], data);
        } else {
            db.salaries.push({
                technician_id: parseInt(techId),
                salary_month: month,
                ...data,
            });
        }
        saveDB(db);
        return db.salaries[idx >= 0 ? idx : db.salaries.length - 1];
    },

    allSalaries: async (month = '') => {
        await delay(50);
        const db = getDB();
        if (!month) {
            const now = new Date();
            month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }
        return (db.salaries || []).filter(s => s.salary_month === month);
    },

    // ========== 服务 ==========
    listServices: async (activeOnly = false) => {
        await delay(50);
        const db = getDB();
        let list = db.services;
        if (activeOnly) list = list.filter(s => s.active === 1);
        return list;
    },

    createService: async (data) => {
        await delay(50);
        const db = getDB();
        const svc = {
            id: nextId(db, 'service'),
            name: data.name || '',
            price: parseFloat(data.price) || 0,
            duration: parseInt(data.duration) || 60,
            category: data.category || '其他',
            active: data.active !== undefined ? data.active : 1,
        };
        db.services.push(svc);
        saveDB(db);
        return svc;
    },

    updateService: async (id, data) => {
        await delay(50);
        const db = getDB();
        const idx = db.services.findIndex(s => s.id === id);
        if (idx === -1) throw new Error('服务不存在');
        Object.assign(db.services[idx], data);
        saveDB(db);
        return db.services[idx];
    },

    deleteService: async (id) => {
        await delay(50);
        const db = getDB();
        const idx = db.services.findIndex(s => s.id === id);
        if (idx === -1) throw new Error('服务不存在');
        db.services[idx].active = 0;
        saveDB(db);
        return { success: true };
    },

    // ========== 预约 ==========
    listAppointments: async (params = {}) => {
        await delay(50);
        const db = getDB();
        let list = [...(db.appointments || [])];

        if (params.date) {
            list = list.filter(a => a.appointment_date === params.date);
        }
        if (params.technician_id) {
            list = list.filter(a => a.technician_id === parseInt(params.technician_id));
        }
        if (params.status) {
            list = list.filter(a => a.status === params.status);
        }

        list.sort((a, b) => {
            if (a.appointment_date !== b.appointment_date) return a.appointment_date.localeCompare(b.appointment_date);
            return (a.appointment_time || '').localeCompare(b.appointment_time || '');
        });

        return list;
    },

    createAppointment: async (data) => {
        await delay(50);
        const db = getDB();
        const appt = {
            id: nextId(db, 'appointment'),
            customer_name: data.customer_name || '',
            customer_phone: data.customer_phone || '',
            technician_id: data.technician_id || 0,
            technician_name: data.technician_name || '',
            service_id: data.service_id || 0,
            service_name: data.service_name || '',
            appointment_date: data.appointment_date || '',
            appointment_time: data.appointment_time || '',
            status: data.status || 'pending',
            notes: data.notes || '',
            created_at: new Date().toISOString(),
        };
        if (!db.appointments) db.appointments = [];
        db.appointments.push(appt);
        saveDB(db);
        return appt;
    },

    updateAppointmentStatus: async (id, status) => {
        await delay(50);
        const db = getDB();
        if (!db.appointments) db.appointments = [];
        const idx = db.appointments.findIndex(a => a.id === id);
        if (idx === -1) throw new Error('预约不存在');
        db.appointments[idx].status = status;
        saveDB(db);
        return db.appointments[idx];
    },

    todayStats: async () => {
        await delay(50);
        const db = getDB();
        const today = new Date().toISOString().slice(0, 10);
        const thisMonth = today.slice(0, 7);

        const todayAppointments = (db.appointments || []).filter(a => a.appointment_date === today);
        const todayCompleted = todayAppointments.filter(a => a.status === 'completed');
        const todayPending = todayAppointments.filter(a => a.status === 'pending');

        const todayRecords = (db.consumption_records || []).filter(r => r.created_at.startsWith(today));
        const todayRevenue = todayRecords.reduce((sum, r) => sum + r.amount, 0);

        // 本月收入
        const monthRecords = (db.consumption_records || []).filter(r => r.created_at.startsWith(thisMonth));
        const monthRevenue = monthRecords.reduce((sum, r) => sum + r.amount, 0);

        const totalCustomers = db.customers.length;
        const memberCount = db.customers.filter(c => c.is_member).length;
        const totalBalance = db.customers.reduce((sum, c) => sum + (c.balance || 0), 0);
        const activeTechs = db.technicians.filter(t => t.active === 1).length;

        return {
            // 兼容旧字段名（页面使用）
            today_total: todayAppointments.length,
            pending_total: todayPending.length,
            customer_total: totalCustomers,
            month_revenue: monthRevenue,
            // 标准字段
            today_appointments: todayAppointments,
            today_completed: todayCompleted.length,
            today_pending: todayPending.length,
            today_consumption: todayRecords.length,
            today_revenue: todayRevenue,
            total_customers: totalCustomers,
            member_total: memberCount,
            total_balance: totalBalance,
            tech_count: activeTechs,
        };
    },

    // ========== 作品 ==========
    listArtworks: async (techId = 0) => {
        await delay(50);
        const db = getDB();
        if (techId && techId !== '0') {
            return (db.artworks || []).filter(a => a.technician_id === parseInt(techId));
        }
        return db.artworks || [];
    },

    createArtwork: async (data) => {
        await delay(50);
        const db = getDB();
        const artwork = {
            id: nextId(db, 'artwork'),
            technician_id: data.technician_id || 0,
            technician_name: data.technician_name || '',
            image_url: data.image_url || '',
            title: data.title || '',
            description: data.description || '',
            created_at: new Date().toISOString(),
        };
        if (!db.artworks) db.artworks = [];
        db.artworks.push(artwork);
        saveDB(db);
        return artwork;
    },

    deleteArtwork: async (id) => {
        await delay(50);
        const db = getDB();
        if (!db.artworks) db.artworks = [];
        db.artworks = db.artworks.filter(a => a.id !== id);
        saveDB(db);
        return { success: true };
    },

    // ========== 二维码 ==========
    qrcodeImageUrl: (type = 'shop', id = 0) => {
        // 使用免费在线 QR 码服务生成
        const shop = getDB().shop;
        let data = '';
        if (type === 'shop') {
            data = `店铺：${shop.name}\n电话：${shop.phone}\n地址：${shop.address}`;
        } else if (type === 'technician') {
            const techs = getDB().technicians;
            const tech = techs.find(t => t.id === id);
            data = tech
                ? `技师：${tech.name}\n电话：${tech.phone}\n职位：${tech.position}\n店铺：${shop.name}`
                : `店铺：${shop.name}`;
        }
        const encoded = encodeURIComponent(data);
        return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}&margin=10`;
    },

    // ========== 图片上传（base64） ==========
    upload: async (file) => {
        await delay(200);
        const dataUrl = await readFileAsDataURL(file);
        return { url: dataUrl, filename: file.name };
    },
};
