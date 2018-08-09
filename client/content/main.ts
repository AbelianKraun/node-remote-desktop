(function () {
    const ipcRenderer = require("electron").ipcRenderer;
    const $ = require("jquery");

    $(document).ready(() => {
        ipcRenderer.send("domReady");
    })

    ipcRenderer.on("clientReady", (e, params) => {
        $("#client-id").text(params.id);
        $("#client-pwd").text(params.pwd);
    })

    $("#btn-connect").click(() => {
        let id = $("#txt-id").val().trim();
        let pwd = $("#txt-password").val().trim();

        if (id == "" || pwd == "") {
            alert("Invalid ID or password");
            return;
        }

        ipcRenderer.send("connect", { id, pwd });
    });
})();