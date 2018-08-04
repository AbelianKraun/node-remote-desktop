"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var websocket_1 = require("websocket");
var http = require("http");
var uuid_1 = require("uuid");
var client_1 = require("./client");
var clients = new client_1.ClientRepository();
// Start server
var server = http.createServer(function (request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});
server.listen(8085, function () {
    console.log((new Date()) + ' Server is listening on port 8085');
});
var wsServer = new websocket_1.server({
    httpServer: server,
    autoAcceptConnections: false
});
// Accept and add all clients
wsServer.on('request', function (request) {
    var connection = request.accept('echo-protocol', request.origin);
    var id = uuid_1.v1();
    var client = new client_1.Client(id, connection);
    client.onConnected = handleClientConnected;
    client.onDisconnected = handleClientDisconnected;
    client.onQueueMessage = handleClientQueueMessage;
});
function handleClientConnected(client) {
    clients.add(client);
    console.log("Connected clients:", clients.length);
}
function handleClientDisconnected(client) {
    clients.remove(client);
    console.log("Connected clients:", clients.length);
}
function handleClientQueueMessage(from, to, type, content) {
    var client;
    if (to instanceof client_1.Client)
        client = to;
    else
        client = clients.findByUuid(to);
    if (client)
        client.sendMessage(type, content);
}
//# sourceMappingURL=app.js.map