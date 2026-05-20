// ===================================
// FORM UTILS — funções compartilhadas entre formulários
// (Usado por contato.js e onde-encontrar.js)
// ===================================

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwS8kCuFdSG4yBf5oRQgx6U4RTybHQNXyU8quLploy-UcUBrRCifJUsZyV9A0psPv87/exec';

function sanitizeInput(input) {
    const temp = document.createElement('div');
    temp.textContent = input;
    return temp.innerHTML;
}

function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function isValidPhone(phone) {
    const numbers = phone.replace(/\D/g, '');
    return numbers.length === 10 || numbers.length === 11;
}

function showToast(type, title, message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${type === 'success' ? '✓' : '✕'}</div>
        <div class="toast-content">
            <div class="toast-title">${sanitizeInput(title)}</div>
            <div class="toast-message">${sanitizeInput(message)}</div>
        </div>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 5000);
}

function addShakeAnimation(element) {
    element.classList.add('error-shake');
    setTimeout(() => element.classList.remove('error-shake'), 500);
}

function applyPhoneMask(inputElement) {
    inputElement.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) value = value.slice(0, 11);

        if (value.length > 10) {
            value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        } else if (value.length > 6) {
            value = value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
        } else if (value.length > 2) {
            value = value.replace(/(\d{2})(\d{0,5})/, '($1) $2');
        } else if (value.length > 0) {
            value = value.replace(/(\d*)/, '($1');
        }

        e.target.value = value;
    });
}

async function submitFormToScript({ formElement, submitBtnElement, validator, onSuccessMessage, onSuccessExtra }) {
    if (submitFormToScript._isSubmitting) {
        showToast('error', 'Aguarde', 'Já estamos processando seu envio...');
        return;
    }

    const formData = new FormData(formElement);

    if (!validator(formData)) {
        return;
    }

    submitFormToScript._isSubmitting = true;
    submitBtnElement.disabled = true;
    submitBtnElement.classList.add('btn--loading');
    const originalText = submitBtnElement.textContent;
    submitBtnElement.textContent = '';

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const result = await response.json();

        if (result.success) {
            showToast('success', onSuccessMessage.title, onSuccessMessage.message);
            formElement.reset();
            if (onSuccessExtra) onSuccessExtra();
        } else {
            showToast('error', 'Erro ao Enviar', result.message || 'Tente novamente ou entre em contato pelo WhatsApp.');
        }
    } catch (error) {
        console.error('Erro:', error);

        if (error.name === 'AbortError') {
            showToast('error', 'Tempo Esgotado', 'O servidor demorou muito. Tente novamente.');
        } else {
            showToast('error', 'Erro de Conexão', 'Verifique sua internet e tente novamente.');
        }
    } finally {
        submitFormToScript._isSubmitting = false;
        submitBtnElement.disabled = false;
        submitBtnElement.classList.remove('btn--loading');
        submitBtnElement.textContent = originalText;
    }
}

submitFormToScript._isSubmitting = false;
