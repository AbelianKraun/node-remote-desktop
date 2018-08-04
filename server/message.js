"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var MessageType;
(function (MessageType) {
    MessageType[MessageType["ClientReady"] = 0] = "ClientReady";
    MessageType[MessageType["ConnectionRequest"] = 1] = "ConnectionRequest";
    MessageType[MessageType["ConnectionAccept"] = 2] = "ConnectionAccept";
    MessageType[MessageType["ConnectionAccepted"] = 3] = "ConnectionAccepted";
    MessageType[MessageType["MouseMove"] = 4] = "MouseMove";
    MessageType[MessageType["MouseClick"] = 5] = "MouseClick";
    MessageType[MessageType["MouseWheel"] = 6] = "MouseWheel";
    MessageType[MessageType["NextFrameData"] = 7] = "NextFrameData";
    MessageType[MessageType["FrameReceived"] = 8] = "FrameReceived";
})(MessageType = exports.MessageType || (exports.MessageType = {}));
var Message = /** @class */ (function () {
    function Message(type, content) {
        this.type = type;
        this.content = content;
    }
    Message.prototype.toString = function () {
        return JSON.stringify({
            type: this.type,
            content: this.content
        });
    };
    return Message;
}());
exports.default = Message;
//# sourceMappingURL=message.js.map