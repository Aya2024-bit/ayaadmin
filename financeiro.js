// ===================================
// GESTÃO FINANCEIRA COM INTEGRAÇÃO BANCÁRIA
// ===================================

let currentTransactionId = null;
let currentBankAccountId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Verificar autenticação
    try {
        await checkAuth();
        
        // Carregar dados iniciais
        await loadFinancialSummary();
        await loadTransactions();
        await loadBankAccounts();
        
        // Event Listeners
        setupEventListeners();
        
    } catch (error) {
        console.error('Erro ao inicializar página financeira:', error);
    }
});

// ===================================
// CONFIGURAR EVENT LISTENERS
// ===================================
function setupEventListeners() {
    // Modal de Transação
    document.getElementById('addTransactionBtn').addEventListener('click', () => openTransactionModal());
    document.getElementById('closeTransactionModal').addEventListener('click', closeTransactionModal);
    document.getElementById('cancelTransactionBtn').addEventListener('click', closeTransactionModal);
    document.getElementById('transactionForm').addEventListener('submit', saveTransaction);

    // Modal de Conta Bancária
    document.getElementById('manageBankBtn').addEventListener('click', () => switchToTab('banks'));
    document.getElementById('addBankAccountBtn').addEventListener('click', () => openBankAccountModal());
    document.getElementById('closeBankModal').addEventListener('click', closeBankAccountModal);
    document.getElementById('cancelBankBtn').addEventListener('click', closeBankAccountModal);
    document.getElementById('bankAccountForm').addEventListener('submit', saveBankAccount);

    // Filtros
    document.getElementById('periodFilter').addEventListener('change', loadTransactions);
    document.getElementById('typeFilter').addEventListener('change', loadTransactions);
    document.getElementById('paymentMethodFilter').addEventListener('change', loadTransactions);

    // Exportar relatório
    document.getElementById('exportReportBtn').addEventListener('click', exportReport);

    // Definir data padrão para hoje
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('transactionDate').value = today;
}

// ===================================
// SWITCH ENTRE TABS
// ===================================
function switchToTab(tabName) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(tabName + '-tab').classList.add('active');
}

// ===================================
// CARREGAR RESUMO FINANCEIRO
// ===================================
async function loadFinancialSummary() {
    try {
        const periodFilter = document.getElementById('periodFilter').value;
        const dateRange = getDateRange(periodFilter);

        let query = db.collection('transactions');
        
        if (dateRange.start) {
            query = query.where('date', '>=', dateRange.start);
        }
        if (dateRange.end) {
            query = query.where('date', '<=', dateRange.end);
        }

        const snapshot = await query.get();

        let totalRevenue = 0;
        let totalExpenses = 0;

        snapshot.forEach(doc => {
            const transaction = doc.data();
            const amount = transaction.amount || 0;

            if (transaction.type === 'revenue') {
                totalRevenue += amount;
            } else if (transaction.type === 'expense') {
                totalExpenses += amount;
            }
        });

        const netBalance = totalRevenue - totalExpenses;

        document.getElementById('totalRevenue').textContent = formatCurrency(totalRevenue);
        document.getElementById('totalExpenses').textContent = formatCurrency(totalExpenses);
        document.getElementById('netBalance').textContent = formatCurrency(netBalance);

        // Aplicar cor ao saldo
        const balanceElement = document.getElementById('netBalance');
        balanceElement.style.color = netBalance >= 0 ? '#2ecc71' : '#e74c3c';

    } catch (error) {
        console.error('Erro ao carregar resumo financeiro:', error);
    }
}

