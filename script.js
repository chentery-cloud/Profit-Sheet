const API_URL = "https://script.google.com/macros/s/AKfycbxFUnKylYPnsFfkh1TlBB6H2PdGvQ6BoDoMPi9GkN_dQgA8SjtMzBz98YUAfvR1-RLhSQ/exec";

// 오늘 날짜 기본값
document.getElementById("date").value =
  new Date().toISOString().slice(0, 10);

document.getElementById("saveBtn").addEventListener("click", async () => {
  const data = {
    date: document.getElementById("date").value,
    type: document.getElementById("type").value,
    category: document.getElementById("category").value,
    amount: Number(document.getElementById("amount").value),
    memo: document.getElementById("memo").value
  };

  if (!data.amount || !data.category) {
    alert("금액과 카테고리는 필수입니다");
    return;
  }

  await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  alert("저장 완료 ✅");

  // 입력 초기화
  document.getElementById("amount").value = "";
  document.getElementById("memo").value = "";
});
