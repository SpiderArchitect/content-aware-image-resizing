document.addEventListener("DOMContentLoaded", () => {
    // Image width slider
    const sizeSliderDivEl = document.querySelector(".sizeSlider");
    const leftSliderEl = document.querySelector(".slider.left");
    const rightSliderEl = document.querySelector(".slider.right");
    const percentEl = document.querySelector("#percent");
    const startButton = document.querySelector("#startButton");
    const imageUploader = document.getElementById("imageUpload");
    const hiddenCanvas = document.getElementById("hiddenCanvas");
    const hiddenCtx = hiddenCanvas.getContext('2d')
    const mainCanvas = document.getElementById("mainCanvas");
    const mainCtx = mainCanvas.getContext('2d');
    let sliderColour = '#ffae00ff';
    let worker = new Worker('worker.js');
    let imageData = null;
    worker.onmessage = (event) => {
        processData(event.data)
    }
    function processData(outputData) {
        if (outputData.type === 'progress') {
            processSliderValue(outputData.data, 'progress');
        }
        else if (outputData.type === 'result') {
            removalWidth = outputData.data;
            leftSliderEl.disabled = false;
            rightSliderEl.disabled = false;
        }
        else if (outputData.type === 'rebuiltImage') {
            renderImage(outputData.data);
        }
    }
    // function setSliderDesignToLoader()
    // {
    //     sliderColour = '#ffae00ff';
    //     leftSliderEl.style.height = `${10}px`;
    //     rightSliderEl.style.height = `${10}px`;
    // }
    let canvasStyleScaleFactor = 1;
    function renderImage(imageData) {
        mainCanvas.width = imageData.width;
        mainCanvas.style.width = `${canvasStyleScaleFactor*imageData.width}px`;
        mainCtx.putImageData(imageData, 0, 0);
    }
    function processSliderValue(sliderValue, valueType) {
        leftSliderEl.value = sliderValue;
        rightSliderEl.value = sliderValue;
        percentEl.textContent = `${Math.floor(sliderValue)}%`;
        leftSliderEl.style.background = `linear-gradient(to left, ${sliderColour} ${sliderValue}%, #ccc ${sliderValue}%)`;
        rightSliderEl.style.background = `linear-gradient(to right, ${sliderColour} ${sliderValue}%, #ccc ${sliderValue}%)`;
        if (valueType === 'width') {
            worker.postMessage({
                type: 'width',
                data: Math.floor((sliderValue * imageData.width) / 100)
            });
        }
    }
    function syncSliders(event) {
        processSliderValue(event.target.value, 'width');
    }
    leftSliderEl.addEventListener('input', syncSliders);
    rightSliderEl.addEventListener('input', syncSliders);
    function showSlider() {
        if (sizeSliderDivEl.classList.contains('hidden')) {
            sizeSliderDivEl.classList.remove('hidden');
            percentEl.classList.remove('hidden');
        }
    }
    function hideSlider() {
        if (!sizeSliderDivEl.classList.contains('hidden')) {
            sizeSliderDivEl.classList.add('hidden');
            percentEl.classList.add('hidden');
        }
    }
    hideSlider();
    // Give proper size to the image displayed
    function calcSize(w, h) {
        const minWidth = 700;
        const maxWidth = 800;
        const maxHeight = window.innerHeight * 0.6;
        const aspectRatio = h / w;
        const scale = Math.min(maxWidth / w, maxHeight / h, 1);
        let displayWidth = w * scale;
        if (displayWidth < minWidth && (minWidth * aspectRatio) <= maxHeight) {
            displayWidth = minWidth;
        }
        return [displayWidth, displayWidth * aspectRatio];
    }


    // Load Image

    function loadImage(file) {
        const reader = new FileReader();
        reader.onload = (fileLoadedEvent) => {
            const img = document.createElement('img');
            img.onload = () => {
                hiddenCanvas.width = img.width;
                hiddenCanvas.height = img.height;
                hiddenCtx.drawImage(img, 0, 0);

                // sets resolution of canvas
                mainCanvas.width = img.width;
                mainCanvas.height = img.height;
                let [displayWidth, displayHeight] = calcSize(img.width, img.height);
                // sets display size of canvas(scaling)
                mainCanvas.style.width = `${displayWidth}px`;
                mainCanvas.style.height = `${displayHeight}px`;
                canvasStyleScaleFactor = displayWidth / mainCanvas.width;
                mainCtx.drawImage(hiddenCanvas, 0, 0);
                imageData = hiddenCtx.getImageData(0, 0, img.width, img.height);
                leftSliderEl.style.width = `${displayWidth / 2 + 5}px`;
                rightSliderEl.style.width = `${displayWidth / 2 + 5}px`;
            }
            img.src = fileLoadedEvent.target.result;
        };
        reader.readAsDataURL(file);
    }

    imageUploader.addEventListener('change', (fileUploadEvent) => {
        const file = fileUploadEvent.target.files[0];
        if (!file) return;
        hideSlider();
        startButton.disabled = false;
        loadImage(file);
    });

    // start computation to get outputData
    function startComputation() {
        if (!imageData) return;
        processSliderValue(0);
        // disable slider and button
        leftSliderEl.disabled = true;
        rightSliderEl.disabled = true;
        startButton.disabled = true;
        // setSliderDesignToLoader()
        showSlider();
        worker.postMessage({type: 'imageData', data: imageData });
    };
    startButton.addEventListener('click', startComputation);
});