// ===================================
// CARREGAR TRANSAÇÕES
// ===================================
async function loadTransactions() {
    try {
        const periodFilter = document.getElementById('periodFilter').value;
        const typeFilter = document.getElementById('typeFilter').value;
        const paymentMethodFilter = document.getElementById('paymentMethodFilter').value;
        const transactionsTable = document.getElementById('transactionsTable');

        transactionsTable.innerHTML = '<tr><td colspan="7" class="loading-state">Carregando...</td></tr>';

        const dateRange = getDateRange(periodFilter);

        let query = db.collection('transactions');

        if (dateRange.start) {
            query = query.where('date', '>=', dateRange.start);
        }
        if (dateRange.end) {
            query = query.where('date', '<=', dateRange.end);
        }
        if (typeFilter !== 'all') {
            query = query.where('type', '==', typeFilter);
        }
        if (paymentMethodFilter !== 'all') {
            query = query.where('paymentMethod', '==', paymentMethodFilter);
        }

        const snapshot = await query.orderBy('date', 'desc').get();

        if (snapshot.empty) {
            transactionsTable.innerHTML = '<tr><td colspan="7" class="empty-state">Nenhuma transação encontrada</td></tr>';
            return;
        }

        transactionsTable.innerHTML = '';

        snapshot.forEach(doc => {
            const transaction = doc.data();
            const row = document.createElement('tr');

            const typeLabel = transaction.type === 'revenue' ? 'Receita' : 'Despesa';
            const typeClass = transaction.type === 'revenue' ? 'success' : 'danger';
            
            const methodLabel = getPaymentMethodLabel(transaction.paymentMethod);
            const methodClass = transaction.paymentMethod || 'outro';

            row.innerHTML = `
                <td>${formatTransactionDate(transaction.date)}</td>
                <td>${transaction.description}</td>
                <td><span class="badge ${typeClass}">${typeLabel}</span></td>
                <td><span class="badge ${methodClass}">${methodLabel}</span></td>
                <td>${transaction.category || '-'}</td>
                <td style="font-weight: 600; color: ${transaction.type === 'revenue' ? '#2ecc71' : '#e74c3c'}">
                    ${transaction.type === 'revenue' ? '+' : '-'} ${formatCurrency(transaction.amount || 0)}
                </td>
                <td>
                    <button onclick="editTransaction('${doc.id}')" class="btn-secondary" style="padding: 6px 12px; font-size: 12px; margin-right: 4px;">✏️</button>
                    <button onclick="deleteTransaction('${doc.id}')" class="btn-danger" style="padding: 6px 12px; font-size: 12px;">🗑️</button>
                </td>
            `;

            transactionsTable.appendChild(row);
        });

        // Atualizar resumo
        await loadFinancialSummary();

    } catch (error) {
        console.error('Erro ao carregar transações:', error);
        document.getElementById('transactionsTable').innerHTML = 
            '<tr><td colspan="7" class="empty-state">Erro ao carregar transações</td></tr>';
    }
}

// ===================================
// MODAL DE TRANSAÇÃO
// ===================================
function openTransactionModal(transactionId = null) {
    currentTransactionId = transactionId;
    
    const modal = document.getElementById('transactionModal');
    const form = document.getElementById('transactionForm');
    
    form.reset();
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('transactionDate').value = today;

    if (transactionId) {
        document.querySelector('#transactionModal .modal-header h2').textContent = 'Editar Transação';
        loadTransactionData(transactionId);
    } else {
        document.querySelector('#transactionModal .modal-header h2').textContent = 'Nova Transação';
    }

    modal.classList.add('active');
}

function closeTransactionModal() {
    document.getElementById('transactionModal').classList.remove('active');
    currentTransactionId = null;
}

async function loadTransactionData(transactionId) {
    try {
        const doc = await db.collection('transactions').doc(transactionId).get();
        
        if (!doc.exists) {
            alert('Transação não encontrada!');
            closeTransactionModal();
            return;
        }

        const transaction = doc.data();
        
        document.getElementById('transactionType').value = transaction.type || 'revenue';
        document.getElementById('transactionDescription').value = transaction.description || '';
        document.getElementById('transactionPaymentMethod').value = transaction.paymentMethod || 'pix';
        document.getElementById('transactionCategory').value = transaction.category || '';
        document.getElementById('transactionAmount').value = transaction.amount || '';
        document.getElementById('transactionNotes').value = transaction.notes || '';
        
        if (transaction.date) {
            const date = transaction.date.toDate();
            document.getElementById('transactionDate').value = date.toISOString().split('T')[0];
        }

        document.getElementById('transactionId').value = transactionId;

    } catch (error) {
        console.error('Erro ao carregar transação:', error);
        alert('Erro ao carregar transação!');
    }
}

