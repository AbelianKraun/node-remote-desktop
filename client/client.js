"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var message_1 = require("./message");
var websocket_1 = require("websocket");
var bindings_1 = require("./bindings");
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
        this.host = false;
        this.frameReceived = false;
        this.screenCapturer = null;
        this.cache = [];
        this.log("Client created.");
        this.sendFrame = this.sendFrame.bind(this);
        // Setup events
        this.websocketClient.on("connect", function (connection) {
            _this.log("Connected.");
            _this.connection = connection;
            _this.screenCapturer = new bindings_1.default.Vector();
            // Init device
            if (!_this.screenCapturer.initDevice()) {
                console.log("Init device failed.");
            }
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
        this.host = true;
        this.sendMessage(message_1.MessageType.ConnectionRequest, { id: id, pwd: pwd });
    };
    Client.prototype.handleDisconnection = function (reasonCode, description) {
        var _this = this;
        this.log("Client disconnected. (" + reasonCode + ", " + description + ")");
        this.cleanConnection();
        this.status = ClientStatus.Disconnected;
        if (this.screenCapturer)
            this.screenCapturer.releaseDevice();
        if (this.onDisconnected)
            this.onDisconnected(this);
        setTimeout(function () { return _this.connect(); }, 10000);
    };
    Client.prototype.handleUTFMessage = function (message) {
        this.log(message);
        switch (message.type) {
            case message_1.MessageType.Error:
                this.connectedClient = null;
            case message_1.MessageType.ClientReady:
                this.status = ClientStatus.Ready;
                this.clientId = message.content.id;
                this.clientPwd = message.content.pwd;
                if (this.onReady)
                    this.onReady(this.clientId, this.clientPwd);
                break;
            case message_1.MessageType.ConnectionRequest:
                this.host = false;
                // Request is already authorized by server, so we don't need to check for pwd
                this.connectedClient = message.content;
                this.sendMessage(message_1.MessageType.ConnectionAccept, message.content); // Content contains the guid of the requester
                break;
            case message_1.MessageType.ConnectionAccept:
                // Request is already authorized by server, so we don't need to check for pwd
                this.sendMessage(message_1.MessageType.ConnectionCompleted, message.content); // Content contains the guid of the requester
                break;
            case message_1.MessageType.ConnectionCompleted:
                this.status = ClientStatus.Connected;
                this.connectedClient = message.content;
                this.log("Connection estabilished with " + message.content);
                if (this.host)
                    this.requestNextFrame();
                else
                    this.sendFrame();
                break;
            case message_1.MessageType.ConnectionClosed:
                this.cleanConnection();
                break;
            case message_1.MessageType.FrameRequest:
                this.frameReceived = true;
                break;
            case message_1.MessageType.NextFrameData:
                if (this.onSetNextFrameData)
                    this.onSetNextFrameData(message.content);
                break;
        }
    };
    Client.prototype.cleanConnection = function () {
        this.status = ClientStatus.Ready;
        this.connectedClient = null;
        this.host = false;
        this.log("Connection cleaned.");
    };
    Client.prototype.requestNextFrame = function () {
        if (this.status != ClientStatus.Connected) {
            console.log("Requesting next frame but not connected. Clearing interval.");
            return;
        }
        this.sendMessage(message_1.MessageType.FrameRequest, this.connectedClient);
    };
    Client.prototype.sendFrame = function () {
        var _this = this;
        if (this.frameReceived) {
            var dirties = this.cache.filter(function (c) { return c.isDirty; }).sort(function (x) { return x.updated.getTime(); });
            var d_1 = dirties.length > 0 ? dirties[0] : null;
            if (d_1) {
                d_1.isDirty = false;
                console.log("Sending frame: ", d_1.x, d_1.y, d_1.width, d_1.height, d_1.data.length);
                this.sendMessage(message_1.MessageType.NextFrameData, { to: this.connectedClient, x: d_1.x, y: d_1.y, w: d_1.width, h: d_1.height });
                this.connection.sendBytes(Buffer.from(d_1.data));
                this.frameReceived = false;
            }
        }
        var d = this.screenCapturer.getNextFrame(function (d) {
            if (d.data.length != 0) {
                var previous = _this.cache.find(function (c) { return c.x == d.x && c.y == d.y; });
                if (!previous) {
                    previous = { x: d.x, y: d.y, width: d.width, height: d.height };
                    _this.cache.push(previous);
                }
                if (previous.data) {
                    delete previous.data;
                }
                if (previous.updated)
                    delete previous.updated;
                previous.data = d.data;
                previous.updated = new Date();
                previous.isDirty = true;
            }
            setTimeout(_this.sendFrame, 0);
        });
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