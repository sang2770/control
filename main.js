const { app, BrowserWindow, ipcMain } = require("electron");
const { findFreePort } = require("./initSocket");
const path = require("path");
const fs = require("fs");
const WebSocket = require("ws");
const MauBinhLogic = require("./mau_binh_logic.js");

let actionRunning = null;

let lastConfig = null;
let mainWindow;
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
  if (message.action === "saveSettings") {
    lastConfig = message;
  } else {
    actionRunning = message.action;
    if (message.isStop) {
      actionRunning = null;
    }
  }
  broadcast(message);
});

// Solver window logic removed as it's now integrated into the main window

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
    width: 650,
    height: 800,
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
                mainWindow.webContents.send("logStatus", `Đã cập nhật systemKey: ${data.systemKey}`);
              }

              setTimeout(() => {
                if (lastConfig) {
                  ws.send(JSON.stringify(lastConfig));
                }
                if (actionRunning) {
                  ws.send(JSON.stringify({ action: actionRunning }));
                }
              }, 1500);
            } else if (data.action === "updateUserStatus" && data.userStatus) {
              const status = data.userStatus;

              if (status.type === "MAUBINH_MONITOR_ROOMDATA") {
                const { players } = status;
                const systemKeys = Array.from(clients.keys());

                // Tạo sessionKey từ danh sách 4 người chơi để định danh bàn
                const sessionKey = players.map(p => p.dn).sort().join('|');

                // Đồng bộ sessionKey và reset cards cho tất cả các máy khách hệ thống có mặt trong bàn này
                players.forEach(p => {
                  const peerWs = clients.get(p.dn);
                  if (peerWs) {
                    if (peerWs.sessionKey !== sessionKey) {
                      peerWs.sessionKey = sessionKey;
                      peerWs.currentCards = null;
                    }
                  }
                });

                const systemPlayersInRoom = players.filter(p => systemKeys.includes(p.dn));
                if (systemPlayersInRoom.length === 3 && players.length === 4) {
                  const guestPlayer = players.find(p => !systemKeys.includes(p.dn));
                  if (guestPlayer) {
                    // Đồng bộ tên khách cho tất cả các máy khách trong bàn
                    players.forEach(p => {
                      const peerWs = clients.get(p.dn);
                      if (peerWs) peerWs.currentGuest = guestPlayer.dn;
                    });

                    if (mainWindow && !mainWindow.isDestroyed()) {
                      mainWindow.webContents.send("logStatus", `Phát hiện khách: ${guestPlayer.dn}`);
                    }
                  }
                } else {
                  // Nếu không phải bàn 3-1, xóa currentGuest của các máy khách trong bàn này
                  players.forEach(p => {
                    const peerWs = clients.get(p.dn);
                    if (peerWs) peerWs.currentGuest = null;
                  });
                }
              } else if (status.type === "MAUBINH_MONITOR_GAME_END") {
                // Reset trạng thái ván đấu hiện tại của client này
                ws.currentCards = null;
                ws.currentGuest = null;
                ws.sessionKey = null;
                // Clear UI solutions khi ván đấu kết thúc
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send("clearSolvers", {});
                }
              } else if (status.type === "MAUBINH_PLAYER_CARDS_REPORT") {
                const { playerName, cards } = status;
                ws.currentCards = cards;

                const solutions = MauBinhLogic.solveMauBinh(cards, 50);
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send("mauBinhSolutions", {
                    playerName: playerName,
                    solutions: solutions
                  });
                }

                // Kiểm tra xem đã đủ 3 người chơi hệ thống trong cùng 1 session (cùng 1 bàn) chưa
                if (ws.sessionKey) {
                  const peers = Array.from(clients.values()).filter(c =>
                    c.sessionKey === ws.sessionKey &&
                    c.currentCards
                  );

                  if (peers.length === 3) {
                    const cardsKnown = new Set();
                    let guestName = null;

                    peers.forEach(p => {
                      p.currentCards.forEach(c => cardsKnown.add(c));
                      if (p.currentGuest) guestName = p.currentGuest;
                    });

                    if (cardsKnown.size === 39 && guestName) {
                      let guestCards = [];
                      for (let i = 0; i < 52; i++) {
                        if (!cardsKnown.has(i)) {
                          guestCards.push(i);
                        }
                      }

                      if (guestCards.length === 13) {
                        const guestSolutions = MauBinhLogic.solveMauBinh(guestCards, 50);
                        guestSolutions.isGuest = true;

                        if (mainWindow && !mainWindow.isDestroyed()) {
                          mainWindow.webContents.send("mauBinhSolutions", {
                            playerName: "Khách: " + guestName,
                            solutions: guestSolutions
                          });
                          mainWindow.webContents.send("logStatus", `Đã dự đoán bài cho khách: ${guestName}`);
                        }
                      }
                    }
                  }
                }
              } else if (status.type === "MAUBINH_SOLUTIONS") {
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send("mauBinhSolutions", {
                    playerName: clientName,
                    solutions: status.solutions
                  });
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
              mainWindow.webContents.send("logStatus", `Extension ${clientName} đã ngắt kết nối`);
            }
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