// ===================================
// SALVAR TRANSAÇÃO
// ===================================
async function saveTransaction(e) {
    e.preventDefault();

    const type = document.getElementById('transactionType').value;
    const description = document.getElementById('transactionDescription').value.trim();
    const paymentMethod = document.getElementById('transactionPaymentMethod').value;
    const category = document.getElementById('transactionCategory').value.trim();
    const amount = parseFloat(document.getElementById('transactionAmount').value);
    const notes = document.getElementById('transactionNotes').value.trim();
    const dateStr = document.getElementById('transactionDate').value;
    const transactionId = document.getElementById('transactionId').value;

    if (!description || !amount || !dateStr) {
        alert('Preencha todos os campos obrigatórios!');
        return;
    }

    if (amount <= 0) {
        alert('O valor deve ser maior que zero!');
        return;
    }

    try {
        const transactionData = {
            type,
            description,
            paymentMethod,
            category,
            amount,
            notes,
            date: new Date(dateStr + 'T00:00:00'),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (transactionId) {
            await db.collection('transactions').doc(transactionId).update(transactionData);
            showSuccess('Transação atualizada com sucesso!');
        } else {
            transactionData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('transactions').add(transactionData);
            showSuccess('Transação criada com sucesso!');
        }

        closeTransactionModal();
        await loadTransactions();

    } catch (error) {
        console.error('Erro ao salvar transação:', error);
        alert('Erro ao salvar transação. Tente novamente.');
    }
}

// ===================================
// EDITAR E EXCLUIR TRANSAÇÃO
// ===================================
window.editTransaction = function(transactionId) {
    openTransactionModal(transactionId);
};

window.deleteTransaction = async function(transactionId) {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) {
        return;
    }

    try {
        await db.collection('transactions').doc(transactionId).delete();
        showSuccess('Transação excluída com sucesso!');
        await loadTransactions();
    } catch (error) {
        console.error('Erro ao excluir transação:', error);
        alert('Erro ao excluir transação. Tente novamente.');
    }
};

// ===================================
// CARREGAR CONTAS BANCÁRIAS
// ===================================
async function loadBankAccounts() {
    try {
        const grid = document.getElementById('bankAccountsGrid');
        grid.innerHTML = '<p class="loading-state">Carregando contas...</p>';

        const snapshot = await db.collection('bank_accounts')
            .orderBy('createdAt', 'desc')
            .get();

        if (snapshot.empty) {
            grid.innerHTML = '<p class="empty-state">Nenhuma conta bancária cadastrada</p>';
            return;
        }

        grid.innerHTML = '';

        snapshot.forEach(doc => {
            const account = doc.data();
            const card = createBankCard(doc.id, account);
            grid.appendChild(card);
        });

    } catch (error) {
        console.error('Erro ao carregar contas bancárias:', error);
        document.getElementById('bankAccountsGrid').innerHTML = 
            '<p class="empty-state">Erro ao carregar contas</p>';
    }
}

function createBankCard(id, account) {
    const card = document.createElement('div');
    card.className = `bank-card ${account.active ? 'active' : ''}`;

    const statusText = account.active ? 'Ativa' : 'Inativa';
    const envText = account.environment === 'production' ? '🟢 Produção' : '🟡 Sandbox';

    card.innerHTML = `
        <div class="bank-status">${statusText}</div>
        <h4>🏦 ${account.bankName}</h4>
        <div class="bank-info">Tipo: ${account.accountType === 'corrente' ? 'Conta Corrente' : account.accountType === 'poupanca' ? 'Poupança' : 'Pagamento'}</div>
        ${account.agency ? `<div class="bank-info">Agência: ${account.agency}</div>` : ''}
        ${account.accountNumber ? `<div class="bank-info">Conta: ${account.accountNumber}</div>` : ''}
        ${account.pixKey ? `<div class="bank-info">PIX: ${maskPixKey(account.pixKey)}</div>` : ''}
        <div class="bank-info" style="margin-top: 10px;">${envText}</div>
        ${account.autoConciliation ? '<div class="bank-info">✅ Conciliação Automática</div>' : ''}
        <div class="bank-actions">
            <button class="btn-edit" onclick="editBankAccount('${id}')">✏️ Editar</button>
            <button class="btn-delete" onclick="deleteBankAccount('${id}')">🗑️ Excluir</button>
        </div>
    `;

    return card;
}

