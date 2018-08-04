import fs from "fs-extra";
import { server as websocketServer } from "websocket";
import * as http from "http";
import { v1 as uuid } from "uuid";
import { Client } from "./client";
import { MessageType } from "./message";
import { clientsRepository } from "./client_repository";

// Start server
var server = http.createServer(function (request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});

server.listen(8085, function () {
    console.log((new Date()) + ' Server is listening on port 8085');
});

var wsServer = new websocketServer({
    httpServer: server,
    autoAcceptConnections: false
});

// Accept and add all clients
wsServer.on('request', function (request) {
    var connection = request.accept('echo-protocol', request.origin);
    var id = uuid();

    var client = new Client(id, connection);
    client.onConnected = handleClientConnected;
    client.onDisconnected = handleClientDisconnected;
});

function handleClientConnected(client: Client) {
    clientsRepository.add(client);
    console.log("Connected clients:", clientsRepository.length);
}

function handleClientDisconnected(client: Client) {
    clientsRepository.remove(client);
    console.log("Connected clients:", clientsRepository.length);
}
