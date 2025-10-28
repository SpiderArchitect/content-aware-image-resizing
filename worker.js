onmessage = (message) => {
    let imageData = message.data;
    postMessage(calcSeamHistory(imageData));
}

function calcSeamHistory(originalImage)
{
    let croppedData = {
        height: originalImage.height,
        width: originalImage.width,
        greyScaleArray: generateGreyScale(originalImage),
        originalPosMap: generatePosMap(height, width),
    };
    
    let removalHistory = {
        height: originalImage.height,
        width: originalImage.width,
        removalWidth: new Array(imageHeight*imageWidth).fill(0)
    };

    let seam = findSeam(croppedData);

    markSeamWidth(seam, removalHistory, croppedData);
    return removalHistory;
}
function generateGreyScale(originalImage)
{
    let width = originalImage.width;
    let height = originalImage.height;
    let pixelArray = originalImage.data;
    let greyScale = new Array(height * width).fill(0);
    for(let r = 0; r < height; ++r)
    {
        for(let c = 0; c < width; ++c)
        {
            let R = (r * width + c) * 4;
            let G = R + 1;
            let B = R + 2;
            greyScale[r * width + c] = 0.299 * pixelArray[R] + 0.587 * pixelArray[G] + 0.114 * pixelArray[B];
        }
    }
    return greyScale;
}
function generatePosMap(height, width)
{
    let posMap = new Array(width * height).fill(0);
    for(let r = 0; r < height; ++r)
    {
        for(let c = 0; c < width; ++c)
        {
            posMap[r*width + c] = [r, c];
        }
    }
    return posMap;
}

function findSeam(croppedData)
{
    let width = croppedData.width;
    let height = croppedData.height;
    let greyScaleArray = croppedData.greyScaleArray;
    let dp = sobelFilter(croppedData);
    for(let r = 1; r < height; ++r)
    {
        for(let c = 0; c < width; ++c)
        {
            let prevMin = dp[(r-1) * width + (c)];
            if(0 <= c-1 && dp[(r-1) * width + (c-1)] < prevMin)
            {
                prevMin = dp[(r-1) * width + (c-1)];
            }
            if(c+1 <= width && dp[(r-1) * width + (c+1)] < prevMin)
            {
                prevMin = dp[(r-1) * width + (c+1)];
            }
            dp[r * width + c] += prevMin;
        }
    }
        
    let seamCols = [];
    let end = null;
    let minVal = Infinity;
    for(let c = 0; c < width; ++c)
    {
        if(dp[(height-1) * width + c] < minVal)
        {
            end = [height-1, c];
            minVal = dp[(height-1) * width + c];
        }
    }
    seamCols.push([...end]);

    for(let r = height - 2; r >= 0; --r)
    {
        let nextC = seamCols.at(-1);
        let currC = nextC;
        if(0 <= nextC-1 && dp[r * width + currC] > dp[r * width + nextC - 1]) currC = nextC - 1;
        if(nextC+1 <= width-1 && dp[r * width + currC] > dp[r * width + nextC + 1]) currC = nextC + 1;
        seam.push([r, currC]);
    }

    seamCols.reverse();
    return seamCols;
}
function markSeamWidth(seam, removalHistory, croppedData)
{
    let originalWidth = removalHistory.width;
    let currWidth = croppedData.width;
    let originalPosMap = croppedData.originalPosMap;
    seam.forEach((pos, ind) => {
        let originalCol = originalPosMap[(pos[0]) * currWidth + pos[1]];
        removalHistory[pos[0] * originalWidth + originalCol] = currWidth;
    });
}
function removeSeam(seam, croppedData)
{

}



let sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
let sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
function sobelFilter(greyScale, imageWidth, imageHeight, r, c)
{
    let gX = 0;
    let gY = 0;
    for(let dr = -1; dr <= 1; ++dr)
    {
        for(let dc = -1; dc <= 1; ++dc)
        {
            let I = 0;
            if(r+dr < 0 || imageHeight <= r+dr || c+dc < 0 || imageWidth <= c+dc)
            {
                I = 255;
            }
            else
            {
                I = greyScale[(r + dr) * imageWidth + (c + dc)];
            }

            gX += sobelX[1 + dr][1 + dc] * I;
            gY += sobelY[1 + dr][1 + dc] * I;
        }
    }

    return gX * gX + gY * gY;
}