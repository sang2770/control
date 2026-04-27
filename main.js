const { app, BrowserWindow, ipcMain } = require("electron");
const { findFreePort } = require("./initSocket");
const path = require("path");
const fs = require("fs");
const WebSocket = require("ws");

let actionRunning = null;
let lastConfig = null

let mainWindow;

function savePortToConfig(port) {
  let baseDir = "";

  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    baseDir = process.env.PORTABLE_EXECUTABLE_DIR; // ✅ Đây là thư mục gốc chứa file .exe
  } else {
    baseDir = path.dirname(process.execPath); // fallback cho non-portable
  }
  const configPath = path.join(
    app.isPackaged ? baseDir : path.join(__dirname, ".."),
    "sunwin-extension",
    "port.json"
  );
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

  let baseDir = "";

  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    baseDir = process.env.PORTABLE_EXECUTABLE_DIR; // ✅ Đây là thư mục gốc chứa file .exe
  } else {
    baseDir = path.dirname(process.execPath); // fallback cho non-portable
  }
  // Set title to executable name and prevent HTML from overriding it
  const exeName = baseDir.split("/").pop();
  console.log("exeName", exeName);
  mainWindow.setTitle(exeName);
  mainWindow.on("page-title-updated", (e) => e.preventDefault());

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
    wss.on("connection", (ws) => {
      console.log("Extension connected to WebSocket server");
      mainWindow.webContents.send(
        "logStatus",
        "Extension đã kết nối đến bảng điều khiển"
      );

      ws.on("message", (message) => {
        const messageStr = message.toString();
        // console.log("Received from extension:", messageStr);
        try {
          const data = JSON.parse(messageStr);

          // Heartbeat handling
          if (data.action === "ping") {
            ws.send(JSON.stringify({ action: "pong" }));
            return;
          }

          // Registration handling
          if (data.action === "register") {
            console.log("Extension registered");
            // Sync current state
            if (lastConfig) {
              ws.send(JSON.stringify(lastConfig));
            }
            if (actionRunning) {
              ws.send(JSON.stringify({ action: actionRunning }));
            }
            return;
          }

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

            // Sync current state if not already done by register
            setTimeout(() => {
              if (lastConfig) {
                ws.send(JSON.stringify(lastConfig));
              }
              if (actionRunning) {
                ws.send(JSON.stringify({ action: actionRunning }));
              }
            }, 1000);
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
                messageStr
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
    if (message.action === "saveSettings") {
      lastConfig = message;
      broadcast(message);
    } else {
      actionRunning = message.action;
      broadcast(message);
      if (message.isStop) {
        actionRunning = null;
      }
    }
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
    mainWindow.webContents.send("updateStatusLog", "Error: " + error.message);
  }
});
