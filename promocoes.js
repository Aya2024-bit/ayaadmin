// ===================================
// GERENCIAMENTO DE PROMOÇÕES
// ===================================

let currentPromotionId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Verificar autenticação
    try {
        await checkAuth();
        
        // Carregar dados iniciais
        await loadPromotions();
        await loadProductsForPromotion();
        
        // Event Listeners
        setupEventListeners();
        
    } catch (error) {
        console.error('Erro ao inicializar página de promoções:', error);
    }
});

// ===================================
// CONFIGURAR EVENT LISTENERS
// ===================================
function setupEventListeners() {
    // Abrir modal de nova promoção
    document.getElementById('createPromotionBtn').addEventListener('click', () => {
        openPromotionModal();
    });

    // Fechar modal
    document.getElementById('closePromotionModal').addEventListener('click', closePromotionModal);
    document.getElementById('cancelPromotionBtn').addEventListener('click', closePromotionModal);

    // Salvar promoção
    document.getElementById('promotionForm').addEventListener('submit', savePromotion);
}

// ===================================
// CARREGAR PROMOÇÕES
// ===================================
async function loadPromotions() {
    try {
        const promotionsGrid = document.getElementById('promotionsGrid');
        promotionsGrid.innerHTML = '<p class="loading-state">Carregando promoções...</p>';

        const snapshot = await db.collection('promotions')
            .orderBy('createdAt', 'desc')
            .get();

        if (snapshot.empty) {
            promotionsGrid.innerHTML = '<p class="empty-state">Nenhuma promoção cadastrada</p>';
            return;
        }

        promotionsGrid.innerHTML = '';

        snapshot.forEach(doc => {
            const promotion = doc.data();
            const promotionCard = createPromotionCard(doc.id, promotion);
            promotionsGrid.appendChild(promotionCard);
        });

    } catch (error) {
        console.error('Erro ao carregar promoções:', error);
        document.getElementById('promotionsGrid').innerHTML = 
            '<p class="empty-state">Erro ao carregar promoções</p>';
    }
}

// ===================================
// CRIAR CARD DE PROMOÇÃO
// ===================================
function createPromotionCard(id, promotion) {
    const card = document.createElement('div');
    card.className = 'promotion-card';

    const isActive = promotion.active && isPromotionValid(promotion);
    const statusBadge = isActive 
        ? '<span class="promotion-badge">Ativa</span>' 
        : '<span class="promotion-badge inactive">Inativa</span>';

    const startDate = formatPromotionDate(promotion.startDate);
    const endDate = formatPromotionDate(promotion.endDate);

    card.innerHTML = `
        ${statusBadge}
        <h3 class="promotion-title">${promotion.title}</h3>
        ${promotion.description ? `<p style="color: #666; margin-bottom: 12px;">${promotion.description}</p>` : ''}
        <div class="promotion-discount">${promotion.discount}% OFF</div>
        <div class="promotion-dates">
            📅 ${startDate} até ${endDate}
        </div>
        ${promotion.products && promotion.products.length > 0 
            ? `<p style="font-size: 14px; color: #666; margin-bottom: 16px;">
                📦 ${promotion.products.length} produto(s) incluído(s)
               </p>` 
            : ''}
        <div class="promotion-actions">
            <button onclick="editPromotion('${id}')" class="btn-secondary" style="flex: 1; background: #3498db; color: white;">
                ✏️ Editar
            </button>
            <button onclick="togglePromotionStatus('${id}', ${!promotion.active})" class="btn-secondary" style="flex: 1; background: ${isActive ? '#95a5a6' : '#2ecc71'}; color: white;">
                ${isActive ? '⏸️ Desativar' : '▶️ Ativar'}
            </button>
            <button onclick="deletePromotion('${id}')" class="btn-danger" style="flex: 1;">
                🗑️ Excluir
            </button>
        </div>
    `;

    return card;
}

// ===================================
// ABRIR MODAL DE PROMOÇÃO
// ===================================
function openPromotionModal(promotionId = null) {
    currentPromotionId = promotionId;
    
    const modal = document.getElementById('promotionModal');
    const modalTitle = document.getElementById('promotionModalTitle');
    const form = document.getElementById('promotionForm');
    
    form.reset();
    document.getElementById('promotionId').value = promotionId || '';

    if (promotionId) {
        modalTitle.textContent = 'Editar Promoção';
        loadPromotionData(promotionId);
    } else {
        modalTitle.textContent = 'Nova Promoção';
        
        // Definir datas padrão
        const today = new Date().toISOString().split('T')[0];
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        document.getElementById('promotionStartDate').value = today;
        document.getElementById('promotionEndDate').value = nextWeek;
        document.getElementById('promotionActive').checked = true;
    }

    modal.classList.add('active');
}

function closePromotionModal() {
    document.getElementById('promotionModal').classList.remove('active');
    currentPromotionId = null;
}

