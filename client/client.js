"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var message_1 = require("./message");
var websocket_1 = require("websocket");
var bindings_1 = require("./bindings");
var models_1 = require("./models");
var Client = /** @class */ (function () {
    function Client() {
        var _this = this;
        this.status = models_1.ClientStatus.Disconnected;
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
        this.nextFrameData = null;
        this.cleanConnection = function () {
            _this.status = models_1.ClientStatus.Ready;
            _this.connectedClient = null;
            _this.host = false;
            _this.log("Connection cleaned.");
        };
        this.requestNextFrame = function () {
            if (_this.status != models_1.ClientStatus.Connected) {
                console.log("Requesting next frame but not connected. Clearing interval.");
                return;
            }
            _this.sendMessage(models_1.MessageType.FrameRequest, _this.connectedClient);
        };
        this.sendFrame = function () {
            if (_this.status != models_1.ClientStatus.Connected)
                return;
            if (_this.frameReceived) {
                var dirties = _this.cache.filter(function (c) { return c.isDirty; }).sort(function (x) { return x.updated.getTime(); });
                var d_1 = dirties.length > 0 ? dirties[0] : null;
                if (d_1) {
                    d_1.isDirty = false;
                    console.log("Sending frame: ", d_1.x, d_1.y, d_1.width, d_1.height, d_1.data.length);
                    _this.sendMessage(models_1.MessageType.NextFrameData, { to: _this.connectedClient, x: d_1.x, y: d_1.y, w: d_1.width, h: d_1.height });
                    _this.connection.sendBytes(Buffer.from(d_1.data));
                    _this.frameReceived = false;
                }
            }
            var d = _this.screenCapturer.getNextFrame(function (d) {
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
        this.handleBinaryMessage = function (message) {
            if (_this.nextFrameData) {
                if (_this.onFrameReceived)
                    _this.onFrameReceived(message, _this.nextFrameData);
                _this.requestNextFrame();
            }
        };
        this.sendMessage = function (type, content) {
            var message = new message_1.default(type, content);
            if (_this.connection && _this.connection.connected)
                _this.connection.sendUTF(message.toString());
        };
        this.sendMouseEvent = function (e) {
            _this.sendMessage(models_1.MessageType.MouseEvent, e);
        };
        this.handleMessageEvent = function (e) {
            console.log("MouseEvent", e);
            switch (e.type) {
                case models_1.MouseEventType.MouseMove:
                    //if (this.screenCapturer)
                    //this.screenCapturer.setMousePosition(e.x, e.y);
                    break;
                case models_1.MouseEventType.MouseDown:
                    if (_this.screenCapturer)
                        _this.screenCapturer.mouseDown(e.button);
                    break;
                case models_1.MouseEventType.MouseUp:
                    if (_this.screenCapturer)
                        _this.screenCapturer.mouseUp(e.button);
                    break;
            }
        };
        this.log = function (message) {
            console.log(message);
        };
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
        if (this.status == models_1.ClientStatus.Disconnected) {
            this.websocketClient.connect('ws://localhost:8085/', 'echo-protocol');
        }
    };
    Client.prototype.disconnect = function () {
        if (this.status != models_1.ClientStatus.Disconnected) {
            this.websocketClient.disconnect();
        }
    };
    Client.prototype.connectTo = function (id, pwd) {
        this.host = true;
        this.sendMessage(models_1.MessageType.ConnectionRequest, { id: id, pwd: pwd });
    };
    Client.prototype.closeConnection = function () {
        this.sendMessage(models_1.MessageType.ConnectionClose);
        this.cleanConnection();
    };
    Client.prototype.handleDisconnection = function (reasonCode, description) {
        var _this = this;
        this.log("Client disconnected. (" + reasonCode + ", " + description + ")");
        this.cleanConnection();
        this.status = models_1.ClientStatus.Disconnected;
        if (this.screenCapturer)
            this.screenCapturer.releaseDevice();
        if (this.onDisconnected)
            this.onDisconnected();
        setTimeout(function () { return _this.connect(); }, 10000);
    };
    Client.prototype.handleUTFMessage = function (message) {
        this.log(message);
        switch (message.type) {
            case models_1.MessageType.Error:
                //this.connectedClient = null;
                break;
            case models_1.MessageType.ClientReady:
                this.status = models_1.ClientStatus.Ready;
                this.clientId = message.content.id;
                this.clientPwd = message.content.pwd;
                if (this.onReady)
                    this.onReady(this.clientId, this.clientPwd);
                break;
            case models_1.MessageType.ConnectionRequest:
                this.host = false;
                // Request is already authorized by server, so we don't need to check for pwd
                this.sendMessage(models_1.MessageType.ConnectionAccept, message.content); // Content contains the guid of the requester
                break;
            case models_1.MessageType.ConnectionAccept:
                // Request is already authorized by server, so we don't need to check for pwd
                this.sendMessage(models_1.MessageType.ConnectionCompleted, message.content); // Content contains the guid of the requester
                break;
            case models_1.MessageType.ConnectionCompleted:
                this.status = models_1.ClientStatus.Connected;
                this.connectedClient = message.content;
                this.log("Connection estabilished with " + message.content);
                if (this.host)
                    this.requestNextFrame();
                else
                    this.sendFrame();
                break;
            case models_1.MessageType.ConnectionClosed:
                this.cleanConnection();
                if (this.onConnectionClosed)
                    this.onConnectionClosed();
                break;
            case models_1.MessageType.FrameRequest:
                this.frameReceived = true;
                break;
            case models_1.MessageType.NextFrameData:
                this.nextFrameData = message.content;
                break;
            case models_1.MessageType.MouseEvent:
                this.handleMessageEvent(message.content);
                break;
        }
    };
    return Client;
}());
exports.Client = Client;
//# sourceMappingURL=client.js.map