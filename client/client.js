"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var message_1 = require("./message");
var websocket_1 = require("websocket");
var ClientStatus;
(function (ClientStatus) {
    ClientStatus[ClientStatus["Disconnected"] = 0] = "Disconnected";
    ClientStatus[ClientStatus["Connected"] = 1] = "Connected";
    ClientStatus[ClientStatus["Ready"] = 2] = "Ready";
})(ClientStatus = exports.ClientStatus || (exports.ClientStatus = {}));
var Client = /** @class */ (function () {
    function Client() {
        var _this = this;
        this.status = ClientStatus.Disconnected;
        this.connectedClient = null;
        this.websocketClient = new websocket_1.client();
        this.connection = null;
        this.uuid = "";
        this.clientId = "";
        this.clientPwd = "";
        this.log("Client created.");
        // Setup events
        this.websocketClient.on("connect", function (connection) {
            _this.log("Connected.");
            _this.connection = connection;
            _this.connection.on('close', function (reasonCode, description) { return _this.handleDisconnection(reasonCode, description); });
            _this.connection.on('message', function (message) {
                if (message.type === 'utf8') {
                    _this.handleUTFMessage(JSON.parse(message.utf8Data));
                }
                else if (message.type === "binary") {
                    _this.handleBinaryMessage(message.binaryData);
                }
            });
        });
        this.websocketClient.on('connectFailed', function (error) { return _this.handleDisconnection(0, error.toString()); });
    }
    Client.prototype.connect = function () {
        this.log("Try connecting to server...");
        if (this.status == ClientStatus.Disconnected) {
            this.websocketClient.connect('ws://localhost:8085/', 'echo-protocol');
        }
    };
    Client.prototype.disconnect = function () {
        if (this.status != ClientStatus.Disconnected) {
            this.websocketClient.disconnect();
        }
    };
    Client.prototype.connectTo = function (id, pwd) {
        this.sendMessage(message_1.MessageType.ConnectionRequest, { id: id, pwd: pwd });
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
            case message_1.MessageType.ClientReady:
                this.status = ClientStatus.Ready;
                this.clientId = message.content.id;
                this.clientPwd = message.content.pwd;
                if (this.onReady)
                    this.onReady(this.clientId, this.clientPwd);
                break;
            case message_1.MessageType.ConnectionRequest:
                // Request is already authorized by server, so we don't need to check for pwd
                this.sendMessage(message_1.MessageType.ConnectionAccept, message.content); // Content contains the guid of the requester
                break;
            case message_1.MessageType.ConnectionAccept:
                // Request is already authorized by server, so we don't need to check for pwd
                this.sendMessage(message_1.MessageType.ConnectionCompleted, message.content); // Content contains the guid of the requester
                break;
        }
    };
    Client.prototype.handleBinaryMessage = function (message) {
    };
    Client.prototype.sendMessage = function (type, content) {
        var message = new message_1.default(type, content);
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