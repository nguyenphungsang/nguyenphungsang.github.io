/**
 * main.js — Core application logic for the portfolio site:
 * language switching (EN/VI), dark/light theme, navigation, scroll
 * effects, the contact form, mobile menu, and the background particles.
 *
 * Pairs with js/animations.js, which owns the boot loader and all
 * Anime.js entrance/scroll animations.
 */

const AppState = {
    currentLang: 'en',
    currentTheme: 'dark',
    currentSection: 'home',
    isMenuOpen: false,
    isLoaded: false
};

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    generateParticles();
});

function initializeApp() {
    loadPreferences();
    initLanguage();
    initTheme();
    initNavigation();
    initScrollEffects();
    initFormHandlers();
    initMobileMenu();
    updateLanguageUI();
    updateThemeUI();
    AppState.isLoaded = true;
}

function loadPreferences() {
    const savedLang = localStorage.getItem('portfolio-lang');
    const savedTheme = localStorage.getItem('portfolio-theme');
    if (savedLang) AppState.currentLang = savedLang;
    if (savedTheme) AppState.currentTheme = savedTheme;
}

function initLanguage() {
    const langToggle = document.getElementById('langToggle');
    if (langToggle) {
        langToggle.addEventListener('click', toggleLanguage);
    }
    setLanguage(AppState.currentLang);
}

function toggleLanguage() {
    const newLang = AppState.currentLang === 'en' ? 'vi' : 'en';
    setLanguage(newLang);
    localStorage.setItem('portfolio-lang', newLang);
}

function setLanguage(lang) {
    AppState.currentLang = lang;
    const html = document.documentElement;
    const body = document.body;

    if (lang === 'vi') {
        html.setAttribute('lang', 'vi');
        html.setAttribute('dir', 'ltr');
        body.setAttribute('data-lang', 'vi');
        body.setAttribute('data-dir', 'ltr');
    } else {
        html.setAttribute('lang', 'en');
        html.setAttribute('dir', 'ltr');
        body.setAttribute('data-lang', 'en');
        body.setAttribute('data-dir', 'ltr');
    }
    updateLanguageUI();
}

function updateLanguageUI() {
    const textElements = document.querySelectorAll('[data-text-en], [data-text-vi]');
    textElements.forEach(element => {
        const enText = element.getAttribute('data-text-en');
        const viText = element.getAttribute('data-text-vi');
        if (AppState.currentLang === 'vi' && viText) {
            element.textContent = viText;
        } else if (AppState.currentLang === 'en' && enText) {
            element.textContent = enText;
        }
    });

    const placeholderElements = document.querySelectorAll('[data-placeholder-en], [data-placeholder-vi]');
    placeholderElements.forEach(element => {
        const enPlaceholder = element.getAttribute('data-placeholder-en');
        const viPlaceholder = element.getAttribute('data-placeholder-vi');
        if (AppState.currentLang === 'vi' && viPlaceholder) {
            element.setAttribute('placeholder', viPlaceholder);
        } else if (AppState.currentLang === 'en' && enPlaceholder) {
            element.setAttribute('placeholder', enPlaceholder);
        }
    });

    const langToggle = document.getElementById('langToggle');
    if (langToggle) {
        const langText = langToggle.querySelector('.lang-text');
        if (langText) {
            langText.textContent = AppState.currentLang === 'en' ? 'VI' : 'EN';
        }
    }
}

function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    setTheme(AppState.currentTheme);
}

function toggleTheme() {
    const newTheme = AppState.currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('portfolio-theme', newTheme);
}

function setTheme(theme) {
    AppState.currentTheme = theme;
    document.body.setAttribute('data-theme', theme);
    updateThemeUI();
}

function updateThemeUI() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        if (icon) {
            icon.className = AppState.currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }
}

function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);

            if (targetSection) {
                const headerHeight = document.querySelector('.main-header').offsetHeight;
                const targetPosition = targetSection.offsetTop - headerHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });

                updateActiveNavLink(link);
                if (AppState.isMenuOpen) {
                    toggleMobileMenu();
                }
            }
        });
    });

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('scroll', updateHeaderOnScroll);
}

function handleScroll() {
    const sections = document.querySelectorAll('section[id]');
    const scrollPosition = window.scrollY + 100;

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');

        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            AppState.currentSection = sectionId;
            updateActiveNavLink(null, sectionId);
        }
    });
}

function updateActiveNavLink(clickedLink, sectionId = null) {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (clickedLink && link === clickedLink) {
            link.classList.add('active');
        } else if (sectionId) {
            const linkSection = link.getAttribute('data-section');
            if (linkSection === sectionId) {
                link.classList.add('active');
            }
        }
    });
}

function updateHeaderOnScroll() {
    const header = document.querySelector('.main-header');
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
}

function initScrollEffects() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const fadeElements = document.querySelectorAll('.fade-in');
    fadeElements.forEach(element => observer.observe(element));

    const sections = document.querySelectorAll('.section');
    sections.forEach(section => observer.observe(section));
}

function initFormHandlers() {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleFormSubmit);
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) submitBtn.disabled = true;

    const payload = {
        name: document.getElementById('contactName')?.value || '',
        email: document.getElementById('contactEmail')?.value || '',
        subject: document.getElementById('contactSubject')?.value || 'No Subject',
        message: document.getElementById('contactMessage')?.value || ''
    };

    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwCidoniuEv8XPLwesJyQlf_88njNEGL1zNnl7glkXFaUv1dYRWjRR1INPJt0qJDBQl/exec';

    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const msg = (typeof AppState !== 'undefined' && AppState.currentLang === 'vi')
            ? 'Tin nhắn đã được gửi thành công!'
            : 'Message sent successfully!';
        alert(msg);
        e.target.reset();

    } catch (error) {
        console.error("Error sending message:", error);
        const errorMsg = (typeof AppState !== 'undefined' && AppState.currentLang === 'vi')
            ? 'Gửi thất bại, vui lòng thử lại sau!'
            : 'Failed to send message, please try again!';
        alert(errorMsg);
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

function initMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleMobileMenu);
    }

    document.addEventListener('click', (e) => {
        const navMenu = document.getElementById('navMenu');
        const menuToggle = document.getElementById('menuToggle');

        if (AppState.isMenuOpen &&
            !navMenu.contains(e.target) &&
            !menuToggle.contains(e.target)) {
            toggleMobileMenu();
        }
    });
}

function toggleMobileMenu() {
    AppState.isMenuOpen = !AppState.isMenuOpen;
    const navMenu = document.getElementById('navMenu');
    const menuToggle = document.getElementById('menuToggle');

    if (navMenu) {
        navMenu.classList.toggle('active', AppState.isMenuOpen);
    }

    if (menuToggle) {
        menuToggle.classList.toggle('active', AppState.isMenuOpen);
    }
}

function generateParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;

    const codeSymbols = ['{', '}', '[', ']', '(', ')', '<', '>', '/', '*', '=', '+', '-', ';', ':', '&', '|', '%', '$', '#', '@'];
    const particleCount = 20;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.textContent = codeSymbols[Math.floor(Math.random() * codeSymbols.length)];
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (10 + Math.random() * 10) + 's';
        particlesContainer.appendChild(particle);
    }
}