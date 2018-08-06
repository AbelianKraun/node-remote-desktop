"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var websocket_1 = require("websocket");
var http = require("http");
var uuid_1 = require("uuid");
var client_1 = require("./client");
var client_repository_1 = require("./client_repository");
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
});
function handleClientConnected(client) {
    client_repository_1.clientsRepository.add(client);
    console.log("Connected clients:", client_repository_1.clientsRepository.length);
}
function handleClientDisconnected(client) {
    client_repository_1.clientsRepository.remove(client);
    console.log("Connected clients:", client_repository_1.clientsRepository.length);
}
//# sourceMappingURL=app.js.map