// ===================================
// CONFIGURAÇÕES DA LOJA
// ===================================

let currentLogoUrl = null;
let currentBannerUrl = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Verificar autenticação
    try {
        await checkAuth();
        
        // Carregar configurações salvas
        await loadSettings();
        
        // Event Listeners
        setupEventListeners();
        
    } catch (error) {
        console.error('Erro ao inicializar página de configurações:', error);
    }
});

// ===================================
// CONFIGURAR EVENT LISTENERS
// ===================================
function setupEventListeners() {
    // Upload de logo
    document.getElementById('uploadLogoBtn').addEventListener('click', () => {
        document.getElementById('logoUpload').click();
    });
    document.getElementById('logoUpload').addEventListener('change', handleLogoUpload);
    document.getElementById('removeLogoBtn').addEventListener('click', removeLogo);

    // Upload de banner
    document.getElementById('uploadBannerBtn').addEventListener('click', () => {
        document.getElementById('bannerUpload').click();
    });
    document.getElementById('bannerUpload').addEventListener('change', handleBannerUpload);
    document.getElementById('removeBannerBtn').addEventListener('click', removeBanner);

    // Salvar paleta de cores
    document.getElementById('colorPaletteForm').addEventListener('submit', saveColorPalette);

    // Salvar informações de contato
    document.getElementById('contactForm').addEventListener('submit', saveContactInfo);
}

// ===================================
// CARREGAR CONFIGURAÇÕES
// ===================================
async function loadSettings() {
    try {
        const doc = await db.collection('settings').doc('storeConfig').get();

        if (doc.exists) {
            const settings = doc.data();

            // Logo
            if (settings.logoUrl) {
                currentLogoUrl = settings.logoUrl;
                displayLogo(settings.logoUrl);
            }

            // Banner
            if (settings.bannerUrl) {
                currentBannerUrl = settings.bannerUrl;
                displayBanner(settings.bannerUrl);
            }

            // Paleta de cores
            if (settings.colors) {
                document.getElementById('primaryColor').value = settings.colors.primary || '#3498db';
                document.getElementById('secondaryColor').value = settings.colors.secondary || '#2ecc71';
                document.getElementById('accentColor').value = settings.colors.accent || '#e74c3c';
            }

            // Informações de contato
            if (settings.contact) {
                document.getElementById('instagram').value = settings.contact.instagram || '';
                document.getElementById('whatsapp').value = settings.contact.whatsapp || '';
                document.getElementById('phone').value = settings.contact.phone || '';
                document.getElementById('aboutUs').value = settings.contact.aboutUs || '';
                document.getElementById('address').value = settings.contact.address || '';
                document.getElementById('email').value = settings.contact.email || '';
            }
        }

    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
    }
}

