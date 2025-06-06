const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const WebSocket = require("ws");

let actionRunning = null;
// Đảm bảo chỉ có một instance của ứng dụng chạy
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    // Nếu người dùng cố gắng mở một instance thứ hai, focus vào cửa sổ đầu tiên
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 560,
    height: 450,
    webPreferences: {
      preload: path.join(__dirname, "renderer.js"),
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, "icons", "icon.ico"),
  });

  mainWindow.loadFile("index.html");

  // Khởi động WebSocket server
  let wss;
  try {
    wss = new WebSocket.Server({ port: 8080 });
    wss.on("connection", (ws) => {
      console.log("Extension connected to WebSocket server");
      mainWindow.webContents.send(
        "logStatus",
        "Extension đã kết nối đến bảng điều khiển"
      );

      ws.on("message", (message) => {
        console.log("Received from extension:", message.toString());
        try {
          const data = JSON.parse(message);
          // Xử lý khi client gửi systemKey
          if (data.action === "updateSystemKey" && data.systemKey) {
            // Thêm hoặc cập nhật systemKey
            // Gửi danh sách systemKeys cập nhật về renderer
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("updateSystemKeys", [data.systemKey]);
            }
            mainWindow.webContents.send(
              "logStatus",
              `Đã cập nhật systemKey: ${data.systemKey}`
            );

            setTimeout(() => {
              if (actionRunning) {
                ws.send(JSON.stringify({ action: actionRunning }));
              }
            }, 1500);
          } else if (data.action === "updateUserStatus" && data.userStatus) {
            // Thêm hoặc cập nhật userStatus
            mainWindow.webContents.send(
              "logStatus",
              `Đã cập nhật: ${data.userStatus}`
            );
          } else {
            // Gửi trạng thái khác tới renderer để hiển thị trong statusLog
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send(
                "updateStatusLog",
                message.toString()
              );
            }
          }
        } catch (error) {
          console.error("Error parsing message:", error);
          mainWindow.webContents.send(
            "logStatus",
            `Lỗi xử lý message từ client: ${error.message}`
          );
        }
      });

      ws.on("close", () => {
        console.log("Extension disconnected from WebSocket server");
        mainWindow.webContents.send("logStatus", "Extension đã ngắt kết nối");
      });
    });
  } catch (error) {
    console.error("Error starting WebSocket server:", error);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(
        "updateStatusLog",
        "Error starting WebSocket server: " + error.message
      );
    }
  }

  // Hàm broadcast gửi message tới tất cả WebSocket clients
  function broadcast(message) {
    if (wss && wss.clients) {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });
    }
  }

  // Xử lý IPC message từ renderer
  ipcMain.on("broadcast", (event, message) => {
    if (message.action === "joinTable" || message.action === "createTable") {
      actionRunning = message.action;
    } else if (
      message.action === "stopJoinTable" ||
      message.action === "leaveTable"
    ) {
      actionRunning = null;
    }
    broadcast(message);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    // Đóng WebSocket server khi cửa sổ đóng
    if (wss) {
      wss.close();
    }
  });
}

// Thiết lập để ứng dụng khởi động cùng Windows
app.setLoginItemSettings({
  openAtLogin: true,
  path: app.getPath("exe"),
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Xử lý lỗi không bắt được
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // Hiển thị lỗi cho người dùng nếu có thể
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("updateStatusLog", "Error: " + error.message);
  }
});
