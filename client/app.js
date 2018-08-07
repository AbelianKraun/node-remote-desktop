"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
var path = require("path");
var client_1 = require("./client");
// Capture device
var mainWindow = null;
var client = new client_1.Client();
// Create main window
electron_1.app.on('ready', createWindow);
electron_1.app.on("before-quit", function () {
    if (client)
        client.disconnect();
});
function createWindow() {
    var startUrl = path.resolve('./content/index.html');
    mainWindow = new electron_1.BrowserWindow({ width: 800, height: 600 });
    mainWindow.loadFile(startUrl);
    mainWindow.on("closed", function () { return mainWindow = null; });
}
// Client events
client.onReady = function (id, pwd) {
    if (mainWindow)
        mainWindow.webContents.send("clientReady", { id: id, pwd: pwd });
};
client.onSetNextFrameData = function (frameData) {
    if (mainWindow)
        mainWindow.webContents.send("nextFrameData", frameData);
};
// DOM events
electron_1.ipcMain.on("domReady", function () {
    client.connect();
});
electron_1.ipcMain.on("connect", function (e, _a) {
    var id = _a.id, pwd = _a.pwd;
    console.log("Connecting to ", id, pwd);
    client.connectTo(id, pwd);
});
//# sourceMappingURL=app.js.map