const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// 서비스 계정 키 파일 경로
const serviceAccount = require('./firebase-key.json');

// Firebase 초기화
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://find-name-da412-default-rtdb.asia-southeast1.firebasedatabase.app/"
});

const db = admin.database();
const ref = db.ref('people');

async function uploadData() {
  try {
    const data = JSON.parse(fs.readFileSync('db.json', 'utf-8'));
    console.log('데이터를 읽어왔습니다. 업로드를 시작합니다...');
    
    // 데이터를 Firebase에 저장 (기존 데이터 덮어쓰기)
    await ref.set(data);
    
    console.log('✅ 성공적으로 Firebase에 업로드되었습니다!');
    process.exit(0);
  } catch (error) {
    console.error('❌ 업로드 중 오류 발생:', error);
    process.exit(1);
  }
}

uploadData();
