const { ipcRenderer } = require("electron");
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
  const joinRoomToggleButton = document.getElementById("joinRoomToggle");
  const methodInput = document.getElementById("method");
  const statusLog = document.getElementById("statusLog");
  let isJoining = false;

  // Hàm lưu cấu hình vào localStorage
  const saveToLocalStorage = (config) => {
    try {
      localStorage.setItem("hitClubTienLenDemLa", JSON.stringify(config));
      logStatus("Cấu hình đã được lưu vào localStorage");
    } catch (error) {
      logStatus(`Lỗi khi lưu cấu hình: ${error.message}`);
    }
  };

  // Hàm tải cấu hình từ localStorage
  const loadFromLocalStorage = () => {
    try {
      const savedConfig = localStorage.getItem("hitClubTienLenDemLa");
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        systemKeysInput.value = config.systemKeys.join(",");
        joinDelayInput.value = config.joinDelay;
        checkDelayInput.value = config.checkDelay;
        selectedTableInput.value = config.selectedTable;
        methodInput.value = config.method || 1;
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
    const joinDelay = parseInt(joinDelayInput.value) || 1000;
    const checkDelay = parseInt(checkDelayInput.value) || 1000;
    const selectedTable = selectedTableInput.value;
    const method = methodInput.value;
    const systemKeys = getSystemKeys();
    const config = {
      joinDelay,
      checkDelay,
      selectedTable,
      method,
      systemKeys
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

  // Auto-save on input changes
  systemKeysInput.addEventListener("input", debouncedSaveSettings);
  joinDelayInput.addEventListener("input", debouncedSaveSettings);
  checkDelayInput.addEventListener("input", debouncedSaveSettings);
  selectedTableInput.addEventListener("change", debouncedSaveSettings);
  methodInput.addEventListener("change", debouncedSaveSettings);

  // Toggle start/stop action
  joinRoomToggleButton.addEventListener("click", () => {
    isJoining = !isJoining;
    if (isJoining) {
      ipcRenderer.send("broadcast", { action: 'joinTable' });
      joinRoomToggleButton.textContent = "Dừng";
      joinRoomToggleButton.style.backgroundColor = "red";
      logStatus(
        `Đã gửi lệnh vào bàn ${selectedTableInput.value} với delay ${joinDelayInput.value}ms`
      );
    } else {
      ipcRenderer.send("broadcast", { action: "stopRunning" });
      joinRoomToggleButton.textContent = "Bắt Đầu";
      joinRoomToggleButton.style.backgroundColor = "green";
      logStatus("Đã gửi lệnh dừng");
    }
  });

  ipcRenderer.on("logStatus", (event, message) => {
    console.log("message");

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
