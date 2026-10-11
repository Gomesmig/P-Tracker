# Proteína

App para registar a proteína, as calorias e os hidratos que comes ao longo do dia. Funciona no telemóvel sem servidor e sem conta, e os dados ficam guardados no próprio telemóvel.

## Instalar no telemóvel

- **Android (Chrome):** abre o link → menu ⋮ → "Instalar app".
- **iPhone (Safari):** abre o link → Partilhar → "Adicionar ao ecrã principal".

Depois da primeira abertura, funciona sem rede. Só a pesquisa de produtos no Open Food Facts precisa de internet.

## Funcionalidades

- **Metas diárias:** proteína e água (objetivos a atingir), calorias e hidratos (limites). Definem-se no separador Definições, junto com a cópia de segurança.
- **Para fechar o dia:** sugere 1 ou 2 alimentos, sobretudo dos teus favoritos, com porções que fecham a proteína em falta sem passar o que resta de calorias e hidratos. As sugestões são para a refeição da hora atual: aprende com o que costumas comer a cada refeição (à noite, por exemplo, só sugere coisas leves como lacticínios). Um toque regista a sugestão.
- **Código de barras:** leitura contínua pela câmara. Os produtos novos são pesquisados no Open Food Facts.
- **Leitura da etiqueta:** tira foto à tabela nutricional para preencher proteína, calorias e hidratos por 100 g. O OCR corre no telemóvel.
- **Alimentos sem código:** cerca de 120 alimentos comuns (carne, charcutaria, peixe, marisco, ovos, queijos, frutos secos, sementes, legumes, leguminosas, cereais, fruta…) com valores médios por 100 g, em versão crua ou cozinhada. Podes editá-los ou apagá-los.
- **Refeições:** pequeno-almoço, almoço, lanche, jantar e ceia. A refeição é sugerida pela hora do registo e pode ser alterada.
- **Água:** botões de copo (250 ml), garrafa (500 ml) ou outro valor, com meta diária (2,5 L por defeito) e botão para desfazer.
- **Registo rápido:** para refeições fora de casa, só com as gramas de proteína (e, opcionalmente, calorias e hidratos).
- **Editar registos:** tocar num registo permite corrigir a quantidade ou a refeição.
- **Outros dias:** as setas junto à data permitem ver ou registar noutro dia.
- **Histórico:** gráfico dos últimos 14 dias de proteína, calorias, hidratos ou água. Tocar numa barra abre esse dia.
- **Partilhar:** em Definições há um código QR e um botão para enviar o link da app a outras pessoas (cada uma fica com os seus dados).
- **Cópia de segurança:** separador Definições → Exportar / Importar, em ficheiro JSON.

## Como funciona

- **Código de barras:** usa o BarcodeDetector nativo quando existe (Android) e a biblioteca ZXing nos outros casos (iPhone).
- **Etiquetas:** usa o Tesseract.js com o modelo de português, incluído na app.
- **Dados:** guardados no `localStorage` do browser. Faz exportações regulares para não perderes os produtos e os registos.
- **Atualizações:** ao alterar ficheiros, muda o `VERSION` no `sw.js` para os telemóveis apanharem a versão nova.

## Bibliotecas incluídas (em `lib/`)

- ZXing (Apache 2.0)
- qrcode-generator (MIT)
- Tesseract.js, tesseract.js-core e dados de português (Apache 2.0)
