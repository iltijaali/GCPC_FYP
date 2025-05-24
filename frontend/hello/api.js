
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
      username_or_email: email,
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
        localStorage.setItem("token", data.token);
        return data; // return for caller to use
      });
}

export function getUser(token) {
  return fetch(`http://localhost:8000/api/get-me/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    // Don't log `response` directly — wait for json
    return response.json();
  })
  .then(data => {
    return data.username;
  })
  .catch(error => {
    console.error('getUser failed:', error);
    return null;
  });
}



