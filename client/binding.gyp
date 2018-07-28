{
  "targets": [{
    "target_name": "remoteDesktopModule",
    "include_dirs" : [
      "src",
      "<!(node -e \"require('nan')\")"
    ],
    "sources": [
      "src/index.cc",
      "src/lodepng.cpp",
      "src/AsyncWorker.cc",
      "src/Vector.cc",
    ]
  }]
}