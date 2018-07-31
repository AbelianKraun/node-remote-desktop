#include <nan.h>
#include <fstream>
#include <string>
#include <iostream>
#include <Windows.h>
#include <algorithm>
#include <memory>
#include <Wincodec.h>			 // we use WIC for saving images
#include <d3d9.h>				 // DirectX 9 header
#include <time.h>       /* time */

#pragma comment(lib, "d3d9.lib") // link to DirectX 9 library

struct Cache {
  int x;
  int y;
  std::vector<unsigned char>* data = nullptr;
};

struct CapturedFrameResult
{
  public:
	std::vector<unsigned char>* buf;
	int length;
	int left;
	int top;
	int width;
	int height;
};


class Vector : public Nan::ObjectWrap
{
public:
  IDirect3D9 *d3d = nullptr;
  IDirect3DDevice9 *device = nullptr;
  IDirect3DSurface9 *surface = nullptr;

  D3DPRESENT_PARAMETERS parameters = {0};
	D3DDISPLAYMODE mode;
	UINT pitch;
  std::vector<Cache*> cache;

  static NAN_MODULE_INIT(Init);
  static NAN_METHOD(New);
  static NAN_METHOD(InitDevice);
  static NAN_METHOD(GetNextFrame);
  static NAN_METHOD(ReleaseDevice);
  static NAN_METHOD(SetMousePosition);
  static NAN_METHOD(GetMousePosition);
  static NAN_METHOD(MouseClick);

  static NAN_GETTER(HandleGetters);
  static NAN_SETTER(HandleSetters);

  static Nan::Persistent<v8::FunctionTemplate> constructor;
};