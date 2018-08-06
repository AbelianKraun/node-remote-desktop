"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function randomString(length, chars) {
    var result = '';
    for (var i = length; i > 0; --i)
        result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}
exports.randomString = randomString;
//or as a Number prototype method:
function padLeft(str, len, c) {
    var c = c || '0';
    while (str.length < len)
        str = c + str;
    return str;
}
exports.padLeft = padLeft;
//# sourceMappingURL=utils.js.map