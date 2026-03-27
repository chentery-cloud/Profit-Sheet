<script>
  /* ===============================
     ✅ API 및 환경 설정
  ================================ */
  const API_URL = "https://script.google.com/macros/s/AKfycby-J27YZjtkw04iurB1YD8vpTVvlGHOFgzq58m0UpEdo5iZs4hI8OC8nLm0oYI0Do91/exec";
  
  let isAdmin = false;
  const ADMIN_PASS = "admin1234";
  let currentYear = "2026";

  let baseData = {};
  let appData = {};
  let currentMode = 'group';
  let currentSection = '광양사무지원';

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
    const loadingText = document.getElementById('loadingText');
    if (loadingText) loadingText.innerText = text;
    if (overlay) overlay.style.display = show ? 'flex' : 'none';
  }

  // 1️⃣ 캐시 방지(Cache Buster) 적용
  async function fetchRecords() {
    try {
      const urlWithCacheBuster = `${API_URL}?t=${new Date().getTime()}`;
      const res = await fetch(urlWithCacheBuster);
      return await res.json();
    } catch (e) {
      alert("데이터를 불러오는데 실패했습니다.");
      return [];
    }
  }

  function buildBaseDataFromSheet(records, year) {
    const makeEmpty = () => Array.from({ length: 12 }, (_, i) => ({
      month: `${i + 1}월`,
      sales: 0, cogs: 0, gp: 0, sga: 0, op: 0,
      cogs_labor: 0, cogs_exp: 0, sga_labor: 0, sga_exp: 0
    }));

    const data = {
      "광양사무지원": makeEmpty(),
      "광양총무지원": makeEmpty(),
      "광양차량지원": makeEmpty()
    };

    records.forEach(r => {
      if (!r["년월"] || !r["년월"].startsWith(year)) return;
      if (!data[r["섹션"]]) return;

      const m = Number(r["년월"].slice(5, 7)) - 1;
      const t = data[r["섹션"]][m];

      t.sales += Number(r["매출액"] || 0);
      t.cogs_labor += Number(r["원가-노무비"] || 0);
      t.cogs_exp += Number(r["원가-경비"] || 0);
      t.sga_labor += Number(r["판관-급여"] || 0);
      t.sga_exp += Number(r["판관-경비"] || 0);
    });

    // 계산 필드 세팅
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

  function processData() {
    // 그룹 전체 합계 계산
    const groupTotal = baseData["광양사무지원"].map((item, i) => {
      const ch = baseData["광양총무지원"][i];
      const ca = baseData["광양차량지원"][i];
      return {
        month: item.month,
        sales: item.sales + ch.sales + ca.sales,
        cogs: item.cogs + ch.cogs + ca.cogs,
        gp: item.gp + ch.gp + ca.gp,
        sga: item.sga + ch.sga + ca.sga,
        op: item.op + ch.op + ca.op,
        cogs_labor: item.cogs_labor + ch.cogs_labor + ca.cogs_labor,
        cogs_exp: item.cogs_exp + ch.cogs_exp + ca.cogs_exp,
        sga_labor: item.sga_labor + ch.sga_labor + ca.sga_labor,
        sga_exp: item.sga_exp + ch.sga_exp + ca.sga_exp
      };
    });

    appData = {
      "그룹전체": groupTotal,
      "광양사무지원": baseData["광양사무지원"],
      "광양총무지원": baseData["광양총무지원"],
      "광양차량지원": baseData["광양차량지원"]
    };
  }

  async function loadData() {
    showLoading(true, "데이터를 불러오는 중입니다...");
    const records = await fetchRecords();
    baseData = buildBaseDataFromSheet(records, currentYear);
    processData();
    updateDashboard();
    showLoading(false);
  }

  /* ===============================
     ✅ UI 및 기능 제어
  ================================ */
  function changeYear() {
    currentYear = document.getElementById("yearSelect").value;
    loadData();
  }

  function toggleAdmin() {
    if (isAdmin) {
      isAdmin = false;
      document.getElementById('adminBtn').innerText = '관리자 로그인';
      alert('관리자 모드가 종료되었습니다.');
    } else {
      const pass = prompt('관리자 비밀번호를 입력하세요:');
      if (pass === ADMIN_PASS) {
        isAdmin = true;
        document.getElementById('adminBtn').innerText = '관리자 로그아웃';
        alert('관리자 모드가 활성화되었습니다.');
      } else if (pass !== null) {
        alert('비밀번호가 올바르지 않습니다.');
      }
    }
    updateDashboard();
  }

  function setMode(mode) {
    currentMode = mode;
    document.getElementById('tab-group').classList.toggle('active', mode === 'group');
    document.getElementById('tab-section').classList.toggle('active', mode === 'section');
    document.getElementById('section-buttons').style.display = mode === 'group' ? 'none' : 'flex';
    document.getElementById('group-charts').style.display = mode === 'group' ? 'block' : 'none';
    document.getElementById('section-charts').style.display = mode === 'group' ? 'none' : 'block';
    updateDashboard();
  }

  function setSection(sec) {
    currentSection = sec;
    document.querySelectorAll('.sec-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-${sec}`).classList.add('active');
    updateDashboard();
  }

  function toggleDetail(index) {
    const detailRow = document.getElementById(`detail-${index}`);
    const icon = document.getElementById(`icon-${index}`);
    if (!detailRow) return;
    if (detailRow.style.display === 'table-row') {
      detailRow.style.display = 'none';
      if (icon) icon.innerText = '🔽';
    } else {
      detailRow.style.display = 'table-row';
      if (icon) icon.innerText = '🔼';
    }
  }

  /* ===============================
     ✅ 데이터 포맷 및 렌더링
  ================================ */
  function formatNumber(num) {
    if (num === null || num === undefined) return "-";
    return num === 0 ? "0" : num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function getProfitClass(val) {
    return val > 0 ? "profit positive" : val < 0 ? "profit negative" : "profit";
  }

  function getInsightComment(curr, prev) {
    if (!curr || curr.sales <= 0) return '데이터가 입력되지 않았습니다.';

    const opMargin = ((curr.op / curr.sales) * 100).toFixed(1);
    const laborTotal = curr.cogs_labor + curr.sga_labor;
    const laborRatio = curr.sales > 0 ? ((laborTotal / curr.sales) * 100).toFixed(1) : 0;

    let text = `영업이익률 <b>${opMargin}%</b> 기록. `;
    if (prev && prev.sales > 0) {
      if (curr.op > prev.op) text += `전월비 <b class="good">수익성 개선</b>. `;
      else if (curr.op < prev.op) text += `전월비 <b class="bad">수익성 하락</b>. `;
      else text += `전월과 유사한 실적. `;
    } else {
      if (curr.op > 0) text += `<b class="good">흑자 출발</b>. `;
      else if (curr.op < 0) text += `<b class="bad">적자 발생</b>. `;
    }

    if (laborRatio >= 50) text += `(노무비 비중 <b class="bad">${laborRatio}%</b> 주의)`;
    else text += `(노무비 비중 <b>${laborRatio}%</b> 적정 유지)`;

    return text;
  }

  function updateDashboard() {
    processData();
    const targetKey = currentMode === 'group' ? '그룹전체' : currentSection;
    const data = appData[targetKey];

    document.getElementById("tableTitle").innerText = `[${currentYear}] ${titleMap[targetKey]} 손익표`;

    if (currentMode === 'section') {
      document.getElementById("sectionSalesChartTitle").innerText = `📊 ${titleMap[targetKey]} 매출액 추이`;
      document.getElementById("sectionOpChartTitle").innerText = `📈 ${titleMap[targetKey]} 영업이익 추이`;
    }

    const tbody = document.getElementById("tableBody");
    tbody.innerHTML = "";

    let tSales = 0, tCogs = 0, tGp = 0, tSga = 0, tOp = 0;

    data.forEach((row, idx) => {
      tSales += row.sales; tCogs += row.cogs; tGp += row.gp; tSga += row.sga; tOp += row.op;

      const tr = document.createElement("tr");
      tr.className = "main-row";
      tr.onclick = () => toggleDetail(idx);
      tr.innerHTML = `
        <td class="month-cell">${row.month} <span id="icon-${idx}" style="font-size:10px;">🔽</span></td>
        <td>${formatNumber(row.sales)}</td>
        <td>${formatNumber(row.cogs)}</td>
        <td>${formatNumber(row.gp)}</td>
        <td>${formatNumber(row.sga)}</td>
        <td class="${getProfitClass(row.op)}">${formatNumber(row.op)}</td>
      `;
      tbody.appendChild(tr);

      const aiComment = getInsightComment(row, idx > 0 ? data[idx - 1] : null);
      const detailTr = document.createElement("tr");
      detailTr.id = `detail-${idx}`;
      detailTr.className = "detail-row";

      if (currentMode === 'section' && isAdmin) {
        detailTr.innerHTML = `
          <td colspan="6" style="padding:0; border:none;">
            <div class="edit-box">
              <div class="edit-row"><label>매출액</label><input type="number" value="${row.sales}" /></div>
              <div class="edit-row"><label>원가-노무비</label><input type="number" value="${row.cogs_labor}" /></div>
              <div class="edit-row"><label>원가-경비</label><input type="number" value="${row.cogs_exp}" /></div>
              <div class="edit-row"><label>판관-급여</label><input type="number" value="${row.sga_labor}" /></div>
              <div class="edit-row"><label>판관-경비</label><input type="number" value="${row.sga_exp}" /></div>
              <div class="edit-actions"><button class="save-btn" onclick="saveToSheet(this, ${idx})">구글 시트에 저장</button></div>
            </div>
          </td>`;
      } else {
        detailTr.innerHTML = `
          <td colspan="6" style="padding:0; border:none;">
            <div class="detail-box">
              <div class="d-row"><span class="d-title">🛒 매출원가 (${formatNumber(row.cogs)})</span>
              <span class="d-value">노무비 <b>${formatNumber(row.cogs_labor)}</b> / 경비 <b>${formatNumber(row.cogs_exp)}</b></span></div>
              <div class="d-row"><span class="d-title">🏢 판관비 (${formatNumber(row.sga)})</span>
              <span class="d-value">급여 <b>${formatNumber(row.sga_labor)}</b> / 경비 <b>${formatNumber(row.sga_exp)}</b></span></div>
              <div class="insight-box">${aiComment}</div>
            </div>
          </td>`;
      }
      tbody.appendChild(detailTr);
    });

    const totalTr = document.createElement("tr");
    totalTr.className = "total-row";
    totalTr.innerHTML = `
      <td>합계</td>
      <td>${formatNumber(tSales)}</td>
      <td>${formatNumber(tCogs)}</td>
      <td>${formatNumber(tGp)}</td>
      <td>${formatNumber(tSga)}</td>
      <td class="${getProfitClass(tOp)}">${formatNumber(tOp)}</td>
    `;
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

  /* ===============================
     ✅ 저장 기능 (API POST) - 빠른 UI 업데이트 반영 (Optimistic Update)
  ================================ */
  async function saveToSheet(btn, idx) {
    const inputs = btn.closest('.edit-box').querySelectorAll('input');
    
    // 입력값 가져오기
    const sales = Number(inputs[0].value || 0);
    const cogsLabor = Number(inputs[1].value || 0);
    const cogsExp = Number(inputs[2].value || 0);
    const sgaLabor = Number(inputs[3].value || 0);
    const sgaExp = Number(inputs[4].value || 0);

    const payload = {
      yearMonth: `${currentYear}-${String(idx + 1).padStart(2, "0")}`,
      section: currentSection,
      sales: sales,
      cogsLabor: cogsLabor,
      cogsExp: cogsExp,
      sgaLabor: sgaLabor,
      sgaExp: sgaExp
    };

    showLoading(true, "구글 시트에 저장하는 중입니다...");

    try {
      // 1. 구글 시트로 백그라운드 전송
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" }, // CORS 방지
        body: JSON.stringify(payload)
      });

      // 2. 서버 응답을 기다리지 않고, 로컬 데이터를 즉시 재계산 및 덮어쓰기
      const cogs = cogsLabor + cogsExp;
      const gp = sales - cogs;
      const sga = sgaLabor + sgaExp;
      const op = gp - sga;

      // 내가 수정한 섹션의 데이터만 바로 업데이트
      baseData[currentSection][idx] = {
        ...baseData[currentSection][idx],
        sales: sales,
        cogs_labor: cogsLabor,
        cogs_exp: cogsExp,
        sga_labor: sgaLabor,
        sga_exp: sgaExp,
        cogs: cogs,
        gp: gp,
        sga: sga,
        op: op
      };

      alert("구글 시트에 성공적으로 저장되었습니다.");
      
      // 3. 화면 갱신 (서버에서 다시 안 불러와도 이미 수정한 값으로 다시 그려짐)
      updateDashboard();
      
      // 4. 방금 수정한 탭을 닫히지 않고 다시 열어두기
      const detailRow = document.getElementById(`detail-${idx}`);
      const icon = document.getElementById(`icon-${idx}`);
      if (detailRow) detailRow.style.display = 'table-row';
      if (icon) icon.innerText = '🔼';

    } catch (error) {
      console.error(error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      showLoading(false);
    }
  }

  /* ===============================
     ✅ 차트 그리기 함수 (변경 없음)
  ================================ */
  function drawBarChart(containerId, data, key, positiveColor) {
    const chartArea = document.getElementById(containerId);
    if (!chartArea) return;
    chartArea.innerHTML = "";
    
    const isOp = (key === "op");
    const line = document.createElement("div");
    line.style.position = "absolute"; line.style.left = "0"; line.style.right = "0"; line.style.height = "1px"; line.style.zIndex = "0";
    if (isOp) { line.style.borderTop = "1px solid #999"; line.style.top = "calc(50% - 11px)"; } 
    else { line.style.borderTop = "1px dashed #cbd5e1"; line.style.bottom = "22px"; }
    chartArea.appendChild(line);

    const values = data.map(d => Math.abs(d[key]));
    const maxVal = Math.max(...values, 1);

    data.forEach(row => {
      const val = row[key];
      const isPositive = val >= 0;
      const isEmpty = row.sales === 0 && row.cogs === 0 && row.sga === 0 && row.op === 0;

      const col = document.createElement("div"); col.className = "bar-col";
      const barWrapper = document.createElement("div"); barWrapper.className = "bar-wrapper";
      let heightPercent = isEmpty ? 0 : (Math.abs(val) / maxVal) * 95;

      const bar = document.createElement("div");
      bar.className = isEmpty ? "bar bar-empty" : "bar";
      bar.style.background = isEmpty ? "#cbd5e1" : (isPositive ? positiveColor : "var(--negative)");

      if (isOp) {
        bar.style.height = isEmpty ? "2px" : `${heightPercent / 2}%`;
        if (isPositive) { bar.style.bottom = "50%"; bar.style.borderRadius = "4px 4px 0 0"; bar.style.alignItems = "flex-start"; bar.style.paddingTop = "4px"; } 
        else { bar.style.top = "50%"; bar.style.borderRadius = "0 0 4px 4px"; bar.style.alignItems = "flex-end"; bar.style.paddingBottom = "4px"; }
      } else {
        bar.style.height = isEmpty ? "2px" : `${heightPercent}%`;
        bar.style.bottom = "0"; bar.style.borderRadius = "4px 4px 0 0"; bar.style.alignItems = "flex-start"; bar.style.paddingTop = "4px";
      }
      bar.innerHTML = isEmpty ? '' : formatNumber(val);
      barWrapper.appendChild(bar);

      const labelArea = document.createElement("div"); labelArea.className = "bar-label"; labelArea.innerText = row.month;
      col.appendChild(barWrapper); col.appendChild(labelArea); chartArea.appendChild(col);
    });
  }

  function drawPieCharts() {
    const getSum = (sec, key) => appData[sec].reduce((sum, d) => sum + d[key], 0);
    const salesItems = [
      { name: "광양사무지원", value: getSum("광양사무지원", "sales"), color: "var(--color-samu)" },
      { name: "광양총무지원", value: getSum("광양총무지원", "sales"), color: "var(--color-chongmu)" },
      { name: "광양차량지원", value: getSum("광양차량지원", "sales"), color: "var(--color-car)" }
    ];
    renderPie("pieChartSales", "pieLegendSales", salesItems, false);

    const opItems = [
      { name: "광양사무지원", value: Math.abs(getSum("광양사무지원", "op")), raw: getSum("광양사무지원", "op"), color: "var(--color-samu)" },
      { name: "광양총무지원", value: Math.abs(getSum("광양총무지원", "op")), raw: getSum("광양총무지원", "op"), color: "var(--color-chongmu)" },
      { name: "광양차량지원", value: Math.abs(getSum("광양차량지원", "op")), raw: getSum("광양차량지원", "op"), color: "var(--color-car)" }
    ];
    renderPie("pieChartOp", "pieLegendOp", opItems, true);
  }

  function renderPie(chartId, legendId, items, isOp) {
    const total = items.reduce((sum, item) => sum + item.value, 0);
    const chartEl = document.getElementById(chartId);
    const legendEl = document.getElementById(legendId);
    if(!chartEl || !legendEl) return;

    if (total > 0) {
      let accum = 0;
      const gradients = items.map(item => {
        const start = accum;
        const pct = (item.value / total) * 100;
        accum += pct;
        return `${item.color} ${start}% ${accum}%`;
      }).join(", ");

      chartEl.style.background = `conic-gradient(${gradients})`;
      legendEl.innerHTML = items.map(item => {
        const displayVal = isOp ? item.raw : item.value;
        const colorClass = isOp && displayVal < 0 ? 'negative' : (isOp && displayVal > 0 ? 'positive' : '');
        return `
        <div class="legend-item">
          <div class="legend-label"><span class="dot" style="background:${item.color}"></span>${item.name}</div>
          <div class="legend-value">${((item.value / total) * 100).toFixed(1)}%<br><span class="${colorClass}">${formatNumber(displayVal)}</span></div>
        </div>`;
      }).join("");
    } else {
      chartEl.style.background = "#e2e8f0";
      legendEl.innerHTML = `<div class="muted">데이터 없음</div>`;
    }
  }

  /* ===============================
     ✅ 초기 실행
  ================================ */
  window.onload = () => {
    loadData();
  };
</script>
