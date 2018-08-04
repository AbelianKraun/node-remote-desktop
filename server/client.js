"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var message_1 = require("./message");
var ClientStatus;
(function (ClientStatus) {
    ClientStatus[ClientStatus["Creating"] = 0] = "Creating";
    ClientStatus[ClientStatus["Ready"] = 1] = "Ready";
    ClientStatus[ClientStatus["Connecting"] = 2] = "Connecting";
    ClientStatus[ClientStatus["Connected"] = 3] = "Connected";
})(ClientStatus = exports.ClientStatus || (exports.ClientStatus = {}));
var Client = /** @class */ (function () {
    function Client(uuid, connection) {
        var _this = this;
        this.uuid = uuid;
        this.connection = connection;
        this.status = ClientStatus.Creating;
        this.connectedClient = null;
        this.connection = connection;
        this.uuid = uuid;
        this.log("New client created. (" + this.connection.remoteAddress + ")");
        // Setup events
        connection.on('message', function (message) {
            if (message.type === 'utf8') {
                _this.handleUTFMessage(message.utf8Data);
            }
            else if (message.type === "binary") {
                _this.handleBinaryMessage(message.binaryData);
            }
        });
        connection.on('close', function (reasonCode, description) { return _this.handleDisconnection(reasonCode, description); });
        process.nextTick(function () {
            _this.status = ClientStatus.Ready;
            if (_this.onConnected)
                _this.onConnected(_this);
            // Send client ready
            _this.sendMessage(message_1.MessageType.ClientReady);
        });
    }
    Client.prototype.handleDisconnection = function (reasonCode, description) {
        this.log("Client disconnected. (" + this.connection.remoteAddress + ")");
        // Close all current connections
        this.closeConnection();
        if (this.onDisconnected)
            this.onDisconnected(this);
    };
    Client.prototype.handleUTFMessage = function (message) {
        this.log(message);
        switch (message.type) {
            case message_1.MessageType.ConnectionRequest:
                if (this.status == ClientStatus.Ready) {
                    this.status = ClientStatus.Connecting;
                    this.relayMessage(message);
                }
                else {
                    this.sendMessage(message_1.MessageType.Error, "Client busy or not ready.");
                }
            case message_1.MessageType.ConnectionAccept:
                if (this.status == ClientStatus.Ready) {
                    this.status = ClientStatus.Connecting;
                    this.relayMessage(message);
                }
                else {
                    this.sendMessage(message_1.MessageType.Error, "Client busy or not ready.");
                }
            case message_1.MessageType.ConnectionCompleted:
                if (this.status == ClientStatus.Connecting) {
                    this.status = ClientStatus.Connected;
                    this.relayMessage(message);
                }
                else {
                    this.sendMessage(message_1.MessageType.Error, "Client busy or not ready.");
                }
            case message_1.MessageType.ConnectionClose:
                if (!this.closeConnection()) {
                    this.sendMessage(message_1.MessageType.Error, "Client not connected to any destination or not ready");
                }
        }
    };
    Client.prototype.handleBinaryMessage = function (message) {
    };
    // This method simply work as a relay. We just send a message from client to client
    Client.prototype.relayMessage = function (message) {
        this.sendMessageToOther(message.destination, message.type, message.content);
    };
    Client.prototype.sendMessageToOther = function (destination, type, content) {
        if (this.onQueueMessage)
            this.onQueueMessage(this, destination, type, content);
    };
    Client.prototype.sendMessage = function (type, content) {
        var message = new message_1.default(type, null, content);
        if (this.connection && this.connection.connected)
            this.connection.sendUTF(message.toString());
    };
    Client.prototype.closeConnection = function () {
        if (this.status == ClientStatus.Connecting || this.status == ClientStatus.Connected) {
            var target = this.connectedClient;
            // Reset me
            this.status = ClientStatus.Ready;
            this.connectedClient = null;
            this.sendMessage(message_1.MessageType.ConnectionClosed);
            // Close other client
            if (target)
                target.closeConnection();
            return true;
        }
        else {
            return false;
        }
    };
    Client.prototype.log = function (message) {
        console.log(this.uuid + ": " + message);
    };
    return Client;
}());
exports.Client = Client;
var ClientRepository = /** @class */ (function () {
    function ClientRepository() {
        this.clients = [];
    }
    Object.defineProperty(ClientRepository.prototype, "length", {
        get: function () {
            return this.clients.length;
        },
        enumerable: true,
        configurable: true
    });
    ClientRepository.prototype.add = function (client) {
        this.clients.push(client);
    };
    ClientRepository.prototype.remove = function (clientToRemove) {
        var newClients = [];
        for (var _i = 0, _a = this.clients; _i < _a.length; _i++) {
            var client = _a[_i];
            if (client != clientToRemove)
                newClients.push(client);
        }
        this.clients = newClients;
    };
    ClientRepository.prototype.findByUuid = function (uuid) {
        for (var _i = 0, _a = this.clients; _i < _a.length; _i++) {
            var client = _a[_i];
            if (client.uuid == uuid)
                return client;
        }
        return null;
    };
    return ClientRepository;
}());
exports.ClientRepository = ClientRepository;
//# sourceMappingURL=client.js.map