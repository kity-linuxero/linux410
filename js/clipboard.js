(function () {
    // Uso: <pre class="codigo_shadow clipboard"><code class="bash codigo-redondo">...</code></pre>
    // También se acepta la clase clipboard directamente en el elemento <code>.
    document.querySelectorAll('.reveal pre').forEach(function (block) {
        var isClipboardEnabled = block.classList.contains('clipboard') || block.querySelector('code.clipboard');
        block.dataset.cc = isClipboardEnabled ? 'true' : 'false';
    });
})();
