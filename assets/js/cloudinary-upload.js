// Upload de imagens para o Cloudinary (free tier) — sem backend.
// Usa "unsigned upload preset" — o navegador envia direto pra API do Cloudinary.
//
// Como funciona:
// 1. Você cria uma conta em cloudinary.com
// 2. Cria um upload preset com Signing Mode = Unsigned
// 3. Substitui CLOUD_NAME e UPLOAD_PRESET abaixo pelos valores reais
//
// Segurança: como o preset é unsigned, qualquer um que descobrir o nome pode fazer
// upload. Mitigação está no próprio preset (formato, tamanho, pasta restrita) —
// configure essas restrições no painel do Cloudinary.

const CLOUD_NAME    = "dwy3jzhyz";
const UPLOAD_PRESET = "tio-luiz-produtos";

const MAX_BYTES = 2 * 1024 * 1024;  // 2 MB — também limite o preset no Cloudinary

export function cloudinaryConfigurado() {
  return CLOUD_NAME && CLOUD_NAME !== "COLE_AQUI_O_CLOUD_NAME";
}

// Upload de um único arquivo. Retorna a URL segura (https) da imagem.
// Lança erro com mensagem amigável em caso de falha.
export async function uploadImagem(file, { onProgress } = {}) {
  if (!cloudinaryConfigurado()) {
    throw new Error("Cloudinary não configurado — preencha CLOUD_NAME em cloudinary-upload.js.");
  }
  if (!file) throw new Error("Nenhum arquivo selecionado.");
  if (!file.type.startsWith("image/")) {
    throw new Error("Arquivo precisa ser uma imagem (jpg, png, webp).");
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`Imagem muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Limite: ${MAX_BYTES / 1024 / 1024} MB.`);
  }

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);

  // Usa XMLHttpRequest pra ter progresso (fetch nativo não suporta upload progress).
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.secure_url) resolve(data.secure_url);
          else reject(new Error("Resposta inesperada do Cloudinary."));
        } catch {
          reject(new Error("Resposta inválida do Cloudinary."));
        }
      } else {
        let msg = `Cloudinary retornou ${xhr.status}.`;
        try {
          const err = JSON.parse(xhr.responseText);
          if (err.error?.message) msg = `Cloudinary: ${err.error.message}`;
        } catch {}
        reject(new Error(msg));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Falha de rede no upload.")));
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelado.")));

    xhr.send(form);
  });
}
