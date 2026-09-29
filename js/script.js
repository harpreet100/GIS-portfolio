// Mobile navigation

const menuButton = document.getElementById("mobile-menu");
const navigation = document.querySelector(".nav-links");

if (menuButton && navigation) {
    menuButton.addEventListener("click", function () {
        const isOpen = navigation.classList.toggle("open");

        menuButton.setAttribute(
            "aria-expanded",
            String(isOpen)
        );
    });

    // Close the mobile menu after selecting a navigation link
    navigation.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function () {
            navigation.classList.remove("open");
            menuButton.setAttribute("aria-expanded", "false");
        });
    });
}


// Project filtering

const filterButtons = document.querySelectorAll(".filter-btn");
const projectItems = document.querySelectorAll(".project-item");

filterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        const selectedFilter = button.dataset.filter;

        filterButtons.forEach(function (filterButton) {
            filterButton.classList.remove("active");
        });

        button.classList.add("active");

        projectItems.forEach(function (project) {
            const categories = project.dataset.category
                .split(" ")
                .filter(Boolean);

            const shouldDisplay =
                selectedFilter === "all" ||
                categories.includes(selectedFilter);

            project.style.display = shouldDisplay
                ? "flex"
                : "none";
        });
    });
});


// Automatically update the copyright year

document.querySelectorAll("[data-year]").forEach(function (element) {
    element.textContent = new Date().getFullYear();
});