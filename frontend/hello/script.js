import { getUser } from "./api.js";


// functionality to manage login and registration
// Not every page has all three nav elements, so each one is optional.

const logout_button = document.getElementById("logout-btn");
const login_register_element = document.getElementById("login-nav-header");
const logout_element = document.getElementById("logout-nav-header");

function showLoggedOut() {
    if (login_register_element) login_register_element.style.display = "block";
    if (logout_element) logout_element.style.display = "none";
    if (logout_button) logout_button.innerHTML = ``;
}

function showLoggedIn(username) {
    if (login_register_element) login_register_element.style.display = "none";
    if (logout_element) logout_element.style.display = "block";
    if (logout_button) logout_button.innerHTML = `Logout ${username}`;
}

const token = localStorage.getItem("token");
if (!token) {
    showLoggedOut();  // nothing to check, so don't call the API
} else {
    getUser(token).then(username => {
        if (username) {
            showLoggedIn(username);
        } else {
            showLoggedOut();  // the stored token was rejected
        }
    });
}
