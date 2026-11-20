/**
 * main.js — Core UI & Motion System for Harpreet Singh's GIS Portfolio
 * Handles:
 *  1. Persistent Light/Dark theme toggle (localStorage)
 *  2. Frosted sticky header scroll state + rAF hero topo parallax & coordinate scrubbing
 *  3. Staggered IntersectionObserver scroll reveals ([data-reveal])
 *  4. Desktop pointer-tracking spotlight (--mouse-x, --mouse-y) & damped 3D card tilt
 *  5. Apple-style sticky scrollytelling observer ([data-scrolly-step])
 *  6. Accessible mobile navigation, Prism.js copy buttons, and footer year
 */

(function () {
    "use strict";

    const THEME_KEY = "gis-portfolio-theme";
    const prefersReducedMotion =
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isFinePointer =
        window.matchMedia &&
        window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    if (!prefersReducedMotion) {
        document.documentElement.classList.add("js-motion");
    }

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

        // 2. Frosted Sticky Header + rAF Topo Parallax & Coordinate Scrubbing
        const siteHeader = document.querySelector(".site-header");
        const topoSvg = document.querySelector(".topo-contours");
        const scrollLatEl = document.querySelector("[data-scroll-lat]");
        const baseLat = 51.0447;
        let scrollRaf = null;

        function updateOnScroll() {
            scrollRaf = null;
            const sy = window.scrollY || window.pageYOffset || 0;

            if (siteHeader) {
                siteHeader.classList.toggle("is-scrolled", sy > 24);
            }

            if (!prefersReducedMotion) {
                if (topoSvg) {
                    const offset = Math.min(sy * 0.15, 90);
                    topoSvg.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
                }
                if (scrollLatEl) {
                    const scrubbedLat = baseLat + Math.min(sy, 1600) * 0.00004;
                    scrollLatEl.textContent = `${scrubbedLat.toFixed(4)}° N`;
                }
            }
        }

        updateOnScroll();
        window.addEventListener(
            "scroll",
            function () {
                if (!scrollRaf) {
                    scrollRaf = requestAnimationFrame(updateOnScroll);
                }
            },
            { passive: true }
        );

        // 3. Staggered Scroll Reveals (IntersectionObserver)
        const revealEls = document.querySelectorAll("[data-reveal]");
        if (revealEls.length > 0) {
            const staggerGroups = document.querySelectorAll(
                ".grid-2, .grid-3, .grid-4, .matrix-grid, .pipeline-grid, .waypoint-list"
            );
            staggerGroups.forEach(function (group) {
                const children = group.querySelectorAll("[data-reveal]");
                children.forEach(function (child, idx) {
                    if (!child.style.getPropertyValue("--stagger-index")) {
                        child.style.setProperty("--stagger-index", String(idx));
                    }
                });
            });

            if (prefersReducedMotion || !("IntersectionObserver" in window)) {
                revealEls.forEach(function (el) {
                    el.classList.add("is-visible");
                });
            } else {
                const revealObserver = new IntersectionObserver(
                    function (entries, obs) {
                        entries.forEach(function (entry) {
                            if (entry.isIntersecting) {
                                entry.target.classList.add("is-visible");
                                obs.unobserve(entry.target);
                            }
                        });
                    },
                    {
                        threshold: 0.12,
                        rootMargin: "0px 0px -40px 0px"
                    }
                );

                revealEls.forEach(function (el) {
                    revealObserver.observe(el);
                });
            }
        }

        // 4. Cursor-Tracking Border Spotlight & Damped 3D Card Tilt (Desktop Pointer Only)
        if (!prefersReducedMotion && isFinePointer) {
            const interactiveCards = document.querySelectorAll(".project-card, .matrix-card");
            interactiveCards.forEach(function (card) {
                card.addEventListener("pointermove", function (e) {
                    const rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    const px = (x / rect.width) * 100;
                    const py = (y / rect.height) * 100;

                    card.style.setProperty("--mouse-x", `${x.toFixed(1)}px`);
                    card.style.setProperty("--mouse-y", `${y.toFixed(1)}px`);

                    const tiltY = ((px - 50) / 50) * 2.2;
                    const tiltX = ((50 - py) / 50) * 2.2;
                    card.style.setProperty("--tilt-x", `${tiltX.toFixed(2)}deg`);
                    card.style.setProperty("--tilt-y", `${tiltY.toFixed(2)}deg`);
                });

                card.addEventListener("pointerleave", function () {
                    card.style.setProperty("--tilt-x", "0deg");
                    card.style.setProperty("--tilt-y", "0deg");
                });
            });
        }

        // 5. Sticky Scrollytelling Observer (Case Studies)
        const scrollySteps = document.querySelectorAll("[data-scrolly-step]");
        const scrollyVisuals = document.querySelectorAll(".scrolly-visual[data-scrolly-index]");
        if (scrollySteps.length > 0 && scrollyVisuals.length > 0) {
            function activateScrolly(index) {
                scrollySteps.forEach(function (step) {
                    step.classList.toggle("is-active", step.dataset.scrollyStep === index);
                });
                scrollyVisuals.forEach(function (vis) {
                    vis.classList.toggle("is-active", vis.dataset.scrollyIndex === index);
                });
            }

            if ("IntersectionObserver" in window) {
                const scrollyObserver = new IntersectionObserver(
                    function (entries) {
                        entries.forEach(function (entry) {
                            if (entry.isIntersecting) {
                                activateScrolly(entry.target.dataset.scrollyStep);
                            }
                        });
                    },
                    {
                        threshold: 0.5,
                        rootMargin: "-15% 0px -30% 0px"
                    }
                );
                scrollySteps.forEach(function (step) {
                    scrollyObserver.observe(step);
                });
            }

            scrollySteps.forEach(function (step) {
                step.addEventListener("click", function () {
                    activateScrolly(step.dataset.scrollyStep);
                });
            });
        }

        // 6. Mobile Navigation
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

        // 7. Copy Code Buttons (for Prism.js blocks)
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

        // 8. Footer Copyright Year
        const year = String(new Date().getFullYear());
        document.querySelectorAll("[data-year]").forEach(function (el) {
            el.textContent = year;
        });
    });
})();
