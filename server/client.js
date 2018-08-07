"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var message_1 = require("./message");
var client_repository_1 = require("./client_repository");
var utils_1 = require("./utils");
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
        this.clientId = null;
        this.clientPwd = null;
        this.status = ClientStatus.Creating;
        this.connectedClient = null;
        this.connection = connection;
        this.uuid = uuid;
        this.log("New client created. (" + this.connection.remoteAddress + ")");
        // Setup events
        connection.on('message', function (message) {
            if (message.type === 'utf8') {
                _this.handleUTFMessage(JSON.parse(message.utf8Data));
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
            var id = utils_1.padLeft(Math.round(Math.random() * 100).toString(), 3, '0') + "" + utils_1.padLeft(Math.round(Math.random() * 100).toString(), 3, '0') + "" + utils_1.padLeft(Math.round(Math.random() * 100).toString(), 3, '0');
            var pwd = utils_1.randomString(5, "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ").toUpperCase();
            _this.clientId = id;
            _this.clientPwd = pwd;
            // Send client ready
            _this.sendMessage(message_1.MessageType.ClientReady, { id: id, pwd: pwd });
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
        this.log(JSON.stringify(message));
        var target = null;
        switch (message.type) {
            case message_1.MessageType.ConnectionRequest:
                if (this.status == ClientStatus.Ready) {
                    // Check target
                    var target_1 = client_repository_1.clientsRepository.findByClientId(message.content.id);
                    if (target_1 && target_1 != this && target_1.requestConnection(this, message.content.pwd))
                        this.status = ClientStatus.Connecting;
                    else {
                        this.sendMessage(message_1.MessageType.Error, "Target busy or not available");
                        this.closeConnection();
                    }
                }
                else {
                    this.sendMessage(message_1.MessageType.Error, "Client busy or not ready.");
                }
                break;
            case message_1.MessageType.ConnectionAccept:
                if (this.status == ClientStatus.Connecting) {
                    // Check target
                    var target_2 = client_repository_1.clientsRepository.findByUuid(message.content);
                    if (target_2)
                        target_2.acceptConnection(this);
                    else {
                        this.sendMessage(message_1.MessageType.Error, "Target busy or not available");
                        this.closeConnection();
                    }
                }
                else {
                    this.sendMessage(message_1.MessageType.Error, "Client busy or not ready.");
                }
                break;
            case message_1.MessageType.ConnectionCompleted:
                if (this.status == ClientStatus.Connecting) {
                    // Check target
                    var target_3 = client_repository_1.clientsRepository.findByUuid(message.content);
                    if (target_3 && target_3.completeConnection(this)) {
                        this.completeConnection(target_3);
                        this.log("Connection estabilished. From " + this.clientId + " to " + target_3.clientId);
                    }
                    else {
                        this.sendMessage(message_1.MessageType.Error, "Target busy or not available");
                        this.closeConnection();
                    }
                }
                else {
                    this.sendMessage(message_1.MessageType.Error, "Client busy or not ready.");
                }
                break;
            case message_1.MessageType.ConnectionClose:
                if (!this.closeConnection()) {
                    this.sendMessage(message_1.MessageType.Error, "Client not connected to any destination or not ready");
                }
                break;
            case message_1.MessageType.FrameRequest:
                target = client_repository_1.clientsRepository.findByUuid(message.content);
                if (target) {
                    target.requestFrame(this);
                }
                else {
                    this.sendMessage(message_1.MessageType.Error, "Target busy or not available");
                    this.closeConnection();
                }
                break;
            case message_1.MessageType.NextFrameData:
                target = client_repository_1.clientsRepository.findByUuid(message.content);
                if (target) {
                    target.setNextFrameData(this, { x: message.content.x, y: message.content.y, w: message.content.y, h: message.content.h });
                }
                else {
                    this.sendMessage(message_1.MessageType.Error, "Target busy or not available");
                    this.closeConnection();
                }
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
    Client.prototype.requestConnection = function (from, pwd) {
        this.log("Connection request from " + from.clientId + ", pwd: " + pwd);
        if (pwd == this.clientPwd && this.status == ClientStatus.Ready) {
            this.status = ClientStatus.Connecting;
            this.sendMessage(message_1.MessageType.ConnectionRequest, from.uuid);
            return true;
        }
        else {
            return false;
        }
    };
    Client.prototype.acceptConnection = function (from) {
        if (this.status == ClientStatus.Connecting) {
            this.sendMessage(message_1.MessageType.ConnectionAccept, from.uuid);
            return true;
        }
        else {
            return false;
        }
    };
    Client.prototype.completeConnection = function (other) {
        if (this.status == ClientStatus.Connecting) {
            this.status = ClientStatus.Connected;
            this.connectedClient = other;
            this.sendMessage(message_1.MessageType.ConnectionCompleted, other.uuid);
            return true;
        }
        else {
            return false;
        }
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
    Client.prototype.requestFrame = function (from) {
        if (this.status == ClientStatus.Connected) {
            this.sendMessage(message_1.MessageType.FrameRequest, from.uuid);
        }
    };
    Client.prototype.setNextFrameData = function (from, data) {
        if (this.status == ClientStatus.Connected) {
            this.sendMessage(message_1.MessageType.NextFrameData, { from: from.uuid, x: data.x, y: data.y, w: data.w, h: data.h });
        }
    };
    Client.prototype.log = function (message) {
        console.log((this.clientId || this.uuid) + ": " + message);
    };
    return Client;
}());
exports.Client = Client;
//# sourceMappingURL=client.js.map