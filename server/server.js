// this is how we will require our module
const fs = require("fs-extra");
var WebSocketServer = require('websocket').server;
var http = require('http');
var streamToBuffer = require('stream-to-buffer')

let clients = new Map();

var server = http.createServer(function (request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});
server.listen(8080, function () {
    console.log((new Date()) + ' Server is listening on port 8080');
});

wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
    // put logic here to detect whether the specified origin is allowed.
    return true;
}

wsServer.on('request', function (request) {
    let interval = null;

    if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject();
        console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
        return;
    }

    var connection = request.accept('echo-protocol', request.origin);
    clients.set(connection.origin, connection);
    console.log(connection);
    console.log((new Date()) + ' Connection accepted.');

    connection.on('message', function (message) {
    });

    connection.on('close', function (reasonCode, description) {
        clearInterval(interval);
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
});