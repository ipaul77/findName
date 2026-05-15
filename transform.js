const fs = require('fs');
const admin = require('firebase-admin');

// Firebase 초기화
const serviceAccount = require('./firebase-key.json');
if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://find-name-da412-default-rtdb.asia-southeast1.firebasedatabase.app/"
    });
}

const rtdb = admin.database();

async function generateFiles() {
    try {
        console.log('Firebase에서 데이터를 가져오는 중...');
        const snapshot = await rtdb.ref('people').once('value');
        const people = snapshot.val() || [];
        
        if (people.length === 0) {
            console.log('가져올 데이터가 없습니다.');
            return;
        }

        console.log(`${people.length}명의 데이터를 확인했습니다. 파일 생성을 시작합니다...`);

        // 4. 4단 구조 재배치
        const columnsPerRow = 4;
        const newRows = [];

        // 새 헤더 생성
        let headerRow = [];
        for (let i = 0; i < columnsPerRow; i++) {
            headerRow.push('이름', '생년월일', '전화번호', '비고');
            if (i < columnsPerRow - 1) headerRow.push(''); // 구분용 빈 열
        }
        newRows.push(headerRow.join(','));

        // 데이터 채우기
        for (let i = 0; i < people.length; i += columnsPerRow) {
            const chunk = people.slice(i, i + columnsPerRow);
            let currentRow = [];
            for (let j = 0; j < chunk.length; j++) {
                currentRow.push(chunk[j].name, chunk[j].birth, chunk[j].phone, chunk[j].remark || '');
                if (j < columnsPerRow - 1) currentRow.push(''); // 구분용 빈 열
            }
            newRows.push(currentRow.join(','));
        }

        // 5. 결과 파일 저장 (UTF-8 BOM 포함하여 Excel에서 한글 깨짐 방지)
        fs.writeFileSync('선거인명부_변환결과.csv', '\ufeff' + newRows.join('\n'), 'utf-8');

        // 6. A3 출력용 HTML 파일 생성
        let htmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>선거인명부 (출력용)</title>
<style>
  @page {
    size: A3 landscape;
    margin: 15mm;
  }
  body {
    font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
    font-size: 13px;
    color: #333;
  }
  h1 {
    text-align: center;
    font-size: 24px;
    margin-bottom: 15px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  th, td {
    border: 1px solid #444;
    padding: 6px 2px;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
  }
  th {
    background-color: #f2f2f2;
    font-weight: bold;
  }
  /* 컬럼 너비 조정 */
  .col-name { width: 4.5%; }
  .col-birth { width: 6.5%; }
  .col-phone { width: 8.5%; }
  .col-remark { width: 4.5%; }
  .col-spacer { width: 1%; border-top: none; border-bottom: none; }
</style>
</head>
<body>
  <h1>선거인명부</h1>
  <table>
    <colgroup>
      <col class="col-name"><col class="col-birth"><col class="col-phone"><col class="col-remark"><col class="col-spacer">
      <col class="col-name"><col class="col-birth"><col class="col-phone"><col class="col-remark"><col class="col-spacer">
      <col class="col-name"><col class="col-birth"><col class="col-phone"><col class="col-remark"><col class="col-spacer">
      <col class="col-name"><col class="col-birth"><col class="col-phone"><col class="col-remark">
    </colgroup>
    <thead>
      <tr>
        <th>이름</th><th>생년월일</th><th>전화번호</th><th>비고</th><th style="border:none"></th>
        <th>이름</th><th>생년월일</th><th>전화번호</th><th>비고</th><th style="border:none"></th>
        <th>이름</th><th>생년월일</th><th>전화번호</th><th>비고</th><th style="border:none"></th>
        <th>이름</th><th>생년월일</th><th>전화번호</th><th>비고</th>
      </tr>
    </thead>
    <tbody>`;

        for (let i = 0; i < people.length; i += columnsPerRow) {
            const chunk = people.slice(i, i + columnsPerRow);
            htmlContent += `\n      <tr>`;
            for (let j = 0; j < 4; j++) {
                if (j < chunk.length) {
                    htmlContent += `<td>${chunk[j].name}</td><td>${chunk[j].birth}</td><td>${chunk[j].phone}</td><td>${chunk[j].remark || ''}</td>`;
                } else {
                    htmlContent += `<td></td><td></td><td></td><td></td>`;
                }
                if (j < 3) htmlContent += `<td style="border:none"></td>`; // spacer
            }
            htmlContent += `</tr>`;
        }

        htmlContent += `
    </tbody>
  </table>
</body>
</html>`;

        fs.writeFileSync('선거인명부_출력용.html', htmlContent, 'utf-8');
        console.log('✅ 파일 생성이 완료되었습니다!');
        console.log('📄 선거인명부_변환결과.csv (엑셀용)');
        console.log('🖨️ 선거인명부_출력용.html (A3 출력용)');
        process.exit(0);
    } catch (error) {
        console.error('❌ 오류 발생:', error);
        process.exit(1);
    }
}

generateFiles();