// ===================================
// UPLOAD DE LOGO
// ===================================
async function handleLogoUpload(e) {
    const file = e.target.files[0];
    
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione uma imagem válida!');
        return;
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 5MB!');
        return;
    }

    const uploadBtn = document.getElementById('uploadLogoBtn');
    uploadBtn.disabled = true;
    uploadBtn.textContent = '⏳ Enviando...';

    try {
        // Deletar logo anterior se existir
        if (currentLogoUrl) {
            try {
                const oldLogoRef = storage.refFromURL(currentLogoUrl);
                await oldLogoRef.delete();
            } catch (error) {
                console.log('Logo anterior não encontrada ou já deletada');
            }
        }

        // Upload da nova logo
        const filename = `store/logo_${Date.now()}_${file.name}`;
        const storageRef = storage.ref(filename);
        
        await storageRef.put(file);
        const downloadURL = await storageRef.getDownloadURL();

        // Salvar no Firestore
        await db.collection('settings').doc('storeConfig').set({
            logoUrl: downloadURL,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        currentLogoUrl = downloadURL;
        displayLogo(downloadURL);
        
        showSuccess('Logo atualizada com sucesso!');

    } catch (error) {
        console.error('Erro ao fazer upload da logo:', error);
        alert('Erro ao fazer upload. Tente novamente.');
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = '📤 Upload Logo';
    }
}

function displayLogo(url) {
    const logoPreview = document.getElementById('logoPreview');
    logoPreview.innerHTML = `<img src="${url}" alt="Logo da Loja">`;
    document.getElementById('removeLogoBtn').style.display = 'inline-block';
}

async function removeLogo() {
    if (!confirm('Deseja remover a logo da loja?')) {
        return;
    }

    try {
        if (currentLogoUrl) {
            const logoRef = storage.refFromURL(currentLogoUrl);
            await logoRef.delete();
        }

        await db.collection('settings').doc('storeConfig').update({
            logoUrl: firebase.firestore.FieldValue.delete(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        currentLogoUrl = null;
        document.getElementById('logoPreview').innerHTML = '<p>Nenhuma logo definida</p>';
        document.getElementById('removeLogoBtn').style.display = 'none';
        
        showSuccess('Logo removida com sucesso!');

    } catch (error) {
        console.error('Erro ao remover logo:', error);
        alert('Erro ao remover logo. Tente novamente.');
    }
}

// ===================================
// UPLOAD DE BANNER
// ===================================
async function handleBannerUpload(e) {
    const file = e.target.files[0];
    
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione uma imagem válida!');
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 10MB!');
        return;
    }

    const uploadBtn = document.getElementById('uploadBannerBtn');
    uploadBtn.disabled = true;
    uploadBtn.textContent = '⏳ Enviando...';

    try {
        if (currentBannerUrl) {
            try {
                const oldBannerRef = storage.refFromURL(currentBannerUrl);
                await oldBannerRef.delete();
            } catch (error) {
                console.log('Banner anterior não encontrado ou já deletado');
            }
        }

        const filename = `store/banner_${Date.now()}_${file.name}`;
        const storageRef = storage.ref(filename);
        
        await storageRef.put(file);
        const downloadURL = await storageRef.getDownloadURL();

        await db.collection('settings').doc('storeConfig').set({
            bannerUrl: downloadURL,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        currentBannerUrl = downloadURL;
        displayBanner(downloadURL);
        
        showSuccess('Banner atualizado com sucesso!');

    } catch (error) {
        console.error('Erro ao fazer upload do banner:', error);
        alert('Erro ao fazer upload. Tente novamente.');
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = '📤 Upload Banner';
    }
}

function displayBanner(url) {
    const bannerPreview = document.getElementById('bannerPreview');
    bannerPreview.innerHTML = `<img src="${url}" alt="Banner da Loja">`;
    document.getElementById('removeBannerBtn').style.display = 'inline-block';
}

async function removeBanner() {
    if (!confirm('Deseja remover o banner da página inicial?')) {
        return;
    }

    try {
        if (currentBannerUrl) {
            const bannerRef = storage.refFromURL(currentBannerUrl);
            await bannerRef.delete();
        }

        await db.collection('settings').doc('storeConfig').update({
            bannerUrl: firebase.firestore.FieldValue.delete(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        currentBannerUrl = null;
        document.getElementById('bannerPreview').innerHTML = '<p>Nenhum banner definido</p>';
        document.getElementById('removeBannerBtn').style.display = 'none';
        
        showSuccess('Banner removido com sucesso!');

    } catch (error) {
        console.error('Erro ao remover banner:', error);
        alert('Erro ao remover banner. Tente novamente.');
    }
}

// ===================================
// SALVAR PALETA DE CORES
// ===================================
async function saveColorPalette(e) {
    e.preventDefault();

    const primaryColor = document.getElementById('primaryColor').value;
    const secondaryColor = document.getElementById('secondaryColor').value;
    const accentColor = document.getElementById('accentColor').value;

    try {
        await db.collection('settings').doc('storeConfig').set({
            colors: {
                primary: primaryColor,
                secondary: secondaryColor,
                accent: accentColor
            },
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        showSuccess('Paleta de cores salva com sucesso!');

    } catch (error) {
        console.error('Erro ao salvar paleta de cores:', error);
        alert('Erro ao salvar. Tente novamente.');
    }
}

// ===================================
// SALVAR INFORMAÇÕES DE CONTATO
// ===================================
async function saveContactInfo(e) {
    e.preventDefault();

    const instagram = document.getElementById('instagram').value.trim();
    const whatsapp = document.getElementById('whatsapp').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const aboutUs = document.getElementById('aboutUs').value.trim();
    const address = document.getElementById('address').value.trim();
    const email = document.getElementById('email').value.trim();

    // Validar e-mail se fornecido
    if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Por favor, insira um e-mail válido!');
            return;
        }
    }

    try {
        await db.collection('settings').doc('storeConfig').set({
            contact: {
                instagram,
                whatsapp,
                phone,
                aboutUs,
                address,
                email
            },
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        showSuccess('Informações de contato salvas com sucesso!');

    } catch (error) {
        console.error('Erro ao salvar informações de contato:', error);
        alert('Erro ao salvar. Tente novamente.');
    }
}