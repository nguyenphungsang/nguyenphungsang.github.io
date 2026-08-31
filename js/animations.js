/**
 * animations.js - Motion layer for the portfolio site.
 *
 * Design rules this file follows:
 *
 *  1. The page must be readable without it. Reveal states are applied by JS
 *     (never hard-coded in the HTML), so if this file fails to load nothing
 *     is left invisible.
 *  2. CSS does the moving, JS only decides when. Transitions run on the
 *     compositor, which is what keeps a mid-range phone at 60fps; anime.js is
 *     reserved for the things CSS cannot do - counters and the loader.
 *  3. `prefers-reduced-motion` is honoured everywhere, and pointer-driven
 *     effects (magnetic buttons, card tilt) only bind on real mice.
 *  4. The loader can never trap the visitor: it advances on its own and is
 *     capped by a hard deadline whether or not `window.load` ever fires.
 *
 * Pairs with js/main.js.
 */
(function (window, document) {
    'use strict';

    var P = window.Portfolio || {};
    var utils = P.utils || {
        $: function (s, r) { return (r || document).querySelector(s); },
        $$: function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); },
        reducedMotion: function () { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; },
        finePointer: function () { return window.matchMedia('(hover: hover) and (pointer: fine)').matches; },
        isMobile: function () { return window.matchMedia('(max-width: 768px)').matches; },
        rafThrottle: function (fn) {
            var queued = false, lastArgs;
            return function () {
                lastArgs = arguments;
                if (queued) return;
                queued = true;
                window.requestAnimationFrame(function () { queued = false; fn.apply(null, lastArgs); });
            };
        }
    };

    var hasAnime = function () { return typeof window.anime !== 'undefined'; };
    var still = utils.reducedMotion();

    /* =============================================================
     * Loader
     *
     * Progress creeps to 90% on its own, then completes as soon as the page
     * has finished loading - or after HARD_DEADLINE, whichever comes first.
     * `window.load` waits on every font, CDN script and image, which on a
     * slow mobile connection is exactly how a loading screen ends up looking
     * frozen. The deadline makes that impossible.
     * ============================================================= */
    var loader = {
        HARD_DEADLINE: 2500,
        SOFT_CEILING: 90,

        start: function () {
            this.el = document.getElementById('loader');
            this.label = document.getElementById('loaderPercent');

            if (!this.el) { reveal.play(); return; }

            this.progress = 0;
            this.pageReady = false;
            this.finished = false;

            if (document.readyState === 'complete') {
                this.pageReady = true;
            } else {
                window.addEventListener('load', function () { loader.pageReady = true; });
            }
            setTimeout(function () { loader.pageReady = true; }, this.HARD_DEADLINE);

            this.timer = setInterval(function () { loader.tick(); }, 90);
        },

        tick: function () {
            var ceiling = this.pageReady ? 100 : this.SOFT_CEILING;
            // Ease off as it approaches the ceiling so it never sits dead still.
            var step = Math.max(1, (ceiling - this.progress) * 0.18);
            this.progress = Math.min(ceiling, this.progress + step);

            if (this.label) this.label.textContent = Math.floor(this.progress) + '%';
            if (this.progress >= 99.5) this.finish();
        },

        finish: function () {
            if (this.finished) return;
            this.finished = true;
            clearInterval(this.timer);
            if (this.label) this.label.textContent = '100%';

            var hide = function () {
                loader.el.classList.add('hidden');
                document.body.classList.add('is-loaded');
                reveal.play();
                hero.play();
            };

            if (still) { hide(); return; }

            setTimeout(function () {
                if (hasAnime()) {
                    window.anime({
                        targets: loader.el,
                        opacity: [1, 0],
                        duration: 450,
                        easing: 'easeInOutQuad',
                        complete: hide
                    });
                } else {
                    loader.el.style.transition = 'opacity .45s ease';
                    loader.el.style.opacity = '0';
                    setTimeout(hide, 450);
                }
            }, 200);
        }
    };

    /* =============================================================
     * Reveal on scroll
     *
     * One observer for the whole page. Elements are tagged at runtime, so
     * the markup stays clean and nothing is hidden if this never runs.
     * ============================================================= */
    var reveal = {
        // [selector, direction, stagger step in ms]
        GROUPS: [
            ['.section-header', 'up', 0],
            ['.about-text-wrapper', 'left', 0],
            ['.about-image-wrapper', 'right', 0],
            ['.stat-item', 'up', 90],
            ['.skill-category', 'up', 120],
            ['.timeline-item', 'left', 120],
            ['.project-card', 'up', 110],
            ['.contact-item', 'left', 90],
            ['.contact-form', 'right', 0]
        ],

        play: function () {
            if (this.started) return;
            this.started = true;

            if (still || !('IntersectionObserver' in window)) return; // everything stays visible

            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                });
            }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

            this.GROUPS.forEach(function (group) {
                var selector = group[0], direction = group[1], step = group[2];

                utils.$$(selector).forEach(function (el, index) {
                    el.setAttribute('data-reveal', direction);
                    if (step) el.style.transitionDelay = (index % 4) * step + 'ms';

                    // Anything already on screen shows immediately - no blank
                    // first paint for content above the fold.
                    var box = el.getBoundingClientRect();
                    if (box.top < window.innerHeight * 0.9) {
                        window.requestAnimationFrame(function () { el.classList.add('is-visible'); });
                    } else {
                        observer.observe(el);
                    }
                });
            });

            counters.watch();
            skills.watch();
            pointerFx.bind();
            parallax.bind();
        }
    };

    /* =============================================================
     * Hero intro
     * ============================================================= */
    var hero = {
        play: function () {
            if (still) return;

            this.typewriter();

            if (!hasAnime()) {
                document.body.classList.add('hero-fallback');
                return;
            }

            var anime = window.anime;
            var sequence = [
                ['.hero-greeting', 0, 0],
                ['.hero-title', 24, 250],
                ['.hero-description', 20, 400],
                ['.hero-buttons .btn', 16, 550],
                ['.hero-social .social-icon', 14, 700]
            ];

            sequence.forEach(function (item) {
                var nodes = utils.$$(item[0]);
                if (!nodes.length) return;
                anime({
                    targets: nodes,
                    opacity: [0, 1],
                    translateY: [item[1], 0],
                    delay: anime.stagger(70, { start: item[2] }),
                    duration: 720,
                    easing: 'easeOutExpo'
                });
            });

            var frame = utils.$('.profile-image-frame');
            if (frame) {
                anime({
                    targets: frame,
                    opacity: [0, 1],
                    scale: [0.86, 1],
                    duration: 1100,
                    easing: 'easeOutElastic(1, .7)'
                });
            }

            var badges = utils.$$('.floating-badge');
            if (badges.length) {
                anime({
                    targets: badges,
                    opacity: [0, 1],
                    translateY: [16, 0],
                    scale: [0.9, 1],
                    delay: anime.stagger(140, { start: 600 }),
                    duration: 800,
                    easing: 'easeOutBack'
                });
            }
        },

        /**
         * Types out the hero name. Re-runs on language change so the effect
         * survives an EN/VI switch instead of being overwritten mid-flight.
         */
        typewriter: function () {
            var target = utils.$('#heroName .name-value');
            if (!target) return;

            var text = target.getAttribute('data-typed') || target.textContent.trim();
            target.setAttribute('data-typed', text);

            // Reserve the final width first, otherwise the line reflows (and can
            // wrap) on every character while the text is still growing.
            target.style.display = 'inline-block';
            target.style.minWidth = Math.ceil(target.getBoundingClientRect().width) + 'px';

            target.textContent = '';
            target.classList.add('is-typing');

            var index = 0;
            var step = function () {
                target.textContent = text.slice(0, ++index);
                if (index < text.length) {
                    setTimeout(step, 90);
                } else {
                    setTimeout(function () { target.classList.remove('is-typing'); }, 1600);
                }
            };
            setTimeout(step, 250);
        }
    };

    /* =============================================================
     * Counting numbers (About stats)
     * ============================================================= */
    var counters = {
        watch: function () {
            var nodes = utils.$$('.stat-number');
            if (!nodes.length) return;

            if (still || !('IntersectionObserver' in window)) {
                nodes.forEach(function (n) { n.textContent = n.getAttribute('data-count') || '0'; });
                return;
            }

            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    counters.run(entry.target);
                    observer.unobserve(entry.target);
                });
            }, { threshold: 0.4 });

            nodes.forEach(function (n) { observer.observe(n); });
        },

        run: function (node) {
            var target = parseInt(node.getAttribute('data-count') || '0', 10);

            if (!hasAnime()) { node.textContent = target; return; }

            window.anime({
                targets: { value: 0 },
                value: target,
                duration: 1800,
                easing: 'easeOutExpo',
                update: function (anim) {
                    node.textContent = Math.floor(anim.animatables[0].target.value);
                }
            });
        }
    };

    /* =============================================================
     * Skill bars
     * ============================================================= */
    var skills = {
        watch: function () {
            var items = utils.$$('.skill-item');
            if (!items.length) return;

            if (still || !('IntersectionObserver' in window)) {
                items.forEach(function (item) { skills.fill(item, true); });
                return;
            }

            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    skills.fill(entry.target, false);
                    observer.unobserve(entry.target);
                });
            }, { threshold: 0.35 });

            items.forEach(function (item) { observer.observe(item); });
        },

        fill: function (item, instant) {
            var bar = item.querySelector('.skill-progress');
            var label = item.querySelector('.skill-percent');
            var percent = parseInt(item.getAttribute('data-percent') || '0', 10);

            if (instant || !hasAnime()) {
                if (bar) bar.style.width = percent + '%';
                if (label) label.textContent = percent + '%';
                return;
            }

            if (bar) {
                window.anime({
                    targets: bar,
                    width: ['0%', percent + '%'],
                    duration: 1600,
                    delay: 150,
                    easing: 'easeOutExpo'
                });
            }

            if (label) {
                window.anime({
                    targets: { value: 0 },
                    value: percent,
                    duration: 1600,
                    delay: 150,
                    easing: 'easeOutExpo',
                    update: function (anim) {
                        label.textContent = Math.floor(anim.animatables[0].target.value) + '%';
                    }
                });
            }
        }
    };

    /* =============================================================
     * Pointer effects - mice only. Binding these on a touchscreen just
     * adds work per frame and leaves elements stuck in a hover state.
     * ============================================================= */
    var pointerFx = {
        bind: function () {
            if (still || !utils.finePointer()) return;
            this.magnetic();
            this.tilt();
        },

        /** Buttons drift a few pixels towards the cursor. */
        magnetic: function () {
            utils.$$('.hero-buttons .btn, .btn-submit').forEach(function (btn) {
                btn.addEventListener('mousemove', function (e) {
                    var box = btn.getBoundingClientRect();
                    var x = (e.clientX - box.left - box.width / 2) * 0.18;
                    var y = (e.clientY - box.top - box.height / 2) * 0.28;
                    btn.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
                });
                btn.addEventListener('mouseleave', function () {
                    btn.style.transform = '';
                });
            });
        },

        /** Project cards lean towards the cursor in 3D. */
        tilt: function () {
            utils.$$('.project-card').forEach(function (card) {
                card.style.transformStyle = 'preserve-3d';

                var onMove = utils.rafThrottle(function (clientX, clientY) {
                    var box = card.getBoundingClientRect();
                    var px = (clientX - box.left) / box.width - 0.5;
                    var py = (clientY - box.top) / box.height - 0.5;
                    card.style.transform =
                        'perspective(900px) rotateY(' + (px * 7).toFixed(2) + 'deg) rotateX(' +
                        (-py * 7).toFixed(2) + 'deg) translateY(-6px)';
                });

                card.addEventListener('mousemove', function (e) { onMove(e.clientX, e.clientY); });
                card.addEventListener('mouseleave', function () { card.style.transform = ''; });
            });
        }
    };

    /* =============================================================
     * Parallax - desktop only; on a phone the hero image is the first
     * thing on screen and shifting it just fights the scroll.
     * ============================================================= */
    var parallax = {
        bind: function () {
            if (still || utils.isMobile()) return;

            var image = document.getElementById('profileImage');
            var grid = utils.$('.code-grid-bg');
            if (!image && !grid) return;

            var onScroll = utils.rafThrottle(function () {
                var y = window.pageYOffset || 0;
                if (y > window.innerHeight * 1.2) return; // hero is off screen
                if (image) image.style.transform = 'translateY(' + Math.min(y * 0.25, 90) + 'px)';
                if (grid) grid.style.transform = 'translateY(' + (y * 0.15) + 'px)';
            });

            window.addEventListener('scroll', onScroll, { passive: true });
        }
    };

    /* =============================================================
     * Boot
     * ============================================================= */
    function boot() {
        loader.start();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    // Re-type the hero name when the visitor flips EN/VI.
    document.addEventListener('portfolio:languagechange', function () {
        if (!still && loader.finished) hero.typewriter();
    });

    window.Portfolio = window.Portfolio || {};
    window.Portfolio.animations = {
        loader: loader,
        reveal: reveal,
        hero: hero,
        counters: counters,
        skills: skills,
        pointerFx: pointerFx,
        parallax: parallax
    };
})(window, document);