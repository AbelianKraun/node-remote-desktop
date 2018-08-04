"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("./client");
var MessageType;
(function (MessageType) {
    MessageType[MessageType["ClientReady"] = 0] = "ClientReady";
    MessageType[MessageType["ConnectionRequest"] = 1] = "ConnectionRequest";
    MessageType[MessageType["ConnectionAccept"] = 2] = "ConnectionAccept";
    MessageType[MessageType["ConnectionCompleted"] = 3] = "ConnectionCompleted";
    MessageType[MessageType["ConnectionClose"] = 4] = "ConnectionClose";
    MessageType[MessageType["ConnectionClosed"] = 5] = "ConnectionClosed";
    MessageType[MessageType["MouseMove"] = 6] = "MouseMove";
    MessageType[MessageType["MouseClick"] = 7] = "MouseClick";
    MessageType[MessageType["MouseWheel"] = 8] = "MouseWheel";
    MessageType[MessageType["NextFrameData"] = 9] = "NextFrameData";
    MessageType[MessageType["FrameReceived"] = 10] = "FrameReceived";
    MessageType[MessageType["Success"] = 11] = "Success";
    MessageType[MessageType["Error"] = 12] = "Error";
})(MessageType = exports.MessageType || (exports.MessageType = {}));
var Message = /** @class */ (function () {
    function Message(type, destination, content) {
        this.type = type;
        this.content = content;
        if (destination)
            this.destination = destination instanceof client_1.Client ? destination.uuid : this.destination;
    }
    Message.prototype.toString = function () {
        var msg = {
            type: this.type,
            content: this.content
        };
        if (this.destination)
            msg.destination = this.destination;
        return JSON.stringify(msg);
    };
    return Message;
}());
exports.default = Message;
//# sourceMappingURL=message.js.map