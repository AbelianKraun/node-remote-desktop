#include "Vector.h"
#include <fstream>
#include <string>
#include <iostream>
#include <Windows.h>
#include <algorithm>
#include <memory>
#include <Wincodec.h>             // we use WIC for saving images
#include <d3d9.h>                 // DirectX 9 header
#pragma comment(lib, "d3d9.lib")  // link to DirectX 9 library


#define WIDEN2(x) L ## x
#define WIDEN(x) WIDEN2(x)
#define __WFILE__ WIDEN(__FILE__)
#define HRCHECK(__expr) {hr=(__expr);if(FAILED(hr)){wprintf(L"FAILURE 0x%08X (%i)\n\tline: %u file: '%s'\n\texpr: '" WIDEN(#__expr) L"'\n",hr, hr, __LINE__,__WFILE__);goto cleanup;}}
#define RELEASE(__p) {if(__p!=nullptr){__p->Release();__p=nullptr;}}



struct CaptureReturn
{
public:
	BYTE * buf;
	int length;
	int width;
	int height;
};

HRESULT SavePixelsToFile32bppPBGRA(UINT width, UINT height, UINT stride, LPBYTE pixels, LPWSTR filePath, const GUID &format);


CaptureReturn Direct3D9TakeScreenshots(UINT adapter)
{

	HRESULT hr = S_OK;
	IDirect3D9 *d3d = nullptr;
	IDirect3DDevice9 *device = nullptr;
	IDirect3DSurface9 *surface = nullptr;
	D3DPRESENT_PARAMETERS parameters = { 0 };
	D3DDISPLAYMODE mode;
	D3DLOCKED_RECT rc;
	UINT pitch;
	LPBYTE shots = nullptr;
	CaptureReturn ret = { 0 };

	// init D3D and get screen size
	d3d = Direct3DCreate9(D3D_SDK_VERSION);
	HRCHECK(d3d->GetAdapterDisplayMode(adapter, &mode));

	parameters.Windowed = TRUE;
	parameters.BackBufferCount = 1;
	parameters.BackBufferHeight = mode.Height;
	parameters.BackBufferWidth = mode.Width;
	parameters.SwapEffect = D3DSWAPEFFECT_DISCARD;
	parameters.hDeviceWindow = NULL;

	// create device & capture surface
	HRCHECK(d3d->CreateDevice(adapter, D3DDEVTYPE_HAL, NULL, D3DCREATE_SOFTWARE_VERTEXPROCESSING, &parameters, &device));
	HRCHECK(device->CreateOffscreenPlainSurface(mode.Width, mode.Height, D3DFMT_A8R8G8B8, D3DPOOL_SYSTEMMEM, &surface, nullptr));

	// compute the required buffer size
	HRCHECK(surface->LockRect(&rc, NULL, 0));
	pitch = rc.Pitch;
	HRCHECK(surface->UnlockRect());

	// allocate screenshots buffers
	shots = new BYTE[pitch * mode.Height];

	// get the data
	HRCHECK(device->GetFrontBufferData(0, surface));

	// copy it into our buffers
	HRCHECK(surface->LockRect(&rc, NULL, 0));
	CopyMemory(shots, rc.pBits, rc.Pitch * mode.Height);
	HRCHECK(surface->UnlockRect());

	// TO BGRA
	LPBYTE bytes = new BYTE[rc.Pitch * mode.Height];

	for (int i = 0; i < rc.Pitch * mode.Height; i+= 4) {
		char b = shots[i];
		char g = shots[i + 1];
		char r = shots[i + 2];
		char a = shots[i + 3];

		bytes[i] = r;
		bytes[i + 1] = g;
		bytes[i + 2] = b;
		bytes[i + 3] = a;
	}

	delete[] shots;

	ret.buf = bytes;
	ret.length = rc.Pitch * mode.Height;
	ret.width = mode.Width;
	ret.height = mode.Height;



cleanup:

	RELEASE(surface);
	RELEASE(device);
	RELEASE(d3d);
	return ret;
}

