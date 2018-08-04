"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var message_1 = require("./message");
var Client = /** @class */ (function () {
    function Client(uuid, connection) {
        var _this = this;
        this.uuid = uuid;
        this.connection = connection;
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
            if (_this.onConnected)
                _this.onConnected(_this);
            // Send client ready
            _this.sendMessage(message_1.MessageType.ClientReady);
        });
    }
    Client.prototype.handleDisconnection = function (reasonCode, description) {
        this.log("Client disconnected. (" + this.connection.remoteAddress + ")");
        if (this.onDisconnected)
            this.onDisconnected(this);
    };
    Client.prototype.handleUTFMessage = function (message) {
        this.log(message);
    };
    Client.prototype.handleBinaryMessage = function (message) {
    };
    Client.prototype.sendMessage = function (type, content) {
        var message = new message_1.default(type, content);
        if (this.connection)
            this.connection.sendUTF(message.toString());
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