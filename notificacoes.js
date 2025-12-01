// ===================================
// SISTEMA DE NOTIFICAÇÕES
// ===================================

document.addEventListener('DOMContentLoaded', async () => {
    // Verificar autenticação
    try {
        await checkAuth();
        
        // Carregar histórico de notificações
        await loadNotificationsHistory();
        
        // Event Listeners
        setupEventListeners();
        
    } catch (error) {
        console.error('Erro ao inicializar página de notificações:', error);
    }
});

// ===================================
// CONFIGURAR EVENT LISTENERS
// ===================================
function setupEventListeners() {
    // Formulário de envio
    document.getElementById('notificationForm').addEventListener('submit', sendNotification);

    // Checkbox de agendamento
    document.getElementById('scheduleNotification').addEventListener('change', toggleScheduleFields);
}

// ===================================
// ALTERNAR CAMPOS DE AGENDAMENTO
// ===================================
function toggleScheduleFields() {
    const scheduleCheckbox = document.getElementById('scheduleNotification');
    const scheduleGroup = document.getElementById('scheduleGroup');
    
    if (scheduleCheckbox.checked) {
        scheduleGroup.style.display = 'block';
        
        // Definir data/hora mínima (agora)
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('scheduleDateTime').min = now.toISOString().slice(0, 16);
    } else {
        scheduleGroup.style.display = 'none';
    }
}

