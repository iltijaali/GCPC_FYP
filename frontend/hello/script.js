import { getUser } from "./api.js";


// functionality to manage login and registration

const logout_button = document.getElementById("logout-btn");
const login_register_element = document.getElementById("login-nav-header");
const logout_element = document.getElementById("logout-nav-header");
getUser(localStorage.getItem("token")).then(username=> {
    if(localStorage.getItem("token") != null){
        login_register_element.style.display = "none";
        logout_element.style.display = "block";
        logout_button.innerHTML = `Logout ${username}`;
    }
    else{
        login_register_element.style.display = "block";
        logout_element.style.display = "none";
        logout_button.innerHTML = ``;
    }
 }
)



