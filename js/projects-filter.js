/**
 * projects-filter.js — Sliding Spring Pill + FLIP Grid Reflow for projects.html
 * Uses First -> Last -> Invert -> Play (FLIP) with transform + opacity over 380ms.
 */

(function () {
    "use strict";

    document.addEventListener("DOMContentLoaded", function () {
        const filterContainer = document.querySelector(".filter-container");
        const filterButtons = document.querySelectorAll(".filter-btn");
        const projectItems = Array.from(document.querySelectorAll(".project-item"));
        const statusEl = document.getElementById("filter-status");
        const prefersReducedMotion =
            window.matchMedia &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (!filterContainer || !filterButtons.length || !projectItems.length) {
            return;
        }

        // 1. Create Sliding Spring Pill inside .filter-container
        const pill = document.createElement("span");
        pill.className = "sliding-pill";
        pill.setAttribute("aria-hidden", "true");
        filterContainer.classList.add("has-pill");
        filterContainer.prepend(pill);

        function positionPill(targetBtn) {
            if (!targetBtn) return;
            pill.style.width = `${targetBtn.offsetWidth}px`;
            pill.style.height = `${targetBtn.offsetHeight}px`;
            pill.style.transform = `translate3d(${targetBtn.offsetLeft}px, ${targetBtn.offsetTop}px, 0)`;
        }

        function updateFilter(selectedFilter, animateFlip) {
            // FIRST: capture bounding rects of currently visible items
            const firstRects = new Map();
            if (animateFlip && !prefersReducedMotion) {
                projectItems.forEach(function (item) {
                    if (!item.hidden) {
                        firstRects.set(item, item.getBoundingClientRect());
                    }
                });
            }

            let visibleCount = 0;
            const newlyShown = [];

            projectItems.forEach(function (item) {
                const wasHidden = item.hidden;
                const categories = (item.dataset.category || "")
                    .split(/\s+/)
                    .filter(Boolean);
                const matches = selectedFilter === "all" || categories.includes(selectedFilter);
                item.hidden = !matches;
                if (matches) {
                    visibleCount += 1;
                    if (wasHidden) {
                        newlyShown.push(item);
                    }
                }
            });

            // Update active button & glide pill
            let activeBtn = null;
            filterButtons.forEach(function (btn) {
                const isActive = btn.dataset.filter === selectedFilter;
                btn.classList.toggle("active", isActive);
                btn.setAttribute("aria-pressed", String(isActive));
                if (isActive) activeBtn = btn;
            });
            positionPill(activeBtn);

            if (statusEl) {
                statusEl.textContent = `Showing ${visibleCount} of ${projectItems.length} case studies`;
            }

            // LAST -> INVERT -> PLAY
            if (animateFlip && !prefersReducedMotion) {
                projectItems.forEach(function (item) {
                    if (item.hidden) return;
                    item.classList.add("is-visible");

                    const first = firstRects.get(item);
                    if (first) {
                        const last = item.getBoundingClientRect();
                        const dx = first.left - last.left;
                        const dy = first.top - last.top;
                        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
                            item.style.transition = "none";
                            item.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
                            requestAnimationFrame(function () {
                                item.style.transition = "transform 380ms cubic-bezier(0.16, 1, 0.3, 1)";
                                item.style.transform = "translate3d(0, 0, 0)";
                            });
                        }
                    } else if (newlyShown.includes(item)) {
                        item.style.transition = "none";
                        item.style.opacity = "0";
                        item.style.transform = "scale(0.96)";
                        requestAnimationFrame(function () {
                            item.style.transition =
                                "transform 380ms cubic-bezier(0.16, 1, 0.3, 1), opacity 320ms ease";
                            item.style.opacity = "1";
                            item.style.transform = "scale(1)";
                        });
                    }
                });
            }
        }

        filterButtons.forEach(function (button) {
            button.addEventListener("click", function () {
                updateFilter(button.dataset.filter || "all", true);
            });
        });

        window.addEventListener("resize", function () {
            const active = filterContainer.querySelector(".filter-btn.active");
            positionPill(active);
        });

        updateFilter("all", false);
    });
})();
