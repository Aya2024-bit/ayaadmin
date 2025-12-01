// ===================================
// DASHBOARD - MÉTRICAS E VISÃO GERAL
// ===================================

let functions;

document.addEventListener('DOMContentLoaded', async () => {
    // Verificar autenticação
    try {
        const user = await checkAuth();
        document.getElementById('userEmail').textContent = user.email;
        
        // Inicializar Cloud Functions
        functions = firebase.app().functions('southamerica-east1');
        console.log('✅ Cloud Functions inicializadas no Dashboard');
        
        // Exibir data atual
        displayCurrentDate();
        
        // Carregar dados do dashboard
        await loadDashboardMetrics();
        await loadRecentSales();
        await loadTopProducts();
        
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
});

// ===================================
// EXIBIR DATA ATUAL
// ===================================
function displayCurrentDate() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    const dateString = now.toLocaleDateString('pt-BR', options);
    document.getElementById('currentDate').textContent = dateString;
}

// ===================================
// CARREGAR MÉTRICAS DO DASHBOARD
// ===================================
async function loadDashboardMetrics() {
    try {
        // 1. Total de Produtos
        const productsSnapshot = await db.collection('products').get();
        document.getElementById('totalProducts').textContent = productsSnapshot.size;

        // 2. Vendas do Mês
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const salesSnapshot = await db.collection('transactions')
            .where('type', '==', 'revenue')
            .where('date', '>=', firstDayOfMonth)
            .get();
        
        let monthSales = 0;
        salesSnapshot.forEach(doc => {
            monthSales += doc.data().amount || 0;
        });
        
        document.getElementById('monthSales').textContent = formatCurrency(monthSales);

        // 3. Clientes Ativos (usando Cloud Function - mesma lógica de notificacoes.html)
        await loadActiveCustomers();

        // 4. Promoções Ativas (com validação de data)
        await loadActivePromotions();

    } catch (error) {
        console.error('Erro ao carregar métricas:', error);
    }
}

// ===================================
// CARREGAR CLIENTES ATIVOS (CLOUD FUNCTION)
// ===================================
async function loadActiveCustomers() {
    try {
        console.log('📊 Carregando clientes ativos...');
        
        const contarUsuarios = functions.httpsCallable('contarUsuarios');
        const result = await contarUsuarios();
        
        const count = result.data.total || 0;
        document.getElementById('totalCustomers').textContent = count;
        
        console.log(`✅ ${count} clientes ativos carregados`);
    } catch (error) {
        console.error('❌ Erro ao carregar clientes ativos:', error);
        document.getElementById('totalCustomers').textContent = '0';
    }
}

// ===================================
// CARREGAR PROMOÇÕES ATIVAS
// ===================================
async function loadActivePromotions() {
    try {
        const now = new Date();
        
        const promotionsSnapshot = await db.collection('promotions')
            .where('active', '==', true)
            .get();
        
        let activeCount = 0;
        
        promotionsSnapshot.forEach(doc => {
            const promo = doc.data();
            
            // Validar se a promoção está dentro do período
            if (promo.startDate && promo.endDate) {
                const startDate = promo.startDate.toDate();
                const endDate = promo.endDate.toDate();
                
                if (now >= startDate && now <= endDate) {
                    activeCount++;
                }
            }
        });
        
        document.getElementById('activePromotions').textContent = activeCount;
        console.log(`✅ ${activeCount} promoções ativas no período`);
        
    } catch (error) {
        console.error('Erro ao carregar promoções ativas:', error);
        document.getElementById('activePromotions').textContent = '0';
    }
}

// ===================================
// CARREGAR VENDAS RECENTES
// ===================================
async function loadRecentSales() {
    try {
        const salesTableBody = document.getElementById('salesTableBody');
        
        const salesSnapshot = await db.collection('sales')
            .orderBy('date', 'desc')
            .limit(10)
            .get();

        if (salesSnapshot.empty) {
            salesTableBody.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhuma venda registrada</td></tr>';
            return;
        }

        salesTableBody.innerHTML = '';
        
        salesSnapshot.forEach(doc => {
            const sale = doc.data();
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${formatDate(sale.date)}</td>
                <td>${sale.customerName || 'Cliente não informado'}</td>
                <td>${sale.productName || 'Produto não especificado'}</td>
                <td>${formatCurrency(sale.amount || 0)}</td>
                <td><span class="badge ${getStatusClass(sale.status)}">${sale.status || 'Pendente'}</span></td>
            `;
            
            salesTableBody.appendChild(row);
        });

    } catch (error) {
        console.error('Erro ao carregar vendas recentes:', error);
        document.getElementById('salesTableBody').innerHTML = 
            '<tr><td colspan="5" class="empty-state">Erro ao carregar vendas</td></tr>';
    }
}

// ===================================
// CARREGAR PRODUTOS MAIS VENDIDOS
// ===================================
async function loadTopProducts() {
    try {
        const topProductsContainer = document.getElementById('topProducts');
        
        const productsSnapshot = await db.collection('products')
            .orderBy('salesCount', 'desc')
            .limit(5)
            .get();

        if (productsSnapshot.empty) {
            topProductsContainer.innerHTML = '<p class="empty-state">Nenhum produto vendido ainda</p>';
            return;
        }

        topProductsContainer.innerHTML = '';
        
        productsSnapshot.forEach(doc => {
            const product = doc.data();
            const productItem = document.createElement('div');
            productItem.className = 'product-list-item';
            
            productItem.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #eee;">
                    <div>
                        <strong>${product.title}</strong>
                        <p style="color: #666; font-size: 14px; margin-top: 4px;">
                            ${product.salesCount || 0} vendas
                        </p>
                    </div>
                    <div style="text-align: right;">
                        <strong style="color: #2ecc71; font-size: 18px;">
                            ${formatCurrency(product.price || 0)}
                        </strong>
                    </div>
                </div>
            `;
            
            topProductsContainer.appendChild(productItem);
        });

    } catch (error) {
        console.error('Erro ao carregar produtos mais vendidos:', error);
        document.getElementById('topProducts').innerHTML = 
            '<p class="empty-state">Erro ao carregar dados</p>';
    }
}

// ===================================
// FUNÇÕES AUXILIARES
// ===================================
function getStatusClass(status) {
    const statusMap = {
        'Concluída': 'success',
        'Pendente': 'warning',
        'Cancelada': 'danger',
        'Em Processamento': 'info'
    };
    
    return statusMap[status] || 'info';
}

// Atualizar métricas a cada 30 segundos
setInterval(() => {
    loadDashboardMetrics();
}, 30000);