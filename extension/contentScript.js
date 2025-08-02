function scanForClickjacking() {
  const iframes = document.getElementsByTagName('iframe');
  if (iframes.length === 0) return; 

  for (const frame of iframes) {
    try {
      const style = window.getComputedStyle(frame);
      const opacity = parseFloat(style.opacity || "1");
      const visibility = style.visibility;
      const display = style.display;
      const rect = frame.getBoundingClientRect();
      const area = rect.width * rect.height;
      const coveringViewport = rect.width >= window.innerWidth * 0.8 && rect.height >= window.innerHeight * 0.8;
      const invisibleButLarge = (opacity === 0 || visibility === 'hidden') && area > 0;
      const largeOverlay = opacity > 0 && coveringViewport;
      if (invisibleButLarge || largeOverlay) {
        console.warn("Possible clickjacking attempt detected: an iframe is hidden or covering content!", frame);
        alert("⚠️ Warning: This page may be attempting a clickjacking attack (hidden overlay detected).");
        break;
      }
    } catch (e) {
    }
  }
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.target.tagName === 'IFRAME') {
      scanForClickjacking();
    }
  });
}, { root: null, threshold: 0.1 });  
document.querySelectorAll('iframe').forEach(frame => observer.observe(frame));
const mutObs = new MutationObserver((mutations) => {
  for (const mut of mutations) {
    mut.addedNodes.forEach(node => {
      if (node.tagName === 'IFRAME') {
        observer.observe(node);
        scanForClickjacking();
      }
    });
  }
});
mutObs.observe(document.body, { childList: true, subtree: true });
scanForClickjacking();