// ===================================
// CARREGAR PRODUTOS PARA SELEÇÃO
// ===================================
async function loadProductsForPromotion() {
    try {
        const snapshot = await db.collection('products').orderBy('title').get();
        const select = document.getElementById('promotionProducts');
        
        select.innerHTML = '';

        snapshot.forEach(doc => {
            const product = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${product.title} - ${formatCurrency(product.price || 0)}`;
            select.appendChild(option);
        });

    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
    }
}

// ===================================
// CARREGAR DADOS DA PROMOÇÃO
// ===================================
async function loadPromotionData(promotionId) {
    try {
        const doc = await db.collection('promotions').doc(promotionId).get();
        
        if (!doc.exists) {
            alert('Promoção não encontrada!');
            closePromotionModal();
            return;
        }

        const promotion = doc.data();
        
        document.getElementById('promotionTitle').value = promotion.title || '';
        document.getElementById('promotionDescription').value = promotion.description || '';
        document.getElementById('promotionDiscount').value = promotion.discount || '';
        document.getElementById('promotionActive').checked = promotion.active || false;

        // Datas
        if (promotion.startDate) {
            const startDate = promotion.startDate.toDate();
            document.getElementById('promotionStartDate').value = startDate.toISOString().split('T')[0];
        }
        if (promotion.endDate) {
            const endDate = promotion.endDate.toDate();
            document.getElementById('promotionEndDate').value = endDate.toISOString().split('T')[0];
        }

        // Selecionar produtos
        if (promotion.products && promotion.products.length > 0) {
            const select = document.getElementById('promotionProducts');
            Array.from(select.options).forEach(option => {
                if (promotion.products.includes(option.value)) {
                    option.selected = true;
                }
            });
        }

    } catch (error) {
        console.error('Erro ao carregar dados da promoção:', error);
        alert('Erro ao carregar promoção!');
    }
}

// ===================================
// SALVAR PROMOÇÃO
// ===================================
async function savePromotion(e) {
    e.preventDefault();

    const title = document.getElementById('promotionTitle').value.trim();
    const description = document.getElementById('promotionDescription').value.trim();
    const discount = parseFloat(document.getElementById('promotionDiscount').value);
    const startDateStr = document.getElementById('promotionStartDate').value;
    const endDateStr = document.getElementById('promotionEndDate').value;
    const active = document.getElementById('promotionActive').checked;
    const promotionId = document.getElementById('promotionId').value;

    // Validações
    if (!title || !discount || !startDateStr || !endDateStr) {
        alert('Preencha todos os campos obrigatórios!');
        return;
    }

    if (discount <= 0 || discount > 100) {
        alert('O desconto deve estar entre 0 e 100%!');
        return;
    }

    const startDate = new Date(startDateStr + 'T00:00:00');
    const endDate = new Date(endDateStr + 'T00:00:00');

    if (endDate <= startDate) {
        alert('A data de término deve ser posterior à data de início!');
        return;
    }

    // Coletar produtos selecionados
    const select = document.getElementById('promotionProducts');
    const selectedProducts = Array.from(select.selectedOptions).map(option => option.value);

    try {
        const promotionData = {
            title,
            description,
            discount,
            startDate,
            endDate,
            active,
            products: selectedProducts,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (promotionId) {
            await db.collection('promotions').doc(promotionId).update(promotionData);
            showSuccess('Promoção atualizada com sucesso!');
        } else {
            promotionData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('promotions').add(promotionData);
            showSuccess('Promoção criada com sucesso!');
        }

        closePromotionModal();
        await loadPromotions();

    } catch (error) {
        console.error('Erro ao salvar promoção:', error);
        alert('Erro ao salvar promoção. Tente novamente.');
    }
}

// ===================================
// EDITAR PROMOÇÃO
// ===================================
window.editPromotion = function(promotionId) {
    openPromotionModal(promotionId);
};

// ===================================
// ALTERNAR STATUS DA PROMOÇÃO
// ===================================
window.togglePromotionStatus = async function(promotionId, newStatus) {
    try {
        await db.collection('promotions').doc(promotionId).update({
            active: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showSuccess(`Promoção ${newStatus ? 'ativada' : 'desativada'} com sucesso!`);
        await loadPromotions();

    } catch (error) {
        console.error('Erro ao alterar status da promoção:', error);
        alert('Erro ao alterar status. Tente novamente.');
    }
};

// ===================================
// EXCLUIR PROMOÇÃO
// ===================================
window.deletePromotion = async function(promotionId) {
    if (!confirm('Tem certeza que deseja excluir esta promoção?')) {
        return;
    }

    try {
        await db.collection('promotions').doc(promotionId).delete();
        showSuccess('Promoção excluída com sucesso!');
        await loadPromotions();
    } catch (error) {
        console.error('Erro ao excluir promoção:', error);
        alert('Erro ao excluir promoção. Tente novamente.');
    }
};

// ===================================
// FUNÇÕES AUXILIARES
// ===================================
function isPromotionValid(promotion) {
    const now = new Date();
    const startDate = promotion.startDate.toDate ? promotion.startDate.toDate() : new Date(promotion.startDate);
    const endDate = promotion.endDate.toDate ? promotion.endDate.toDate() : new Date(promotion.endDate);
    
    return now >= startDate && now <= endDate;
}

function formatPromotionDate(timestamp) {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(date);
}