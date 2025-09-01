document.addEventListener("DOMContentLoaded", () => {

    const leftSliderEl = document.querySelector(".slider.left")
    const rightSliderEl = document.querySelector(".slider.right")
    const percentEl = document.querySelector("#percent")
    function leftSliderScript() {
        rightSliderEl.value = leftSliderEl.value;
        processProgressRange();
    }
    function rightSliderScript() {
        console.log("ayooo right")
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
    
    processProgressRange();
    
    
    const imageUploader = document.getElementById("imageUpload");
    
    const hiddenCanvas = document.getElementById("hiddenCanvas");
    const hiddenCtx = hiddenCanvas.getContext('2d')
    
    const mainCanvas = document.getElementById("mainCanvas");
    const mainCtx = mainCanvas.getContext('2d');
    
    let imageData = null;
    
    
    imageUploader.addEventListener('change', (fileUploadEvent) => {
        const file = fileUploadEvent.target.files[0];
        if(!file) return;
        
        const reader = new FileReader();
        
        reader.onload = (fileLoadedEvent) => {
            const img = document.createElement('img');
            img.onload = () => {
                hiddenCanvas.width = img.width;
                hiddenCanvas.height = img.height;
                hiddenCtx.drawImage(img, 0, 0);
                
                imageData = hiddenCtx.getImageData(0, 0, img.width, img.height);
                console.log(img.width, img.height);


                let [displayWidth, displayHeight] = calcSize(img.width, img.height);
                mainCanvas.style.width = `${displayWidth}px`;
                mainCanvas.style.height = `${displayHeight}px`;

                mainCanvas.width = img.width;
                mainCanvas.height = img.height;

                mainCtx.drawImage(hiddenCanvas, 0, 0);
                
            }
            img.src = fileLoadedEvent.target.result;
        };
        reader.readAsDataURL(file);
    });
});