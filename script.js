/* =====================================================
   ✅ 환경 설정
===================================================== */
const API_URL = "YOUR_APPS_SCRIPT_URL";   // ← 반드시 교체
const currentYear = "2026";

let baseData = {};
let currentSection = "group";

/* =====================================================
   ✅ Google Sheet 데이터 조회
===================================================== */
async function fetchRecords() {
  const res = await fetch(API_URL);
  return await res.json();
}

/* =====================================================
   ✅ Sheet → 내부 데이터 구조 변환
===================================================== */
function buildBaseDataFromSheet(records, year) {
  const makeEmpty = () =>
    Array.from({ length: 12 }, (_, i) => ({
      month: `${i + 1}월`,
      sales: 0,
      cogs: 0,
      gp: 0,
      sga: 0,
      op: 0,
      cogs_labor: 0,
      cogs_exp: 0,
      sga_labor: 0,
      sga_exp: 0
    }));

  const data = {
    "광양사무지원": makeEmpty(),
    "광양총무지원": makeEmpty(),
    "광양차량지원": makeEmpty()
  };

  records.forEach(r => {
    if (!r["년월"] || !r["년월"].startsWith(year)) return;
    if (!data[r["섹션"]]) return;

    const monthIdx = Number(r["년월"].slice(5, 7)) - 1;
    const target = data[r["섹션"]][monthIdx];

    target.sales += Number(r["매출액"] || 0);
    target.cogs_labor += Number(r["원가-노무비"] || 0);
    target.cogs_exp += Number(r["원가-경비"] || 0);
    target.sga_labor += Number(r["판관-급여"] || 0);
    target.sga_exp += Number(r["판관-경비"] || 0);
  });

  Object.values(data).forEach(section => {
    section.forEach(m => {
      m.cogs = m.cogs_labor + m.cogs_exp;
      m.gp = m.sales - m.cogs;
      m.sga = m.sga_labor + m.sga_exp;
      m.op = m.gp - m.sga;
    });
  });

  return data;
}

/* =====================================================
   ✅ 그룹 합계 계산
===================================================== */
function getGroupData() {
  const result = Array.from({ length: 12 }, (_, i) => ({
    month: `${i + 1}월`,
    sales: 0,
    cogs: 0,
    gp: 0,
    sga: 0,
    op: 0
  }));

  Object.values(baseData).forEach(section => {
    section.forEach((m, i) => {
      result[i].sales += m.sales;
      result[i].cogs += m.cogs;
      result[i].gp += m.gp;
      result[i].sga += m.sga;
      result[i].op += m.op;
    });
  });

  return result;
}

/* =====================================================
   ✅ 화면 모드 전환
===================================================== */
function setMode(section) {
  currentSection = section;
  updateDashboard();
}

/* =====================================================
   ✅ 테이블 렌더링
===================================================== */
function updateDashboard() {
  const tbody = document.querySelector("#dataTable tbody");
  tbody.innerHTML = "";

  const rows =
    currentSection === "group"
      ? getGroupData()
      : baseData[currentSection];

  rows.forEach((row, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.month}</td>
      <td>${row.sales}</td>
      <td>${row.cogs}</td>
      <td>${row.gp}</td>
      <td>${row.sga}</td>
      <td>${row.op}</td>
      <td>
        ${
          currentSection !== "group"
            ? `<button onclick="toggleEdit(${idx})">입력</button>`
            : ""
        }
      </td>
    `;
    tbody.appendChild(tr);

    if (currentSection !== "group") {
      const editTr = document.createElement("tr");
      editTr.id = `edit-${idx}`;
      editTr.style.display = "none";
      editTr.innerHTML = `
        <td colspan="7">
          <div class="edit-box">
            매출 <input><br>
            원가-노무비 <input><br>
            원가-경비 <input><br>
            판관-급여 <input><br>
            판관-경비 <input><br>
            <button onclick="saveEdit(${idx})">저장</button>
          </div>
        </td>
      `;
      tbody.appendChild(editTr);
    }
  });
}

/* =====================================================
   ✅ 관리자 입력 UI
===================================================== */
function toggleEdit(idx) {
  const tr = document.getElementById(`edit-${idx}`);
  tr.style.display = tr.style.display === "none" ? "table-row" : "none";
}

/* =====================================================
   ✅ Google Sheet 저장 (섹션 자동)
===================================================== */
async function saveEdit(idx) {
  const inputs = document
    .querySelector(`#edit-${idx}`)
    .querySelectorAll("input");

  const payload = {
    yearMonth: `${currentYear}-${String(idx + 1).padStart(2, "0")}`,
    section: currentSection, // ✅ 현재 탭 자동 반영
    sales: Number(inputs[0].value || 0),
    cogsLabor: Number(inputs[1].value || 0),
    cogsExp: Number(inputs[2].value || 0),
    sgaLabor: Number(inputs[3].value || 0),
    sgaExp: Number(inputs[4].value || 0)
  };

  await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  });

  alert("구글 시트에 저장되었습니다.");

  // ✅ Sheet 기준으로 재로딩
  const records = await fetchRecords();
  baseData = buildBaseDataFromSheet(records, currentYear);
  updateDashboard();
}

/* =====================================================
   ✅ 초기 로딩
===================================================== */
window.onload = async () => {
  const records = await fetchRecords();
  baseData = buildBaseDataFromSheet(records, currentYear);
  setMode("group");
};
