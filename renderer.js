const { ipcRenderer } = require("electron");
const { solveMauBinh } = require("./mau_binh_logic.js");
let currentAction = null;
// Simple debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.__inited) return; // tránh init lại
  window.__inited = true;
  console.log("Start renderer at:", new Date().toISOString());

  const systemKeysInput = document.getElementById("systemKeys");
  const joinDelayInput = document.getElementById("joinDelay");
  const checkDelayInput = document.getElementById("checkDelay");
  const selectedTableInput = document.getElementById("selectedTable");
  const btnJoinTable = document.getElementById("btnJoinTable");
  const btnCreateTable = document.getElementById("btnCreateTable");
  const btnLeaveTable = document.getElementById("btnLeaveTable");
  let activeAction = null; // 'join' or 'create' or null
  const statusLog = document.getElementById("statusLog");

  // Hàm lưu cấu hình vào localStorage
  const saveToLocalStorage = (config) => {
    try {
      localStorage.setItem("phomConfig", JSON.stringify(config));
      logStatus("Cấu hình đã được lưu vào localStorage");
    } catch (error) {
      logStatus(`Lỗi khi lưu cấu hình: ${error.message}`);
    }
  };

  // Hàm tải cấu hình từ localStorage
  const loadFromLocalStorage = () => {
    try {
      const savedConfig = localStorage.getItem("phomConfig");
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        systemKeysInput.value = config.systemKeys.join(",");
        joinDelayInput.value = Math.max(3000, config.joinDelay || 3000);
        checkDelayInput.value = Math.max(3000, config.checkDelay || 3000);
        selectedTableInput.value = config.selectedTable;
        logStatus("Đã tải cấu hình từ localStorage");
        return config;
      }
    } catch (error) {
      logStatus(`Lỗi khi tải cấu hình: ${error.message}`);
    }
    return null;
  };

  // Hàm ghi log vào statusLog
  const logStatus = (message) => {
    statusLog.value += `${message}\n`;
    statusLog.scrollTop = statusLog.scrollHeight;
  };

  const getSystemKeys = () => {
    return (systemKeysInput.value || "")
      .split(",")
      .map((key) => key.trim())
      .filter((key) => key);
  };

  // Hàm lưu cấu hình
  const saveSettings = () => {
    const joinDelay = Math.max(3000, parseInt(joinDelayInput.value) || 3000);
    const checkDelay = Math.max(3000, parseInt(checkDelayInput.value) || 3000);
    const selectedTable = selectedTableInput.value;
    const systemKeys = getSystemKeys();
    const config = {
      joinDelay,
      checkDelay,
      selectedTable,
      systemKeys,
    };

    saveToLocalStorage(config);
    ipcRenderer.send("broadcast", {
      action: "saveSettings",
      ...config,
    });
    logStatus("Cài đặt đã được gửi đến các extension");
  };

  // Debounced save settings
  const debouncedSaveSettings = debounce(saveSettings, 1000);

  // Tải cấu hình khi trang được tải
  loadFromLocalStorage();
  saveSettings();

  // Auto-save on input changes
  systemKeysInput.addEventListener("input", debouncedSaveSettings);
  joinDelayInput.addEventListener("input", debouncedSaveSettings);
  checkDelayInput.addEventListener("input", debouncedSaveSettings);
  selectedTableInput.addEventListener("change", debouncedSaveSettings);

  const resetButtons = () => {
    btnJoinTable.textContent = "Vào Bàn";
    btnJoinTable.style.backgroundColor = "#007bff";
    btnCreateTable.textContent = "Tạo Bàn";
    btnCreateTable.style.backgroundColor = "#28a745";
    activeAction = null;
  };

  btnJoinTable.addEventListener("click", () => {
    if (activeAction === "join") {
      ipcRenderer.send("broadcast", { action: "stopJoinTable", isStop: true });
      resetButtons();
      logStatus("Đã dừng vào bàn");
    } else {
      if (activeAction === "create") {
        ipcRenderer.send("broadcast", { action: "stopCreateTable", isStop: true });
      }
      activeAction = "join";
      ipcRenderer.send("broadcast", { action: "joinTable" });
      btnJoinTable.textContent = "Dừng Vào Bàn";
      btnJoinTable.style.backgroundColor = "red";
      btnCreateTable.textContent = "Tạo Bàn";
      btnCreateTable.style.backgroundColor = "#28a745";
      logStatus("Bắt đầu vào bàn");
    }
  });

  btnCreateTable.addEventListener("click", () => {
    if (activeAction === "create") {
      ipcRenderer.send("broadcast", { action: "stopCreateTable", isStop: true });
      resetButtons();
      logStatus("Đã dừng tạo bàn");
    } else {
      if (activeAction === "join") {
        ipcRenderer.send("broadcast", { action: "stopJoinTable", isStop: true });
      }
      activeAction = "create";
      ipcRenderer.send("broadcast", { action: "createTable" });
      btnCreateTable.textContent = "Dừng Tạo Bàn";
      btnCreateTable.style.backgroundColor = "red";
      btnJoinTable.textContent = "Vào Bàn";
      btnJoinTable.style.backgroundColor = "#007bff";
      logStatus("Bắt đầu tạo bàn");
    }
  });

  btnLeaveTable.addEventListener("click", () => {
    ipcRenderer.send("broadcast", { action: "leaveTable", isStop: true });
    resetButtons();
    logStatus("Đã rời bàn");
  });

  const playerList = document.getElementById("playerList");
  const solverGroup = document.getElementById("solverGroup");
  let playersData = {}; // { playerName: { solutions: [], selectedIndex: 0 } }
  let allConnectedPlayers = [];

  const renderCardsHtml = (cardsStr) => {
    return cardsStr.map(cardStr => {
      const suit = cardStr.slice(-1);
      const value = cardStr.slice(0, -1);
      const isRed = (suit === '♦' || suit === '♥');
      return `<span class="playing-card ${isRed ? 'red' : ''}">${value}${suit}</span>`;
    }).join('');
  };

  const getHighlightClass = (loai) => {
    if (["Thùng Phá Sảnh", "Tứ Quí"].includes(loai)) return 'special-gold';
    if (["3 cái Thùng", "3 cái Sảnh"].includes(loai)) return 'special-cyan';
    return '';
  };

  const renderSolvers = () => {
    solverGroup.innerHTML = "";
    Object.keys(playersData).forEach(playerName => {
      const data = playersData[playerName];
      if (!data.solutions || data.solutions.length === 0) return;

      const isGuest = data.solutions.isGuest || false;
      const solverCard = document.createElement("div");
      solverCard.className = "player-solver-card";

      let solutionsHtml = data.solutions.map((sol, index) => `
        <div class="solution-item ${data.selectedIndex === index ? 'selected' : ''}" 
             onclick="selectSolutionForPlayer('${playerName}', ${index})">
          <div><b>#${index + 1}</b></div>
          <div style="display:flex; justify-content:space-between; font-size:0.7em;">
            <span class="${getHighlightClass(sol.chi1.loai)}">${sol.chi1.loai}</span>
            <span class="${getHighlightClass(sol.chi2.loai)}">${sol.chi2.loai}</span>
            <span class="${getHighlightClass(sol.chi3.loai)}">${sol.chi3.loai}</span>
          </div>
        </div>
      `).join('');

      const selectedSol = data.solutions[data.selectedIndex] || data.solutions[0];
      const previewHtml = selectedSol ? `
        <div class="chi-row">
          <span class="chi-header">Chi 1 (3):</span>
          <div class="card-list">${renderCardsHtml(selectedSol.chi1.cards)}</div>
        </div>
        <div class="chi-row">
          <span class="chi-header">Chi 2 (5):</span>
          <div class="card-list">${renderCardsHtml(selectedSol.chi2.cards)}</div>
        </div>
        <div class="chi-row">
          <span class="chi-header">Chi 3 (5):</span>
          <div class="card-list">${renderCardsHtml(selectedSol.chi3.cards)}</div>
        </div>
      ` : '<p>Chọn một phương án</p>';

      solverCard.innerHTML = `
        <div class="player-solver-header">
          <span class="player-name ${isGuest ? 'is-guest' : ''}">${isGuest ? '[DỰ ĐOÁN] ' : ''}${playerName}</span>
          ${!isGuest ? `<button class="btn-apply" onclick="applyArrangementForPlayer('${playerName}')">Áp Dụng</button>` : ''}
        </div>
        <div class="solver-layout">
          <div class="solutions-list">${solutionsHtml}</div>
          <div class="solution-preview-pane">${previewHtml}</div>
        </div>
      `;
      solverGroup.appendChild(solverCard);
    });
  };

  window.selectSolutionForPlayer = (playerName, index) => {
    if (playersData[playerName]) {
      playersData[playerName].selectedIndex = index;
      renderSolvers();
    }
  };

  window.applyArrangementForPlayer = (playerName) => {
    const data = playersData[playerName];
    if (!data || data.selectedIndex === -1) return;
    const sol = data.solutions[data.selectedIndex];
    const cards = [
      ...sol.chi1.cardIds,
      ...sol.chi2.cardIds,
      ...sol.chi3.cardIds
    ];
    ipcRenderer.send("apply-arrangement", { playerName, cards });
  };

  // Render player list
  const renderPlayers = (names) => {
    playerList.innerHTML = "";
    names.forEach(name => {
      const card = document.createElement("div");
      card.className = "player-card";
      if (playersData[name] && playersData[name].solutions && playersData[name].solutions.length > 0) {
        card.classList.add("has-cards");
      }
      card.textContent = name;
      playerList.appendChild(card);
    });
  };

  ipcRenderer.on("updatePlayerList", (event, names) => {
    allConnectedPlayers = names;
    renderPlayers(names);
  });

  const handleMauBinhSolutions = (playerName, solutions) => {
    playersData[playerName] = {
      solutions: solutions,
      selectedIndex: solutions.length > 0 ? 0 : -1
    };
    logStatus(`Đã nhận ${solutions.length} phương án xếp bài cho ${playerName}`);

    // Merge guest players into the list if they are not in connected players
    const currentList = [...allConnectedPlayers];
    if (!currentList.includes(playerName)) {
      currentList.push(playerName);
    }
    renderPlayers(currentList);
    renderSolvers();
  };

  ipcRenderer.on("mauBinhSolutions", (event, { playerName, solutions }) => {
    handleMauBinhSolutions(playerName, solutions);
  });

  ipcRenderer.on("clearMauBinhSolutions", () => {
    playersData = {};
    renderPlayers(allConnectedPlayers);
    renderSolvers();
    logStatus("Kết thúc ván. Đã xóa dữ liệu bài.");
  });

  const btnFakeData = document.getElementById("btnFakeData");
  btnFakeData.addEventListener("click", () => {
    const fakePlayers = ["Bot_Hên", "Bot_VIP", "Guest_999"];
    let usedCards = new Set();
    const allCards = Array.from({ length: 52 }, (_, i) => i);

    fakePlayers.forEach((name, i) => {
      let available = allCards.filter(c => !usedCards.has(c));
      const shuffled = available.sort(() => 0.5 - Math.random());
      const cards = shuffled.slice(0, 13);
      cards.forEach(c => usedCards.add(c));

      // solveMauBinh is available from mau_binh_logic.js loaded in index.html
      const solutions = solveMauBinh(cards);
      if (name.includes("Guest")) solutions.isGuest = true;

      handleMauBinhSolutions(name, solutions);
    });
    logStatus("Đã tạo dữ liệu giả cho 3 người chơi");
  });

  ipcRenderer.on("logStatus", (event, message) => {
    logStatus(message);
  });

  const btnClearSolvers = document.getElementById("btnClearSolvers");
  btnClearSolvers.addEventListener("click", () => {
    playersData = {};
    renderPlayers(Array.from(document.querySelectorAll("#playerList .player-card")).map(el => el.textContent));
    renderSolvers();
    logStatus("Đã xóa tất cả phương án xếp bài");
  });

  // Xử lý cập nhật systemKeys từ main process
  ipcRenderer.on("updateSystemKeys", (event, newSystemKeys) => {
    const currentSystemKeys = getSystemKeys();
    const newKeys = newSystemKeys.filter(
      (key) => !currentSystemKeys.includes(key)
    );
    if (newKeys.length > 0) {
      logStatus(`Đã nhận thêm systemKeys: ${newKeys.join(", ")}`);
    }
    systemKeysInput.value = currentSystemKeys.concat(newKeys).join(",");
    logStatus("Đã cập nhật danh sách systemKeys từ client");
  });
});