// ===================================
// MODAL DE CONTA BANCÁRIA
// ===================================
function openBankAccountModal(accountId = null) {
    currentBankAccountId = accountId;
    
    const modal = document.getElementById('bankAccountModal');
    const form = document.getElementById('bankAccountForm');
    
    form.reset();
    document.getElementById('bankActive').checked = true;

    if (accountId) {
        document.querySelector('#bankAccountModal .modal-header h2').textContent = 'Editar Conta Bancária';
        loadBankAccountData(accountId);
    } else {
        document.querySelector('#bankAccountModal .modal-header h2').textContent = 'Adicionar Conta Bancária';
    }

    modal.classList.add('active');
}

function closeBankAccountModal() {
    document.getElementById('bankAccountModal').classList.remove('active');
    currentBankAccountId = null;
}

async function loadBankAccountData(accountId) {
    try {
        const doc = await db.collection('bank_accounts').doc(accountId).get();
        
        if (!doc.exists) {
            alert('Conta não encontrada!');
            closeBankAccountModal();
            return;
        }

        const account = doc.data();
        
        document.getElementById('bankName').value = account.bankName || '';
        document.getElementById('bankAccountType').value = account.accountType || 'corrente';
        document.getElementById('bankAgency').value = account.agency || '';
        document.getElementById('bankAccountNumber').value = account.accountNumber || '';
        document.getElementById('bankPixKey').value = account.pixKey || '';
        document.getElementById('bankApiKey').value = account.apiKey || '';
        document.getElementById('bankApiSecret').value = account.apiSecret || '';
        document.getElementById('bankWebhookUrl').value = account.webhookUrl || '';
        document.getElementById('bankEnvironment').value = account.environment || 'sandbox';
        document.getElementById('bankActive').checked = account.active || false;
        document.getElementById('bankAutoConciliation').checked = account.autoConciliation || false;
        
        document.getElementById('bankAccountId').value = accountId;

    } catch (error) {
        console.error('Erro ao carregar conta bancária:', error);
        alert('Erro ao carregar conta!');
    }
}

