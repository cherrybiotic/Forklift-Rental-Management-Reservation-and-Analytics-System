const API_URL = 'http://localhost:3000/api';

function showSection(id) {
  document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

async function login() {
  const username = document.getElementById('loginUser').value;
  const password = document.getElementById('loginPass').value;
  const errorEl = document.getElementById('loginError');

  if (!username || !password) {
    errorEl.textContent = 'Please enter username and password';
    return;
  }

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      document.getElementById('nav').classList.add('hidden');
      document.getElementById('loggedInNav').classList.remove('hidden');
      document.getElementById('welcomeMsg').textContent = `Welcome, ${data.user.username}!`;
      
      if (data.user.role === 'owner') {
        showSection('ownerDashboard');
      } else {
        showSection('customerDashboard');
      }
      
      errorEl.textContent = '';
    } else {
      errorEl.textContent = data.message || 'Login failed';
    }
  } catch (error) {
    errorEl.textContent = 'Cannot connect to server';
    console.error('Login error:', error);
  }
}

async function register() {
  const email = document.getElementById('regEmail').value;
  const username = document.getElementById('regUser').value;
  const password = document.getElementById('regPass').value;
  const errorEl = document.getElementById('registerError');

  if (!email || !username || !password) {
    errorEl.textContent = 'Please fill in all fields';
    return;
  }

  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password })
    });

    const data = await response.json();

    if (response.ok) {
      alert('Registration successful! Please login.');
      showSection('login');
    } else {
      errorEl.textContent = data.message;
    }
  } catch (error) {
    errorEl.textContent = 'Cannot connect to server';
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  document.getElementById('nav').classList.remove('hidden');
  document.getElementById('loggedInNav').classList.add('hidden');
  showSection('home');
}