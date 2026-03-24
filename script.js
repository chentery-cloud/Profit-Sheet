/*************************************************
 * Google Apps Script API
 *************************************************/
const API_URL =
  "https://script.google.com/macros/s/AKfycbxwdVHq0eg26DcQpFysPzCcHCQ8efzjWjJwTPoLtF8OiTPlQA7v7_gF4o7M7nJZE2QKNA/exec";

/*************************************************
 * 날짜 기본값
 *************************************************/
document.getElementById("date").value =
  new Date().toISOString().slice(0, 10);

/*************************************************
 * 저장 버튼
 *************************************************/
document.getElementById("saveBtn").addEventListener("click", async () => {
  const data = {
    date: document.getElementById("date").value,
    type: document.getElementById("type").value,
    category: document.getElementById("category").value.trim(),
    amount: document.getElementById("amount").value,
    memo: document.getElementById("memo").value.trim()
  };

  if (!data.date || !data.category || !data.amount) {
    alert("날짜 / 카테고리 / 금액은 필수입니다");
    return;
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams(data)
    });

    const text = await res.text();
    console.log("저장 응답:", text);

    alert("저장 완료 ✅");

    document.getElementById("amount").value = "";
    document.getElementById("memo").value = "";

    await loadAndRender();

  } catch (err) {
    console.error(err);
    alert("저장 실패 ❌ 콘솔 확인");
  }
});

/*************************************************
 * Sheet 데이터 불러오기
 *************************************************/
async function fetchRecords() {
  const res = await fetch(API_URL);
  return await res.json();
}

/*************************************************
 * 월별 합계 계산
 *************************************************/
function buildMonthlySummary(records, year) {
  const months = Array.from({ length: 12 }, (_, i) => ({
    month: `${i + 1}월`,
    income: 0,
    expense: 0
  }));

  records.forEach(r => {
    if (!r.date || !r.date.startsWith(year)) return;

    const m = Number(r.date.slice(5, 7)) - 1;
    const amt = Number(r.amount) || 0;

    if (r.type === "수입") months[m].income += amt;
    if (r.type === "지출") months[m].expense += amt;
  });

  return months;
}

/*************************************************
 * 목록 + 통계 출력
 *************************************************/
async function loadAndRender() {
  const records = await fetchRecords();

  renderList(records);

  const summary = buildMonthlySummary(records, "2026");
  console.table(summary);
}

/*************************************************
 * 내역 목록 표시
 *************************************************/
function renderList(records) {
  const ul = document.getElementById("dataList");
  ul.innerHTML = "";

  records.slice().reverse().forEach(r => {
    const li = document.createElement("li");
    li.textContent = `${r.date} | ${r.type} | ${r.category} | ${Number(
      r.amount
    ).toLocaleString()}원`;
    ul.appendChild(li);
  });
}

/*************************************************
 * 최초 로딩
 *************************************************/
window.addEventListener("load", loadAndRender);

