// this is how we will require our module
const m = require('./bindings');
const fs = require("fs-extra");
const bmp = require("bmp-js");
var PNG = require('node-png').PNG;
var WebSocketClient = require('websocket').client;
var http = require('http');
var streamToBuffer = require('stream-to-buffer')

const Perf = require('performance-node');
const performance = new Perf();

const screenCapturer = new m.Vector(20, 10, 0);


let init = screenCapturer.initDevice();

if (!init)
    return;

var client = new WebSocketClient();
client.on('connectFailed', function (error) {
    console.log('Connect Error: ' + error.toString());

    setTimeout(tryConnect, 10000);
});

client.on('connect', function (connection) {
    console.log('WebSocket Client Connected');
    connection.on('error', function (error) {
        console.log("Connection Error: " + error.toString());
    });
    connection.on('close', function () {
        console.log('echo-protocol Connection Closed');
        setTimeout(tryConnect, 10000);
    });
    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            console.log("Received: '" + message.utf8Data + "'");
        }
    });
});

function tryConnect() {
    client.connect('ws://localhost:8080/', 'echo-protocol');
}

tryConnect();


/* let d = screenCapturer.getNextFrame();
var bmpData = { data: Buffer.from(new Uint8Array(d.data)), width: d.width, height: d.height };
var res = new PNG({ width: bmpData, width: bmpData.width, height: bmpData.height });
res.data = bmpData.data;
var s = res.pack(); */


function exitHandler(options, err) {

    if (screenCapturer)
        screenCapturer.releaseDevice();

    if (err) console.log(err.stack);
    if (options.exit) process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null, { cleanup: true }));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true }));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));