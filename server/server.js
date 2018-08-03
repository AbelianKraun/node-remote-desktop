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
server.listen(8085, function () {
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

    if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject();
        console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
        return;
    }

    var index = clients.size;
    var connection = request.accept('echo-protocol', request.origin);
    clients.set(index, connection);


    console.log((new Date()) + ' - Connection accepted. Updating users list to all.');
    sendUpdatedUsersList();

    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            console.log(message.utf8Data);

            let content = JSON.parse(message.utf8Data);
            let target;
            switch (content.type) {
                case "connect":
                    target = clients.get(content.client);
                    if (target)
                        target.sendUTF(JSON.stringify({ type: "connectionRequest", from: index }));
                    break;
                case "acceptConnection":
                    target = clients.get(content.from);
                    if (target)
                        target.sendUTF(JSON.stringify({ type: "connectionAccepted", from: index, width: content.width, height: content.height }));

                    connection.target = content.from;
                    break;
                case "frameReceived":
                    target = clients.get(content.from);
                    if (target)
                        target.sendUTF(JSON.stringify({ type: "frameReceived", from: index }));
                    break;
                case "nextFrameData":
                case "mouseClick":
                case "mouseMove":
                    target = clients.get(content.to);
                    if (target)
                        target.sendUTF(JSON.stringify(content));
                    break;

            }
        } else if (message.type === "binary") {
            if (connection.target != undefined) {
                let target = clients.get(connection.target);
                if (target)
                    target.sendBytes(message.binaryData);
            }
        }

    });

    connection.on('close', function (reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
        clients.delete(index);
    });
});

function sendUpdatedUsersList() {
    for (let [key, client] of clients) {
        let list = [];

        for (let [key2, client2] of clients)
            if (key2 != key)
                list.push(key2);

        client.sendUTF(JSON.stringify({ type: "usersList", clients: list }));
    }
}