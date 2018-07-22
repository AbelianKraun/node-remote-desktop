// this is how we will require our module
const m = require('./bindings');
const fs = require("fs-extra");
const bmp = require("bmp-js");
var PNG = require('node-png').PNG;
var WebSocketServer = require('websocket').server;
var http = require('http');
var streamToBuffer = require('stream-to-buffer')

const Perf = require('performance-node');
const performance = new Perf();

const vec1 = new m.Vector(20, 10, 0);


var t1 = performance.now();
let d = vec1.getScreen();
var bmpData = { data: new Buffer(new Uint8Array(d.data)), width: d.width, height: d.height };
var t2 = performance.now();
console.log(t2 - t1);
/* var rawData = bmp.encode(bmpData);//default no compression,write rawData to .bmp file */
var res = new PNG({ width: bmpData, width: bmpData.width, height: bmpData.height });
res.data = bmpData.data;
var s = res.pack();
s.pipe(fs.createWriteStream("out.png"));
var t3 = performance.now();
console.log(t3 - t2, t3 - t1);
return;


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
    console.log((new Date()) + ' Connection accepted.');



    setInterval(() => {
        let d = vec1.getScreen();
        var bmpData = { data: new Buffer(new Uint8Array(d)), width: 1920, height: 1080 };
        /* var rawData = bmp.encode(bmpData);//default no compression,write rawData to .bmp file */
        var res = new PNG({ width: bmpData, width: bmpData.width, height: bmpData.height });
        res.data = bmpData.data;
        var s = res.pack();

        var bufs = [];
        s.on('data', function(d){ bufs.push(d); });
        s.on('end', function(){
          var buf = Buffer.concat(bufs);
          connection.sendBytes(Buffer.concat(bufs));
        });

    }, 1000)

    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            console.log('Received Message: ' + message.utf8Data);
            connection.sendUTF(message.utf8Data);
        }
        else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
            connection.sendBytes(message.binaryData);
        }
    });
    connection.on('close', function (reasonCode, description) {
        clearInterval(interval);
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
});