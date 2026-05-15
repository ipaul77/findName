const express = require('express');
const admin = require('firebase-admin');
const path = require('path');

// Firebase 초기화
// Vercel 환경에서는 파일보다 환경변수를 쓰는 것이 보안상 좋지만, 
// 우선 파일이 존재하면 파일을 사용하도록 설정합니다.
let serviceAccount;
try {
    serviceAccount = require('../firebase-key.json');
} catch (e) {
    // 환경변수에서 가져오는 로직 (Vercel 설정용)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    }
}

if (!serviceAccount) {
    console.error("FIREBASE_SERVICE_ACCOUNT environment variable is missing!");
}

if (serviceAccount && !admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: "https://find-name-da412-default-rtdb.asia-southeast1.firebasedatabase.app/"
        });
    } catch (error) {
        console.error("Firebase initialization error:", error);
    }
}

const app = express();
app.use(express.json());

// Helper to get DB reference safely
const getDb = () => {
    if (!admin.apps.length) return null;
    return admin.database();
};

// API 경로만 처리 (정적 파일은 vercel.json에서 처리)
app.get('/api/search', async (req, res) => {
    const query = (req.query.name || '').trim();
    if (!query) return res.json([]);
    
    try {
        const db = getDb();
        if (!db) return res.status(500).json({ error: 'Firebase not initialized' });
        const snapshot = await db.ref('people').once('value');
        const people = snapshot.val() || [];
        const results = people.filter(p => p.name.startsWith(query));
        
        const maskedResults = results.map(p => {
            let maskedPhone = p.phone;
            if (maskedPhone && maskedPhone.length > 8) {
                const parts = maskedPhone.split('-');
                if (parts.length === 3) maskedPhone = `${parts[0]}-****-${parts[2]}`;
                else maskedPhone = maskedPhone.substring(0, 3) + '****' + maskedPhone.slice(-4);
            } else if (!maskedPhone) maskedPhone = '없음';
            
            let maskedBirth = p.birth;
            if (maskedBirth && maskedBirth.length >= 4) {
                 const parts = maskedBirth.split('-');
                 if(parts.length >= 1) maskedBirth = parts[0] + '-**-**';
                 else maskedBirth = maskedBirth.substring(0, 4) + '**';
            } else if (!maskedBirth) maskedBirth = '없음';
            
            return { id: p.id, name: p.name, maskedBirth, maskedPhone };
        });
        res.json(maskedResults);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/verify', async (req, res) => {
    const { id, secret } = req.body;
    try {
        const db = getDb();
        if (!db) return res.status(500).json({ error: 'Firebase not initialized' });
        const snapshot = await db.ref('people').once('value');
        const people = snapshot.val() || [];
        const person = people.find(p => p.id === id);
        if (!person) return res.status(404).json({ success: false });
        const cleanSecret = secret.replace(/[^0-9]/g, '');
        const cleanBirth = (person.birth || '').replace(/[^0-9]/g, '');
        const cleanPhone = (person.phone || '').replace(/[^0-9]/g, '');
        if (cleanSecret && ((cleanBirth && cleanSecret === cleanBirth) || (cleanPhone && cleanSecret === cleanPhone))) {
            return res.json({ success: true, data: person });
        }
        res.json({ success: false, message: '인증 정보가 일치하지 않습니다.' });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/update', async (req, res) => {
    const { id, birth, phone, remark } = req.body;
    try {
        const db = getDb();
        if (!db) return res.status(500).json({ error: 'Firebase not initialized' });
        const snapshot = await db.ref('people').once('value');
        let people = snapshot.val() || [];
        const index = people.findIndex(p => p.id === id);
        if (index === -1) return res.status(404).json({ success: false });
        
        const person = people[index];
        let changes = [];
        if (person.birth !== birth) changes.push('생일');
        if (person.phone !== phone) changes.push('번호');
        let finalRemark = remark || '';
        if (changes.length > 0) {
            const changeStr = `(${changes.join(',')}수정)`;
            if (!finalRemark.includes(changeStr)) finalRemark = finalRemark ? `${finalRemark} ${changeStr}` : changeStr;
        }
        people[index].birth = birth;
        people[index].phone = phone;
        people[index].remark = finalRemark;
        await db.ref('people').set(people);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = app;