HRESULT SavePixelsToFile32bppPBGRA(UINT width, UINT height, UINT stride, LPBYTE pixels, LPWSTR filePath, const GUID &format)
{
	if (!filePath || !pixels)
		return E_INVALIDARG;

	HRESULT hr = S_OK;
	IWICImagingFactory *factory = nullptr;
	IWICBitmapEncoder *encoder = nullptr;
	IWICBitmapFrameEncode *frame = nullptr;
	IWICStream *stream = nullptr;
	GUID pf = GUID_WICPixelFormat32bppPBGRA;
	BOOL coInit = CoInitialize(nullptr);

	HRCHECK(CoCreateInstance(CLSID_WICImagingFactory, nullptr, CLSCTX_INPROC_SERVER, IID_PPV_ARGS(&factory)));
	HRCHECK(factory->CreateStream(&stream));
	HRCHECK(stream->InitializeFromFilename(filePath, GENERIC_WRITE));
	HRCHECK(factory->CreateEncoder(format, nullptr, &encoder));
	HRCHECK(encoder->Initialize(stream, WICBitmapEncoderNoCache));
	HRCHECK(encoder->CreateNewFrame(&frame, nullptr)); // we don't use options here
	HRCHECK(frame->Initialize(nullptr)); // we dont' use any options here
	HRCHECK(frame->SetSize(width, height));
	HRCHECK(frame->SetPixelFormat(&pf));
	HRCHECK(frame->WritePixels(height, stride, stride * height, pixels));
	HRCHECK(frame->Commit());
	HRCHECK(encoder->Commit());

cleanup:
	RELEASE(stream);
	RELEASE(frame);
	RELEASE(encoder);
	RELEASE(factory);
	if (coInit) CoUninitialize();
	return hr;
}


Nan::Persistent<v8::FunctionTemplate> Vector::constructor;
CaptureReturn CaptureScreen(const char *filename);
void SaveBitmapToFile(BYTE *pBitmapBits,
	LONG lWidth,
	LONG lHeight,
	WORD wBitsPerPixel,
	const unsigned long &padding_size,
	LPCTSTR lpszFileName);

NAN_MODULE_INIT(Vector::Init)
{
	v8::Local<v8::FunctionTemplate> ctor = Nan::New<v8::FunctionTemplate>(Vector::New);
	constructor.Reset(ctor);
	ctor->InstanceTemplate()->SetInternalFieldCount(1);
	ctor->SetClassName(Nan::New("Vector").ToLocalChecked());

	// link our getters and setter to the object property
	Nan::SetAccessor(ctor->InstanceTemplate(), Nan::New("x").ToLocalChecked(), Vector::HandleGetters, Vector::HandleSetters);
	Nan::SetAccessor(ctor->InstanceTemplate(), Nan::New("y").ToLocalChecked(), Vector::HandleGetters, Vector::HandleSetters);
	Nan::SetAccessor(ctor->InstanceTemplate(), Nan::New("z").ToLocalChecked(), Vector::HandleGetters, Vector::HandleSetters);

	Nan::SetPrototypeMethod(ctor, "getScreen", GetScreen);

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
	if (info.Length() != 3)
	{
		return Nan::ThrowError(Nan::New("Vector::New - expected arguments x, y, z").ToLocalChecked());
	}

	// expect arguments to be numbers
	if (!info[0]->IsNumber() || !info[1]->IsNumber() || !info[2]->IsNumber())
	{
		return Nan::ThrowError(Nan::New("Vector::New - expected arguments to be numbers").ToLocalChecked());
	}

	// create a new instance and wrap our javascript instance
	Vector *vec = new Vector();
	vec->Wrap(info.Holder());

	// initialize it's values
	vec->x = info[0]->NumberValue();
	vec->y = info[1]->NumberValue();
	vec->z = info[2]->NumberValue();

	// return the wrapped javascript instance
	info.GetReturnValue().Set(info.Holder());
}

NAN_METHOD(Vector::GetScreen)
{
	// unwrap this Vector
	Vector *self = Nan::ObjectWrap::Unwrap<Vector>(info.This());

	// get a local handle to our constructor function
	v8::Local<v8::Function> constructorFunc = Nan::New(Vector::constructor)->GetFunction();

	CaptureReturn ret = Direct3D9TakeScreenshots(1);

	//CaptureReturn ret = CaptureScreen("./test.png");
	//BYTE *bytes = ret.buf;
	// create a new JS instance from arguments
	v8::Local<v8::Object> obj = Nan::New<v8::Object>();
	v8::Local<v8::Array> array = Nan::New<v8::Array>(ret.length);

	for (int i = 0; i < ret.length; i++)
	{
		Nan::Set(array, i, Nan::New(ret.buf[i]));
	}

	obj->Set(Nan::New("data").ToLocalChecked(), array);
	obj->Set(Nan::New("width").ToLocalChecked(), Nan::New(ret.width));
	obj->Set(Nan::New("height").ToLocalChecked(), Nan::New(ret.height));

	delete[] ret.buf;



	info.GetReturnValue().Set(obj);
}

