# Wavex Payments — site

Landing page da Wavex Payments. HTML, CSS e JavaScript puros: **não tem build nem dependência** — é só publicar a pasta.

Versão de teste no ar: https://wavex-payments.vercel.app

## Publicar no domínio

**Vercel (recomendado, de graça)**
1. Em vercel.com → *Add New → Project* → importe este repositório.
2. *Framework Preset*: **Other**. Deixe *Build Command* e *Output Directory* em branco.
3. *Deploy*. Depois, em *Settings → Domains*, adicione o domínio e crie no DNS os registros que a Vercel mostrar.

**Outra hospedagem (cPanel, Hostinger etc.):** envie todos os arquivos para a pasta pública (`public_html`), mantendo a pasta `assets/`.

## Antes de ir pro ar

1. **`script.js`, no topo, objeto `CONFIG`:** preencha o número do WhatsApp (sem ele os leads do formulário não chegam no time), link do painel, redes, e-mail, termos, privacidade, razão social e CNPJ. Campo vazio some do site — não fica link quebrado.
2. **`index.html`, linhas `og:url` e `og:image`:** troque `https://wavex-payments.vercel.app` pelo domínio novo. É a prévia que aparece quando mandam o link no WhatsApp.

## Como funciona

- **Abertura:** roda toda vez que a página carrega (selo → globo → boas-vindas, ~13 s). Pula no botão, no Esc ou rolando a página. Quem usa "reduzir movimento" no aparelho entra direto.
- **Som das vendas:** o navegador só libera som depois de um clique ou toque do visitante — por isso existe o botão "Ativar som" na abertura.
- **Formulário:** abre o WhatsApp com a mensagem pronta para o número do `CONFIG.whatsapp`.

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | a página |
| `styles.css` | o visual |
| `script.js` | menu, abas, carrossel, formulário e o `CONFIG` |
| `intro.js` | a abertura (globo em WebGL) e o som das vendas |
| `assets/` | imagens, logos e texturas do globo |

## Créditos

Texturas da Terra: NASA Blue Marble e Black Marble (domínio público). Ícones: Lucide (ISC) e Simple Icons (CC0). Fonte: Geist (SIL OFL).
