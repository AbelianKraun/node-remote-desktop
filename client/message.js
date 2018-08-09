"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Message = /** @class */ (function () {
    function Message(type, content) {
        this.type = type;
        this.content = content;
    }
    Message.prototype.toString = function () {
        var msg = {
            type: this.type,
            content: this.content
        };
        return JSON.stringify(msg);
    };
    return Message;
}());
exports.default = Message;
//# sourceMappingURL=message.js.map