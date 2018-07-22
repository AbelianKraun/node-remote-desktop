#include "Vector.h"
#include <fstream>
#include <string>
#include <iostream>
#include <Windows.h>
#include <algorithm>
#include <memory>

struct CaptureReturn
{
public:
  BYTE *buf;
  int length;
  int width;
  int height;
};

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

  CaptureReturn ret = CaptureScreen("./test.png");
  BYTE *bytes = ret.buf;
  // create a new JS instance from arguments
  v8::Local<v8::Object> obj = Nan::New<v8::Object>();
  v8::Local<v8::Array> array = Nan::New<v8::Array>(ret.length);

  for (int i = 0; i < ret.length; i++)
  {
    Nan::Set(array, i, Nan::New(bytes[i]));
  }

  obj->Set(Nan::New("data").ToLocalChecked(), array);
  obj->Set(Nan::New("width").ToLocalChecked(), Nan::New(ret.width));
  obj->Set(Nan::New("height").ToLocalChecked(), Nan::New(ret.height));

  delete[] bytes;
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
MONITORINFOEX mi[2] = {MONITORINFOEX(), MONITORINFOEX()};

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
  int nScreenHeight =  250; //mi[0].rcMonitor.bottom;
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

  BITMAPINFOHEADER bmpInfoHeader = {0};

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

  BITMAPFILEHEADER bfh = {0};

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
