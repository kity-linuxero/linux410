(function () {
    'use strict';

    // Para otra promoción, reemplazá estos datos y usá un campaignId nuevo.
    // De ese modo, la campaña no hereda las cookies de la anterior.
    var eventModalConfig = {
        // Habilitar el modal.
        enabled: true,
        campaignId: 'enredate-2026',
        imageSrc: 'img/enredate26-2.jpeg',
        imageAlt: 'Enredate 26, encuentro de informáticos: viernes 2 de octubre a las 19 horas en el CDP de ATE de La Plata',
        linkUrl: 'https://forms.gle/t8WgTYbPiEKgu42X7',
        dialogLabel: 'Invitación a Enredate 26',
        activeFrom: null,
        activeUntil: '2026-10-02',
        eventDate: '2026-10-02',
        repeatAfterDays: 7
    };

    if (!eventModalConfig.enabled) {
        return;
    }

    var now = new Date();
    var today = formatLocalDate(now);

    if (eventModalConfig.activeFrom && today < eventModalConfig.activeFrom) {
        return;
    }

    if (eventModalConfig.activeUntil && today > eventModalConfig.activeUntil) {
        return;
    }

    var cookiePrefix = 'linux410_event_' + eventModalConfig.campaignId.replace(/[^a-z0-9_-]/gi, '_');
    var weeklyCookie = cookiePrefix + '_weekly';
    var eventDayCookie = cookiePrefix + '_event_day';
    var isEventDay = today === eventModalConfig.eventDate;
    var eventDayPending = isEventDay && getCookie(eventDayCookie) !== today;
    var weeklyPending = !getCookie(weeklyCookie);

    if (!eventDayPending && !weeklyPending) {
        return;
    }

    showModal();
    setCookie(weeklyCookie, today, eventModalConfig.repeatAfterDays * 24 * 60 * 60);

    if (isEventDay) {
        setCookie(eventDayCookie, today, 370 * 24 * 60 * 60);
    }

    function showModal() {
        var previouslyFocused = document.activeElement;
        var modal = document.createElement('div');
        modal.className = 'event-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', eventModalConfig.dialogLabel);

        var dialog = document.createElement('div');
        dialog.className = 'event-modal__dialog';

        var link = document.createElement('a');
        link.className = 'event-modal__link';
        link.href = eventModalConfig.linkUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.setAttribute('aria-label', eventModalConfig.dialogLabel + ': abrir formulario de inscripción');

        var image = document.createElement('img');
        image.className = 'event-modal__image';
        image.src = eventModalConfig.imageSrc;
        image.alt = eventModalConfig.imageAlt;

        var closeButton = document.createElement('button');
        closeButton.className = 'event-modal__close';
        closeButton.type = 'button';
        closeButton.setAttribute('aria-label', 'Cerrar promoción');
        closeButton.textContent = '×';

        link.appendChild(image);
        dialog.appendChild(link);
        dialog.appendChild(closeButton);
        modal.appendChild(dialog);
        document.body.appendChild(modal);
        document.body.classList.add('event-modal-open');
        closeButton.focus();

        closeButton.addEventListener('click', closeModal);
        modal.addEventListener('click', function (event) {
            if (event.target === modal) {
                closeModal();
            }
        });
        document.addEventListener('keydown', handleKeydown);

        function handleKeydown(event) {
            if (event.key === 'Escape') {
                closeModal();
                return;
            }

            if (event.key !== 'Tab') {
                return;
            }

            var focusableElements = [link, closeButton];
            var currentIndex = focusableElements.indexOf(document.activeElement);
            var nextIndex = event.shiftKey ? currentIndex - 1 : currentIndex + 1;

            if (nextIndex < 0) {
                nextIndex = focusableElements.length - 1;
            } else if (nextIndex >= focusableElements.length) {
                nextIndex = 0;
            }

            event.preventDefault();
            focusableElements[nextIndex].focus();
        }

        function closeModal() {
            document.removeEventListener('keydown', handleKeydown);
            document.body.classList.remove('event-modal-open');
            modal.remove();

            if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
                previouslyFocused.focus();
            }
        }
    }

    function formatLocalDate(date) {
        var year = date.getFullYear();
        var month = String(date.getMonth() + 1).padStart(2, '0');
        var day = String(date.getDate()).padStart(2, '0');
        return year + '-' + month + '-' + day;
    }

    function getCookie(name) {
        var prefix = encodeURIComponent(name) + '=';
        var cookies = document.cookie ? document.cookie.split('; ') : [];

        for (var index = 0; index < cookies.length; index += 1) {
            if (cookies[index].indexOf(prefix) === 0) {
                return decodeURIComponent(cookies[index].slice(prefix.length));
            }
        }

        return null;
    }

    function setCookie(name, value, maxAge) {
        var cookie = encodeURIComponent(name) + '=' + encodeURIComponent(value)
            + '; Max-Age=' + Math.floor(maxAge)
            + '; Path=/; SameSite=Lax';

        if (window.location.protocol === 'https:') {
            cookie += '; Secure';
        }

        document.cookie = cookie;
    }
})();
