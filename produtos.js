// ===================================
// GERENCIAMENTO DE PRODUTOS
// ===================================

let currentProductId = null;
let selectedImages = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Verificar autenticação
    try {
        await checkAuth();
        
        // Carregar dados iniciais
        await loadProducts();
        await loadCollections();
        
        // Event Listeners
        setupEventListeners();
        
    } catch (error) {
        console.error('Erro ao inicializar página de produtos:', error);
    }
});

// ===================================
// CONFIGURAR EVENT LISTENERS
// ===================================
function setupEventListeners() {
    // Abrir modal de novo produto
    document.getElementById('openProductModal').addEventListener('click', () => {
        openProductModal();
    });

    // Fechar modal
    document.getElementById('closeProductModal').addEventListener('click', closeProductModal);
    document.getElementById('cancelProductBtn').addEventListener('click', closeProductModal);

    // Salvar produto
    document.getElementById('productForm').addEventListener('submit', saveProduct);

    // Upload de imagens
    document.getElementById('productImages').addEventListener('change', handleImageSelection);

    // Gerenciar coleções
    document.getElementById('manageCollectionsBtn').addEventListener('click', openCollectionsModal);
    document.getElementById('closeCollectionsModal').addEventListener('click', closeCollectionsModal);
    document.getElementById('addCollectionBtn').addEventListener('click', addCollection);

    // Filtro por coleção
    document.getElementById('collectionFilter').addEventListener('change', filterProductsByCollection);
}

// ===================================
// CARREGAR PRODUTOS
// ===================================
async function loadProducts(collectionFilter = '') {
    try {
        const productsGrid = document.getElementById('productsGrid');
        productsGrid.innerHTML = '<p class="loading-state">Carregando produtos...</p>';

        let query = db.collection('products');
        
        if (collectionFilter) {
            query = query.where('collection', '==', collectionFilter);
        }

        const snapshot = await query.orderBy('createdAt', 'desc').get();

        if (snapshot.empty) {
            productsGrid.innerHTML = '<p class="empty-state">Nenhum produto cadastrado</p>';
            return;
        }

        productsGrid.innerHTML = '';

        snapshot.forEach(doc => {
            const product = doc.data();
            const productCard = createProductCard(doc.id, product);
            productsGrid.appendChild(productCard);
        });

    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        document.getElementById('productsGrid').innerHTML = 
            '<p class="empty-state">Erro ao carregar produtos</p>';
    }
}

// ===================================
// CRIAR CARD DE PRODUTO
// ===================================
// ===================================
// CRIAR CARD DE PRODUTO (ATUALIZADO)
// ===================================
function createProductCard(id, product) {
    const card = document.createElement('div');
    card.className = 'product-card';

    const imageUrl = product.images && product.images[0] 
        ? product.images[0] 
        : 'https://via.placeholder.com/300x200?text=Sem+Imagem';

    // ========== NOVO: FORMATAR MÉTODOS DE PAGAMENTO ==========
    let paymentMethodsHTML = '';
    if (product.paymentMethods && product.paymentMethods.length > 0) {
        const methodLabels = {
            'pix': '💚 PIX',
            'cartao': '💳 Cartão',
            'boleto': '📄 Boleto',
            'dinheiro': '💵 Dinheiro',
            'transferencia': '🏦 Transfer',
            'whatsapp': '📱 WhatsApp'
        };

        const badges = product.paymentMethods.map(method => {
            const label = methodLabels[method] || method;
            const className = method === 'whatsapp' ? 'payment-badge whatsapp' : 'payment-badge';
            return `<span class="${className}">${label}</span>`;
        }).join(' ');

        paymentMethodsHTML = `
            <div class="payment-methods-display">
                ${badges}
            </div>
        `;
    }
    // ========== FIM ==========

    card.innerHTML = `
        <img src="${imageUrl}" alt="${product.title}" class="product-image" onerror="this.src='https://via.placeholder.com/300x200?text=Erro+ao+Carregar'">
        <div class="product-info">
            <h3 class="product-title">${product.title}</h3>
            <p style="color: #666; font-size: 14px; margin-bottom: 8px;">${truncateText(product.description, 80)}</p>
            <p class="product-price">${formatCurrency(product.price || 0)}</p>
            ${product.collection ? `<span class="badge info">${product.collection}</span>` : ''}
            ${product.stock !== undefined ? `<p style="font-size: 12px; color: #666; margin-top: 8px;">Estoque: ${product.stock}</p>` : ''}
            ${paymentMethodsHTML}
            <div class="product-actions">
                <button onclick="editProduct('${id}')" class="btn-secondary" style="background: #3498db; color: white;">✏️ Editar</button>
                <button onclick="deleteProduct('${id}')" class="btn-danger" style="background: #e74c3c; color: white;">🗑️ Excluir</button>
            </div>
        </div>
    `;

    return card;
}

