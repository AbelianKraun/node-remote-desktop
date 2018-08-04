import fs from "fs-extra";
import { server as websocketServer } from "websocket";
import * as http from "http";
import { v1 as uuid } from "uuid";
import { Client, ClientRepository } from "./client";
import { MessageType } from "./message";

var clients = new ClientRepository();

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
    client.onQueueMessage = handleClientQueueMessage;
});

function handleClientConnected(client: Client) {
    clients.add(client);
    console.log("Connected clients:", clients.length);
}

function handleClientDisconnected(client: Client) {
    clients.remove(client);
    console.log("Connected clients:", clients.length);
}

function handleClientQueueMessage(from: Client, to: Client | string, type: MessageType, content: any) {

    let client!: Client;

    if (to instanceof Client)
        client = to;
    else
        client = clients.findByUuid(to);

    if (client)
        client.sendMessage(type, content);
}

