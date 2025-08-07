// contentScript.js

(function() {
  const WARNING_ID = 'clickjack-warning-overlay';
  const IMAGE_URL = chrome.runtime.getURL('warning.png'); // bundle warning.png in your extension

  function showWarningOverlay() {
    if (document.getElementById(WARNING_ID)) return;

    // Create container
    const overlay = document.createElement('div');
    overlay.id = WARNING_ID;
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0', left: '0',
      width: '100%', height: '100%',
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      'justify-content': 'center',
      'align-items': 'center',
      'z-index': '2147483647'
    });

    // Create inner box
    const box = document.createElement('div');
    Object.assign(box.style, {
      position: 'relative',
      padding: '1rem',
      'background-color': '#fff',
      'border-radius': '8px',
      'box-shadow': '0 0 10px rgba(0,0,0,0.3)',
      'text-align': 'center'
    });

    // Warning image
    const img = document.createElement('img');
    img.src = IMAGE_URL;
    img.alt = 'Clickjacking Protection Enabled';
    img.style.maxWidth = '300px';
    img.style.width = '80%';
    box.appendChild(img);

    // Dismiss button
    const btn = document.createElement('button');
    btn.textContent = 'Dismiss';
    Object.assign(btn.style, {
      marginTop: '1rem',
      padding: '0.5rem 1rem',
      'font-size': '1rem',
      cursor: 'pointer'
    });
    btn.addEventListener('click', () => {
      overlay.remove();
      disconnectObservers();
    });
    box.appendChild(btn);

    overlay.appendChild(box);
    document.documentElement.appendChild(overlay);
  }

  function scanForClickjacking() {
    const iframes = document.getElementsByTagName('iframe');
    for (const frame of iframes) {
      try {
        const style = window.getComputedStyle(frame);
        const op = parseFloat(style.opacity || '1');
        const vis = style.visibility;
        const rect = frame.getBoundingClientRect();
        const area = rect.width * rect.height;
        const covers = rect.width >= window.innerWidth * 0.8 &&
                       rect.height >= window.innerHeight * 0.8;
        const hiddenLarge = (op === 0 || vis === 'hidden') && area > 0;
        const overlayLarge = op > 0 && covers;

        if (hiddenLarge || overlayLarge) {
          console.warn('Clickjacking overlay detected', frame);
          showWarningOverlay();
          return;  // stop after first detection
        }
      } catch (e) {
        // cross-origin frames may throw; ignore
      }
    }
  }

  // Set up observers
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

  // Kick off
  document.querySelectorAll('iframe').forEach(f => io.observe(f));
  mo.observe(document.body, { childList: true, subtree: true });
  scanForClickjacking();

})();
