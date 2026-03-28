const { ipcRenderer } = require("electron");
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
  let playersData = {}; // Store solutions per player

  // Render player list
  const renderPlayers = (names) => {
    playerList.innerHTML = "";
    names.forEach(name => {
      const card = document.createElement("div");
      card.className = "player-card";
      if (playersData[name] && playersData[name].length > 0) {
        card.classList.add("has-cards");
      }
      card.textContent = name;
      card.onclick = () => showMauBinhModal(name);
      playerList.appendChild(card);
    });
  };

  const showMauBinhModal = (playerName) => {
    const solutions = playersData[playerName] || [];
    if (solutions.length === 0) {
      logStatus(`Chưa có dữ liệu bài cho ${playerName}`);
      return;
    }

    // Open a new Electron window instead of showing a local modal
    ipcRenderer.send("openSolverWindow", {
      playerName,
      solutions
    });
  };

  // setArrangement logic moved to main.js and solver_renderer.js (solver.html)

  ipcRenderer.on("updatePlayerList", (event, names) => {
    renderPlayers(names);
  });

  ipcRenderer.on("mauBinhSolutions", (event, { playerName, solutions }) => {
    playersData[playerName] = solutions;
    logStatus(`Đã nhận ${solutions.length} phương án xếp bài cho ${playerName}`);
    renderPlayers(Object.keys(playersData).length ? Object.keys(playersData) : [playerName]);
  });

  ipcRenderer.on("logStatus", (event, message) => {
    logStatus(message);
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
