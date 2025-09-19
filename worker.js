onmessage = (message) => {
    let imageData = message.data;
    let pixelArray = imageData.data;
    let imageWidth = imageData.width;
    let imageHeight = imageData.height;
    // grey scale
    let greyImageData = {};
    for(let y = 0; y < imageHeight; ++y)
    {
        for(let x = 0; x < imageWidth; ++x)
        {
            let R = (y * imageWidth + x) * 4;
            let G = (y * imageWidth + x) * 4 + 1;
            let B = (y * imageWidth + x) * 4 + 2;
            let gray = 0.299*pixelArray[R] + 0.587*pixelArray[G] + 0.114*pixelArray[B];
            pixelArray[R] = gray;
            pixelArray[G] = gray;
            pixelArray[B] = gray;
        }
    }
    postMessage(imageData);
}