# Proteína

App para registar as gramas de proteína diárias. Funciona no telemóvel sem servidor e sem conta. Os dados ficam no próprio telemóvel.

## Como pôr online (GitHub Pages, ~5 min)

1. Cria um repositório no GitHub (pode ser privado se tiveres GitHub Pro; senão público, que não tem dados teus).
2. Faz upload de **todo o conteúdo desta pasta** para a raiz do repositório.
3. Settings → Pages → Source: "Deploy from a branch" → branch `main`, pasta `/ (root)` → Save.
4. Ao fim de 1–2 minutos fica disponível em `https://<utilizador>.github.io/<repositorio>/`.

A câmara só funciona em HTTPS, por isso não dá para abrir o `index.html` diretamente do telemóvel.

## Instalar no telemóvel

- **Android (Chrome):** abre o link → menu ⋮ → "Adicionar ao ecrã principal".
- **iPhone (Safari):** abre o link → botão Partilhar → "Adicionar ao ecrã principal".

Depois da primeira abertura, funciona sem rede. Só a pesquisa no Open Food Facts precisa de internet.

## Como funciona

- **Código de barras:** lido no telemóvel (BarcodeDetector nativo no Android, ZXing no iPhone).
- **Produto novo:** tenta o Open Food Facts; se não houver dados, lês a etiqueta com a câmara (OCR Tesseract, corre no telemóvel) ou escreves o valor.
- **Alimentos sem código:** a app traz ~40 alimentos comuns (frango, vitela, atum, ovos, leguminosas…) com valores médios por 100 g, cru ou cozinhado. Podes editar ou apagar.
- **Base de dados:** `localStorage` do browser. Usa Definições → Exportar para fazer cópias de segurança.

## Bibliotecas incluídas (em `lib/`)

- ZXing (Apache 2.0)
- Tesseract.js + tesseract.js-core + dados de português (Apache 2.0)
