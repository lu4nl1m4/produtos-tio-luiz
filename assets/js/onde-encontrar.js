// ===================================
// ONDE ENCONTRAR — validação do formulário de revendedor
// Depende de form-utils.js
// ===================================

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('resellerForm');
    if (!form) return;

    const submitBtn = document.getElementById('submitBtnReseller');
    const telefoneField = document.getElementById('telefoneReseller');

    function validateResellerForm(formData) {
        const estabelecimento = formData.get('estabelecimento').trim();
        const tipo = formData.get('tipoEstabelecimento');
        const responsavel = formData.get('responsavel').trim();
        const email = formData.get('emailReseller').trim();
        const telefone = formData.get('telefoneReseller').trim();
        const cidade = formData.get('cidade').trim();

        if (estabelecimento.length < 3) {
            showToast('error', 'Estabelecimento Inválido', 'O nome deve ter pelo menos 3 caracteres.');
            addShakeAnimation(document.getElementById('estabelecimento'));
            document.getElementById('estabelecimento').focus();
            return false;
        }
        if (!tipo) {
            showToast('error', 'Tipo Obrigatório', 'Selecione o tipo de estabelecimento.');
            addShakeAnimation(document.getElementById('tipoEstabelecimento'));
            document.getElementById('tipoEstabelecimento').focus();
            return false;
        }
        if (responsavel.length < 3) {
            showToast('error', 'Nome Inválido', 'O nome do responsável deve ter pelo menos 3 caracteres.');
            addShakeAnimation(document.getElementById('responsavel'));
            document.getElementById('responsavel').focus();
            return false;
        }
        if (!isValidEmail(email)) {
            showToast('error', 'Email Inválido', 'Por favor, insira um email válido.');
            addShakeAnimation(document.getElementById('emailReseller'));
            document.getElementById('emailReseller').focus();
            return false;
        }
        if (!isValidPhone(telefone)) {
            showToast('error', 'Telefone Inválido', 'Insira um telefone válido com DDD (10 ou 11 dígitos).');
            addShakeAnimation(document.getElementById('telefoneReseller'));
            document.getElementById('telefoneReseller').focus();
            return false;
        }
        if (cidade.length < 3) {
            showToast('error', 'Cidade Inválida', 'A cidade deve ter pelo menos 3 caracteres.');
            addShakeAnimation(document.getElementById('cidade'));
            document.getElementById('cidade').focus();
            return false;
        }
        return true;
    }

    if (telefoneField) applyPhoneMask(telefoneField);

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        submitFormToScript({
            formElement: form,
            submitBtnElement: submitBtn,
            validator: validateResellerForm,
            onSuccessMessage: {
                title: 'Solicitação Enviada!',
                message: 'Entraremos em contato em breve.'
            }
        });
    });
});
