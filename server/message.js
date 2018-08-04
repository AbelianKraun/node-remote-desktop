"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("./client");
var MessageType;
(function (MessageType) {
    MessageType[MessageType["ConnectionRequest"] = 0] = "ConnectionRequest";
    MessageType[MessageType["ConnectionAccept"] = 1] = "ConnectionAccept";
    MessageType[MessageType["ConnectionAccepted"] = 2] = "ConnectionAccepted";
    MessageType[MessageType["MouseMove"] = 3] = "MouseMove";
    MessageType[MessageType["MouseClick"] = 4] = "MouseClick";
    MessageType[MessageType["MouseWheel"] = 5] = "MouseWheel";
    MessageType[MessageType["NextFrameData"] = 6] = "NextFrameData";
    MessageType[MessageType["FrameReceived"] = 7] = "FrameReceived";
})(MessageType = exports.MessageType || (exports.MessageType = {}));
var Message = /** @class */ (function () {
    function Message(type, destination, content) {
        this.type = type;
        this.destination = destination;
        this.content = content;
    }
    Message.prototype.toString = function () {
        return JSON.stringify({
            type: this.type,
            destination: this.destination instanceof client_1.Client ? this.destination.uuid : this.destination,
            content: this.content
        });
    };
    return Message;
}());
exports.default = Message;
//# sourceMappingURL=message.js.map