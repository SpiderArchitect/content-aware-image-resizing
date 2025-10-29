let removalHistory = null;
let imageData = null;
onmessage = (message) => {
    if (message.data.type == 'imageData') {
        imageData = message.data.data;
        calcRemovalWidth(imageData)
        postMessage({ type: 'result', data: removalHistory });
    }
    else if (message.data.type == 'width') {
        let reqWidth = message.data.data;
        postMessage({ type: 'rebuiltImage', data: buildImage(reqWidth) });
    }
}

function calcRemovalWidth(originalImage) {
    let h = originalImage.height;
    let w = originalImage.width;
    let croppedData = {
        height: h,
        width: w,
        greyScale: generateGreyScale(originalImage),
        originalColMap: generateColMap(h, w),
        dp: new Float64Array(w * h)
    };

    // removalWidth[r][c] = w means tells that to transition from w to w-1, (r, c) has to be removed
    removalHistory = {
        height: h,
        width: w,
        removalWidth: new Uint32Array(w * h)
    };
    let seamCols = new Uint32Array(h);
    let prevPercentageDone = 0;
    let currPercentageDone = 0;
    postMessage({ type: 'progress', data: 0 });
    while (croppedData.width > 0) {
        findSeamCols(croppedData, seamCols);
        markSeamWidth(seamCols, removalHistory, croppedData);
        removeSeam(seamCols, croppedData);
        prevPercentageDone = currPercentageDone;
        // currPercentageDone = Math.floor(((originalImage.width - croppedData.width) * 100) / originalImage.width);
        let W = originalImage.width;
        let w = croppedData.width;
        currPercentageDone = ((W*W - w*w) * 100) / (W*W);
        if (prevPercentageDone != currPercentageDone) postMessage({ type: 'progress', data: currPercentageDone });
    }
}
function buildImage(reqWidth) {
    let originalWidth = imageData.width;
    let height = imageData.height;
    if(reqWidth == 0) return new ImageData(1, height);
    let removalWidth = removalHistory.removalWidth;
    let originalImagePixels = imageData.data;
    let newImagePixels = new Uint8ClampedArray(4 * reqWidth * height);
    let i = 0;
    for (let r = 0; r < height; ++r) {
        for (let c = 0; c < originalWidth; ++c) {
            if (removalWidth[r*originalWidth + c] > reqWidth) continue;
            newImagePixels[i] = originalImagePixels[4 * (r * originalWidth + c)];
            ++i;
            newImagePixels[i] = originalImagePixels[4 * (r * originalWidth + c) + 1];
            ++i;
            newImagePixels[i] = originalImagePixels[4 * (r * originalWidth + c) + 2];
            ++i;
            newImagePixels[i] = originalImagePixels[4 * (r * originalWidth + c) + 3];
            ++i;
        }
    }
    return new ImageData(newImagePixels, reqWidth, height);
}
function generateGreyScale(originalImage) {
    let width = originalImage.width;
    let height = originalImage.height;
    let pixelArray = originalImage.data;
    let greyScale = new Float64Array(width * height);
    for (let r = 0; r < height; ++r) {
        for (let c = 0; c < width; ++c) {
            let R = (r * width + c) * 4;
            let G = R + 1;
            let B = R + 2;
            greyScale[r * width + c] = 0.299 * pixelArray[R] + 0.587 * pixelArray[G] + 0.114 * pixelArray[B];
        }
    }
    return greyScale;
}
function generateColMap(height, width) {
    let colMap = new Uint32Array(width * height);
    for (let r = 0; r < height; ++r) {
        for (let c = 0; c < width; ++c) {
            colMap[r * width + c] = c;
        }
    }
    return colMap;
}

