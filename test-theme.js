const themeToggleBtn = document.createElement('div');
themeToggleBtn.id = 'theme-toggle';
themeToggleBtn.title = 'Cambiar tema';
themeToggleBtn.innerHTML = '🌙';
themeToggleBtn.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    background: rgba(128, 128, 128, 0.2);
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);
    border: 1px solid rgba(128, 128, 128, 0.3);
    border-radius: 30px;
    padding: 8px 12px;
    cursor: pointer;
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    transition: all 0.3s ease;
    user-select: none;
`;
document.body.appendChild(themeToggleBtn);

// Ensure the theme link has an ID
let themeLink = document.querySelector('link[href*="theme/white.css"]');
if (!themeLink) themeLink = document.querySelector('link[href*="theme/night.css"]') || document.querySelector('link[href*="theme/black.css"]');

themeToggleBtn.addEventListener('click', () => {
    const currentTheme = themeLink.getAttribute('href');
    const isDark = currentTheme.includes('black.css') || currentTheme.includes('night.css');
    
    if (!isDark) {
        themeLink.setAttribute('href', 'dist/theme/night.css'); // 'night' or 'black'
        themeToggleBtn.innerHTML = '☀️';
        
        // Also remove hardcoded light gradients if any
        document.querySelectorAll('section[data-background-gradient]').forEach(el => {
            el.dataset.oldGradient = el.getAttribute('data-background-gradient');
            el.setAttribute('data-background-gradient', 'radial-gradient(#222, #000)'); // Or something dark
        });
        
    } else {
        themeLink.setAttribute('href', 'dist/theme/white.css');
        themeToggleBtn.innerHTML = '🌙';
        
        // Restore light gradients
        document.querySelectorAll('section[data-old-gradient]').forEach(el => {
            el.setAttribute('data-background-gradient', el.dataset.oldGradient);
        });
    }
    
    // Reveal.js might need a sync to update backgrounds properly, but changing attributes sometimes triggers it.
    // Reveal.sync() can be called if Reveal is available globally.
    if (typeof Reveal !== 'undefined') {
        Reveal.sync();
    }
});
