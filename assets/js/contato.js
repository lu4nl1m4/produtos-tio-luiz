// CONTATO — validação + máscara + contador de caracteres.
// Importa as utilities do form-utils.js (módulo ES).

import {
  showToast,
  isValidEmail,
  isValidPhone,
  applyPhoneMask,
  addShakeAnimation,
  submitFormToScript
} from "./form-utils.js";

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    const submitBtn = document.getElementById('submitBtn');
    const mensagemField = document.getElementById('mensagem');
    const counter = document.getElementById('mensagem-counter');
    const telefoneField = document.getElementById('telefone');

    function validateContactForm(formData) {
        const nome = formData.get('nome').trim();
        const email = formData.get('email').trim();
        const telefone = formData.get('telefone').trim();
        const assunto = formData.get('assunto');
        const mensagem = formData.get('mensagem').trim();

        if (nome.length < 3) {
            showToast('error', 'Nome Inválido', 'O nome deve ter pelo menos 3 caracteres.');
            addShakeAnimation(document.getElementById('nome'));
            document.getElementById('nome').focus();
            return false;
        }
        if (nome.length > 100) {
            showToast('error', 'Nome Muito Longo', 'O nome deve ter no máximo 100 caracteres.');
            addShakeAnimation(document.getElementById('nome'));
            return false;
        }
        if (!isValidEmail(email)) {
            showToast('error', 'Email Inválido', 'Por favor, insira um email válido.');
            addShakeAnimation(document.getElementById('email'));
            document.getElementById('email').focus();
            return false;
        }
        if (telefone && !isValidPhone(telefone)) {
            showToast('error', 'Telefone Inválido', 'Insira um telefone válido com DDD (10 ou 11 dígitos).');
            addShakeAnimation(document.getElementById('telefone'));
            document.getElementById('telefone').focus();
            return false;
        }
        if (!assunto) {
            showToast('error', 'Assunto Obrigatório', 'Por favor, selecione um assunto.');
            addShakeAnimation(document.getElementById('assunto'));
            document.getElementById('assunto').focus();
            return false;
        }
        if (mensagem.length < 10) {
            showToast('error', 'Mensagem Muito Curta', 'A mensagem deve ter pelo menos 10 caracteres.');
            addShakeAnimation(document.getElementById('mensagem'));
            document.getElementById('mensagem').focus();
            return false;
        }
        if (mensagem.length > 1000) {
            showToast('error', 'Mensagem Muito Longa', 'A mensagem deve ter no máximo 1000 caracteres.');
            addShakeAnimation(document.getElementById('mensagem'));
            return false;
        }
        return true;
    }

    // Contador de caracteres da mensagem
    if (mensagemField && counter) {
        mensagemField.addEventListener('input', function(e) {
            const maxLength = 1000;
            const currentLength = e.target.value.length;
            counter.textContent = `${currentLength}/${maxLength} caracteres`;
            counter.classList.remove('warning', 'danger');
            if (currentLength > maxLength * 0.9) counter.classList.add('warning');
            if (currentLength === maxLength) counter.classList.add('danger');
        });

        mensagemField.addEventListener('paste', function(e) {
            const paste = (e.clipboardData || window.clipboardData).getData('text');
            if (paste.length > 1000) {
                e.preventDefault();
                showToast('error', 'Texto Muito Longo', 'O texto colado excede 1000 caracteres.');
            }
        });
    }

    // Máscara de telefone
    if (telefoneField) applyPhoneMask(telefoneField);

    // Submissão
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        submitFormToScript({
            tipo: "contato",
            formElement: form,
            submitBtnElement: submitBtn,
            validator: validateContactForm,
            onSuccessMessage: {
                title: 'Mensagem Enviada!',
                message: 'Entraremos em contato em breve.'
            },
            onSuccessExtra: () => {
                if (counter) counter.textContent = '0/1000 caracteres';
            }
        });
    });
});
