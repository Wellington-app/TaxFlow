# TaxFlow - Planejamento Tributário & Gestão Financeira

Plataforma inteligente para simulação tributária e automação de fluxo de caixa para empreendedores.

## 📄 Links Legais (Para Google Play Store)

Para publicar o aplicativo na Google Play Store, você precisará fornecer os links para a Política de Privacidade e para a página de Exclusão de Dados. 

Se você estiver usando o **GitHub Pages**, os links serão:

*   **Política de Privacidade:** `https://<seu-usuario>.github.io/<seu-repositorio>/privacy.html`
*   **Exclusão de Conta:** `https://<seu-usuario>.github.io/<seu-repositorio>/delete-account.html`

*Nota: Substitua `<seu-usuario>` e `<seu-repositorio>` pelos seus dados do GitHub.*

## 🚀 Como gerar o APK/AAB via GitHub Actions

O projeto já está configurado com um workflow do GitHub Actions (`.github/workflows/android.yml`). 

1.  Vá na aba **Settings** do seu repositório no GitHub.
2.  Acesse **Secrets and variables** > **Actions**.
3.  Adicione os seguintes **Repository secrets**:
    *   `VITE_SUPABASE_URL`: Sua URL do Supabase.
    *   `VITE_SUPABASE_ANON_KEY`: Sua chave anônima do Supabase.
    *   `GEMINI_API_KEY`: Sua chave da API do Google Gemini.

### 🔑 Assinatura do App (Para Play Store)

Para que o arquivo `.aab` seja aceito na Play Store, ele precisa ser assinado. Se você quiser que o GitHub assine automaticamente, adicione também estes secrets:
*   `ANDROID_KEYSTORE_BASE64`: O seu arquivo `.keystore` convertido para base64.
*   `ANDROID_KEYSTORE_PASSWORD`: Senha do keystore.
*   `ANDROID_KEY_ALIAS`: Alias da chave.
*   `ANDROID_KEY_PASSWORD`: Senha da chave.

*Dica: Para converter seu keystore em base64, use o comando: `base64 -w 0 seu-arquivo.keystore`*

4.  Sempre que você fizer um `push` para a branch `main`, o GitHub gerará automaticamente o arquivo `.aab` (para a Play Store) e o `.apk` (para teste).

### 🎨 Ícones e Splash Screen

Para gerar os ícones do Android automaticamente a partir do arquivo `public/icon.svg`:

1.  Instale a ferramenta: `npm install @capacitor/assets -D`
2.  Crie uma pasta `assets` na raiz e coloque seu ícone lá (renomeie para `icon-only.png` ou similar se necessário).
3.  Execute: `npx capacitor-assets generate --android`

## 🛠 Tecnologias Utilizadas

*   **Frontend:** React + Vite + Tailwind CSS
*   **Backend/DB:** Supabase
*   **IA:** Google Gemini API
*   **Mobile:** Capacitor (Android)
