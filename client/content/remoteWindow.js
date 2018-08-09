(function () {
    var MouseEventType = require("../models").MouseEventType;
    var ipcRenderer = require("electron").ipcRenderer;
    var $ = require("jquery");
    var canvas = $("#canvas").get(0);
    var context = canvas.getContext("2d");
    var img = new Image();
    var nextFrameData = null;
    $(document).ready(function () {
        ipcRenderer.send("domReady");
    });
    ipcRenderer.on("drawFrame", function (e, _a) {
        var content = _a.content, frameData = _a.frameData;
        nextFrameData = frameData;
        img.src = "data:image/png;base64," + content.toString('base64');
    });
    img.onload = function onLoad(e) {
        if (nextFrameData)
            context.drawImage(img, nextFrameData.x, nextFrameData.y, nextFrameData.w, nextFrameData.h);
    };
    ipcRenderer.on("setResolution", function (e, params) {
        canvas.width = params.width;
        canvas.height = params.height;
        canvas.style.width = params.width + "px";
        canvas.style.height = params.height + "px";
    });
    // Events
    $(canvas).mousemove(function (e) {
        ipcRenderer.send("mouseEvent", { type: MouseEventType.MouseMove, x: e.offsetX, y: e.offsetY });
    });
    $(canvas).mousedown(function (e) {
        console.log("mouseDown", e);
        ipcRenderer.send("mouseEvent", { type: MouseEventType.MouseDown, button: e.button });
    });
    $(canvas).mouseup(function (e) {
        console.log("mouseup", e);
        ipcRenderer.send("mouseEvent", { type: MouseEventType.MouseUp, button: e.button });
    });
})();
//# sourceMappingURL=remoteWindow.js.map