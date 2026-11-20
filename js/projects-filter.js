/**
 * projects-filter.js — Instant vanilla JS category filtering for projects.html
 * Uses the native `hidden` attribute on grid items for zero layout shift.
 */

(function () {
    "use strict";

    document.addEventListener("DOMContentLoaded", function () {
        const filterButtons = document.querySelectorAll(".filter-btn");
        const projectItems = document.querySelectorAll(".project-item");
        const statusEl = document.getElementById("filter-status");

        if (!filterButtons.length || !projectItems.length) {
            return;
        }

        function updateFilter(selectedFilter) {
            let visibleCount = 0;

            projectItems.forEach(function (item) {
                const categories = (item.dataset.category || "")
                    .split(/\s+/)
                    .filter(Boolean);

                const matches = selectedFilter === "all" || categories.includes(selectedFilter);
                item.hidden = !matches;
                if (matches) {
                    visibleCount += 1;
                }
            });

            filterButtons.forEach(function (btn) {
                const isActive = btn.dataset.filter === selectedFilter;
                btn.classList.toggle("active", isActive);
                btn.setAttribute("aria-pressed", String(isActive));
            });

            if (statusEl) {
                const total = projectItems.length;
                statusEl.textContent = `Showing ${visibleCount} of ${total} case studies`;
            }
        }

        filterButtons.forEach(function (button) {
            button.addEventListener("click", function () {
                updateFilter(button.dataset.filter || "all");
            });
        });

        updateFilter("all");
    });
})();
