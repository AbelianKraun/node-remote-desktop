"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var message_1 = require("./message");
var websocket_1 = require("websocket");
var ClientStatus;
(function (ClientStatus) {
    ClientStatus[ClientStatus["Disconnected"] = 0] = "Disconnected";
    ClientStatus[ClientStatus["Connected"] = 1] = "Connected";
})(ClientStatus = exports.ClientStatus || (exports.ClientStatus = {}));
var Client = /** @class */ (function () {
    function Client() {
        var _this = this;
        this.status = ClientStatus.Disconnected;
        this.connectedClient = null;
        this.connection = new websocket_1.client();
        this.uuid = "";
        this.clientId = "";
        this.clientPwd = "";
        this.log("Client created.");
        // Setup events
        this.connection.on('message', function (message) {
            if (message.type === 'utf8') {
                _this.handleUTFMessage(message.utf8Data);
            }
            else if (message.type === "binary") {
                _this.handleBinaryMessage(message.binaryData);
            }
        });
        this.connection.on('connectFailed', function (error) { return _this.handleDisconnection(0, error.toString()); });
        this.connection.on('close', function (reasonCode, description) { return _this.handleDisconnection(reasonCode, description); });
    }
    Client.prototype.connect = function () {
        this.log("Try connecting to server...");
        if (this.status == ClientStatus.Disconnected) {
            this.connection.connect('ws://localhost:8085/', 'echo-protocol');
        }
    };
    Client.prototype.disconnect = function () {
        if (this.status != ClientStatus.Disconnected) {
            this.handleDisconnection(0, "Manual disconnection");
        }
    };
    Client.prototype.handleDisconnection = function (reasonCode, description) {
        var _this = this;
        this.log("Client disconnected. (" + reasonCode + ", " + description + ")");
        this.status = ClientStatus.Disconnected;
        this.connectedClient = null;
        if (this.onDisconnected)
            this.onDisconnected(this);
        setTimeout(function () { return _this.connect(); }, 10000);
    };
    Client.prototype.handleUTFMessage = function (message) {
        this.log(message);
        switch (message.type) {
            case message_1.MessageType.ConnectionRequest:
        }
    };
    Client.prototype.handleBinaryMessage = function (message) {
    };
    Client.prototype.sendMessage = function (type, content) {
        var message = new message_1.default(type, null, content);
        if (this.connection && this.connection.connected)
            this.connection.sendUTF(message.toString());
    };
    Client.prototype.log = function (message) {
        console.log(message);
    };
    return Client;
}());
exports.Client = Client;
//# sourceMappingURL=client.js.map