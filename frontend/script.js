// Function to show the selected section and hide others
function showSection(sectionId) {
    const sections = document.querySelectorAll("section");
    sections.forEach((section) => {
        section.style.display = "none";
    });

    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.style.display = "block";
    }
}

// Navbar Click Handling
document.querySelectorAll(".nav-links a").forEach((link) => {
    link.addEventListener("click", function (event) {
        event.preventDefault();
        const targetId = this.getAttribute("href").substring(1);
        showSection(targetId);
    });
});

// Load Home Section by Default
document.addEventListener("DOMContentLoaded", function () {
    showSection("home");
    loadHistory();
});

// ====== Login/Register System ======
function toggleAuthMode() {
    const signupFields = document.getElementById("signupFields");
    const authButton = document.getElementById("authButton");
    const toggleText = document.getElementById("toggleAuth");

    if (signupFields.style.display === "none") {
        signupFields.style.display = "block";
        authButton.textContent = "Register";
        toggleText.innerHTML = `Already registered? <span onclick="toggleAuthMode()">Login</span>`;
    } else {
        signupFields.style.display = "none";
        authButton.textContent = "Login";
        toggleText.innerHTML = `New here? <span onclick="toggleAuthMode()">Register</span>`;
    }
}

// Handle Login/Register
document.getElementById("authForm").addEventListener("submit", function (event) {
    event.preventDefault();

    const nameField = document.getElementById("name");
    const emailField = document.getElementById("email");
    const passwordField = document.getElementById("password");
    const authButton = document.getElementById("authButton");

    const userData = JSON.parse(localStorage.getItem("userData")) || {};

    if (authButton.textContent === "Register") {
        if (!nameField.value || !emailField.value || !passwordField.value) {
            alert("All fields are required for registration!");
            return;
        }

        if (userData[emailField.value]) {
            alert("Email already registered! Try logging in.");
            return;
        }

        userData[emailField.value] = {
            name: nameField.value,
            password: passwordField.value
        };

        localStorage.setItem("userData", JSON.stringify(userData));
        alert("Registration successful! Please login.");
        toggleAuthMode();

    } else {
        if (!emailField.value || !passwordField.value) {
            alert("Email and password are required for login!");
            return;
        }

        if (!userData[emailField.value] || userData[emailField.value].password !== passwordField.value) {
            alert("Invalid email or password!");
            return;
        }

        alert("Login successful! Welcome, " + userData[emailField.value].name);
        localStorage.setItem("loggedInUser", JSON.stringify(userData[emailField.value]));
        showSection("home");
    }
});

// ====== Products and Cart Functions ======
const products = {
    fruits: [
        { name: "Apple", price: 100 },
        { name: "Banana", price: 40 },
        { name: "Orange", price: 60 },
    ],
    vegetables: [
        { name: "Tomato", price: 30 },
        { name: "Potato", price: 20 },
        { name: "Onion", price: 50 },
    ],
};

let cart = [];

function showProducts(category) {
    const productList = document.getElementById("product-list");
    productList.innerHTML = "";

    if (products[category]) {
        products[category].forEach((product) => {
            const productItem = document.createElement("div");
            productItem.className = "product-item";

            productItem.innerHTML = `
                <span>${product.name} - Rs. ${product.price}/kg</span>
                <button class="add-to-cart-btn" onclick="addToCart('${product.name}', ${product.price})">Add to Cart</button>
            `;

            productList.appendChild(productItem);
        });
    } else {
        productList.innerHTML = "<p>No products available for this category.</p>";
    }
}

function addToCart(name, price) {
    cart.push({ name, price });
    updateCartDisplay();
}

function updateCartDisplay() {
    const cartItems = document.getElementById("cart-items");
    cartItems.innerHTML = "";

    if (cart.length === 0) {
        cartItems.innerHTML = "<p>No items in the cart yet.</p>";
    } else {
        cart.forEach((item, index) => {
            const cartItem = document.createElement("div");
            cartItem.className = "cart-item";

            cartItem.innerHTML = `
                <span>${item.name} - Rs. ${item.price}</span>
                <button onclick="removeFromCart(${index})">Remove</button>
            `;

            cartItems.appendChild(cartItem);
        });
    }
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartDisplay();
}

function calculateBill() {
    const totalBill = cart.reduce((total, item) => total + item.price, 0);
    const totalBillDisplay = document.getElementById("total-bill");
    totalBillDisplay.textContent = `Total Bill: Rs. ${totalBill}`;
}

// ====== Purchase History Section ======
const purchaseHistory = [
    { date: "2025-01-10", items: [{ name: "Apple", price: 100 }, { name: "Tomato", price: 30 }], totalBill: 130 },
    { date: "2025-01-12", items: [{ name: "Banana", price: 40 }, { name: "Potato", price: 20 }], totalBill: 60 },
];

function loadHistory() {
    const historySection = document.getElementById("history-items");
    historySection.innerHTML = "";

    if (purchaseHistory.length === 0) {
        historySection.innerHTML = "<p>No purchase history available.</p>";
    } else {
        purchaseHistory.forEach((record, index) => {
            const historyItem = document.createElement("div");
            historyItem.className = "history-item";

            historyItem.innerHTML = `
                <span>${record.date} - Total: Rs. ${record.totalBill}</span>
                <button class="view-details-btn" onclick="viewDetails(${index})">View Details</button>
            `;

            historySection.appendChild(historyItem);
        });
    }
}

function viewDetails(index) {
    const record = purchaseHistory[index];
    const detailsSection = document.getElementById("history-details");
    detailsSection.innerHTML = `
        <h3>Details for ${record.date}</h3>
        ${record.items.map((item) => `<p>${item.name} - Rs. ${item.price}</p>`).join("")}
        <p><strong>Total Bill: Rs. ${record.totalBill}</strong></p>
    `;
    detailsSection.style.display = "block";
}

// ====== Google Maps Integration ======
function initMap() {
    const map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 30.0452, lng: 72.3489 },
        zoom: 15,
    });

    const marker = new google.maps.Marker({
        position: { lat: 30.0452, lng: 72.3489 },
        map: map,
        draggable: true,
    });

    google.maps.event.addListener(marker, "dragend", function () {
        const position = marker.getPosition();
        console.log('Marker moved to:', position.lat(), position.lng());
    });
}