// ===================================
// SALVAR CONTA BANCÁRIA
// ===================================
async function saveBankAccount(e) {
    e.preventDefault();

    const bankName = document.getElementById('bankName').value;
    const accountType = document.getElementById('bankAccountType').value;
    const agency = document.getElementById('bankAgency').value.trim();
    const accountNumber = document.getElementById('bankAccountNumber').value.trim();
    const pixKey = document.getElementById('bankPixKey').value.trim();
    const apiKey = document.getElementById('bankApiKey').value.trim();
    const apiSecret = document.getElementById('bankApiSecret').value.trim();
    const webhookUrl = document.getElementById('bankWebhookUrl').value.trim();
    const environment = document.getElementById('bankEnvironment').value;
    const active = document.getElementById('bankActive').checked;
    const autoConciliation = document.getElementById('bankAutoConciliation').checked;
    const accountId = document.getElementById('bankAccountId').value;

    if (!bankName || !apiKey || !apiSecret) {
        alert('Preencha todos os campos obrigatórios!');
        return;
    }

    try {
        const accountData = {
            bankName,
            accountType,
            agency,
            accountNumber,
            pixKey,
            apiKey,
            apiSecret, // Em produção, criptografe isso!
            webhookUrl,
            environment,
            active,
            autoConciliation,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (accountId) {
            await db.collection('bank_accounts').doc(accountId).update(accountData);
            showSuccess('Conta bancária atualizada com sucesso!');
        } else {
            accountData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('bank_accounts').add(accountData);
            showSuccess('Conta bancária cadastrada com sucesso!');
        }

        closeBankAccountModal();
        await loadBankAccounts();

    } catch (error) {
        console.error('Erro ao salvar conta bancária:', error);
        alert('Erro ao salvar conta. Tente novamente.');
    }
}

// ===================================
// EDITAR E EXCLUIR CONTA BANCÁRIA
// ===================================
window.editBankAccount = function(accountId) {
    openBankAccountModal(accountId);
};

window.deleteBankAccount = async function(accountId) {
    if (!confirm('Tem certeza que deseja excluir esta conta bancária?\n\nIsso NÃO excluirá suas transações existentes.')) {
        return;
    }

    try {
        await db.collection('bank_accounts').doc(accountId).delete();
        showSuccess('Conta bancária excluída com sucesso!');
        await loadBankAccounts();
    } catch (error) {
        console.error('Erro ao excluir conta:', error);
        alert('Erro ao excluir conta. Tente novamente.');
    }
};

// ===================================
// EXPORTAR RELATÓRIO CSV
// ===================================
async function exportReport() {
    try {
        const periodFilter = document.getElementById('periodFilter').value;
        const typeFilter = document.getElementById('typeFilter').value;
        const paymentMethodFilter = document.getElementById('paymentMethodFilter').value;
        const dateRange = getDateRange(periodFilter);

        let query = db.collection('transactions');

        if (dateRange.start) {
            query = query.where('date', '>=', dateRange.start);
        }
        if (dateRange.end) {
            query = query.where('date', '<=', dateRange.end);
        }
        if (typeFilter !== 'all') {
            query = query.where('type', '==', typeFilter);
        }
        if (paymentMethodFilter !== 'all') {
            query = query.where('paymentMethod', '==', paymentMethodFilter);
        }

        const snapshot = await query.orderBy('date', 'desc').get();

        if (snapshot.empty) {
            alert('Nenhuma transação para exportar!');
            return;
        }

        // Criar CSV
        let csv = 'Data,Descrição,Tipo,Método de Pagamento,Categoria,Valor,Observações\n';

        snapshot.forEach(doc => {
            const transaction = doc.data();
            const date = formatTransactionDate(transaction.date);
            const type = transaction.type === 'revenue' ? 'Receita' : 'Despesa';
            const method = getPaymentMethodLabel(transaction.paymentMethod);
            const amount = transaction.amount || 0;

            csv += `"${date}","${transaction.description}","${type}","${method}","${transaction.category || '-'}","${amount}","${transaction.notes || '-'}"\n`;
        });

        // Download do arquivo
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `relatorio_financeiro_${Date.now()}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showSuccess('Relatório exportado com sucesso!');

    } catch (error) {
        console.error('Erro ao exportar relatório:', error);
        alert('Erro ao exportar relatório. Tente novamente.');
    }
}

// ===================================
// FUNÇÕES AUXILIARES
// ===================================
function getDateRange(period) {
    const now = new Date();
    let start, end;

    switch (period) {
        case 'week':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
            end = now;
            break;
        case 'month':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = now;
            break;
        case 'year':
            start = new Date(now.getFullYear(), 0, 1);
            end = now;
            break;
        default:
            start = null;
            end = null;
    }

    return { start, end };
}

function formatTransactionDate(timestamp) {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(date);
}

function getPaymentMethodLabel(method) {
    const labels = {
        'pix': '💚 PIX',
        'cartao': '💳 Cartão',
        'boleto': '📄 Boleto',
        'dinheiro': '💵 Dinheiro',
        'transferencia': '🏦 Transferência',
        'outro': '🔹 Outro'
    };
    
    return labels[method] || '🔹 Outro';
}

function maskPixKey(pixKey) {
    if (!pixKey) return '-';
    if (pixKey.length > 10) {
        return pixKey.substring(0, 3) + '***' + pixKey.substring(pixKey.length - 3);
    }
    return pixKey;
}