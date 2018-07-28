#include "Vector.h"
#include "AsyncWorker.h"

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
void encodeTwoSteps(std::vector<unsigned char> &image, unsigned width, unsigned height, std::vector<unsigned char> &out);

NAN_MODULE_INIT(Vector::Init)
{
	v8::Local<v8::FunctionTemplate> ctor = Nan::New<v8::FunctionTemplate>(Vector::New);
	constructor.Reset(ctor);
	ctor->InstanceTemplate()->SetInternalFieldCount(1);
	ctor->SetClassName(Nan::New("Vector").ToLocalChecked());

	// link our getters and setter to the object property
	Nan::SetAccessor(ctor->InstanceTemplate(), Nan::New("width").ToLocalChecked(), Vector::HandleGetters, Vector::HandleSetters);
	Nan::SetAccessor(ctor->InstanceTemplate(), Nan::New("height").ToLocalChecked(), Vector::HandleGetters, Vector::HandleSetters);

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

int x = 0;
int y = 0;

struct EncodeParams
{
	int width;
	int height;
	int length;
	LPBYTE bytes;
	std::vector<unsigned char> *out;
};

NAN_METHOD(Vector::GetNextFrame)
{
	std::cout << "Getting screen" << std::endl;
	D3DLOCKED_RECT rc;
	HRESULT hr = S_OK;
	LPBYTE bytes = nullptr;
	Cache *previous = nullptr;

	// unwrap this Vector
	Vector *self = Nan::ObjectWrap::Unwrap<Vector>(info.This());

	for (int i = 0; i < self->cache.size(); i++)
	{
		Cache *item = self->cache.at(i);
		if (item->x == x && item->y == y)
		{
			previous = item;
		}
	}

	if (previous == nullptr)
	{
		previous = new Cache();
		previous->x = x;
		previous->y = y;
		self->cache.push_back(previous);
	}

	int width = min(self->mode.Width - x, 400);
	int height = min(self->mode.Height - y, 400);
	int length;

	// copy data  into our buffers
	self->device->GetFrontBufferData(0, self->surface);

	self->surface->LockRect(&rc, NULL, 0);
	length = rc.Pitch * self->mode.Height;
	// allocate screenshots buffers
	bytes = new BYTE[length];
	CopyMemory(bytes, rc.pBits, length);

	self->surface->UnlockRect();

	// starting the async worker
	Nan::AsyncQueueWorker(new MyAsyncWorker(bytes, previous, length, self->mode.Width, self->mode.Height, x, y, width, height,
											new Nan::Callback(info[0].As<v8::Function>())));


	x += width;

	if (x >= self->mode.Width)
	{
		x = 0;
		y += height;
	}

	if (y >= self->mode.Height)
		y = 0;
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

	if (propertyName == "width")
		info.GetReturnValue().Set(self->mode.Width);
	else if (propertyName == "height")
		info.GetReturnValue().Set(self->mode.Height);
	else
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
