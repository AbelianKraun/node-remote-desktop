#include "nan.h"
#include "lodepng.h"

#ifndef AW_H
#define AW_H
#endif

class MyAsyncWorker : public Nan::AsyncWorker
{
  private:
	std::string workerId;
	LPBYTE bytes;
	Cache * cache;
	std::vector<unsigned char> *encodedBytes;
	int length;
	int width, height, originalWidth, originalHeight;
	int x, y;
	void Execute();
	void HandleOKCallback();
	void HandleErrorCallback();
	int getPosition(int x, int y);

  public:
	MyAsyncWorker(LPBYTE bytes, Cache* cache, int length, int originalWidth, int originalHeight, int x, int y, int width, int height, Nan::Callback *callback);
};