// ===================================
// ABRIR MODAL DE PRODUTO
// ===================================
function openProductModal(productId = null) {
    currentProductId = productId;
    selectedImages = [];
    
    const modal = document.getElementById('productModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('productForm');
    
    form.reset();
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('productId').value = productId || '';

    if (productId) {
        modalTitle.textContent = 'Editar Produto';
        loadProductData(productId);
    } else {
        modalTitle.textContent = 'Novo Produto';
    }

    modal.classList.add('active');
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
    currentProductId = null;
    selectedImages = [];
}

// ===================================
// CARREGAR DADOS DO PRODUTO
// ===================================
async function loadProductData(productId) {
    try {
        const doc = await db.collection('products').doc(productId).get();
        
        if (!doc.exists) {
            alert('Produto não encontrado!');
            closeProductModal();
            return;
        }

        const product = doc.data();
        
        document.getElementById('productTitle').value = product.title || '';
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productPrice').value = product.price || '';
        document.getElementById('productCollection').value = product.collection || '';
        document.getElementById('productStock').value = product.stock || 0;

        // Mostrar imagens existentes
        if (product.images && product.images.length > 0) {
            const imagePreview = document.getElementById('imagePreview');
            imagePreview.innerHTML = '';
            
            product.images.forEach((url, index) => {
                const previewItem = document.createElement('div');
                previewItem.className = 'preview-item';
                previewItem.innerHTML = `
                    <img src="${url}" alt="Imagem ${index + 1}">
                    <button type="button" class="remove-preview" onclick="removeExistingImage(${index})">&times;</button>
                `;
                imagePreview.appendChild(previewItem);
            });
            
            selectedImages = [...product.images];
        }

    } catch (error) {
        console.error('Erro ao carregar dados do produto:', error);
        alert('Erro ao carregar produto!');
    }
}

// ===================================
// SALVAR PRODUTO
// ===================================
// ===================================
// SALVAR PRODUTO (ATUALIZADO)
// ===================================
async function saveProduct(e) {
    e.preventDefault();

    const title = document.getElementById('productTitle').value.trim();
    const description = document.getElementById('productDescription').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value);
    const collection = document.getElementById('productCollection').value;
    const stock = parseInt(document.getElementById('productStock').value) || 0;
    const productId = document.getElementById('productId').value;

    // ========== NOVO: CAPTURAR MÉTODOS DE PAGAMENTO ==========
    const paymentMethodsCheckboxes = document.querySelectorAll('input[name="paymentMethods"]:checked');
    const paymentMethods = Array.from(paymentMethodsCheckboxes).map(cb => cb.value);

    // Validação: pelo menos 1 método selecionado
    if (paymentMethods.length === 0) {
        alert('Selecione pelo menos um método de pagamento!');
        return;
    }
    // ========== FIM CAPTURA ==========

    // Validações existentes
    if (!title || !description || !price) {
        alert('Preencha todos os campos obrigatórios!');
        return;
    }

    if (price <= 0) {
        alert('O preço deve ser maior que zero!');
        return;
    }

    const saveBtn = document.getElementById('saveProductBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Salvando...';

    try {
        let imageUrls = [...selectedImages];

        // Upload de novas imagens
        const fileInput = document.getElementById('productImages');
        if (fileInput.files.length > 0) {
            const uploadedUrls = await uploadProductImages(fileInput.files, productId || Date.now().toString());
            imageUrls = [...imageUrls, ...uploadedUrls];
        }

        const productData = {
            title,
            description,
            price,
            collection,
            stock,
            images: imageUrls,
            paymentMethods: paymentMethods, // ← NOVO CAMPO
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (productId) {
            // Atualizar produto existente
            await db.collection('products').doc(productId).update(productData);
            showSuccess('Produto atualizado com sucesso!');
        } else {
            // Criar novo produto
            productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            productData.salesCount = 0;
            
            await db.collection('products').add(productData);
            showSuccess('Produto criado com sucesso!');
        }

        closeProductModal();
        await loadProducts();

    } catch (error) {
        console.error('Erro ao salvar produto:', error);
        alert('Erro ao salvar produto. Tente novamente.');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Salvar Produto';
    }
}

// ===================================
// UPLOAD DE IMAGENS
// ===================================
function handleImageSelection(e) {
    const files = e.target.files;
    const imagePreview = document.getElementById('imagePreview');
    
    // Limpar preview atual (apenas novas imagens)
    const existingPreviews = imagePreview.querySelectorAll('.preview-item');
    const newImagesStartIndex = existingPreviews.length;

    Array.from(files).forEach((file, index) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.innerHTML = `
                <img src="${event.target.result}" alt="Preview ${newImagesStartIndex + index + 1}">
                <button type="button" class="remove-preview" onclick="removeNewImagePreview(this)">&times;</button>
            `;
            imagePreview.appendChild(previewItem);
        };
        
        reader.readAsDataURL(file);
    });
}

