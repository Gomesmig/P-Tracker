# Proteína

App para registar a proteína, as calorias e os hidratos que comes ao longo do dia. Funciona no telemóvel sem servidor e sem conta, e os dados ficam guardados no próprio telemóvel.

## Instalar no telemóvel

- **Android (Chrome):** abre o link → menu ⋮ → "Instalar app".
- **iPhone (Safari):** abre o link → Partilhar → "Adicionar ao ecrã principal".

Depois da primeira abertura, funciona sem rede. Só a pesquisa de produtos no Open Food Facts precisa de internet.

## Funcionalidades

- **Metas diárias:** proteína (objetivo a atingir), calorias e hidratos (limites). Definem-se em Definições.
- **Código de barras:** leitura contínua pela câmara. Os produtos novos são pesquisados no Open Food Facts.
- **Leitura da etiqueta:** tira foto à tabela nutricional para preencher proteína, calorias e hidratos por 100 g. O OCR corre no telemóvel.
- **Alimentos sem código:** cerca de 55 alimentos comuns (carne, peixe, ovos, lacticínios, leguminosas, cereais, fruta…) com valores médios por 100 g, em versão crua ou cozinhada. Podes editá-los ou apagá-los.
- **Refeições:** pequeno-almoço, almoço, lanche, jantar e ceia. A refeição é sugerida pela hora do registo e pode ser alterada.
- **Registo rápido:** para refeições fora de casa, só com as gramas de proteína (e, opcionalmente, calorias e hidratos).
- **Editar registos:** tocar num registo permite corrigir a quantidade ou a refeição.
- **Outros dias:** as setas junto à data permitem ver ou registar noutro dia.
- **Histórico:** gráfico dos últimos 14 dias de proteína, calorias ou hidratos. Tocar numa barra abre esse dia.
- **Cópia de segurança:** Definições → Exportar / Importar, em ficheiro JSON.

## Como funciona

- **Código de barras:** usa o BarcodeDetector nativo quando existe (Android) e a biblioteca ZXing nos outros casos (iPhone).
- **Etiquetas:** usa o Tesseract.js com o modelo de português, incluído na app.
- **Dados:** guardados no `localStorage` do browser. Faz exportações regulares para não perderes os produtos e os registos.
- **Atualizações:** ao alterar ficheiros, muda o `VERSION` no `sw.js` para os telemóveis apanharem a versão nova.

## Bibliotecas incluídas (em `lib/`)

- ZXing (Apache 2.0)
- Tesseract.js, tesseract.js-core e dados de português (Apache 2.0)
