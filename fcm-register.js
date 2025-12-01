// js/fcm-register.js

// Inicializa Firebase Messaging
const messaging = firebase.messaging();

// ===================================
// REGISTRAR TOKEN FCM
// ===================================
async function registerFCM() {
    try {
        // Pede permissão de notificação
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            console.log('✅ Permissão concedida');

            // Pega o token FCM com SUA VAPID KEY
            const token = await messaging.getToken({
                vapidKey: 'BPuGcCGe65vOpZznu6p3RW4ohv-zDA4GotdheBinbbzK5J6aq9DLHAfjLR-wdReFUkrMI81L94_THGUPrRNrbrk'
            });

            console.log('📱 Token FCM:', token);

            // Salva no Firestore
            await db.collection('fcm_tokens').doc(token).set({
                token: token,
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                last_seen: firebase.firestore.FieldValue.serverTimestamp(),
                device_info: {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform
                }
            }, { merge: true });

            console.log('✅ Token salvo no Firestore');

        } else {
            console.log('❌ Permissão negada');
        }

    } catch (error) {
        console.error('❌ Erro ao registrar FCM:', error);
    }
}

// ===================================
// RECEBER NOTIFICAÇÕES EM FOREGROUND
// ===================================
messaging.onMessage((payload) => {
    console.log('📩 Notificação recebida (app aberto):', payload);

    // Mostrar notificação customizada
    new Notification(payload.notification.title, {
        body: payload.notification.body,
        icon: '/loja/icons/icon-192x192.png',
        badge: '/loja/icons/icon-72x72.png',
        vibrate: [200, 100, 200],
        data: { url: payload.data?.url || '/loja/produtos.html' }
    });
});

// ===================================
// AUTO-REGISTRAR AO INSTALAR
// ===================================
window.addEventListener('appinstalled', () => {
    console.log('✅ App instalado! Registrando FCM...');
    setTimeout(() => registerFCM(), 2000);
});

// Se já está instalado, registra ao carregar
if (window.matchMedia('(display-mode: standalone)').matches) {
    const alreadyRegistered = localStorage.getItem('fcm_registered');
    if (!alreadyRegistered) {
        registerFCM().then(() => {
            localStorage.setItem('fcm_registered', 'true');
        });
    }
}

// Também registra na primeira visita (para testar no navegador)
window.addEventListener('load', () => {
    // Aguarda 5 segundos após carregar a página
    setTimeout(() => {
        const permission = Notification.permission;
        if (permission === 'default') {
            registerFCM();
        }
    }, 5000);
});