NAN_GETTER(Vector::HandleGetters)
{
	Vector *self = Nan::ObjectWrap::Unwrap<Vector>(info.This());

	std::string propertyName = std::string(*Nan::Utf8String(property));
	if (propertyName == "x")
	{
		info.GetReturnValue().Set(self->x);
	}
	else if (propertyName == "y")
	{
		info.GetReturnValue().Set(self->y);
	}
	else if (propertyName == "z")
	{
		info.GetReturnValue().Set(self->z);
	}
	else
	{
		info.GetReturnValue().Set(Nan::Undefined());
	}
}

NAN_SETTER(Vector::HandleSetters)
{
	Vector *self = Nan::ObjectWrap::Unwrap<Vector>(info.This());

	if (!value->IsNumber())
	{
		return Nan::ThrowError(Nan::New("expected value to be a number").ToLocalChecked());
	}

	std::string propertyName = std::string(*Nan::Utf8String(property));
	if (propertyName == "x")
	{
		self->x = value->NumberValue();
	}
	else if (propertyName == "y")
	{
		self->y = value->NumberValue();
	}
	else if (propertyName == "z")
	{
		self->z = value->NumberValue();
	}
}

int a = 0;
MONITORINFOEX mi[2] = { MONITORINFOEX(), MONITORINFOEX() };

BOOL CALLBACK MonitorEnumProc(HMONITOR hMonitor, HDC hdcMonitor, LPRECT lprcMonitor, LPARAM dwData)
{
	mi[a].cbSize = sizeof(mi[a]);
	//lprcMonitor holds the rectangle that describes the monitor position and resolution)

	GetMonitorInfo(hMonitor, &mi[a]);

	a++;
	return true;
}

CaptureReturn CaptureScreen(const char *filename)
{
	HDC hDesktopDC = CreateDC("DISPLAY", 0, 0, 0);
	HDC hdc = GetDC(NULL);
	EnumDisplayMonitors(hdc, NULL, &MonitorEnumProc, NULL);
	ReleaseDC(NULL, hdc);

	int nScreenWidth = 250; //mi[1].rcMonitor.right;
	int nScreenHeight = 250; //mi[0].rcMonitor.bottom;
	HWND hDesktopWnd = GetDesktopWindow();

	HDC hCaptureDC = CreateCompatibleDC(hDesktopDC);
	HBITMAP hCaptureBitmap = CreateCompatibleBitmap(hDesktopDC, nScreenWidth, nScreenHeight);
	SelectObject(hCaptureDC, hCaptureBitmap);

	BitBlt(hCaptureDC, 0, 0, nScreenWidth, nScreenHeight, hDesktopDC, 0, 0, SRCCOPY | CAPTUREBLT);

	BITMAPINFO bmi = { 0 };
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

	CaptureReturn ret = CaptureReturn();
	ret.buf = buf;
	ret.length = nScreenWidth * 4 * nScreenHeight;
	ret.width = nScreenWidth;
	ret.height = nScreenHeight;
	return ret;
}

// Save the bitmap to a bmp file
void SaveBitmapToFile(BYTE *pBitmapBits,
	LONG lWidth,
	LONG lHeight,
	WORD wBitsPerPixel,
	const unsigned long &padding_size,
	LPCTSTR lpszFileName)
{
	// Some basic bitmap parameters
	unsigned long headers_size = sizeof(BITMAPFILEHEADER) +
		sizeof(BITMAPINFOHEADER);

	unsigned long pixel_data_size = lHeight * ((lWidth * (wBitsPerPixel / 8)) + padding_size);

	BITMAPINFOHEADER bmpInfoHeader = { 0 };

	// Set the size
	bmpInfoHeader.biSize = sizeof(BITMAPINFOHEADER);

	// Bit count
	bmpInfoHeader.biBitCount = wBitsPerPixel;

	// Use all colors
	bmpInfoHeader.biClrImportant = 0;

	// Use as many colors according to bits per pixel
	bmpInfoHeader.biClrUsed = 0;

	// Store as un Compressed
	bmpInfoHeader.biCompression = BI_RGB;

	// Set the height in pixels
	bmpInfoHeader.biHeight = lHeight;

	// Width of the Image in pixels
	bmpInfoHeader.biWidth = lWidth;

	// Default number of planes
	bmpInfoHeader.biPlanes = 1;

	// Calculate the image size in bytes
	bmpInfoHeader.biSizeImage = pixel_data_size;

	BITMAPFILEHEADER bfh = { 0 };

	// This value should be values of BM letters i.e 0x4D42
	// 0x4D = M 0×42 = B storing in reverse order to match with endian
	bfh.bfType = 0x4D42;
	//bfh.bfType = 'B'+('M' << 8);

	// <<8 used to shift ‘M’ to end  */

	// Offset to the RGBQUAD
	bfh.bfOffBits = headers_size;

	// Total size of image including size of headers
	bfh.bfSize = headers_size + pixel_data_size;

	// Create the file in disk to write
	HANDLE hFile = CreateFile(lpszFileName,
		GENERIC_WRITE,
		0,
		NULL,
		CREATE_ALWAYS,
		FILE_ATTRIBUTE_NORMAL,
		NULL);

	// Return if error opening file
	if (!hFile)
		return;

	DWORD dwWritten = 0;

	// Write the File header
	WriteFile(hFile,
		&bfh,
		sizeof(bfh),
		&dwWritten,
		NULL);

	// Write the bitmap info header
	WriteFile(hFile,
		&bmpInfoHeader,
		sizeof(bmpInfoHeader),
		&dwWritten,
		NULL);

	// Write the RGB Data
	WriteFile(hFile,
		pBitmapBits,
		bmpInfoHeader.biSizeImage,
		&dwWritten,
		NULL);

	// Close the file handle
	CloseHandle(hFile);
}

