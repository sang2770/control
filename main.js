const { app, BrowserWindow, ipcMain } = require("electron");
const { findFreePort } = require("./initSocket");
const path = require("path");
const fs = require("fs");
const WebSocket = require("ws");

let actionRunning = null;
let mainWindow;
const solverWindows = new Map();
const clients = new Map();
let wss;

function savePortToConfig(port) {
  let baseDir = "";
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    baseDir = process.env.PORTABLE_EXECUTABLE_DIR;
  } else {
    baseDir = path.dirname(process.execPath);
  }
  const configPath = path.join(
    app.isPackaged ? baseDir : path.join(__dirname, ".."),
    "sunwin-extension",
    "port.json"
  );
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(
      "logStatus",
      `Đã lưu port: ${port} - path: ${configPath}`
    );
  }
  const config = { port };
  fs.writeFileSync(configPath, JSON.stringify(config));
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

// Xử lý IPC message từ renderer (đặt ngoài createWindow để tránh duplicate listeners)
ipcMain.on("sendToPlayer", (event, { playerName, message }) => {
  const ws = clients.get(playerName);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
    console.log(`Sent to ${playerName}:`, message.action);
  }
});

ipcMain.on("broadcast", (event, message) => {
  actionRunning = message.action;
  broadcast(message);
  if (message.isStop) {
    actionRunning = null;
  }
});

ipcMain.on("openSolverWindow", (event, { playerName, solutions }) => {
  if (solverWindows.has(playerName)) {
    const existingWin = solverWindows.get(playerName);
    if (!existingWin.isDestroyed()) {
      existingWin.focus();
      existingWin.webContents.send('init-data', { playerName, solutions });
      return;
    }
  }

  const solverWin = new BrowserWindow({
    width: 900,
    height: 650,
    title: `Mau Binh Solver - ${playerName}`,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  solverWindows.set(playerName, solverWin);
  solverWin.on('closed', () => {
    solverWindows.delete(playerName);
  });

  solverWin.loadFile("solver.html");
  solverWin.webContents.on('did-finish-load', () => {
    solverWin.webContents.send('init-data', { playerName, solutions });
  });
});

ipcMain.on("apply-arrangement", (event, { playerName, cards }) => {
  const ws = clients.get(playerName);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      action: "setMauBinhArrangement",
      data: { cards }
    }));
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("logStatus", `Đã áp dụng xếp bài cho ${playerName}`);
    }
  }
});

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

  if (!wss) {
    try {
      const port = await findFreePort();
      wss = new WebSocket.Server({ port });
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("logStatus", `WebSocket server started on port ${port}`);
          savePortToConfig(port);
        }
      }, 2000);

      wss.on("connection", (ws) => {
        console.log("Extension connected to WebSocket server");
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("logStatus", "Extension đã kết nối đến bảng điều khiển");
        }

        let clientName = null;
        ws.on("message", (message) => {
          try {
            const data = JSON.parse(message);
            if (data.action === "updateSystemKey" && data.systemKey) {
              clientName = data.systemKey;
              clients.set(clientName, ws);

              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send("updateSystemKeys", [data.systemKey]);
                mainWindow.webContents.send("updatePlayerList", Array.from(clients.keys()));
              }

              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send("logStatus", `Đã cập nhật systemKey: ${data.systemKey}`);
              }

              setTimeout(() => {
                if (actionRunning) {
                  ws.send(JSON.stringify({ action: actionRunning }));
                }
              }, 1500);
            } else if (data.action === "updateUserStatus" && data.userStatus) {
              const status = data.userStatus;
              if (status && status.type === "MAUBINH_SOLUTIONS") {
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send("mauBinhSolutions", {
                    playerName: clientName,
                    solutions: status.solutions
                  });
                }
                if (solverWindows.has(clientName)) {
                  const sWin = solverWindows.get(clientName);
                  if (!sWin.isDestroyed()) {
                    sWin.webContents.send('init-data', { playerName: clientName, solutions: status.solutions });
                  }
                }
              } else {
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send("logStatus", `Đã cập nhật (${clientName || 'Unknown'}): ${JSON.stringify(status)}`);
                }
              }
            } else {
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send("updateStatusLog", `Message từ ${clientName || 'Unknown'}: ` + message.toString());
              }
            }
          } catch (error) {
            console.error("Error parsing message:", error);
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("logStatus", `Lỗi xử lý message từ client: ${error.message}`);
            }
          }
        });

        ws.on("close", () => {
          if (clientName) {
            clients.delete(clientName);
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("updatePlayerList", Array.from(clients.keys()));
            }
          }
          console.log("Extension disconnected from WebSocket server");
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("logStatus", `Extension ${clientName || ''} đã ngắt kết nối`);
          }
        });
      });
    } catch (error) {
      console.error("Error starting WebSocket server:", error);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("updateStatusLog", "Error starting WebSocket server: " + error.message);
      }
    }
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

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

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("updateStatusLog", "Error: " + error.message);
  }
});
