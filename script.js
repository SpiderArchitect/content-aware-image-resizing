document.addEventListener("DOMContentLoaded", () => {
    // Image width slider
    const leftSliderEl = document.querySelector(".slider.left")
    const rightSliderEl = document.querySelector(".slider.right")
    const percentEl = document.querySelector("#percent")
    function leftSliderScript() {
        rightSliderEl.value = leftSliderEl.value;
        processProgressRange();
    }
    function rightSliderScript() {
        leftSliderEl.value = rightSliderEl.value;
        processProgressRange();
    }
    function processProgressRange() {
        const sliderValue = rightSliderEl.value;
        leftSliderEl.style.background = `linear-gradient(to left, #007bff ${sliderValue}%, #ccc ${sliderValue}%)`;
        rightSliderEl.style.background = `linear-gradient(to right, #007bff ${sliderValue}%, #ccc ${sliderValue}%)`;
        percentEl.textContent = `${sliderValue}%`;
    }
    leftSliderEl.addEventListener('input', leftSliderScript);
    rightSliderEl.addEventListener('input', rightSliderScript);
    
    processProgressRange();

    // Give proper size to the image displayed
    function calcSize(w, h) {
        const minWidth = 700;
        const maxWidth = 800;
        const maxHeight = window.innerHeight * 0.7;
        const aspectRatio = h / w;
        const scale = Math.min(maxWidth / w, maxHeight / h, 1);
        let displayWidth = w * scale;
        if (displayWidth < minWidth && (minWidth * aspectRatio) <= maxHeight) {
            displayWidth = minWidth;
        }
        return [displayWidth, displayWidth * aspectRatio];
    }
    
    const imageUploader = document.getElementById("imageUpload");
    const hiddenCanvas = document.getElementById("hiddenCanvas");
    const hiddenCtx = hiddenCanvas.getContext('2d')
    const mainCanvas = document.getElementById("mainCanvas");
    const mainCtx = mainCanvas.getContext('2d');
    
    // Load Image
    let imageData = null;
    
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
                mainCtx.drawImage(hiddenCanvas, 0, 0);
                imageData = hiddenCtx.getImageData(0, 0, img.width, img.height);
            }
            img.src = fileLoadedEvent.target.result;
        };
        reader.readAsDataURL(file);
    }

    imageUploader.addEventListener('change', (fileUploadEvent) => {
        const file = fileUploadEvent.target.files[0];
        if(!file) return;
        loadImage(file);
    });

    // start computation to get outputData
    const startButton = document.querySelector("#startButton");
    let worker = new Worker('worker.js');
    function startComputation() {
        if(!imageData) return;
        console.log(imageData);
        worker.postMessage(imageData);
        worker.onmessage = (event) => {
            processData(event.data)
        }
    };
    startButton.addEventListener('click', startComputation);

    function processData(outputData) {
        console.log("processed!!");
        console.log(outputData);
    }
});