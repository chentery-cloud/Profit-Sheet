const API_URL =
  "https://script.google.com/macros/s/AKfycbxwdVHq0eg26DcQpFysPzCcHCQ8efzjWjJwTPoLtF8OiTPlQA7v7_gF4o7M7nJZE2QKNA/exec";

/* =========================
   오늘 날짜 기본값
========================= */
document.getElementById("date").value =
  new Date().toISOString().slice(0, 10);

/* =========================
   저장 버튼 클릭
========================= */
document.getElementById("saveBtn").addEventListener("click", async () => {
  const data = {
    date: document.getElementById("date").value,
    type: document.getElementById("type").value,
    category: document.getElementById("category").value,
    amount: document.getElementById("amount").value,
    memo: document.getElementById("memo").value
  };

  if (!data.amount || !data.category) {
    alert("금액과 카테고리는 필수입니다");
    return;
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        // ⭐ JSON 금지, form 방식 사용
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams(data)
    });

    const text = await res.text();
    console.log("서버 응답:", text);

    alert("저장 완료 ✅");

    // 입력 초기화
    document.getElementById("amount").value = "";
    document.getElementById("memo").value = "";

  } catch (err) {
    console.error(err);
    alert("저장 실패 ❌ 콘솔 확인");
  }
});