BYTE *LoadBMP(int *width, int *height, unsigned long *size, LPCTSTR bmpfile)
{
	BITMAPFILEHEADER bmpheader;
	BITMAPINFOHEADER bmpinfo;
	// value to be used in ReadFile funcs
	DWORD bytesread;
	// open file to read from
	HANDLE file = CreateFile(bmpfile,
		GENERIC_READ,
		FILE_SHARE_READ,
		NULL,
		OPEN_EXISTING,
		FILE_FLAG_SEQUENTIAL_SCAN,
		NULL);
	if (NULL == file)
		return NULL;

	if (ReadFile(file, &bmpheader, sizeof(BITMAPFILEHEADER), &bytesread, NULL) == false)
	{
		CloseHandle(file);
		return NULL;
	}

	// Read bitmap info
	if (ReadFile(file, &bmpinfo, sizeof(BITMAPINFOHEADER), &bytesread, NULL) == false)
	{
		CloseHandle(file);
		return NULL;
	}

	// check if file is actually a bmp
	if (bmpheader.bfType != 'MB')
	{
		CloseHandle(file);
		return NULL;
	}

	// get image measurements
	*width = bmpinfo.biWidth;
	*height = abs(bmpinfo.biHeight);

	// Check if bmp iuncompressed
	if (bmpinfo.biCompression != BI_RGB)
	{
		CloseHandle(file);
		return NULL;
	}

	// Check if we have 24 bit bmp
	if (bmpinfo.biBitCount != 24)
	{
		CloseHandle(file);
		return NULL;
	}

	// create buffer to hold the data
	*size = bmpheader.bfSize - bmpheader.bfOffBits;
	BYTE *Buffer = new BYTE[*size];
	// move file pointer to start of bitmap data
	SetFilePointer(file, bmpheader.bfOffBits, NULL, FILE_BEGIN);
	// read bmp data
	if (ReadFile(file, Buffer, *size, &bytesread, NULL) == false)
	{
		delete[] Buffer;
		CloseHandle(file);
		return NULL;
	}

	// everything successful here: close file and return buffer

	CloseHandle(file);

	return Buffer;
}

std::unique_ptr<BYTE[]> CreateNewBuffer(unsigned long &padding,
	BYTE *pmatrix,
	const int &width,
	const int &height)
{
	padding = (4 - ((width * 3) % 4)) % 4;
	int scanlinebytes = width * 3;
	int total_scanlinebytes = scanlinebytes + padding;
	long newsize = height * total_scanlinebytes;
	std::unique_ptr<BYTE[]> newbuf(new BYTE[newsize]);

	// Fill new array with original buffer, pad remaining with zeros
	std::fill(&newbuf[0], &newbuf[newsize], 0);
	long bufpos = 0;
	long newpos = 0;
	for (int y = 0; y < height; y++)
	{
		for (int x = 0; x < 3 * width; x += 3)
		{
			// Determine positions in original and padded buffers
			bufpos = y * 3 * width + (3 * width - x);
			newpos = (height - y - 1) * total_scanlinebytes + x;

			// Swap R&B, G remains, swap B&R
			newbuf[newpos] = pmatrix[bufpos + 2];
			newbuf[newpos + 1] = pmatrix[bufpos + 1];
			newbuf[newpos + 2] = pmatrix[bufpos];
		}
	}

	return newbuf;
}
