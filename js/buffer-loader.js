var BufferLoader = function(context, urlList, callback) {
  this.context    = context;
  this.urlList    = urlList;
  this.onload     = callback;
  this.bufferList = new Array();
  this.loadCount  = 0;
}

BufferLoader.prototype.load_buffer = function(url, index) {
  var request = new XMLHttpRequest();
  request.open("GET", url, true);
  request.responseType = "arraybuffer";

  var loader = this;

  request.onload = function() {
    loader.context.decodeAudioData(
      request.response,
      function(buffer) {
        if(!buffer) {
          console.log("error decoding file data for " + url);
          return;
        }

        this.bufferList[index] = buffer;
        if(++loader.loadCount == loader.urlList.length)
          loader.onload(loader.bufferList);
      }
    )
  }

  request.onerror = function() {
    console.log("BufferLoader: XHR error for " + url);
  }

  request.send();
}

BufferLoader.prototype.load = function() {
  for (var i = 0; i < this.urlList.length; ++i) {
    this.load_buffer(this.urlList[i], i);
  }
}