function findSeamCols(croppedData, seamCols) {
    let width = croppedData.width;
    let height = croppedData.height;
    sobelFilter(croppedData);
    let dp = croppedData.dp;
    for (let r = 1; r < height; ++r) {
        for (let c = 0; c < width; ++c) {
            let prevMin = dp[(r - 1) * width + c];
            if (0 <= c - 1 && dp[(r - 1) * width + (c - 1)] < prevMin) {
                prevMin = dp[(r - 1) * width + (c - 1)];
            }
            if (c + 1 < width && dp[(r - 1) * width + (c + 1)] < prevMin) {
                prevMin = dp[(r - 1) * width + (c + 1)];
            }
            dp[r * width + c] += prevMin;
        }
    }
    // seamCols[r] stores column to be removed at height r in croppedData
    let minVal = Number.MAX_SAFE_INTEGER;
    for (let c = 0; c < width; ++c) {
        if (dp[(height - 1) * width + c] < minVal) {
            minVal = dp[(height - 1) * width + c];
            seamCols[height - 1] = c;
        }
    }
    for (let r = height - 2; r >= 0; --r) {
        minVal = Number.MAX_SAFE_INTEGER;
        if (seamCols[r + 1] - 1 >= 0 && dp[r * width + seamCols[r + 1] - 1] < minVal) {
            minVal = Math.min(minVal, dp[r * width + seamCols[r + 1] - 1]);
            seamCols[r] = seamCols[r + 1] - 1;
        }
        if (dp[r * width + seamCols[r + 1]] < minVal) {
            minVal = Math.min(minVal, dp[r * width + seamCols[r + 1]]);
            seamCols[r] = seamCols[r + 1];
        }
        if (seamCols[r + 1] + 1 < width && dp[r * width + seamCols[r + 1] + 1] < minVal) {
            minVal = Math.min(minVal, dp[r * width + seamCols[r + 1] + 1]);
            seamCols[r] = seamCols[r + 1] + 1;
        }
    }
    return seamCols;
}

// scharr instead of sobel
let sobelX = [[-3, 0, 3], [-10, 0, 10], [-3, 0, 3]];
let sobelY = [[-3, -10, -3], [0, 0, 0], [3, 10, 3]];
function sobelFilter(croppedData) {
    let height = croppedData.height;
    let width = croppedData.width;
    for (let r = 0; r < height; ++r) {
        for (let c = 0; c < width; ++c) {
            let gX = 0;
            let gY = 0;
            for (let dr = -1; dr <= 1; ++dr) {
                for (let dc = -1; dc <= 1; ++dc) {
                    let fr = r + dr;
                    let fc = c + dc;
                    if (fr < 0) fr = 0;
                    if (fr >= height) fr = height - 1;
                    if (fc < 0) fc = 0;
                    if (fc >= width) fc = width - 1;

                    let I = croppedData.greyScale[fr * width + fc];
                    gX += sobelX[1 + dr][1 + dc] * I;
                    gY += sobelY[1 + dr][1 + dc] * I;
                }
            }
            gX = Math.abs(gX);
            gY = Math.abs(gY);
            // croppedData.dp[r * width + c] = gX + gY;
            // croppedData.dp[r * width + c] = (Math.max(gX, gY) + gX + gY) >> 1;;
            croppedData.dp[r * width + c] = Math.sqrt(gX*gX + gY*gY) ;
        }
    }
}

function markSeamWidth(seamCols, removalHistory, croppedData) {
    let height = croppedData.height;
    let width = croppedData.width;
    let originalWidth = removalHistory.width;
    for (let r = 0; r < height; ++r) {
        let originalCol = croppedData.originalColMap[r * width + seamCols[r]];
        removalHistory.removalWidth[r * originalWidth + originalCol] = width;
    }
}
function removeSeam(seamCols, croppedData) {
    let height = croppedData.height;
    let width = croppedData.width;
    let i = 0;
    for (let r = 0; r < height; ++r) {
        for (let c = 0; c < width; ++c) {
            if (c == seamCols[r]) {
                continue;
            }
            croppedData.greyScale[i] = croppedData.greyScale[r * width + c];
            croppedData.originalColMap[i] = croppedData.originalColMap[r * width + c];
            ++i;
        }
    }
    croppedData.width = croppedData.width - 1;
}