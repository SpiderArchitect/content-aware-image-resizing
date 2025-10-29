onmessage = (message) => {
    console.log("worker got message!");
    let imageData = message.data;
    postMessage(calcSeamHistory(imageData));
}

function calcSeamHistory(originalImage)
{
    let croppedData = {
        height: originalImage.height,
        width: originalImage.width,
        greyScale: generateGreyScale(originalImage),
        originalColMap: generateColMap(originalImage.height, originalImage.width),
    };

    // removalWidth[r][c] = w means tells that to transition from w to w-1, (r, c) has to be removed
    let removalHistory = {
        height: originalImage.height,
        width: originalImage.width,
        removalWidth: Array(originalImage.height).fill(0).map(x => Array(originalImage.width).fill(0))
    };
    let seamCols = null;
    let prevPercentageDone = 0;
    let currPercentageDone = 0;
    postMessage(currPercentageDone);
    while(croppedData.width > 0)
    {
        seamCols = findSeamCols(croppedData);
        markSeamWidth(seamCols, removalHistory, croppedData);
        removeSeam(seamCols, croppedData);
        prevPercentageDone = currPercentageDone;
        currPercentageDone = Math.floor(((originalImage.width - croppedData.width) * 100) / originalImage.width);
        if(prevPercentageDone != currPercentageDone) postMessage(currPercentageDone);
    }
    return removalHistory;
}
function generateGreyScale(originalImage)
{
    let width = originalImage.width;
    let height = originalImage.height;
    let pixelArray = originalImage.data;
    let greyScale = Array(height).fill(0).map(x => Array(width).fill(0));
    for(let r = 0; r < height; ++r)
    {
        for(let c = 0; c < width; ++c)
        {
            let R = (r * width + c) * 4;
            let G = R + 1;
            let B = R + 2;
            greyScale[r][c] = 0.299 * pixelArray[R] + 0.587 * pixelArray[G] + 0.114 * pixelArray[B];
        }
    }
    return greyScale;
}
function generateColMap(height, width)
{
    let posMap = Array(height).fill(0).map(x => Array(width).fill(0));
    for(let r = 0; r < height; ++r)
    {
        for(let c = 0; c < width; ++c)
        {
            posMap[r][c] = c;
        }
    }
    return posMap;
}

function findSeamCols(croppedData)
{
    let width = croppedData.width;
    let height = croppedData.height;
    let dp = sobelFilter(croppedData);
    for(let r = 1; r < height; ++r)
    {
        for(let c = 0; c < width; ++c)
        {
            let prevMin = dp[r-1][c];
            if(0 <= c-1 && dp[r-1][c-1] < prevMin)
            {
                prevMin = dp[r-1][c-1];
            }
            if(c+1 < width && dp[r-1][c+1] < prevMin)
            {
                prevMin = dp[r-1][c+1];
            }
            dp[r][c] += prevMin;
        }
    }
    // seamCol[r] stores column to be removed at height r in croppedData
    let seamCol = Array(height).fill(0);
    let minVal = Number.MAX_SAFE_INTEGER;
    for(let c = 0; c < width; ++c)
    {
        if(dp[height-1][c] < minVal)
        {
            minVal = dp[height-1][c];
            seamCol[height-1] = c;
        }
    }
    for(let r = height-2; r >= 0; --r)
    {
        minVal = Number.MAX_SAFE_INTEGER;
        if(seamCol[r+1]-1 >= 0 && dp[r][seamCol[r+1]-1] < minVal)
        {
            minVal = Math.min(minVal, dp[r][seamCol[r+1]-1]);
            seamCol[r] = seamCol[r+1]-1;
        }
        if(dp[r][seamCol[r+1]] < minVal)
        {
            minVal = Math.min(minVal, dp[r][seamCol[r+1]]);
            seamCol[r] = seamCol[r+1];
        }
        if(seamCol[r+1]+1 < width && dp[r][seamCol[r+1]+1] < minVal)
        {
            minVal = Math.min(minVal, dp[r][seamCol[r+1]+1]);
            seamCol[r] = seamCol[r+1]+1;
        }
    }
    return seamCol;
}

// scharr instead of sobel
let sobelX = [[-3, 0, 3], [-10, 0, 10], [-3, 0, 3]];
let sobelY = [[-3, -10, -3], [0, 0, 0], [3, 10, 3]];
function sobelFilter(croppedData)
{
    let imageHeight = croppedData.height;
    let imageWidth = croppedData.width;
    let sobelData = Array(imageHeight).fill(0).map(x => Array(imageWidth).fill(0))
    for(let r = 0; r < imageHeight; ++r)
    {
        for(let c = 0; c < imageWidth; ++c)
        {
            let gX = 0;
            let gY = 0;
            for(let dr = -1; dr <= 1; ++dr)
            {
                for(let dc = -1; dc <= 1; ++dc)
                {
                    let fr = r + dr;
                    let fc = c + dc;
                    if (fr < 0) fr = 0;
                    if (fr >= imageHeight) fr = imageHeight - 1;
                    if (fc < 0) fc = 0;
                    if (fc >= imageWidth) fc = imageWidth - 1;

                    let I = croppedData.greyScale[fr][fc];
        
                    gX += sobelX[1 + dr][1 + dc] * I;
                    gY += sobelY[1 + dr][1 + dc] * I;
                }
            }
            gX = Math.abs(gX);
            gY = Math.abs(gY);
            sobelData[r][c] = gX + gY;
            // sobelData[r][c] = (Math.max(gX, gY) + gX + gY) >> 1;
        }
    }
    return sobelData;
}

function markSeamWidth(seamCols, removalHistory, croppedData)
{
    let height = croppedData.height;  
    let width = croppedData.width;
    for(let r = 0; r < height; ++r)
    {
        let originalCol = croppedData.originalColMap[r][seamCols[r]];
        removalHistory.removalWidth[r][originalCol] = width;
    }
}
function removeSeam(seamCols, croppedData)
{
    let height = croppedData.height;  
    let width = croppedData.width;
    for(let r = 0; r < height; ++r)
    {
        croppedData.greyScale[r].splice(seamCols[r], 1);
        croppedData.originalColMap[r].splice(seamCols[r], 1);
    }
    croppedData.width = croppedData.width - 1;
}