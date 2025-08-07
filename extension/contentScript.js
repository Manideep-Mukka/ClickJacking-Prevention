// contentScript.js

(function() {
  const WARNING_ID = 'clickjack-warning-overlay';
  const IMAGE_URL = chrome.runtime.getURL('warning.png');

  function showWarningOverlay() {
    if (document.getElementById(WARNING_ID)) return;
    const overlay = document.createElement('div');
    overlay.id = WARNING_ID;
    Object.assign(overlay.style, {
      position: 'fixed',
      top: 0, left: 0,
      width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2147483647
    });

    const box = document.createElement('div');
    Object.assign(box.style, {
      background: '#fff',
      borderRadius: '8px',
      padding: '1rem',
      textAlign: 'center',
      boxShadow: '0 0 10px rgba(0,0,0,0.3)'
    });

    const img = document.createElement('img');
    img.src = IMAGE_URL;
    img.alt = 'Clickjacking Protection Enabled';
    img.style.maxWidth = '300px';
    img.style.width = '80%';

    const btn = document.createElement('button');
    btn.textContent = 'Dismiss';
    Object.assign(btn.style, {
      marginTop: '1rem',
      padding: '0.5rem 1rem',
      fontSize: '1rem',
      cursor: 'pointer'
    });
    btn.addEventListener('click', () => {
      overlay.remove();
      disconnectObservers();
    });

    box.append(img, btn);
    overlay.appendChild(box);
    document.documentElement.appendChild(overlay);
  }

  function scanForClickjacking() {
    const iframes = document.getElementsByTagName('iframe');
    console.log('[Detector] scanning', iframes.length, 'iframes');
    for (const frame of iframes) {
      try {
        const style = window.getComputedStyle(frame);
        const op = parseFloat(style.opacity || '1');
        const vis = style.visibility;
        const rect = frame.getBoundingClientRect();
        const area = rect.width * rect.height;
        const coversViewport = rect.width >= window.innerWidth * 0.8 &&
                               rect.height >= window.innerHeight * 0.8;

        // New: any hidden iframe
        const hiddenAny = (op === 0 || vis === 'hidden');
        // Old: invisible but large
        const hiddenLarge = hiddenAny && area > 0;
        // Classic overlay
        const overlayLarge = op > 0 && coversViewport;

        if (hiddenAny || hiddenLarge || overlayLarge) {
          console.warn('[Detector] clickjack suspected', frame);
          showWarningOverlay();
          return;
        }
      } catch (e) {
        // ignore cross-origin frames
      }
    }
  }

  const io = new IntersectionObserver(entries => {
    for (const ent of entries) {
      if (ent.target.tagName === 'IFRAME') {
        scanForClickjacking();
        break;
      }
    }
  }, { threshold: 0.1 });

  const mo = new MutationObserver(muts => {
    for (const m of muts) {
      for (const node of m.addedNodes) {
        if (node.tagName === 'IFRAME') {
          io.observe(node);
          scanForClickjacking();
        }
      }
    }
  });

  function disconnectObservers() {
    io.disconnect();
    mo.disconnect();
  }

  // start observing
  document.querySelectorAll('iframe').forEach(f => io.observe(f));
  mo.observe(document.body, { childList: true, subtree: true });
  scanForClickjacking();

})();
