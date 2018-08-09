
(function () {
    const MouseEventType = require("../models").MouseEventType;
    const ipcRenderer = require("electron").ipcRenderer;
    const $ = require("jquery");

    const canvas = $("#canvas").get(0);
    const context = canvas.getContext("2d");
    const img = new Image();
    let nextFrameData: any = null;

    $(document).ready(() => {
        ipcRenderer.send("domReady");
    });

    ipcRenderer.on("drawFrame", (e, { content, frameData }) => {
        nextFrameData = frameData;
        img.src = "data:image/png;base64," + content.toString('base64');
    });
    
    img.onload = function onLoad(e) {
        if (nextFrameData)
            context.drawImage(img, nextFrameData.x, nextFrameData.y, nextFrameData.w, nextFrameData.h);
    };
   

    ipcRenderer.on("setResolution", (e, params) => {
        canvas.width = params.width;
        canvas.height = params.height;
        canvas.style.width = params.width + "px";
        canvas.style.height = params.height + "px";
    })

    // Events
    $(canvas).mousemove((e) => {
        ipcRenderer.send("mouseEvent", { type: MouseEventType.MouseMove, x: e.offsetX, y: e.offsetY });
    });

    $(canvas).mousedown((e: MouseEvent) => {
        console.log("mouseDown", e);
        ipcRenderer.send("mouseEvent", { type: MouseEventType.MouseDown, button: e.button });
    });

    $(canvas).mouseup((e: MouseEvent) => {
        console.log("mouseup", e);
        ipcRenderer.send("mouseEvent", { type: MouseEventType.MouseUp, button: e.button });
    });
})();