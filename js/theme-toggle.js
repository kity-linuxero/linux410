document.addEventListener('DOMContentLoaded', () => {
    // Buscar el link del tema
    let themeLink = document.querySelector('link[href*="theme/white.css"]') || 
                    document.querySelector('link[href*="theme/night.css"]') || 
                    document.querySelector('link[href*="theme/black.css"]');
    
    if (!themeLink) return;
    themeLink.id = 'theme-style';

    // Crear el botón
    const themeToggleBtn = document.createElement('div');
    themeToggleBtn.id = 'theme-toggle';
    themeToggleBtn.title = 'Cambiar tema';
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
    
    // Hover effects
    themeToggleBtn.onmouseenter = () => {
        themeToggleBtn.style.background = 'rgba(128, 128, 128, 0.4)';
        themeToggleBtn.style.transform = 'scale(1.05)';
    };
    themeToggleBtn.onmouseleave = () => {
        themeToggleBtn.style.background = 'rgba(128, 128, 128, 0.2)';
        themeToggleBtn.style.transform = 'scale(1)';
    };

    document.body.appendChild(themeToggleBtn);

    const isInitiallyDark = themeLink.getAttribute('href').includes('night.css') || themeLink.getAttribute('href').includes('black.css');
    themeToggleBtn.innerHTML = isInitiallyDark ? '☀️' : '🌙';

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = themeLink.getAttribute('href');
        const isDark = currentTheme.includes('black.css') || currentTheme.includes('night.css');
        
        if (!isDark) {
            themeLink.setAttribute('href', 'dist/theme/night.css');
            themeToggleBtn.innerHTML = '☀️';
            
            // Adjust hardcoded light gradients
            document.querySelectorAll('section[data-background-gradient]').forEach(el => {
                if (!el.dataset.oldGradient) {
                    el.dataset.oldGradient = el.getAttribute('data-background-gradient');
                }
                el.setAttribute('data-background-gradient', 'radial-gradient(#222, #000)');
            });
            
        } else {
            themeLink.setAttribute('href', 'dist/theme/white.css');
            themeToggleBtn.innerHTML = '🌙';
            
            // Restore light gradients
            document.querySelectorAll('section[data-old-gradient]').forEach(el => {
                el.setAttribute('data-background-gradient', el.dataset.oldGradient);
            });
        }
        
        // Sync reveal to update background elements
        if (typeof Reveal !== 'undefined' && typeof Reveal.sync === 'function') {
            Reveal.sync();
        }
    });
});
