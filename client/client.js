const { app, BrowserWindow, ipcMain } = require('electron')
const path = require("path");
const fs = require("fs-extra");
const captureModule = require('./bindings');
const WebSocketClient = require('websocket').client;
const PNG = require("node-png").PNG;
const streamToBuffer = require("stream-to-buffer");
const screenCapturer = new captureModule.Vector();
let win;

// Init capturer
let init = screenCapturer.initDevice();

// On fail close app
if (!init) {
    app.quit();
    return;
}


var client = new WebSocketClient();
var connection = null;
var interval = null;
var currentTarget = null;
var nextFrameData = {};
var mustSendNextFrame = false;
var cache = [];

client.on('connectFailed', function (error) {
    console.log('Connect Error: ' + error.toString());

    setTimeout(tryConnect, 10000);
});

client.on('connect', function (newConnection) {
    connection = newConnection;

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
            console.log(message.utf8Data);

            let content = JSON.parse(message.utf8Data);
            switch (content.type) {
                case "usersList":
                    win.webContents.send("refreshUsersList", content.clients);
                    break;
                case "connectionRequest":
                    currentTarget = content.from;
                    mustSendNextFrame = true;
                    sendMessage({ type: "acceptConnection", from: content.from, width: screenCapturer.width, height: screenCapturer.height });
                    //sendScreen(content.from);
                    setInterval(() => screenCapturer.getNextFrame(() => {return}), 5000);
                    break;
                case "connectionAccepted":
                    currentTarget = content.from;
                    win.webContents.send("setFrameDimension", {width: content.width, height: content.height});
                    break;
                case "nextFrameData":
                    nextFrameData.x = content.x;
                    nextFrameData.y = content.y;
                    nextFrameData.width = content.w;
                    nextFrameData.height = content.h;
                    break;
                case "frameReceived":
                    console.log("Frame received. Sending another.", currentTarget);
                    mustSendNextFrame = true;
                    break;
            }
        }
        else if (message.type === 'binary') {

            win.webContents.send("updateScreen", { data: message.binaryData, frameData: nextFrameData });
            sendMessage({ type: "frameReceived", from: currentTarget });
        }
    });
});

function tryConnect() {
    client.connect('ws://192.168.1.20:8080/', 'echo-protocol');
}

function sendMessage(obj) {
    if (connection)
        connection.sendUTF(JSON.stringify(obj));
}

function sendScreen() {

    if (mustSendNextFrame) {
        let dirties = cache.filter(c => c.isDirty).sort(x => x.updated.getTime());
        let d = dirties.length > 0 ? dirties[0] : null;

        if (d) {
            d.isDirty = false;
            console.log("Sending frame: ", d.x, d.y, d.width, d.height, d.data.length);
            sendMessage({ type: "nextFrameData", to: currentTarget, x: d.x, y: d.y, w: d.width, h: d.height });
            connection.sendBytes(Buffer.from(new Uint8Array(d.data)));
            mustSendNextFrame = false;
        }
    }

    let d = screenCapturer.getNextFrame((d) => {
        if (d.data.length != 0) {

            let previous = cache.find(c => c.x == d.x && c.y == d.y);
            if (!previous) {
                previous = { x: d.x, y: d.y, width: d.width, height: d.height };
                cache.push(previous);
            }

            previous.data = d.data;
            previous.updated = new Date();
            previous.isDirty = true;
        }

        setTimeout(sendScreen,1);
    });

}

ipcMain.on("connectToClient", (e, client) => {
    sendMessage({ type: "connect", client: client });
});


function createWindow() {

    // Creazione della finestra del browser.
    win = new BrowserWindow({ width: 800, height: 600 })
    const startUrl = path.resolve('index.html');
    // e viene caricato il file index.html della nostra app.
    win.loadFile(startUrl)


    setTimeout(() => tryConnect(), 1000);

    // Open the DevTools.
    //win.webContents.openDevTools()

    // Emesso quando la finestra viene chiusa.
    win.on('closed', () => {
        // Eliminiamo il riferimento dell'oggetto window;  solitamente si tiene traccia delle finestre
        // in array se l'applicazione supporta più finestre, questo è il momento in cui 
        // si dovrebbe eliminare l'elemento corrispondente.
        win = null
    })
}

// Questo metodo viene chiamato quando Electron ha finito
// l'inizializzazione ed è pronto a creare le finestre browser.
// Alcune API possono essere utilizzate solo dopo che si verifica questo evento.
app.on('ready', createWindow)

// Terminiamo l'App quando tutte le finestre vengono chiuse.
app.on('window-all-closed', () => {
    // Su macOS è comune che l'applicazione e la barra menù 
    // restano attive finché l'utente non esce espressamente tramite i tasti Cmd + Q
    if (process.platform !== 'darwin') {
        if (screenCapturer)
            screenCapturer.releaseDevice();

        app.quit()
    }
})

app.on('activate', () => {
    // Su macOS è comune ri-creare la finestra dell'app quando
    // viene cliccata l'icona sul dock e non ci sono altre finestre aperte.
    if (win === null) {
        createWindow()
    }
})

// in questo file possiamo includere il codice specifico necessario 
// alla nostra app. Si può anche mettere il codice in file separati e richiederlo qui.



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