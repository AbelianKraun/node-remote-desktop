#include "Vector.h"

#define WIDEN2(x) L##x
#define WIDEN(x) WIDEN2(x)
#define __WFILE__ WIDEN(__FILE__)
#define HRCHECK(__expr)                                                                                                           \
	{                                                                                                                             \
		hr = (__expr);                                                                                                            \
		if (FAILED(hr))                                                                                                           \
		{                                                                                                                         \
			wprintf(L"FAILURE 0x%08X (%i)\n\tline: %u file: '%s'\n\texpr: '" WIDEN(#__expr) L"'\n", hr, hr, __LINE__, __WFILE__); \
			goto cleanup;                                                                                                         \
		}                                                                                                                         \
	}
#define RELEASE(__p)        \
	{                       \
		if (__p != nullptr) \
		{                   \
			__p->Release(); \
			__p = nullptr;  \
		}                   \
	}

Nan::Persistent<v8::FunctionTemplate> Vector::constructor;

NAN_MODULE_INIT(Vector::Init)
{
	v8::Local<v8::FunctionTemplate> ctor = Nan::New<v8::FunctionTemplate>(Vector::New);
	constructor.Reset(ctor);
	ctor->InstanceTemplate()->SetInternalFieldCount(1);
	ctor->SetClassName(Nan::New("Vector").ToLocalChecked());

	// link our getters and setter to the object property
	/* 	Nan::SetAccessor(ctor->InstanceTemplate(), Nan::New("x").ToLocalChecked(), Vector::HandleGetters, Vector::HandleSetters);
	Nan::SetAccessor(ctor->InstanceTemplate(), Nan::New("y").ToLocalChecked(), Vector::HandleGetters, Vector::HandleSetters);
	Nan::SetAccessor(ctor->InstanceTemplate(), Nan::New("z").ToLocalChecked(), Vector::HandleGetters, Vector::HandleSetters);
 */

	// Methods
	Nan::SetPrototypeMethod(ctor, "initDevice", InitDevice);
	Nan::SetPrototypeMethod(ctor, "getNextFrame", GetNextFrame);
	Nan::SetPrototypeMethod(ctor, "releaseDevice", ReleaseDevice);

	target->Set(Nan::New("Vector").ToLocalChecked(), ctor->GetFunction());
}

NAN_METHOD(Vector::New)
{
	// throw an error if constructor is called without new keyword
	if (!info.IsConstructCall())
	{
		return Nan::ThrowError(Nan::New("Vector::New - called without new keyword").ToLocalChecked());
	}

	// expect exactly 3 arguments
	/* 	if (info.Length() != 3)
	{
		return Nan::ThrowError(Nan::New("Vector::New - expected arguments x, y, z").ToLocalChecked());
	} */

	// create a new instance and wrap our javascript instance
	Vector *vec = new Vector();
	vec->Wrap(info.Holder());

	// return the wrapped javascript instance
	info.GetReturnValue().Set(info.Holder());
}

NAN_METHOD(Vector::InitDevice)
{
	D3DLOCKED_RECT rc;
	HRESULT hr = S_OK;
	Vector *self = Nan::ObjectWrap::Unwrap<Vector>(info.This());

	int adapter = 0;
	try
	{
		// init D3D and get screen size
		self->d3d = Direct3DCreate9(D3D_SDK_VERSION);
		self->d3d->GetAdapterDisplayMode(adapter, &(self->mode));

		self->parameters.Windowed = TRUE;
		self->parameters.BackBufferCount = 1;
		self->parameters.BackBufferHeight = self->mode.Height;
		self->parameters.BackBufferWidth = self->mode.Width;
		self->parameters.SwapEffect = D3DSWAPEFFECT_DISCARD;
		self->parameters.hDeviceWindow = NULL;

		// create device & capture surface
		self->d3d->CreateDevice(adapter, D3DDEVTYPE_HAL, NULL, D3DCREATE_SOFTWARE_VERTEXPROCESSING, &(self->parameters), &(self->device));
		self->device->CreateOffscreenPlainSurface(self->mode.Width, self->mode.Height, D3DFMT_A8R8G8B8, D3DPOOL_SYSTEMMEM, &(self->surface), nullptr);

		// compute the required buffer size
		self->surface->LockRect(&rc, NULL, 0);
		self->pitch = rc.Pitch;
		self->surface->UnlockRect();
		info.GetReturnValue().Set(Nan::New(true));
	}
	catch (...)
	{
		std::cout << "Init device fail";
		RELEASE(self->surface);
		RELEASE(self->device);
		RELEASE(self->d3d);
	}
}

NAN_METHOD(Vector::GetNextFrame)
{
	CapturedFrameResult ret = {0};
	D3DLOCKED_RECT rc;
	HRESULT hr = S_OK;
	LPBYTE bytes = nullptr;
	LPBYTE swappedBytes = nullptr;

	// unwrap this Vector
	Vector *self = Nan::ObjectWrap::Unwrap<Vector>(info.This());

	// copy data  into our buffers
	self->device->GetFrontBufferData(0, self->surface);

	self->surface->LockRect(&rc, NULL, 0);

	// allocate screenshots buffers
	bytes = new BYTE[rc.Pitch * self->mode.Height];
	swappedBytes = new BYTE[rc.Pitch * self->mode.Height];

	CopyMemory(bytes, rc.pBits, rc.Pitch * self->mode.Height);
	self->surface->UnlockRect();

	// TO BGRA

	for (unsigned int i = 0; i < rc.Pitch * self->mode.Height; i += 4)
	{
		char b = bytes[i];
		char g = bytes[i + 1];
		char r = bytes[i + 2];
		char a = bytes[i + 3];

		swappedBytes[i] = r;
		swappedBytes[i + 1] = g;
		swappedBytes[i + 2] = b;
		swappedBytes[i + 3] = a;
	}

	delete[] bytes;

	ret.buf = swappedBytes;
	ret.length = rc.Pitch * self->mode.Height;
	ret.left = 0;
	ret.top = 0;
	ret.width = self->mode.Width;
	ret.height = self->mode.Height;

	//CapturedFrameResult ret = CaptureScreen("./test.png");
	//BYTE *bytes = ret.buf;
	// create a new JS instance from arguments
	v8::Local<v8::Object> frame = Nan::New<v8::Object>();
	v8::Local<v8::Array> array = Nan::New<v8::Array>(ret.length);

	// Build JS array
	for (int i = 0; i < ret.length; i++)
		Nan::Set(array, i, Nan::New(ret.buf[i]));

	delete[] ret.buf; // Clean buffer
	frame->Set(Nan::New("data").ToLocalChecked(), array);
	frame->Set(Nan::New("left").ToLocalChecked(), Nan::New(ret.left));
	frame->Set(Nan::New("top").ToLocalChecked(), Nan::New(ret.top));
	frame->Set(Nan::New("width").ToLocalChecked(), Nan::New(ret.width));
	frame->Set(Nan::New("height").ToLocalChecked(), Nan::New(ret.height));
	info.GetReturnValue().Set(frame);
}

NAN_METHOD(Vector::ReleaseDevice)
{

	Vector *self = Nan::ObjectWrap::Unwrap<Vector>(info.This());
	HRESULT hr = S_OK;

	RELEASE(self->surface);
	RELEASE(self->device);
	RELEASE(self->d3d);
}

NAN_GETTER(Vector::HandleGetters)
{
	Vector *self = Nan::ObjectWrap::Unwrap<Vector>(info.This());

	std::string propertyName = std::string(*Nan::Utf8String(property));
	info.GetReturnValue().Set(Nan::Undefined());
}

NAN_SETTER(Vector::HandleSetters)
{
	Vector *self = Nan::ObjectWrap::Unwrap<Vector>(info.This());

	if (!value->IsNumber())
	{
		return Nan::ThrowError(Nan::New("expected value to be a number").ToLocalChecked());
	}

	std::string propertyName = std::string(*Nan::Utf8String(property));
}

int a = 0;
MONITORINFOEX mi[2] = {MONITORINFOEX(), MONITORINFOEX()};

BOOL CALLBACK MonitorEnumProc(HMONITOR hMonitor, HDC hdcMonitor, LPRECT lprcMonitor, LPARAM dwData)
{
	mi[a].cbSize = sizeof(mi[a]);
	//lprcMonitor holds the rectangle that describes the monitor position and resolution)

	GetMonitorInfo(hMonitor, &mi[a]);

	a++;
	return true;
}

CapturedFrameResult CaptureScreen(const char *filename)
{
	HDC hDesktopDC = CreateDC("DISPLAY", 0, 0, 0);
	HDC hdc = GetDC(NULL);
	EnumDisplayMonitors(hdc, NULL, &MonitorEnumProc, NULL);
	ReleaseDC(NULL, hdc);

	int nScreenWidth = 250;  //mi[1].rcMonitor.right;
	int nScreenHeight = 250; //mi[0].rcMonitor.bottom;
	HWND hDesktopWnd = GetDesktopWindow();

	HDC hCaptureDC = CreateCompatibleDC(hDesktopDC);
	HBITMAP hCaptureBitmap = CreateCompatibleBitmap(hDesktopDC, nScreenWidth, nScreenHeight);
	SelectObject(hCaptureDC, hCaptureBitmap);

	BitBlt(hCaptureDC, 0, 0, nScreenWidth, nScreenHeight, hDesktopDC, 0, 0, SRCCOPY | CAPTUREBLT);

	BITMAPINFO bmi = {0};
	bmi.bmiHeader.biSize = sizeof(bmi.bmiHeader);
	bmi.bmiHeader.biWidth = nScreenWidth;
	bmi.bmiHeader.biHeight = nScreenHeight;
	bmi.bmiHeader.biPlanes = 1;
	bmi.bmiHeader.biBitCount = 32;
	bmi.bmiHeader.biCompression = BI_RGB;

	RGBQUAD *pPixels = new RGBQUAD[nScreenWidth * nScreenHeight];

	GetDIBits(
		hCaptureDC,
		hCaptureBitmap,
		0,
		nScreenHeight,
		pPixels,
		&bmi,
		DIB_RGB_COLORS);

	// write:
	int p;
	int x, y;

	BYTE *buf = new BYTE[nScreenWidth * 4 * nScreenHeight];
	int c = 0;
	for (y = 0; y < nScreenHeight; y++)
	{
		for (x = 0; x < nScreenWidth; x++)
		{
			p = (nScreenHeight - y - 1) * nScreenWidth + x; // upside down
			const char r = pPixels[p].rgbRed;
			const char g = pPixels[p].rgbGreen;
			const char b = pPixels[p].rgbBlue;

			buf[c] = r;
			buf[c + 1] = g;
			buf[c + 2] = b;
			buf[c + 3] = 255;

			c += 4;
		}
	}

	// Use the new array data to create the new bitmap file
	/* 	SaveBitmapToFile(buf,
	nScreenWidth,
	nScreenHeight,
	24,
	0,
	filename); */

	delete[] pPixels;

	ReleaseDC(hDesktopWnd, hDesktopDC);
	DeleteDC(hCaptureDC);
	DeleteObject(hCaptureBitmap);

	CapturedFrameResult ret = CapturedFrameResult();
	ret.buf = buf;
	ret.length = nScreenWidth * 4 * nScreenHeight;
	ret.width = nScreenWidth;
	ret.height = nScreenHeight;
	return ret;
}