function removeNewImagePreview(button) {
    button.closest('.preview-item').remove();
}

function removeExistingImage(index) {
    selectedImages.splice(index, 1);
    const imagePreview = document.getElementById('imagePreview');
    imagePreview.children[index].remove();
}

async function uploadProductImages(files, productId) {
    const uploadPromises = Array.from(files).map(async (file, index) => {
        const filename = `products/${productId}/${Date.now()}_${index}_${file.name}`;
        const storageRef = storage.ref(filename);
        
        await storageRef.put(file);
        const downloadURL = await storageRef.getDownloadURL();
        
        return downloadURL;
    });

    return Promise.all(uploadPromises);
}

// ===================================
// EDITAR PRODUTO
// ===================================
window.editProduct = function(productId) {
    openProductModal(productId);
};

// ===================================
// EXCLUIR PRODUTO
// ===================================
window.deleteProduct = async function(productId) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) {
        return;
    }

    try {
        // Buscar produto para deletar imagens do storage
        const doc = await db.collection('products').doc(productId).get();
        const product = doc.data();

        // Deletar imagens do storage
        if (product.images && product.images.length > 0) {
            await Promise.all(
                product.images.map(url => {
                    const imageRef = storage.refFromURL(url);
                    return imageRef.delete().catch(err => console.log('Erro ao deletar imagem:', err));
                })
            );
        }

        // Deletar documento do Firestore
        await db.collection('products').doc(productId).delete();
        
        showSuccess('Produto excluído com sucesso!');
        await loadProducts();

    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        alert('Erro ao excluir produto. Tente novamente.');
    }
};

// ===================================
// GERENCIAMENTO DE COLEÇÕES
// ===================================
async function loadCollections() {
    try {
        const snapshot = await db.collection('collections').orderBy('name').get();
        
        const collectionFilter = document.getElementById('collectionFilter');
        const productCollection = document.getElementById('productCollection');
        
        // Limpar options existentes (manter primeira opção)
        collectionFilter.innerHTML = '<option value="">Todas</option>';
        productCollection.innerHTML = '<option value="">Sem coleção</option>';

        snapshot.forEach(doc => {
            const collection = doc.data();
            
            const option1 = document.createElement('option');
            option1.value = collection.name;
            option1.textContent = collection.name;
            collectionFilter.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = collection.name;
            option2.textContent = collection.name;
            productCollection.appendChild(option2);
        });

        // Atualizar lista no modal de gerenciamento
        updateCollectionsList(snapshot);

    } catch (error) {
        console.error('Erro ao carregar coleções:', error);
    }
}