// ===================================
// ENVIAR NOTIFICAÇÃO
// ===================================
async function sendNotification(e) {
    e.preventDefault();

    const title = document.getElementById('notificationTitle').value.trim();
    const message = document.getElementById('notificationMessage').value.trim();
    const target = document.getElementById('notificationTarget').value;
    const isScheduled = document.getElementById('scheduleNotification').checked;
    const scheduleDateTime = document.getElementById('scheduleDateTime').value;

    // Validações
    if (!title || !message) {
        alert('Preencha todos os campos obrigatórios!');
        return;
    }

    if (isScheduled && !scheduleDateTime) {
        alert('Defina a data e hora para o agendamento!');
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '📤 Enviando...';

    try {
        // Buscar clientes de acordo com o alvo
        const customers = await getTargetCustomers(target);

        if (customers.length === 0) {
            alert('Nenhum cliente encontrado para enviar a notificação!');
            submitBtn.disabled = false;
            submitBtn.textContent = '🚀 Enviar Notificação';
            return;
        }

        const notificationData = {
            title,
            message,
            target,
            recipientsCount: customers.length,
            status: isScheduled ? 'scheduled' : 'sent',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            sentAt: isScheduled ? null : firebase.firestore.FieldValue.serverTimestamp(),
            scheduledFor: isScheduled ? new Date(scheduleDateTime) : null
        };

        // Salvar notificação no histórico
        const notificationRef = await db.collection('notifications').add(notificationData);

        // Se não for agendada, enviar imediatamente
        if (!isScheduled) {
            await sendToCustomers(notificationRef.id, customers, title, message);
        }

        showSuccess(
            isScheduled 
                ? 'Notificação agendada com sucesso!' 
                : `Notificação enviada para ${customers.length} cliente(s)!`
        );

        // Limpar formulário
        document.getElementById('notificationForm').reset();
        
        // Recarregar histórico
        await loadNotificationsHistory();

    } catch (error) {
        console.error('Erro ao enviar notificação:', error);
        alert('Erro ao enviar notificação. Tente novamente.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '🚀 Enviar Notificação';
    }
}

// ===================================
// BUSCAR CLIENTES ALVO
// ===================================
async function getTargetCustomers(target) {
    try {
        let query = db.collection('customers');

        switch (target) {
            case 'recent':
                // Clientes dos últimos 30 dias
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                query = query.where('createdAt', '>=', thirtyDaysAgo);
                break;

            case 'active':
                // Clientes com flag de ativo
                query = query.where('active', '==', true);
                break;

            default:
                // Todos os clientes
                break;
        }

        const snapshot = await query.get();
        const customers = [];

        snapshot.forEach(doc => {
            const customer = doc.data();
            if (customer.email || customer.phone) {
                customers.push({
                    id: doc.id,
                    email: customer.email,
                    phone: customer.phone,
                    name: customer.name
                });
            }
        });

        return customers;

    } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        return [];
    }
}

// ===================================
// ENVIAR PARA CLIENTES
// ===================================
async function sendToCustomers(notificationId, customers, title, message) {
    try {
        // Salvar registro de cada envio
        const sendPromises = customers.map(customer => {
            return db.collection('notifications').doc(notificationId).collection('recipients').add({
                customerId: customer.id,
                customerEmail: customer.email,
                customerPhone: customer.phone,
                customerName: customer.name,
                sentAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'sent'
            });
        });

        await Promise.all(sendPromises);

        // Atualizar status da notificação
        await db.collection('notifications').doc(notificationId).update({
            deliveredCount: customers.length,
            lastSentAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log(`Notificação enviada para ${customers.length} cliente(s)`);

        // NOTA: Aqui você pode integrar com serviços reais de envio
        // como SendGrid (e-mail), Twilio (SMS), Firebase Cloud Messaging (push), etc.

    } catch (error) {
        console.error('Erro ao enviar para clientes:', error);
        throw error;
    }
}

// ===================================
// CARREGAR HISTÓRICO DE NOTIFICAÇÕES
// ===================================
async function loadNotificationsHistory() {
    try {
        const historyContainer = document.getElementById('notificationsHistory');
        historyContainer.innerHTML = '<p class="loading-state">Carregando histórico...</p>';

        const snapshot = await db.collection('notifications')
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();

        if (snapshot.empty) {
            historyContainer.innerHTML = '<p class="empty-state">Nenhuma notificação enviada ainda</p>';
            return;
        }

        historyContainer.innerHTML = '';

        snapshot.forEach(doc => {
            const notification = doc.data();
            const item = createNotificationItem(doc.id, notification);
            historyContainer.appendChild(item);
        });

    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        document.getElementById('notificationsHistory').innerHTML = 
            '<p class="empty-state">Erro ao carregar histórico</p>';
    }
}

// ===================================
// CRIAR ITEM DE NOTIFICAÇÃO
// ===================================
function createNotificationItem(id, notification) {
    const item = document.createElement('div');
    item.className = 'notification-item';

    const statusText = getStatusText(notification.status);
    const statusColor = getStatusColor(notification.status);

    const dateText = notification.status === 'scheduled' 
        ? `Agendada para: ${formatDate(notification.scheduledFor)}`
        : `Enviada em: ${formatDate(notification.sentAt)}`;

    item.innerHTML = `
        <h4>${notification.title}</h4>
        <p>${notification.message}</p>
        <div class="notification-meta">
            <span style="color: ${statusColor}; font-weight: 600;">
                ${statusText}
            </span>
            <span>${notification.recipientsCount || 0} destinatário(s)</span>
        </div>
        <div class="notification-meta">
            <span style="font-size: 11px;">${dateText}</span>
            ${notification.status === 'scheduled' 
                ? `<button onclick="cancelScheduledNotification('${id}')" style="background: #e74c3c; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">
                    Cancelar Agendamento
                   </button>`
                : ''}
        </div>
    `;

    return item;
}

// ===================================
// CANCELAR NOTIFICAÇÃO AGENDADA
// ===================================
window.cancelScheduledNotification = async function(notificationId) {
    if (!confirm('Deseja cancelar esta notificação agendada?')) {
        return;
    }

    try {
        await db.collection('notifications').doc(notificationId).update({
            status: 'cancelled',
            cancelledAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showSuccess('Notificação cancelada com sucesso!');
        await loadNotificationsHistory();

    } catch (error) {
        console.error('Erro ao cancelar notificação:', error);
        alert('Erro ao cancelar notificação. Tente novamente.');
    }
};

// ===================================
// FUNÇÕES AUXILIARES
// ===================================
function getStatusText(status) {
    const statusMap = {
        'sent': '✅ Enviada',
        'scheduled': '🕒 Agendada',
        'cancelled': '❌ Cancelada',
        'failed': '⚠️ Falhou'
    };
    
    return statusMap[status] || status;
}

function getStatusColor(status) {
    const colorMap = {
        'sent': '#2ecc71',
        'scheduled': '#3498db',
        'cancelled': '#95a5a6',
        'failed': '#e74c3c'
    };
    
    return colorMap[status] || '#666';
}

// Verificar notificações agendadas periodicamente
setInterval(async () => {
    try {
        const now = new Date();
        
        const snapshot = await db.collection('notifications')
            .where('status', '==', 'scheduled')
            .where('scheduledFor', '<=', now)
            .get();

        snapshot.forEach(async (doc) => {
            const notification = doc.data();
            
            // Buscar clientes e enviar
            const customers = await getTargetCustomers(notification.target);
            await sendToCustomers(doc.id, customers, notification.title, notification.message);
            
            // Atualizar status
            await db.collection('notifications').doc(doc.id).update({
                status: 'sent',
                sentAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });

    } catch (error) {
        console.error('Erro ao processar notificações agendadas:', error);
    }
}, 60000); // Verificar a cada minuto