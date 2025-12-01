// ===================================
// CONFIGURAÇÃO DO FIREBASE
// ===================================

// Configuração com as credenciais fornecidas
const firebaseConfig = {
    apiKey: "AIzaSyAeiTYTfS4a0Wh4yOrXET-2dAbcT8ZLbj4",
    authDomain: "ayajoias-455fe.firebaseapp.com",
    projectId: "ayajoias-455fe",
    storageBucket: "ayajoias-455fe.firebasestorage.app",
    messagingSenderId: "793600668160",
    appId: "1:793600668160:web:945db49cccd4cc2ff99ee5",
    measurementId: "G-RYRMN5W7P6"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Serviços do Firebase
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Verificar autenticação em páginas protegidas
function checkAuth() {
    return new Promise((resolve, reject) => {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                resolve(user);
            } else {
                // Redirecionar para login se não estiver autenticado
                if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
                    window.location.href = 'index.html';
                }
                reject('Usuário não autenticado');
            }
        });
    });
}

// Função de logout (usada em todas as páginas)
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await firebase.auth().signOut();
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Erro ao fazer logout:', error);
                alert('Erro ao sair. Tente novamente.');
            }
        });
    }
});

// Função utilitária para formatar valores monetários
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Função utilitária para formatar datas
function formatDate(timestamp) {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// Função para mostrar mensagens de erro
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    }
}

// Função para mostrar mensagens de sucesso
function showSuccess(message) {
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = 'success-message';
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

console.log('Firebase inicializado com sucesso!');