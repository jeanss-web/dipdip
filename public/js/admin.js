// Initialize Socket.IO connection
const socket = io();

// Handle real-time updates
socket.on('admin-update', ({ event, data }) => {
    console.log('Received update:', event, data);
    
    switch (event) {
        case 'new_log':
            updateLogs(data);
            break;
        case 'user_deleted':
            handleUserDeletion(data.userId);
            break;
        case 'user_updated':
            handleUserUpdate(data);
            break;
        case 'evaluation_deleted':
            handleEvaluationDeletion(data.evaluationId);
            break;
        case 'admin_status_updated':
            handleAdminStatusUpdate(data);
            break;
        case 'products_updated':
            updateProductsList(data.products);
            break;
    }
});

// Update logs in the UI
function updateLogs(logEntry) {
    const logsContainer = document.getElementById('admin-logs');
    if (!logsContainer) return;

    const logElement = document.createElement('div');
    logElement.className = 'log-entry';
    logElement.innerHTML = `
        <div class="log-time">${new Date(logEntry.time).toLocaleString()}</div>
        <div class="log-action">${logEntry.action}</div>
        <div class="log-details">${JSON.stringify(logEntry.details)}</div>
    `;
    
    logsContainer.insertBefore(logElement, logsContainer.firstChild);
}

// Handle user deletion
function handleUserDeletion(userId) {
    const userElement = document.querySelector(`[data-user-id="${userId}"]`);
    if (userElement) {
        userElement.remove();
    }
    // Update user count if exists
    updateUserCount();
}

// Handle user update
function handleUserUpdate(data) {
    const userElement = document.querySelector(`[data-user-id="${data.userId}"]`);
    if (userElement) {
        // Update user information in the UI
        const usernameElement = userElement.querySelector('.user-username');
        const phoneElement = userElement.querySelector('.user-phone');
        if (usernameElement) usernameElement.textContent = data.username;
        if (phoneElement) phoneElement.textContent = data.phone;
    }
}

// Handle evaluation deletion
function handleEvaluationDeletion(evaluationId) {
    const evaluationElement = document.querySelector(`[data-evaluation-id="${evaluationId}"]`);
    if (evaluationElement) {
        evaluationElement.remove();
    }
    // Update evaluation count if exists
    updateEvaluationCount();
}

// Handle admin status update
function handleAdminStatusUpdate(data) {
    const userElement = document.querySelector(`[data-user-id="${data.userId}"]`);
    if (userElement) {
        const adminBadge = userElement.querySelector('.admin-badge');
        if (adminBadge) {
            adminBadge.style.display = data.isAdmin ? 'inline' : 'none';
        }
    }
}

// Update products list
function updateProductsList(products) {
    const productsContainer = document.getElementById('products-list');
    if (!productsContainer) return;

    productsContainer.innerHTML = products.map(product => `
        <div class="product-item">
            <span class="product-name">${product}</span>
            <button onclick="deleteProduct('${product}')">Удалить</button>
            <button onclick="editProduct('${product}')">Изменить</button>
        </div>
    `).join('');
}

// Update user count
function updateUserCount() {
    const countElement = document.getElementById('users-count');
    if (countElement) {
        const currentCount = parseInt(countElement.textContent);
        countElement.textContent = currentCount - 1;
    }
}

// Update evaluation count
function updateEvaluationCount() {
    const countElement = document.getElementById('evaluations-count');
    if (countElement) {
        const currentCount = parseInt(countElement.textContent);
        countElement.textContent = currentCount - 1;
    }
}

// Export evaluations to CSV
async function exportEvaluations() {
    try {
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) {
            alert('Необходима авторизация');
            return;
        }

        const response = await fetch('/api/admin/export/evaluations', {
            headers: {
                'adminToken': adminToken
            }
        });

        if (!response.ok) {
            throw new Error('Ошибка при скачивании файла');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'evaluations.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Error exporting evaluations:', error);
        alert('Ошибка при скачивании файла: ' + error.message);
    }
}

// Export users to CSV
async function exportUsers() {
    try {
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) {
            alert('Необходима авторизация');
            return;
        }

        const response = await fetch('/api/admin/export/users', {
            headers: {
                'adminToken': adminToken
            }
        });

        if (!response.ok) {
            throw new Error('Ошибка при скачивании файла');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'users.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Error exporting users:', error);
        alert('Ошибка при скачивании файла: ' + error.message);
    }
}

// Add event listeners when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize any necessary UI elements
    console.log('Admin panel initialized');
}); 