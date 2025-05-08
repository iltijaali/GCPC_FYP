// Function to show the selected section and hide others (Not directly used in this multi-page setup)
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

// Navbar Click Handling (Adjusted for multi-page navigation)
document.addEventListener("DOMContentLoaded", function () {
    // No need to manually show a section here, as each HTML loads its own content.
    // Load history if on the history page
    if (document.getElementById("history-section")) {
        loadHistory();
    }
    // Update cart display if on the cart page
    if (document.getElementById("cart-section")) {
        updateCartDisplay();
    }
    // Show fruits by default on the fruits page
    if (document.getElementById("products-section") && window.location.pathname.includes("fruits.html")) {
        showProducts('fruits');
    }
    // Show vegetables by default on the vegetables page
    if (document.getElementById("products-section") && window.location.pathname.includes("vegetables.html")) {
        showProducts('vegetables');
    }
});

// ====== Login/Register System ======
// The toggleAuthMode and authForm submit logic are now in the respective login.html and register.html files.

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

let cart = JSON.parse(localStorage.getItem('cart')) || [];

function showProducts(category) {
    const productList = document.getElementById("product-list");
    productList.innerHTML = "";

    if (products[category]) {
        products[category].forEach((product) => {
            const productItem = document.createElement("div");
            productItem.className = "product-item";

            productItem.innerHTML = `
                <span>${product.name} - Rs. <span class="math-inline">\{product\.price\}/kg</span\>
<button class\="add\-to\-cart\-btn" onclick\="addToCart\('</span>{product.name}', ${product.price})">Add to Cart</button>
            `;

            productList.appendChild(productItem);
        });
    } else {
        productList.innerHTML = "<p>No products available for this category.</p>";
    }
}

function addToCart(name, price) {
    cart.push({ name, price });
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartDisplay();
}

function updateCartDisplay() {
    const cartItems = document.getElementById("cart-items");
    if (!cartItems) return; // Check if the element exists on the current page
    cartItems.innerHTML = "";

    if (cart.length === 0) {
        cartItems.innerHTML = "<p>No items in the cart yet.</p>";
    } else {
        cart.forEach((item, index) => {
            const cartItem = document.createElement("div");
            cartItem.className = "cart-item";

            cartItem.innerHTML = `
                <span>${item.name} - Rs. <span class="math-inline">\{item\.price\}</span\>
<button onclick\="removeFromCart\(</span>{index})">Remove</button>
            `;

            cartItems.appendChild(cartItem);
        });
    }
}

function removeFromCart(index) {
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartDisplay();
}

function calculateBill() {
    const totalBill = cart.reduce((total, item) => total + item.price, 0);
    const totalBillDisplay = document.getElementById("total-bill");
    if (totalBillDisplay) {
        totalBillDisplay.textContent = `Total Bill: Rs. ${totalBill}`;
    }
}

// ====== Purchase History Section ======
const purchaseHistory = JSON.