function updateCollectionsList(snapshot) {
    const collectionsList = document.getElementById('collectionsList');
    
    if (snapshot.empty) {
        collectionsList.innerHTML = '<p class="empty-state">Nenhuma coleção criada</p>';
        return;
    }

    collectionsList.innerHTML = '';

    snapshot.forEach(doc => {
        const collection = doc.data();
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f8f9fa; border-radius: 8px; margin-bottom: 8px;';
        
        item.innerHTML = `
            <span style="font-weight: 600;">${collection.name}</span>
            <button onclick="deleteCollection('${doc.id}')" class="btn-danger" style="padding: 6px 12px; font-size: 12px;">
                🗑️ Excluir
            </button>
        `;
        
        collectionsList.appendChild(item);
    });
}

function openCollectionsModal() {
    document.getElementById('collectionsModal').classList.add('active');
}

function closeCollectionsModal() {
    document.getElementById('collectionsModal').classList.remove('active');
}

async function addCollection() {
    const input = document.getElementById('newCollectionName');
    const name = input.value.trim();

    if (!name) {
        alert('Digite o nome da coleção!');
        return;
    }

    try {
        await db.collection('collections').add({
            name,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        input.value = '';
        showSuccess('Coleção criada com sucesso!');
        await loadCollections();

    } catch (error) {
        console.error('Erro ao criar coleção:', error);
        alert('Erro ao criar coleção. Tente novamente.');
    }
}

window.deleteCollection = async function(collectionId) {
    if (!confirm('Tem certeza que deseja excluir esta coleção?')) {
        return;
    }

    try {
        await db.collection('collections').doc(collectionId).delete();
        showSuccess('Coleção excluída com sucesso!');
        await loadCollections();
    } catch (error) {
        console.error('Erro ao excluir coleção:', error);
        alert('Erro ao excluir coleção. Tente novamente.');
    }
};

// ===================================
// FILTRAR PRODUTOS POR COLEÇÃO
// ===================================
async function filterProductsByCollection() {
    const filter = document.getElementById('collectionFilter').value;
    await loadProducts(filter);
}

// ===================================
// FUNÇÕES AUXILIARES
// ===================================
function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}
// ===================================
// CARREGAR DADOS DO PRODUTO (ATUALIZADO)
// ===================================
async function loadProductData(productId) {
    try {
        const doc = await db.collection('products').doc(productId).get();
        
        if (!doc.exists) {
            alert('Produto não encontrado!');
            closeProductModal();
            return;
        }

        const product = doc.data();
        
        document.getElementById('productTitle').value = product.title || '';
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productPrice').value = product.price || '';
        document.getElementById('productCollection').value = product.collection || '';
        document.getElementById('productStock').value = product.stock || 0;

        // ========== NOVO: CARREGAR MÉTODOS DE PAGAMENTO ==========
        // Desmarcar todos primeiro
        document.querySelectorAll('input[name="paymentMethods"]').forEach(cb => {
            cb.checked = false;
        });

        // Marcar os métodos salvos
        if (product.paymentMethods && product.paymentMethods.length > 0) {
            product.paymentMethods.forEach(method => {
                const checkbox = document.querySelector(`input[name="paymentMethods"][value="${method}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
        } else {
            // Se não tiver métodos salvos, marcar PIX e WhatsApp como padrão
            document.querySelector('input[name="paymentMethods"][value="pix"]').checked = true;
            document.querySelector('input[name="paymentMethods"][value="whatsapp"]').checked = true;
        }
        // ========== FIM ==========

        // Mostrar imagens existentes
        if (product.images && product.images.length > 0) {
            const imagePreview = document.getElementById('imagePreview');
            imagePreview.innerHTML = '';
            
            product.images.forEach((url, index) => {
                const previewItem = document.createElement('div');
                previewItem.className = 'preview-item';
                previewItem.innerHTML = `
                    <img src="${url}" alt="Imagem ${index + 1}">
                    <button type="button" class="remove-preview" onclick="removeExistingImage(${index})">&times;</button>
                `;
                imagePreview.appendChild(previewItem);
            });
            
            selectedImages = [...product.images];
        }

    } catch (error) {
        console.error('Erro ao carregar dados do produto:', error);
        alert('Erro ao carregar produto!');
    }
}