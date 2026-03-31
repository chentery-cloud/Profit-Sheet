<script>
  /* ===============================
     ✅ API 및 환경 설정
  ================================ */
  const API_URL = "https://script.google.com/macros/s/AKfycbx471Y-fPRN3mkdj1Q99O0IR-zi74bOl5xSKLe4QbtOjDlHnDokGpnMyJDYmK4gPgZh/exec";
  
  let isAdmin = false;
  let currentYear = "2026";

  let baseData = {};
  let appData = {};
  let currentMode = 'group';
  let currentSection = '광양사무지원';
  let adminCredentials = []; 

  // 🎯 HR 및 KPI 전용 변수 추가
  let hrData = { "광양사무지원": {mT:0, fT:0, mS:0, mM:0, fS:0, fM:0}, "광양총무지원": {mT:0, fT:0, mS:0, mM:0, fS:0, fM:0}, "광양차량지원": {mT:0, fT:0, mS:0, mM:0, fS:0, fM:0} };
  let kpiTarget = { "매출액": 11180, "매출총이익률": 5, "장애인산정인원": 15, "건강개선목표달성률(%)": 100, "TRIFR(LTIFR)": 0, "교육이수시간(Hr)": 50 };
  let kpiManualActuals = { "건강개선목표달성률(%)": 0, "TRIFR(LTIFR)": 0, "교육이수시간(Hr)": 0 };

  const titleMap = {
    "그룹전체": "🏢 광양서비스지원그룹",
    "광양사무지원": "📋 광양사무지원섹션",
    "광양총무지원": "💼 광양총무지원섹션",
    "광양차량지원": "🚗 광양차량지원섹션"
  };

  /* ===============================
     ✅ 데이터 연동 (구글 시트)
  ================================ */
  function showLoading(show, text = "데이터를 불러오는 중입니다...") {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadText');
    if (loadingText) loadingText.innerText = text;
    if (overlay) overlay.style.display = show ? 'flex' : 'none';
  }

  async function fetchRecords() {
    try {
      const urlWithCacheBuster = `${API_URL}?t=${new Date().getTime()}`;
      const res = await fetch(urlWithCacheBuster);
      return await res.json();
    } catch (e) {
      alert("데이터를 불러오는데 실패했습니다.");
      return null;
    }
  }

  // 1️⃣ 손익 데이터 파싱
  function buildBaseDataFromSheet(profitRecords, year) {
    const makeEmpty = () => Array.from({ length: 12 }, (_, i) => ({
      month: `${i + 1}월`, sales: 0, cogs: 0, gp: 0, sga: 0, op: 0,
      cogs_labor: 0, cogs_exp: 0, sga_labor: 0, sga_exp: 0
    }));

    const data = { "광양사무지원": makeEmpty(), "광양총무지원": makeEmpty(), "광양차량지원": makeEmpty() };

    profitRecords.forEach(r => {
      let ym = String(r["년월"]||"").trim();
      let monthIdx = -1;
      
      // 날짜 파싱 오류 방지 (YYYY-MM 또는 YYYY. M. D 처리)
      if (ym.startsWith(year)) {
        if (ym.includes("-")) monthIdx = Number(ym.split("-")[1]) - 1;
        else if (ym.includes(".")) monthIdx = Number(ym.split(".")[1].trim()) - 1;
      }

      if (monthIdx >= 0 && monthIdx <= 11 && data[r["섹션"]]) {
        const t = data[r["섹션"]][monthIdx];
        t.sales += Number(r["매출액"] || 0);
        t.cogs_labor += Number(r["원가-노무비"] || 0);
        t.cogs_exp += Number(r["원가-경비"] || 0);
        t.sga_labor += Number(r["판관-급여"] || 0);
        t.sga_exp += Number(r["판관-경비"] || 0);
      }
    });

    Object.values(data).forEach(months => {
      months.forEach(m => {
        m.cogs = m.cogs_labor + m.cogs_exp;
        m.gp = m.sales - m.cogs;
        m.sga = m.sga_labor + m.sga_exp;
        m.op = m.gp - m.sga;
      });
    });
    return data;
  }

  // 2️⃣ 인원 데이터 파싱
  function buildHRData(hrArray) {
    hrData = { "광양사무지원": {mT:0, fT:0, mS:0, mM:0, fS:0, fM:0}, "광양총무지원": {mT:0, fT:0, mS:0, mM:0, fS:0, fM:0}, "광양차량지원": {mT:0, fT:0, mS:0, mM:0, fS:0, fM:0} };
    hrArray.forEach(r => {
      let sec = String(r["섹션"]||"").trim();
      if(hrData[sec]) {
        hrData[sec].mT = Number(r["남성총원"]||0); hrData[sec].fT = Number(r["여성총원"]||0);
        hrData[sec].mS = Number(r["남성중증"]||0); hrData[sec].mM = Number(r["남성경증"]||0);
        hrData[sec].fS = Number(r["여성중증"]||0); hrData[sec].fM = Number(r["여성경증"]||0);
      }
    });
  }

  // 3️⃣ KPI 데이터 파싱
  function buildKPIData(kpiArr) {
    if (!kpiArr) return;
    kpiArr.forEach(row => {
      let key = String(row["KPI"] || row["A"] || "").trim(); 
      let target = Number(row["목표"] || row["B"] || 0);
      let actual = Number(row["실적"] || row["C"] || 0); 
      if (key && !isNaN(target)) {
        kpiTarget[key] = target;
        if(kpiManualActuals[key] !== undefined) kpiManualActuals[key] = actual;
      }
    });
  }

  function processData() {
    const groupTotal = baseData["광양사무지원"].map((item, i) => {
      const ch = baseData["광양총무지원"][i]; const ca = baseData["광양차량지원"][i];
      return {
        month: item.month, sales: item.sales + ch.sales + ca.sales, cogs: item.cogs + ch.cogs + ca.cogs,
        gp: item.gp + ch.gp + ca.gp, sga: item.sga + ch.sga + ca.sga, op: item.op + ch.op + ca.op,
        cogs_labor: item.cogs_labor + ch.cogs_labor + ca.cogs_labor, cogs_exp: item.cogs_exp + ch.cogs_exp + ca.cogs_exp,
        sga_labor: item.sga_labor + ch.sga_labor + ca.sga_labor, sga_exp: item.sga_exp + ch.sga_exp + ca.sga_exp
      };
    });
    appData = { "그룹전체": groupTotal, "광양사무지원": baseData["광양사무지원"], "광양총무지원": baseData["광양총무지원"], "광양차량지원": baseData["광양차량지원"] };
  }

  async function loadData() {
    showLoading(true, "데이터를 불러오는 중입니다...");
    const json = await fetchRecords();
    if (json) {
      if (json.admin) adminCredentials = json.admin;
      if (json.kpi) buildKPIData(json.kpi);
      if (json.personnel) buildHRData(json.personnel);
      baseData = buildBaseDataFromSheet(json.profit || [], currentYear);
      processData();
      updateDashboard();
    }
    showLoading(false);
  }

  /* ===============================
     ✅ 관리자 로그인 모드
  ================================ */
  function openAdminModal() { document.getElementById('adminModal').style.display = 'flex'; document.getElementById('loginErrorMsg').style.display = 'none'; document.getElementById('adminId').value = ''; document.getElementById('adminPw').value = ''; }
  function closeAdminModal() { document.getElementById('adminModal').style.display = 'none'; }

  function attemptLogin() {
    var id = document.getElementById('adminId').value; var pw = document.getElementById('adminPw').value;
    if(!id || !pw) { alert("아이디와 비밀번호를 모두 입력해주세요."); return; }
    const matched = adminCredentials.find(c => String(c.id) === String(id) && String(c.pw) === String(pw));
    if (matched || (id === 'admin' && pw === 'admin1234')) {
      isAdmin = true; document.getElementById('adminBtn').innerText = '⚙️ 관리자 로그아웃'; closeAdminModal(); alert('관리자 모드로 접속했습니다.'); updateDashboard();
    } else { document.getElementById('loginErrorMsg').style.display = 'block'; }
  }

  function handleAdminToggle() {
    if (isAdmin) { isAdmin = false; document.getElementById('adminBtn').innerText = '⚙️ 관리자 모드'; alert('관리자 모드가 종료되었습니다.'); updateDashboard(); } 
    else { openAdminModal(); }
  }

  /* ===============================
     ✅ UI 및 탭 제어
  ================================ */
    function setMode(mode) {
      currentMode = mode;
      
      // 1. 탭 버튼 색상 변경 (4개 모두 제어)
      document.getElementById('tab-group').classList.toggle('active', mode === 'group');
      document.getElementById('tab-section').classList.toggle('active', mode === 'section');
      document.getElementById('tab-kpi').classList.toggle('active', mode === 'kpi'); // 누락되었던 KPI 탭 추가
      document.getElementById('tab-personnel').classList.toggle('active', mode === 'personnel');
      
      // 2. 부서 선택 버튼은 섹션매출에서만 보이기
      document.getElementById('section-buttons').style.display = mode === 'section' ? 'flex' : 'none';
      
      // 3. 메인 화면 3가지 중 맞는 것만 보여주기
      document.getElementById('view-profit').classList.toggle('active', mode === 'group' || mode === 'section');
      document.getElementById('view-kpi').classList.toggle('active', mode === 'kpi'); // 누락되었던 KPI 화면 추가
      document.getElementById('view-personnel').classList.toggle('active', mode === 'personnel');
      
      // 4. 매출 화면 내부의 차트 제어
      document.getElementById('group-charts').style.display = mode === 'group' ? 'block' : 'none';
      document.getElementById('section-charts').style.display = mode === 'section' ? 'block' : 'none';

      updateUI();
    }

    // 🌟 화면 업데이트 분기 처리 (여기가 핵심 원인이었습니다)
    function updateUI() { 
      if (currentMode === 'kpi') {
        renderKPI(); // KPI 탭일 때는 KPI 화면만 그리기
      } else if (currentMode === 'personnel') {
        renderHR();  // 인원 탭일 때는 인원 화면만 그리기
      } else {
        renderProfit(); // 그 외(그룹매출, 섹션매출)일 때는 손익표 그리기
      }
    }


  function setSection(sec) { currentSection = sec; document.querySelectorAll('.sec-btn').forEach(btn => btn.classList.remove('active')); document.getElementById(`btn-${sec}`).classList.add('active'); updateDashboard(); }
  function toggleDetail(index) { const detailRow = document.getElementById(`detail-${index}`); const icon = document.getElementById(`icon-${index}`); if (!detailRow) return; if (detailRow.style.display === 'table-row') { detailRow.style.display = 'none'; if (icon) icon.innerText = '🔽'; } else { detailRow.style.display = 'table-row'; if (icon) icon.innerText = '🔼'; } }

  // 🌟 핵심 라우팅 함수 (중복 제거)
  function updateDashboard() {
    processData();
    if (currentMode === 'kpi') renderKPI();
    else if (currentMode === 'personnel') renderHR();
    else renderProfit(); 
  }

  /* ===============================
     ✅ 각 화면별 렌더링 함수 (분리)
  ================================ */
  function formatNumber(num) { if (num === null || num === undefined) return "-"; return num === 0 ? "0" : num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  const formatValue = (v, unit) => unit === "%" ? Number(v||0).toFixed(1) : (Number.isInteger(v) ? formatNumber(v) : Number(v||0).toFixed(1));
  function getProfitClass(val) { return val > 0 ? "profit positive" : val < 0 ? "profit negative" : "profit"; }

  // 📊 1. 매출/손익 렌더링
  function renderProfit() {
    const targetKey = currentMode === 'group' ? '그룹전체' : currentSection;
    const data = appData[targetKey];

    const tableTitleEl = document.getElementById("tableTitle");
    if(tableTitleEl) tableTitleEl.innerText = `[${currentYear}] ${titleMap[targetKey]} 손익표`;

    if (currentMode === 'section') {
      const sTitle = document.getElementById("sectionSalesChartTitle");
      const oTitle = document.getElementById("sectionOpChartTitle");
      if(sTitle) sTitle.innerText = `📊 ${titleMap[targetKey]} 매출액 추이`;
      if(oTitle) oTitle.innerText = `📈 ${titleMap[targetKey]} 영업이익 추이`;
    }

    const tbody = document.getElementById("tableBody");
    if(!tbody) return;
    tbody.innerHTML = "";

    let tSales = 0, tCogs = 0, tGp = 0, tSga = 0, tOp = 0;

    data.forEach((row, idx) => {
      tSales += row.sales; tCogs += row.cogs; tGp += row.gp; tSga += row.sga; tOp += row.op;

      const tr = document.createElement("tr"); tr.className = "main-row"; tr.onclick = () => toggleDetail(idx);
      tr.innerHTML = `<td class="month-cell">${row.month} <span id="icon-${idx}" style="font-size:10px;">🔽</span></td><td>${formatNumber(row.sales)}</td><td>${formatNumber(row.cogs)}</td><td>${formatNumber(row.gp)}</td><td>${formatNumber(row.sga)}</td><td class="${getProfitClass(row.op)}">${formatNumber(row.op)}</td>`;
      tbody.appendChild(tr);

      const detailTr = document.createElement("tr"); detailTr.id = `detail-${idx}`; detailTr.className = "detail-row";
      if (currentMode === 'section' && isAdmin) {
        detailTr.innerHTML = `<td colspan="6" style="padding:0; border:none;"><div class="edit-box"><div class="edit-row"><label>매출액</label><input type="number" value="${row.sales}" /></div><div class="edit-row"><label>원가-노무비</label><input type="number" value="${row.cogs_labor}" /></div><div class="edit-row"><label>원가-경비</label><input type="number" value="${row.cogs_exp}" /></div><div class="edit-row"><label>판관-급여</label><input type="number" value="${row.sga_labor}" /></div><div class="edit-row"><label>판관-경비</label><input type="number" value="${row.sga_exp}" /></div><div class="edit-actions"><button class="save-btn" onclick="saveToSheet(this, ${idx})">데이터 저장 (빠른 반영)</button></div></div></td>`;
      } else {
        detailTr.innerHTML = `<td colspan="6" style="padding:0; border:none;"><div class="detail-box"><div class="d-row"><span class="d-title">🛒 매출원가 (${formatNumber(row.cogs)})</span><span class="d-value">노무비 <b>${formatNumber(row.cogs_labor)}</b> / 경비 <b>${formatNumber(row.cogs_exp)}</b></span></div><div class="d-row"><span class="d-title">🏢 판관비 (${formatNumber(row.sga)})</span><span class="d-value">급여 <b>${formatNumber(row.sga_labor)}</b> / 경비 <b>${formatNumber(row.sga_exp)}</b></span></div></div></td>`;
      }
      tbody.appendChild(detailTr);
    });

    const totalTr = document.createElement("tr"); totalTr.className = "total-row";
    totalTr.innerHTML = `<td>합계</td><td>${formatNumber(tSales)}</td><td>${formatNumber(tCogs)}</td><td>${formatNumber(tGp)}</td><td>${formatNumber(tSga)}</td><td class="${getProfitClass(tOp)}">${formatNumber(tOp)}</td>`;
    tbody.appendChild(totalTr);

    if (currentMode === 'group') {
      drawBarChart("salesChartArea", data, "sales", "var(--color-sales-bar)");
      drawBarChart("opChartArea", data, "op", "var(--positive)");
      drawPieCharts();
    } else {
      drawBarChart("sectionSalesChartArea", data, "sales", "var(--color-sales-bar)");
      drawBarChart("sectionOpChartArea", data, "op", "var(--positive)");
    }
  }

  // 🎯 2. KPI 렌더링
  function renderKPI() {
    let tSales = 0, tCogs = 0;
    appData["그룹전체"].forEach(r => { tSales += r.sales; tCogs += r.cogs; });
    let tGp = tSales - tCogs; 
    let actualGpMargin = tSales > 0 ? (tGp / tSales) * 100 : 0;
    
    let actualRec = 0; 
    Object.values(hrData).forEach(sec => { actualRec += (sec.mS*2) + (sec.mM*0.5) + (sec.fS*2) + (sec.fM*1); });

    let kpiList = [
      { key: "매출액", name: "1.총 매출액", unit: "백만원", actual: tSales || 0, target: kpiTarget["매출액"] || 11180, auto: true },
      { key: "매출총이익률", name: "2.매출(직접)총이익률", unit: "%", actual: actualGpMargin || 0, target: kpiTarget["매출총이익률"] || 5, auto: true },
      { key: "장애인산정인원", name: "3.장애인고용 산정인원", unit: "명", actual: actualRec || 0, target: kpiTarget["장애인산정인원"] || 15, auto: true },
      { key: "건강개선목표달성률(%)", name: "4.건강개선 목표 달성률", unit: "%", actual: kpiManualActuals["건강개선목표달성률(%)"], target: kpiTarget["건강개선목표달성률(%)"], auto: false },
      { key: "TRIFR(LTIFR)", name: "5.TRIFR(LTIFR)", unit: "건", actual: kpiManualActuals["TRIFR(LTIFR)"], target: kpiTarget["TRIFR(LTIFR)"], auto: false, lowerIsBetter: true },
      { key: "교육이수시간(Hr)", name: "6.교육이수시간", unit: "Hr", actual: kpiManualActuals["교육이수시간(Hr)"], target: kpiTarget["교육이수시간(Hr)"], auto: false }
    ];

    let html = ""; let adminHtml = `<h4 style="margin:0 0 10px 0; font-size:13px; color:var(--primary);">⚙️ KPI 목표 및 실적 수정</h4><div class="edit-grid" style="grid-template-columns: 1fr;">`;

    kpiList.forEach((k, idx) => {
      let rate = k.lowerIsBetter ? (k.actual <= k.target ? 100 : 0) : ((k.actual / (k.target||1)) * 100);
      let color = "var(--color-sales-bar)"; let icon = "🟢"; let textCls = "positive";
      let rateStr = rate.toFixed(1);

      if (rate >= 100) { color = "var(--positive)"; icon = "🟢"; textCls = "positive"; }
      else if (rate >= 80) { color = "var(--warning)"; icon = "🟡"; textCls = "warning"; }
      else { color = "var(--negative)"; icon = "🔴"; textCls = "negative"; }

      html += `<div style="margin-bottom:16px;"><div style="display:flex; justify-content:space-between; font-size:13px; font-weight:700; margin-bottom:6px;"><span>${k.name}</span><span class="${textCls}">목표 달성률 ${rateStr}% ${icon}</span></div><div style="background:#e2e8f0; border-radius:8px; height:12px; overflow:hidden; position:relative;"><div style="background:${color}; width:${Math.min(rate, 100)}%; height:100%;"></div></div><div style="font-size:11px; color:var(--sub); text-align:right; margin-top:4px;">현재 실적: <b>${formatValue(k.actual, k.unit)}${k.unit}</b> / 목표치: <b>${formatValue(k.target, k.unit)}${k.unit}</b></div></div>`;
      
      adminHtml += `<div style="background:#fff; padding:8px; border:1px solid #e2e8f0; border-radius:6px;"><div style="font-size:12px; font-weight:700; margin-bottom:6px; color:#1E3A8A;">📌 ${k.name}</div><div style="display:flex; gap:10px;"><div class="edit-row" style="flex:1;"><label>목표치</label><input id="kpi-target-${idx}" value="${k.target}"></div>${!k.auto ? `<div class="edit-row" style="flex:1;"><label>수동 실적</label><input id="kpi-actual-${idx}" value="${k.actual}"></div>` : `<div style="flex:1; font-size:11px; color:#94a3b8; align-self:center; text-align:right;">(자동계산)</div>`}</div></div>`;
    });
    
    adminHtml += `</div><button class="save-btn" onclick="saveKPI()">KPI 변경사항 저장</button>`;
    
    document.getElementById('kpi-content').innerHTML = html;
    document.getElementById('kpi-admin').style.display = isAdmin ? 'block' : 'none';
    if(isAdmin) document.getElementById('kpi-admin').innerHTML = adminHtml;
  }

  // 👥 3. HR(인원현황) 렌더링
  function renderHR() {
    const container = document.getElementById("hrCardsContainer"); container.innerHTML = "";
    const calcRec = (mS, mM, fS, fM) => (mS*2) + (mM*0.5) + (fS*2) + (fM*1);
    const calcRatio = (rec, tot) => tot > 0 ? ((rec/tot)*100).toFixed(1) + '%' : '0.0%';
    let g = {mT:0, fT:0, mS:0, mM:0, fS:0, fM:0};
    Object.values(hrData).forEach(sec => { g.mT+=sec.mT; g.fT+=sec.fT; g.mS+=sec.mS; g.mM+=sec.mM; g.fS+=sec.fS; g.fM+=sec.fM; });

    const makeCard = (title, secKey, d, isGroup) => {
      let tot = d.mT + d.fT; let rec = calcRec(d.mS, d.mM, d.fS, d.fM); let adminHtml = '';
      if(isAdmin && !isGroup) {
        adminHtml = `<div class="hr-grid"><div class="hr-input-group"><label>남성 총원</label><input id="mT_${secKey}" value="${d.mT}"></div><div class="hr-input-group"><label>여성 총원</label><input id="fT_${secKey}" value="${d.fT}"></div><div class="hr-input-group"><label>남성 중증</label><input id="mS_${secKey}" value="${d.mS}"></div><div class="hr-input-group"><label>여성 중증</label><input id="fS_${secKey}" value="${d.fS}"></div><div class="hr-input-group"><label>남성 경증</label><input id="mM_${secKey}" value="${d.mM}"></div><div class="hr-input-group"><label>여성 경증</label><input id="fM_${secKey}" value="${d.fM}"></div></div><button class="save-btn" style="margin-top:10px;" onclick="saveHR('${secKey}')">인원 정보 저장</button>`;
      }
      return `<div class="hr-card ${isGroup ? 'hr-group' : ''}"><div class="hr-title">${title}</div><div class="hr-row"><span class="hr-label">총 근무 인원</span><span class="hr-val">${tot}명 <span class="hr-sub">(남 ${d.mT} / 여 ${d.fT})</span></span></div><div class="hr-row" style="margin-bottom:4px;"><span class="hr-label">장애인 산정 인원</span><div><span class="hr-val">${rec}명</span><span class="hr-badge">고용률 ${calcRatio(rec, tot)}</span></div></div><div style="font-size:11px; color:#94a3b8; text-align:right;">실제: 중증(남${d.mS},여${d.fS}) / 경증(남${d.mM},여${d.fM})</div>${adminHtml}</div>`;
    };
    container.innerHTML += makeCard("🏢 그룹전체 합계", "", g, true);
    container.innerHTML += makeCard("📋 사무지원", "광양사무지원", hrData["광양사무지원"], false);
    container.innerHTML += makeCard("💼 총무지원", "광양총무지원", hrData["광양총무지원"], false);
    container.innerHTML += makeCard("🚗 차량지원", "광양차량지원", hrData["광양차량지원"], false);
  }

  /* ===============================
     ✅ 저장 기능 (API 통신)
  ================================ */
  async function saveToSheet(btn, idx) {
    const inputs = btn.closest('.edit-box').querySelectorAll('input');
    const sales = Number(inputs[0].value || 0), cogsLabor = Number(inputs[1].value || 0), cogsExp = Number(inputs[2].value || 0), sgaLabor = Number(inputs[3].value || 0), sgaExp = Number(inputs[4].value || 0);

    const payload = { type: 'profit', yearMonth: `${currentYear}-${String(idx + 1).padStart(2, "0")}`, section: currentSection, sales: sales, cogsLabor: cogsLabor, cogsExp: cogsExp, sgaLabor: sgaLabor, sgaExp: sgaExp };
    showLoading(true, "구글 시트에 저장하는 중입니다...");
    try {
      await fetch(API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
      const cogs = cogsLabor + cogsExp; const gp = sales - cogs; const sga = sgaLabor + sgaExp; const op = gp - sga;
      baseData[currentSection][idx] = { ...baseData[currentSection][idx], sales, cogs_labor: cogsLabor, cogs_exp: cogsExp, sga_labor: sgaLabor, sga_exp: sgaExp, cogs, gp, sga, op };
      updateDashboard();
      const detailRow = document.getElementById(`detail-${idx}`); const icon = document.getElementById(`icon-${index}`);
      if (detailRow) detailRow.style.display = 'table-row'; if (icon) icon.innerText = '🔼';
    } catch (error) { alert("저장 중 오류가 발생했습니다."); } finally { showLoading(false); }
  }

  async function saveKPI() {
    let keys = [{key: "매출액", auto: true}, {key: "매출총이익률", auto: true}, {key: "장애인산정인원", auto: true}, {key: "건강개선목표달성률(%)", auto: false}, {key: "TRIFR(LTIFR)", auto: false}, {key: "교육이수시간(Hr)", auto: false}];
    let payload = { type: 'kpi_multi', kpis: [] };
    keys.forEach((k, idx) => { payload.kpis.push({ name: k.key, target: Number(document.getElementById(`kpi-target-${idx}`).value), actual: k.auto ? null : Number(document.getElementById(`kpi-actual-${idx}`).value) }); });
    showLoading(true, "KPI를 저장중입니다...");
    try { await fetch(API_URL, { method: "POST", body: JSON.stringify(payload) }); alert("🎯 저장되었습니다!"); await loadData(); } catch(e) { alert("저장에 실패했습니다."); showLoading(false); }
  }

  async function saveHR(secKey) {
    let p = { type: 'personnel', section: secKey, mT: +document.getElementById(`mT_${secKey}`).value, fT: +document.getElementById(`fT_${secKey}`).value, mS: +document.getElementById(`mS_${secKey}`).value, mM: +document.getElementById(`mM_${secKey}`).value, fS: +document.getElementById(`fS_${secKey}`).value, fM: +document.getElementById(`fM_${secKey}`).value };
    showLoading(true, "인원 정보를 저장중입니다...");
    try { await fetch(API_URL, { method: "POST", body: JSON.stringify(p) }); alert("👥 저장되었습니다!"); await loadData(); } catch(e) { alert("저장에 실패했습니다."); showLoading(false); }
  }

  /* ===============================
     ✅ 차트 그리기 함수
  ================================ */
  function drawBarChart(containerId, data, key, positiveColor) {
    const chartArea = document.getElementById(containerId); if (!chartArea) return; chartArea.innerHTML = "";
    const isOp = (key === "op");
    const line = document.createElement("div"); line.style.position = "absolute"; line.style.left = "0"; line.style.right = "0"; line.style.height = "1px"; line.style.zIndex = "0";
    if (isOp) { line.style.borderTop = "1px solid #999"; line.style.top = "calc(50% - 11px)"; } else { line.style.borderTop = "1px dashed #cbd5e1"; line.style.bottom = "22px"; }
    chartArea.appendChild(line);

    const maxVal = Math.max(...data.map(d => Math.abs(d[key])), 1);
    data.forEach(row => {
      const val = row[key]; const isPositive = val >= 0; const isEmpty = row.sales === 0 && row.cogs === 0 && row.sga === 0 && row.op === 0;
      const col = document.createElement("div"); col.className = "bar-col"; const barWrapper = document.createElement("div"); barWrapper.className = "bar-wrapper";
      let heightPercent = isEmpty ? 0 : (Math.abs(val) / maxVal) * 95;
      const bar = document.createElement("div"); bar.className = isEmpty ? "bar bar-empty" : "bar"; bar.style.background = isEmpty ? "#cbd5e1" : (isPositive ? positiveColor : "var(--negative)");
      if (isOp) { bar.style.height = isEmpty ? "2px" : `${heightPercent / 2}%`; if (isPositive) { bar.style.bottom = "50%"; bar.style.borderRadius = "4px 4px 0 0"; bar.style.alignItems = "flex-start"; bar.style.paddingTop = "4px"; } else { bar.style.top = "50%"; bar.style.borderRadius = "0 0 4px 4px"; bar.style.alignItems = "flex-end"; bar.style.paddingBottom = "4px"; } } else { bar.style.height = isEmpty ? "2px" : `${heightPercent}%`; bar.style.bottom = "0"; bar.style.borderRadius = "4px 4px 0 0"; bar.style.alignItems = "flex-start"; bar.style.paddingTop = "4px"; }
      bar.innerHTML = isEmpty ? '' : formatNumber(val); barWrapper.appendChild(bar);
      const labelArea = document.createElement("div"); labelArea.className = "bar-label"; labelArea.innerText = row.month; col.appendChild(barWrapper); col.appendChild(labelArea); chartArea.appendChild(col);
    });
  }

  function drawPieCharts() {
    const getSum = (sec, key) => appData[sec].reduce((sum, d) => sum + d[key], 0);
    renderPie("pieChartSales", "pieLegendSales", [{ name: "광양사무지원", value: getSum("광양사무지원", "sales"), color: "var(--color-samu)" }, { name: "광양총무지원", value: getSum("광양총무지원", "sales"), color: "var(--color-chongmu)" }, { name: "광양차량지원", value: getSum("광양차량지원", "sales"), color: "var(--color-car)" }], false);
    renderPie("pieChartOp", "pieLegendOp", [{ name: "광양사무지원", value: Math.abs(getSum("광양사무지원", "op")), raw: getSum("광양사무지원", "op"), color: "var(--color-samu)" }, { name: "광양총무지원", value: Math.abs(getSum("광양총무지원", "op")), raw: getSum("광양총무지원", "op"), color: "var(--color-chongmu)" }, { name: "광양차량지원", value: Math.abs(getSum("광양차량지원", "op")), raw: getSum("광양차량지원", "op"), color: "var(--color-car)" }], true);
  }

  function renderPie(chartId, legendId, items, isOp) {
    const total = items.reduce((sum, item) => sum + item.value, 0); const chartEl = document.getElementById(chartId); const legendEl = document.getElementById(legendId);
    if(!chartEl || !legendEl) return;
    if (total > 0) {
      let accum = 0; chartEl.style.background = `conic-gradient(${items.map(item => { const start = accum; accum += (item.value / total) * 100; return `${item.color} ${start}% ${accum}%`; }).join(", ")})`;
      legendEl.innerHTML = items.map(item => { const displayVal = isOp ? item.raw : item.value; const colorClass = isOp && displayVal < 0 ? 'negative' : (isOp && displayVal > 0 ? 'positive' : ''); return `<div class="legend-item"><div class="legend-label"><span class="dot" style="background:${item.color}"></span>${item.name}</div><div class="legend-value">${((item.value / total) * 100).toFixed(1)}%<br><span class="${colorClass}">${formatNumber(displayVal)}</span></div></div>`; }).join("");
    } else { chartEl.style.background = "#e2e8f0"; legendEl.innerHTML = `<div class="muted">데이터 없음</div>`; }
  }

  window.onload = loadData;
</script>
