"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var remoteDesktopModule;
if (process.env.DEBUG) {
    remoteDesktopModule = require('./build/Debug/remoteDesktopModule.node');
}
else {
    remoteDesktopModule = require('./build/Release/remoteDesktopModule.node');
}
exports.default = remoteDesktopModule;
//# sourceMappingURL=bindings.js.map