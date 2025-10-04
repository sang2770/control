const { app, BrowserWindow, ipcMain } = require("electron");
const { findFreePort } = require("./initSocket");
const path = require("path");
const fs = require("fs");
const WebSocket = require("ws");

let actionRunning = null;
let mainWindow;

function savePortToConfig(port) {
  let baseDir = '';

  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    baseDir = process.env.PORTABLE_EXECUTABLE_DIR; // ✅ Đây là thư mục gốc chứa file .exe
  } else {
    baseDir = path.dirname(process.execPath); // fallback cho non-portable
  }
  const configPath = path.join(app.isPackaged ? baseDir : (path.join(__dirname, "..")), "hitclub-extension", 'port.json');
  mainWindow.webContents.send(
    "logStatus",
    `Đã lưu port: ${port} - ` + `path: ${configPath}`

  );
  const config = { port };
  fs.writeFileSync(configPath, JSON.stringify(config));
}


async function createWindow() {
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
    const port = await findFreePort();
    wss = new WebSocket.Server({ port });
    setTimeout(() => {
      mainWindow.webContents.send(
        "logStatus",
        `WebSocket server started on port ${port}`
      );
      savePortToConfig(port);
    }, 2000);
    // save port to config
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
                "logStatus",
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
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("logStatus", "Extension đã ngắt kết nối");
        }
      });
    });
  } catch (error) {
    console.error("Error starting WebSocket server:", error);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(
        "logStatus",
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
    actionRunning = message.action;
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

app.whenReady().then(async () => {
  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
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
    mainWindow.webContents.send("logStatus", "Error: " + error.message);
  }
});
