onmessage = (message) => {
    let s = 0;
    for(let i = 0; i < 1e8; ++i)
    {
        s += i;
    }
    postMessage(s);
}