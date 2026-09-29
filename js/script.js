document.addEventListener("DOMContentLoaded", () => {
    // 1. Mobile Menu Toggle
    const menuToggle = document.getElementById("mobile-menu");
    const navLinks = document.querySelector(".nav-links");

    if (menuToggle) {
        menuToggle.addEventListener("click", () => {
            navLinks.classList.toggle("active");
        });
    }

    // 2. Project Filtering Logic
    const filterBtns = document.querySelectorAll(".filter-btn");
    const projectItems = document.querySelectorAll(".project-item");

    if (filterBtns.length > 0 && projectItems.length > 0) {
        filterBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                // Remove active class from all buttons
                filterBtns.forEach(b => b.classList.remove("active"));
                // Add active class to clicked button
                btn.classList.add("active");

                const filterValue = btn.getAttribute("data-filter");

                projectItems.forEach(item => {
                    const categories = item.getAttribute("data-category");
                    
                    if (filterValue === "all" || categories.includes(filterValue)) {
                        item.style.display = "block";
                        // Brief timeout for smooth reflow/animation if desired later
                        setTimeout(() => item.style.opacity = "1", 10);
                    } else {
                        item.style.opacity = "0";
                        setTimeout(() => item.style.display = "none", 300);
                    }
                });
            });
        });
    }
});