var remoteDesktopModule

if (process.env.DEBUG) {
  remoteDesktopModule= require('./build/Debug/remoteDesktopModule.node')
} else {
  remoteDesktopModule= require('./build/Release/remoteDesktopModule.node')
}

module.exports = remoteDesktopModule