
function getUser(id) {
    fetch(`http://localhost:8000/api/user/${id}`)
    .then(response => {
    if (!response.ok) throw new Error('Network response was not ok');
    return response.json(); // or response.text() if it's plain text
    })
    .then(data => {
    console.log('GET response data:', data);
    })
    .catch(error => {
    console.error('GET request failed:', error);
    });
    console.log('GET request sent');
}

export function register(user, email, password , fullname) {
    const requestBody = {
      username: user,
      email: email,
      password: password,
      full_name: fullname
    };
  
    return fetch('http://localhost:8000/api/register/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })
      .then(response => {
        if (!response.ok) throw new Error('Failed to register');
        return response.json();
      })
      .then(data => {
        console.log('Registration successful:', data);
        return data; // return for caller to use
      });
  }
  
export function login(email, password) {
    const requestBody = {
      email: email,
      password: password
    };
  
    return fetch('http://localhost:8000/api/login/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })
      .then(response => {
        if (!response.ok) throw new Error('Failed to login');
        return response.json();
      })
      .then(data => {
        console.log('Login successful:', data);
        return data; // return for caller to use
      });
}