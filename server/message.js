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
    MessageType[MessageType["MouseEvent"] = 6] = "MouseEvent";
    MessageType[MessageType["NextFrameData"] = 7] = "NextFrameData";
    MessageType[MessageType["FrameReceived"] = 8] = "FrameReceived";
    MessageType[MessageType["Success"] = 9] = "Success";
    MessageType[MessageType["Error"] = 10] = "Error";
})(MessageType = exports.MessageType || (exports.MessageType = {}));
var Message = /** @class */ (function () {
    function Message(type, destination, content) {
        this.type = type;
        this.content = content;
        if (destination)
            this.destination = destination instanceof client_1.Client ? destination.uuid : destination;
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