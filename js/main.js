/**
 * main.js — Core UI behavior for Harpreet Singh's GIS Portfolio
 * Handles:
 *  1. Persistent Light/Dark theme toggle (localStorage)
 *  2. Accessible mobile navigation drawer
 *  3. Copy-to-clipboard for Prism.js code blocks
 *  4. Dynamic footer copyright year
 */

(function () {
    "use strict";

    const THEME_KEY = "gis-portfolio-theme";

    function getInitialTheme() {
        const stored = localStorage.getItem(THEME_KEY);
        if (stored === "dark" || stored === "light") {
            return stored;
        }
        return "light";
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        const toggleBtn = document.getElementById("theme-toggle");
        if (toggleBtn) {
            const isDark = theme === "dark";
            toggleBtn.setAttribute("aria-pressed", String(isDark));
            toggleBtn.textContent = isDark ? "☀ Light" : "☾ Dark";
        }
        window.dispatchEvent(new CustomEvent("themechange", { detail: { theme } }));
    }

    // Apply saved theme immediately
    applyTheme(getInitialTheme());

    document.addEventListener("DOMContentLoaded", function () {
        // 1. Theme Toggle Button
        const themeToggle = document.getElementById("theme-toggle");
        if (themeToggle) {
            applyTheme(document.documentElement.getAttribute("data-theme") || "light");
            themeToggle.addEventListener("click", function () {
                const current = document.documentElement.getAttribute("data-theme") || "light";
                const next = current === "dark" ? "light" : "dark";
                localStorage.setItem(THEME_KEY, next);
                applyTheme(next);
            });
        }

        // 2. Mobile Navigation
        const menuButton = document.getElementById("mobile-menu");
        const navigation = document.querySelector(".nav-links");

        if (menuButton && navigation) {
            const closeMenu = function () {
                navigation.classList.remove("open");
                menuButton.setAttribute("aria-expanded", "false");
            };

            menuButton.addEventListener("click", function () {
                const isOpen = navigation.classList.toggle("open");
                menuButton.setAttribute("aria-expanded", String(isOpen));
            });

            navigation.querySelectorAll("a").forEach(function (link) {
                link.addEventListener("click", closeMenu);
            });

            document.addEventListener("keydown", function (event) {
                if (event.key === "Escape" && navigation.classList.contains("open")) {
                    closeMenu();
                    menuButton.focus();
                }
            });
        }

        // 3. Copy Code Buttons (for Prism.js blocks)
        document.querySelectorAll(".copy-code-btn").forEach(function (button) {
            button.addEventListener("click", function () {
                const block = button.closest(".code-block");
                const codeEl = block ? block.querySelector("pre code") : null;
                if (!codeEl) return;

                const text = codeEl.textContent;
                navigator.clipboard.writeText(text).then(function () {
                    const original = button.textContent;
                    button.textContent = "Copied";
                    button.classList.add("copied");
                    setTimeout(function () {
                        button.textContent = original;
                        button.classList.remove("copied");
                    }, 1800);
                });
            });
        });

        // 4. Footer Copyright Year
        const year = String(new Date().getFullYear());
        document.querySelectorAll("[data-year]").forEach(function (el) {
            el.textContent = year;
        });
    });
})();
