/**
 * main.js - Core runtime for the portfolio site.
 *
 * Everything lives behind a single `Portfolio` namespace, so nothing leaks
 * into the global scope. Every feature degrades gracefully: blocked
 * localStorage (Safari private mode), a missing Clipboard API, or a missing
 * IntersectionObserver all fall back to something sensible instead of
 * throwing and taking the rest of the page down with them.
 *
 *   utils     – rAF throttling, media queries, crash-proof storage
 *   i18n      – EN/VI switching driven by data-text-* / data-placeholder-*
 *   theme     – dark/light, follows the OS until the visitor picks one
 *   nav       – IntersectionObserver scroll-spy + smooth scrolling
 *   menu      – mobile menu: scroll lock, Esc, outside click, resize
 *   ui        – injected chrome: scroll progress, back-to-top, toasts, copy
 *   form      – contact form with inline validation and toast feedback
 *   particles – floating code symbols, skipped when motion is reduced
 *
 * Pairs with js/animations.js.
 */
(function (window, document) {
    'use strict';

    var STORAGE_LANG = 'portfolio-lang';
    var STORAGE_THEME = 'portfolio-theme';

    /* =============================================================
     * State
     * ============================================================= */
    var state = {
        lang: 'en',
        theme: 'dark',
        section: 'home',
        menuOpen: false,
        ready: false
    };

    /* =============================================================
     * Utilities
     * ============================================================= */
    var utils = {
        $: function (selector, root) {
            return (root || document).querySelector(selector);
        },
        $$: function (selector, root) {
            return Array.prototype.slice.call((root || document).querySelectorAll(selector));
        },
        /** True when the visitor asked their OS to reduce animation. */
        reducedMotion: function () {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        },
        /** True for real hover-capable pointers - i.e. not a touchscreen. */
        finePointer: function () {
            return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        },
        isMobile: function () {
            return window.matchMedia('(max-width: 768px)').matches;
        },
        /** Collapse repeated calls into one per animation frame. */
        rafThrottle: function (fn) {
            var queued = false;
            var lastArgs;
            return function () {
                lastArgs = arguments;
                if (queued) return;
                queued = true;
                window.requestAnimationFrame(function () {
                    queued = false;
                    fn.apply(null, lastArgs);
                });
            };
        },
        /** Listen to a media query across old and new Safari. */
        onMediaChange: function (query, handler) {
            var mq = window.matchMedia(query);
            if (mq.addEventListener) mq.addEventListener('change', handler);
            else if (mq.addListener) mq.addListener(handler);
            return mq;
        },
        /** localStorage throws in Safari private mode - never let it bubble. */
        storage: {
            get: function (key) {
                try { return window.localStorage.getItem(key); } catch (e) { return null; }
            },
            set: function (key, value) {
                try { window.localStorage.setItem(key, value); } catch (e) { /* ignore */ }
            }
        },
        emit: function (name, detail) {
            var event;
            try {
                event = new CustomEvent(name, { detail: detail });
            } catch (e) {
                event = document.createEvent('CustomEvent');
                event.initCustomEvent(name, false, false, detail);
            }
            document.dispatchEvent(event);
        }
    };

    /* =============================================================
     * i18n - strings for the UI this file injects. Page copy itself
     * still comes from the data-text-* attributes in index.html.
     * ============================================================= */
    var i18n = {
        dict: {
            en: {
                sending: 'Sending...',
                send: 'Send Message',
                sent: 'Message sent successfully!',
                failed: 'Could not send the message. Please try again.',
                invalidName: 'Please enter your name.',
                invalidEmail: 'Please enter a valid email address.',
                invalidSubject: 'Please enter a subject.',
                invalidMessage: 'Please enter a message.',
                copied: 'Copied to clipboard',
                copyFailed: 'Could not copy - please copy manually.',
                copyLabel: 'Copy',
                backToTop: 'Back to top'
            },
            vi: {
                sending: 'Đang gửi...',
                send: 'Gửi tin nhắn',
                sent: 'Tin nhắn đã được gửi thành công!',
                failed: 'Gửi thất bại, vui lòng thử lại sau.',
                invalidName: 'Vui lòng nhập tên của bạn.',
                invalidEmail: 'Vui lòng nhập email hợp lệ.',
                invalidSubject: 'Vui lòng nhập tiêu đề.',
                invalidMessage: 'Vui lòng nhập nội dung tin nhắn.',
                copied: 'Đã sao chép',
                copyFailed: 'Không sao chép được - vui lòng copy thủ công.',
                copyLabel: 'Sao chép',
                backToTop: 'Lên đầu trang'
            }
        },

        t: function (key) {
            var table = this.dict[state.lang] || this.dict.en;
            return table[key] || this.dict.en[key] || key;
        },

        init: function () {
            var saved = utils.storage.get(STORAGE_LANG);
            this.apply(saved === 'vi' ? 'vi' : 'en');

            var toggle = utils.$('#langToggle');
            if (toggle) {
                toggle.addEventListener('click', function () {
                    i18n.apply(state.lang === 'en' ? 'vi' : 'en', true);
                });
            }
        },

        apply: function (lang, persist) {
            state.lang = lang;
            document.documentElement.setAttribute('lang', lang);
            document.documentElement.setAttribute('dir', 'ltr');
            document.body.setAttribute('data-lang', lang);
            document.body.setAttribute('data-dir', 'ltr');
            if (persist) utils.storage.set(STORAGE_LANG, lang);
            this.render();
            utils.emit('portfolio:languagechange', { lang: lang });
        },

        render: function () {
            var attr = 'data-text-' + state.lang;
            utils.$$('[data-text-en], [data-text-vi]').forEach(function (el) {
                var value = el.getAttribute(attr);
                if (value) el.textContent = value;
            });

            var placeholder = 'data-placeholder-' + state.lang;
            utils.$$('[data-placeholder-en], [data-placeholder-vi]').forEach(function (el) {
                var value = el.getAttribute(placeholder);
                if (value) el.setAttribute('placeholder', value);
            });

            var toggle = utils.$('#langToggle .lang-text');
            if (toggle) toggle.textContent = state.lang === 'en' ? 'VI' : 'EN';

            // Injected chrome follows the language too.
            var backTop = utils.$('#backToTop');
            if (backTop) backTop.setAttribute('aria-label', i18n.t('backToTop'));
            utils.$$('.contact-copy').forEach(function (btn) {
                btn.setAttribute('aria-label', i18n.t('copyLabel'));
                btn.setAttribute('title', i18n.t('copyLabel'));
            });
        }
    };

    /* =============================================================
     * Theme - follows the OS until the visitor picks one explicitly.
     * ============================================================= */
    var theme = {
        init: function () {
            // The site is designed dark-first, so dark stays the default even
            // when the OS prefers light; only an explicit choice overrides it.
            var saved = utils.storage.get(STORAGE_THEME);
            this.apply(saved === 'light' ? 'light' : 'dark');

            var toggle = utils.$('#themeToggle');
            if (toggle) {
                toggle.addEventListener('click', function () {
                    theme.apply(state.theme === 'dark' ? 'light' : 'dark', true);
                });
            }
        },

        apply: function (next, persist) {
            state.theme = next;
            document.body.setAttribute('data-theme', next);
            if (persist) utils.storage.set(STORAGE_THEME, next);

            var icon = utils.$('#themeToggle i');
            if (icon) icon.className = next === 'dark' ? 'fas fa-sun' : 'fas fa-moon';

            // Tint the mobile browser chrome to match the page.
            var meta = utils.$('meta[name="theme-color"]');
            if (!meta) {
                meta = document.createElement('meta');
                meta.setAttribute('name', 'theme-color');
                document.head.appendChild(meta);
            }
            meta.setAttribute('content', next === 'dark' ? '#0f172a' : '#ffffff');
        }
    };

    /* =============================================================
     * Navigation - one observer for scroll-spy, no per-scroll loops.
     * ============================================================= */
    var nav = {
        init: function () {
            this.header = utils.$('.main-header');
            this.links = utils.$$('.nav-link[href^="#"]');
            this.sections = utils.$$('section[id]');

            this.links.forEach(function (link) {
                link.addEventListener('click', function (e) { nav.onClick(e, link); });
            });

            this.spy();
        },

        headerOffset: function () {
            return this.header ? this.header.offsetHeight : 0;
        },

        onClick: function (e, link) {
            var target = document.querySelector(link.getAttribute('href'));
            if (!target) return;
            e.preventDefault();

            window.scrollTo({
                top: Math.max(0, target.offsetTop - this.headerOffset()),
                behavior: utils.reducedMotion() ? 'auto' : 'smooth'
            });

            this.setActive(link.getAttribute('data-section'));
            if (state.menuOpen) menu.close();
        },

        /**
         * A band across the middle of the viewport decides the active section.
         * Far cheaper than recomputing every section's offset on every scroll
         * event, which is what actually costs frames on a phone.
         */
        spy: function () {
            if (!('IntersectionObserver' in window)) return;

            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) nav.setActive(entry.target.id);
                });
            }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

            this.sections.forEach(function (section) { observer.observe(section); });
        },

        setActive: function (id) {
            if (!id || state.section === id) return;
            state.section = id;
            this.links.forEach(function (link) {
                link.classList.toggle('active', link.getAttribute('data-section') === id);
            });
        }
    };

    /* =============================================================
     * Mobile menu
     * ============================================================= */
    var menu = {
        init: function () {
            this.toggle = utils.$('#menuToggle');
            this.panel = utils.$('#navMenu');
            if (!this.toggle || !this.panel) return;

            this.toggle.setAttribute('aria-expanded', 'false');
            this.toggle.addEventListener('click', function (e) {
                e.stopPropagation();
                menu.set(!state.menuOpen);
            });

            document.addEventListener('click', function (e) {
                if (!state.menuOpen) return;
                if (!menu.panel.contains(e.target) && !menu.toggle.contains(e.target)) menu.close();
            });

            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape' && state.menuOpen) menu.close();
            });

            // Never leave the menu stuck open when rotating into desktop width.
            utils.onMediaChange('(min-width: 769px)', function (e) {
                if (e.matches && state.menuOpen) menu.close();
            });
        },

        set: function (open) {
            state.menuOpen = open;
            this.panel.classList.toggle('active', open);
            this.toggle.classList.toggle('active', open);
            this.toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            // Stop the page scrolling behind the open menu.
            document.body.style.overflow = open ? 'hidden' : '';
        },

        close: function () { this.set(false); },
        open: function () { this.set(true); }
    };

    /* =============================================================
     * UI chrome - injected from JS so index.html stays clean
     * ============================================================= */
    var ui = {
        init: function () {
            this.buildProgressBar();
            this.buildBackToTop();
            this.buildToastHost();
            this.buildCopyButtons();
            this.bindScroll();
        },

        buildProgressBar: function () {
            this.progress = document.createElement('div');
            this.progress.className = 'scroll-progress';
            this.progress.setAttribute('aria-hidden', 'true');
            document.body.appendChild(this.progress);
        },

        buildBackToTop: function () {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.id = 'backToTop';
            btn.className = 'back-to-top';
            btn.setAttribute('aria-label', i18n.t('backToTop'));
            btn.innerHTML = '<i class="fas fa-arrow-up" aria-hidden="true"></i>';
            btn.addEventListener('click', function () {
                window.scrollTo({ top: 0, behavior: utils.reducedMotion() ? 'auto' : 'smooth' });
            });
            document.body.appendChild(btn);
            this.backTop = btn;
        },

        buildToastHost: function () {
            var host = document.createElement('div');
            host.className = 'toast-host';
            host.setAttribute('role', 'status');
            host.setAttribute('aria-live', 'polite');
            document.body.appendChild(host);
            this.toastHost = host;
        },

        /** A copy button on the email / phone cards - handy on a phone. */
        buildCopyButtons: function () {
            utils.$$('.contact-item').forEach(function (item) {
                var link = item.querySelector('a[href^="mailto:"], a[href^="tel:"]');
                if (!link) return;

                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'contact-copy';
                btn.setAttribute('aria-label', i18n.t('copyLabel'));
                btn.setAttribute('title', i18n.t('copyLabel'));
                btn.innerHTML = '<i class="far fa-copy" aria-hidden="true"></i>';
                btn.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    ui.copy(link.textContent.trim(), btn);
                });
                item.appendChild(btn);
            });
        },

        copy: function (text, btn) {
            var done = function (ok) {
                ui.toast(ok ? i18n.t('copied') : i18n.t('copyFailed'), ok ? 'success' : 'error');
                if (ok && btn) {
                    btn.classList.add('is-copied');
                    setTimeout(function () { btn.classList.remove('is-copied'); }, 1400);
                }
            };

            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
                return;
            }

            // Fallback for http:// and older mobile browsers.
            try {
                var area = document.createElement('textarea');
                area.value = text;
                area.setAttribute('readonly', '');
                area.style.position = 'fixed';
                area.style.opacity = '0';
                document.body.appendChild(area);
                area.select();
                var ok = document.execCommand('copy');
                document.body.removeChild(area);
                done(ok);
            } catch (err) {
                done(false);
            }
        },

        toast: function (message, kind) {
            if (!this.toastHost) return;

            var icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' };
            var el = document.createElement('div');
            el.className = 'toast toast-' + (kind || 'info');
            el.innerHTML = '<i class="fas ' + (icons[kind] || icons.info) + '" aria-hidden="true"></i><span></span>';
            el.querySelector('span').textContent = message;

            this.toastHost.appendChild(el);
            // Next frame, so the entry transition actually runs.
            window.requestAnimationFrame(function () { el.classList.add('is-visible'); });

            setTimeout(function () {
                el.classList.remove('is-visible');
                setTimeout(function () {
                    if (el.parentNode) el.parentNode.removeChild(el);
                }, 350);
            }, 3600);
        },

        bindScroll: function () {
            var header = nav.header;
            var progress = this.progress;
            var backTop = this.backTop;

            var onScroll = utils.rafThrottle(function () {
                var y = window.pageYOffset || document.documentElement.scrollTop || 0;
                var max = document.documentElement.scrollHeight - window.innerHeight;

                if (progress) progress.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
                if (header) header.classList.toggle('scrolled', y > 50);
                if (backTop) backTop.classList.toggle('is-visible', y > window.innerHeight * 0.8);
            });

            // Passive: tells the browser we never preventDefault, so it can keep
            // scrolling smoothly on touch instead of waiting on this handler.
            window.addEventListener('scroll', onScroll, { passive: true });
            onScroll();
        }
    };

    /* =============================================================
     * Contact form
     * ============================================================= */
    var form = {
        ENDPOINT: 'https://script.google.com/macros/s/AKfycbwCidoniuEv8XPLwesJyQlf_88njNEGL1zNnl7glkXFaUv1dYRWjRR1INPJt0qJDBQl/exec',
        EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,

        init: function () {
            this.el = utils.$('#contactForm');
            if (!this.el) return;
            this.button = utils.$('#submitBtn');
            this.buttonText = utils.$('#submitBtnText');
            this.el.setAttribute('novalidate', 'novalidate');
            this.el.addEventListener('submit', function (e) { form.submit(e); });
        },

        value: function (id) {
            var el = document.getElementById(id);
            return el ? el.value.trim() : '';
        },

        /** Returns the first problem found, or null when everything is fine. */
        validate: function (payload) {
            if (!payload.name) return { field: 'contactName', message: i18n.t('invalidName') };
            if (!this.EMAIL.test(payload.email)) return { field: 'contactEmail', message: i18n.t('invalidEmail') };
            if (!payload.subject) return { field: 'contactSubject', message: i18n.t('invalidSubject') };
            if (!payload.message) return { field: 'contactMessage', message: i18n.t('invalidMessage') };
            return null;
        },

        flag: function (id) {
            var el = document.getElementById(id);
            if (!el) return;
            el.classList.add('has-error');
            el.focus();
            var clear = function () {
                el.classList.remove('has-error');
                el.removeEventListener('input', clear);
            };
            el.addEventListener('input', clear);
        },

        busy: function (isBusy) {
            if (this.button) this.button.disabled = isBusy;
            if (this.button) this.button.classList.toggle('is-busy', isBusy);
            if (!this.buttonText) return;
            if (isBusy) {
                this.buttonText.textContent = i18n.t('sending');
            } else {
                // Restore whatever the current language says on the button.
                var label = this.buttonText.getAttribute('data-text-' + state.lang);
                this.buttonText.textContent = label || i18n.t('send');
            }
        },

        submit: function (e) {
            e.preventDefault();

            var payload = {
                name: this.value('contactName'),
                email: this.value('contactEmail'),
                subject: this.value('contactSubject') || 'No Subject',
                message: this.value('contactMessage')
            };

            var problem = this.validate(payload);
            if (problem) {
                ui.toast(problem.message, 'error');
                this.flag(problem.field);
                return;
            }

            this.busy(true);

            // no-cors: the Apps Script endpoint sends no CORS headers, so the
            // response is opaque - a resolved promise is the only signal we get.
            window.fetch(this.ENDPOINT, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(function () {
                ui.toast(i18n.t('sent'), 'success');
                form.el.reset();
            }).catch(function (error) {
                console.error('[contact] send failed:', error);
                ui.toast(i18n.t('failed'), 'error');
            }).then(function () {
                form.busy(false);
            });
        }
    };

    /* =============================================================
     * Background particles
     * ============================================================= */
    var particles = {
        SYMBOLS: ['{', '}', '[', ']', '(', ')', '<', '>', '/', '*', '=', '+', '-', ';', ':', '&', '|', '%', '$', '#', '@'],

        init: function () {
            var host = utils.$('#particles');
            if (!host || utils.reducedMotion()) return;

            // Fewer symbols on a phone: each one is an animated DOM node.
            var count = utils.isMobile() ? 10 : 20;
            var fragment = document.createDocumentFragment();

            for (var i = 0; i < count; i++) {
                var node = document.createElement('div');
                node.className = 'particle';
                node.textContent = this.SYMBOLS[Math.floor(Math.random() * this.SYMBOLS.length)];
                node.style.left = (Math.random() * 100) + '%';
                node.style.animationDelay = (Math.random() * 15) + 's';
                node.style.animationDuration = (10 + Math.random() * 10) + 's';
                fragment.appendChild(node);
            }

            host.appendChild(fragment);
        }
    };

    /* =============================================================
     * Boot
     * ============================================================= */
    function boot() {
        theme.init();
        i18n.init();
        nav.init();
        menu.init();
        ui.init();
        form.init();
        particles.init();

        state.ready = true;
        utils.emit('portfolio:ready', { state: state });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    /* Public surface - animations.js and the console both use this. */
    window.Portfolio = {
        state: state,
        utils: utils,
        i18n: i18n,
        theme: theme,
        nav: nav,
        menu: menu,
        ui: ui,
        form: form
    };

    // Backwards compatibility with the old global.
    window.AppState = state;
})(window, document);