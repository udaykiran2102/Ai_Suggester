// Global variables
let currentUser = null;
let searchHistory = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    loadCategories();
    checkAuthStatus();
    setupEventListeners();
});

// Initialize application
function initializeApp() {
    // Add smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Add scroll effect to navbar
    window.addEventListener('scroll', function() {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 100) {
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Search input enter key
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchTools();
        }
    });

    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Register form
    document.getElementById('registerForm').addEventListener('submit', handleRegister);

    // Close modals when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// Check authentication status
function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
        currentUser = JSON.parse(userData);
        updateUIForLoggedInUser();
    }
}

// Update UI for logged in user
function updateUIForLoggedInUser() {
    const authButtons = document.querySelector('.auth-buttons');
    const userMenu = document.querySelector('.user-menu');
    const userName = document.querySelector('.user-name');
    
    if (currentUser) {
        authButtons.style.display = 'none';
        userMenu.style.display = 'flex';
        userName.textContent = currentUser.username;
    } else {
        authButtons.style.display = 'flex';
        userMenu.style.display = 'none';
    }
}

// Load categories
async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        const categories = await response.json();
        
        const categoriesGrid = document.getElementById('categoriesGrid');
        categoriesGrid.innerHTML = '';
        
        categories.forEach(category => {
            const categoryCard = createCategoryCard(category);
            categoriesGrid.appendChild(categoryCard);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Create category card
function createCategoryCard(category) {
    const card = document.createElement('div');
    card.className = 'category-card fade-in';
    card.innerHTML = `
        <div class="category-icon">${category.icon}</div>
        <h3>${category.name}</h3>
        <p>${category.description}</p>
    `;
    
    card.addEventListener('click', () => {
        setSearchQuery(`${category.name.toLowerCase()} tools`);
        searchTools();
    });
    
    return card;
}

// Set search query
function setSearchQuery(query) {
    document.getElementById('searchInput').value = query;
}

// Search tools
async function searchTools() {
    const query = document.getElementById('searchInput').value.trim();
    
    if (!query) {
        showNotification('Please enter a search query', 'warning');
        return;
    }

    showLoading(true);
    
    try {
        const response = await fetch('/api/recommend', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            displayResults(data);
            saveSearchHistory(query, data.recommendations.length);
        } else {
            showNotification(data.error || 'Search failed', 'error');
        }
    } catch (error) {
        console.error('Search error:', error);
        showNotification('Search failed. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

// Display search results
function displayResults(data) {
    const resultsSection = document.getElementById('results');
    const resultsGrid = document.getElementById('resultsGrid');
    const resultsQuery = document.querySelector('.results-query');
    
    resultsQuery.textContent = `Results for: "${data.query}"`;
    resultsGrid.innerHTML = '';
    
    if (data.recommendations.length === 0) {
        resultsGrid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <h3>No tools found</h3>
                <p>Try a different search query or browse our categories.</p>
            </div>
        `;
    } else {
        data.recommendations.forEach(tool => {
            const toolCard = createToolCard(tool);
            resultsGrid.appendChild(toolCard);
        });
    }
    
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Create tool card
function createToolCard(tool) {
    const card = document.createElement('div');
    card.className = 'tool-card slide-up';
    
    const stars = '★'.repeat(Math.floor(tool.rating)) + '☆'.repeat(5 - Math.floor(tool.rating));
    
    card.innerHTML = `
        <div class="tool-icon">
            <i class="fas fa-${getToolIcon(tool.category)}"></i>
        </div>
        <h3>${tool.name}</h3>
        <p>${tool.description}</p>
        <div class="tool-rating">
            <span class="stars">${stars}</span>
            <span class="rating-text">${tool.rating}/5</span>
        </div>
        <div class="tool-features">
            ${tool.features.map(feature => `<span class="feature">• ${feature}</span>`).join('')}
        </div>
        <div class="tool-tags">
            <span class="tag">${tool.pricing}</span>
            <span class="tag">${tool.category}</span>
        </div>
        <div class="tool-actions">
            <a href="${tool.url}" target="_blank" class="btn btn-primary">
                <i class="fas fa-external-link-alt"></i>
                Visit Tool
            </a>
        </div>
    `;
    
    return card;
}

// Get tool icon based on category
function getToolIcon(category) {
    const icons = {
        'Video': 'video',
        'Image': 'image',
        'Coding': 'code',
        'Text': 'file-text',
        'Audio': 'music',
        'Education': 'graduation-cap',
        'Travel': 'plane',
        'Health': 'heartbeat',
        'Fashion': 'tshirt',
        'Gaming': 'gamepad',
        'HR': 'users',
        'Startup': 'rocket'
    };
    return icons[category] || 'tools';
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    showLoading(true);
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userData', JSON.stringify(data.user));
            currentUser = data.user;
            updateUIForLoggedInUser();
            closeModal('loginModal');
            showNotification('Login successful!', 'success');
        } else {
            showNotification(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Login failed. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

// Handle registration
async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters long', 'warning');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal('registerModal');
            showNotification('Registration successful! Please login.', 'success');
            showLoginModal();
        } else {
            showNotification(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Registration failed. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

// Save search history
async function saveSearchHistory(query, resultsCount) {
    if (!currentUser) return;
    
    try {
        const token = localStorage.getItem('authToken');
        await fetch('/api/search-history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                query, 
                results_count: resultsCount 
            })
        });
    } catch (error) {
        console.error('Error saving search history:', error);
    }
}

// Logout
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    currentUser = null;
    updateUIForLoggedInUser();
    showNotification('Logged out successfully', 'success');
}

// Modal functions
function showLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
}

function showRegisterModal() {
    document.getElementById('registerModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Utility functions
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = show ? 'flex' : 'none';
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 4000;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

function getNotificationColor(type) {
    const colors = {
        'success': '#28a745',
        'error': '#dc3545',
        'warning': '#ffc107',
        'info': '#17a2b8'
    };
    return colors[type] || '#17a2b8';
}

// Add CSS for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .notification button {
        background: none;
        border: none;
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
        margin-left: auto;
    }
    
    .tool-features {
        margin: 1rem 0;
    }
    
    .feature {
        display: block;
        color: #666;
        font-size: 0.9rem;
        margin-bottom: 0.25rem;
    }
    
    .tool-actions {
        margin-top: 1rem;
    }
    
    .no-results {
        grid-column: 1 / -1;
        text-align: center;
        padding: 3rem;
        color: #666;
    }
    
    .no-results i {
        font-size: 3rem;
        margin-bottom: 1rem;
        color: #ccc;
    }
`;
document.head.appendChild(notificationStyles);