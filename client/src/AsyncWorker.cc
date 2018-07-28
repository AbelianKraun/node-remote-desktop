#include "nan.h"
#include "Vector.h"
#include "lodepng.h"
#include "AsyncWorker.h"
#include <iostream>

MyAsyncWorker::MyAsyncWorker(LPBYTE bytes, Cache *cache, int length, int originalWidth, int originalHeight, int x, int y, int width, int height, Nan::Callback *callback) : Nan::AsyncWorker(callback)
{

	this->workerId = workerId;
	this->width = width;
	this->height = height;
	this->originalWidth = originalWidth;
	this->originalHeight = originalHeight;
	this->length = length;
	this->x = x;
	this->y = y;
	this->bytes = bytes;
	this->cache = cache;
	this->encodedBytes = new std::vector<unsigned char>();
}

int MyAsyncWorker::getPosition(int x, int y)
{
	int pos = y * (this->originalWidth * 4) + (x * 4);
	return pos;
}

void MyAsyncWorker::Execute()
{
	bool same = this->cache->data != nullptr || (this->cache->data != nullptr && this->cache->data->size() == length);

	// TO BGRA
	std::vector<unsigned char> *vecBytes = new std::vector<unsigned char>();

	for (int _y = this->y; _y < this->height + this->y; _y++)
		for (int _x = this->x; _x < this->width + this->x; _x++)
		{
			int pos = this->getPosition(_x, _y);

			char b = this->bytes[pos];
			char g = this->bytes[pos + 1];
			char r = this->bytes[pos + 2];
			char a = this->bytes[pos + 3];

			// Get current vecByte size for checking with cache (pos is for all frame buffer not current portion!!!)
			int vecPos = vecBytes->size();

			vecBytes->push_back(r);
			vecBytes->push_back(g);
			vecBytes->push_back(b);
			vecBytes->push_back(a);


			if (same && this->cache->data != nullptr && 
				(vecBytes->at(vecPos) != this->cache->data->at(vecPos) || 
				vecBytes->at(vecPos + 1) != this->cache->data->at(vecPos + 1) ||  
				vecBytes->at(vecPos + 2) != this->cache->data->at(vecPos + 2) ||
				vecBytes->at(vecPos + 3) != this->cache->data->at(vecPos + 3)))
			{
				same = false;
			}
		}

	// Build JS array
	if (!same)
	{
		unsigned error = lodepng::encode(*this->encodedBytes, *vecBytes, this->width, this->height);

		if (this->cache->data != nullptr)
			delete this->cache->data;

		this->cache->data = vecBytes;
	} else {
		delete vecBytes;
	}
}

void MyAsyncWorker::HandleOKCallback()
{
	Nan::HandleScope scope;
	v8::Local<v8::Array> array = Nan::New<v8::Array>(this->encodedBytes->size());
	v8::Local<v8::Object> frame = Nan::New<v8::Object>();

	for (int i = 0; i < this->encodedBytes->size(); i++)
		Nan::Set(array, i, Nan::New(this->encodedBytes->at(i)));

	frame->Set(Nan::New("data").ToLocalChecked(), array);
	frame->Set(Nan::New("x").ToLocalChecked(), Nan::New(this->x));
	frame->Set(Nan::New("y").ToLocalChecked(), Nan::New(this->y));
	frame->Set(Nan::New("width").ToLocalChecked(), Nan::New(this->width));
	frame->Set(Nan::New("height").ToLocalChecked(), Nan::New(this->height));

	v8::Local<v8::Value> argv[] = {
		frame};

	delete this->bytes;
	delete this->encodedBytes;

	Nan::Call(callback->GetFunction(), Nan::GetCurrentContext()->Global(), 1, argv);
}

void MyAsyncWorker::HandleErrorCallback()
{
}