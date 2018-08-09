"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ClientStatus;
(function (ClientStatus) {
    ClientStatus[ClientStatus["Disconnected"] = 0] = "Disconnected";
    ClientStatus[ClientStatus["Connected"] = 1] = "Connected";
    ClientStatus[ClientStatus["Ready"] = 2] = "Ready";
})(ClientStatus = exports.ClientStatus || (exports.ClientStatus = {}));
var MessageType;
(function (MessageType) {
    MessageType[MessageType["ClientReady"] = 0] = "ClientReady";
    MessageType[MessageType["ConnectionRequest"] = 1] = "ConnectionRequest";
    MessageType[MessageType["ConnectionAccept"] = 2] = "ConnectionAccept";
    MessageType[MessageType["ConnectionCompleted"] = 3] = "ConnectionCompleted";
    MessageType[MessageType["ConnectionClose"] = 4] = "ConnectionClose";
    MessageType[MessageType["ConnectionClosed"] = 5] = "ConnectionClosed";
    MessageType[MessageType["MouseEvent"] = 6] = "MouseEvent";
    MessageType[MessageType["NextFrameData"] = 7] = "NextFrameData";
    MessageType[MessageType["FrameRequest"] = 8] = "FrameRequest";
    MessageType[MessageType["Success"] = 9] = "Success";
    MessageType[MessageType["Error"] = 10] = "Error";
})(MessageType = exports.MessageType || (exports.MessageType = {}));
var MouseEventType;
(function (MouseEventType) {
    MouseEventType[MouseEventType["MouseMove"] = 0] = "MouseMove";
    MouseEventType[MouseEventType["MouseDown"] = 1] = "MouseDown";
    MouseEventType[MouseEventType["MouseUp"] = 2] = "MouseUp";
    MouseEventType[MouseEventType["MouseWheel"] = 3] = "MouseWheel";
})(MouseEventType = exports.MouseEventType || (exports.MouseEventType = {}));
var FrameData = /** @class */ (function () {
    function FrameData(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
    return FrameData;
}());
exports.FrameData = FrameData;
//# sourceMappingURL=models.js.map