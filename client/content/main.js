var ipcRenderer = require("electron").ipcRenderer;
var $ = require("jquery");
$(document).ready(function () {
    ipcRenderer.send("domReady");
});
ipcRenderer.on("clientReady", function (e, params) {
    $("#client-id").text(params.id);
    $("#client-pwd").text(params.pwd);
});
$("#btn-connect").click(function () {
    var id = $("#txt-id").val().trim();
    var pwd = $("#txt-password").val().trim();
    if (id == "" || pwd == "") {
        alert("Invalid ID or password");
        return;
    }
    ipcRenderer.send("connect", { id: id, pwd: pwd });
});
//# sourceMappingURL=main.js.map