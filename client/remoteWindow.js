"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
var path = require("path");
var RemoteWindow = /** @class */ (function () {
    function RemoteWindow(client) {
        var _this = this;
        this.onClose = null;
        this.handleClose = function () {
            _this.window = null;
            if (_this.onClose)
                _this.onClose();
        };
        this.handleMouseEvent = function (e, params) {
            _this.client.sendMouseEvent(params);
        };
        this.drawFrame = function (content, frameData) {
            if (_this.window)
                _this.window.webContents.send("drawFrame", { content: content, frameData: frameData });
        };
        this.client = client;
        var startUrl = path.resolve('./content/remoteWindow.html');
        this.window = new electron_1.BrowserWindow({ width: 1366, height: 768 });
        this.window.loadFile(startUrl);
        this.window.on("closed", this.handleClose);
        electron_1.ipcMain.on("domReady", function () {
            console.log("Setitng window res");
            if (_this.window)
                _this.window.webContents.send("setResolution", { width: 1920, height: 1080 });
        });
        electron_1.ipcMain.on("mouseEvent", this.handleMouseEvent);
    }
    RemoteWindow.prototype.close = function () {
        if (this.window)
            this.window.close();
    };
    return RemoteWindow;
}());
exports.default = RemoteWindow;
//# sourceMappingURL=remoteWindow.js.map