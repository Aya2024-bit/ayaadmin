// ===================================
// AUTENTICAÇÃO COM FIREBASE
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const resetPasswordLink = document.getElementById('resetPasswordLink');

    // Verificar se já está autenticado
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // Usuário já está logado, redirecionar para dashboard
            window.location.href = 'dashboard.html';
        }
    });

    // Handler do formulário de login
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const loginBtn = document.getElementById('loginBtn');
            const btnText = loginBtn.querySelector('.btn-text');
            const btnLoader = loginBtn.querySelector('.btn-loader');
            const errorMessage = document.getElementById('errorMessage');

            // Validação básica
            if (!email || !password) {
                showError('errorMessage', 'Por favor, preencha todos os campos.');
                return;
            }

            // Validar formato de email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showError('errorMessage', 'Por favor, insira um e-mail válido.');
                return;
            }

            try {
                // Mostrar loader
                loginBtn.disabled = true;
                btnText.style.display = 'none';
                btnLoader.style.display = 'block';
                errorMessage.style.display = 'none';

                // Fazer login com Firebase Authentication
                await firebase.auth().signInWithEmailAndPassword(email, password);

                // Sucesso - redirecionar para dashboard
                window.location.href = 'dashboard.html';

            } catch (error) {
                console.error('Erro no login:', error);
                
                // Mensagens de erro amigáveis
                let errorMsg = 'Erro ao fazer login. Tente novamente.';
                
                switch (error.code) {
                    case 'auth/user-not-found':
                        errorMsg = 'Usuário não encontrado.';
                        break;
                    case 'auth/wrong-password':
                        errorMsg = 'Senha incorreta.';
                        break;
                    case 'auth/invalid-email':
                        errorMsg = 'E-mail inválido.';
                        break;
                    case 'auth/user-disabled':
                        errorMsg = 'Esta conta foi desativada.';
                        break;
                    case 'auth/too-many-requests':
                        errorMsg = 'Muitas tentativas. Tente novamente mais tarde.';
                        break;
                    case 'auth/network-request-failed':
                        errorMsg = 'Erro de conexão. Verifique sua internet.';
                        break;
                }

                showError('errorMessage', errorMsg);

            } finally {
                // Restaurar botão
                loginBtn.disabled = false;
                btnText.style.display = 'block';
                btnLoader.style.display = 'none';
            }
        });
    }

    // Recuperação de senha
    if (resetPasswordLink) {
        resetPasswordLink.addEventListener('click', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value.trim();

            if (!email) {
                showError('errorMessage', 'Digite seu e-mail antes de recuperar a senha.');
                return;
            }

            try {
                await firebase.auth().sendPasswordResetEmail(email);
                alert('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
            } catch (error) {
                console.error('Erro ao enviar e-mail de recuperação:', error);
                
                let errorMsg = 'Erro ao enviar e-mail de recuperação.';
                
                if (error.code === 'auth/user-not-found') {
                    errorMsg = 'E-mail não cadastrado.';
                } else if (error.code === 'auth/invalid-email') {
                    errorMsg = 'E-mail inválido.';
                }
                
                showError('errorMessage', errorMsg);
            }
        });
    }
});

// Função auxiliar para mostrar erros
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}