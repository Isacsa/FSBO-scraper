# 🔍 Lógica de Detecção de Agências

## 📋 Sistema em Duas Camadas

O sistema usa **duas camadas** de detecção que trabalham juntas:

1. **`advertiserNormalizer.js`** - Detecção rápida baseada em heurísticas simples
2. **`fsboSignals.js`** - Detecção avançada com sistema de scoring

## 🎯 Camada 1: advertiserNormalizer.js

### Heurísticas Simples (OR lógico - qualquer uma indica agência)

#### 1. **Por Nome do Anunciante** (`detectAgencyByName`)
```javascript
// Se o nome contém qualquer uma destas palavras:
'remax', 'century', 'era', 'exp', 'properties', 'real estate',
'imobiliária', 'imobiliaria', 'mediador', 'mediadora',
'consultor', 'consultora', 'broker', 'realty', 'home', 'homes',
'sotheby', 'coldwell', 'banker', 'keller', 'williams', 'kw',
'ltd', 'lda', 's.a.', 'sociedade', 'empresa', 'group', 'grupo',
'investimentos', 'investment', 'gestão', 'gestao', 'management',
'consultoria', 'consulting'
```
**Resultado:** Se encontrar → `is_agency = true`

#### 2. **Por Número de Anúncios** (`detectAgencyByAdsCount`)
```javascript
// Se total_ads >= 5 → agência
if (totalAds >= 5) return true;
```
**Resultado:** Se tiver 5+ anúncios → `is_agency = true`

#### 3. **Por URL do Perfil** (`detectAgencyByUrl`)
```javascript
// Imovirtual: URLs com /empresas/ ou /agencias-imobiliarias/
// OLX: Não tem padrão claro (retorna false)
```
**Resultado:** Se URL indicar agência → `is_agency = true`

### Lógica Final da Camada 1:
```javascript
const isAgency = isAgencyByName || isAgencyByAds || isAgencyByUrl;
// Se QUALQUER uma for true → é agência
```

## 🎯 Camada 2: fsboSignals.js (Sistema de Scoring)

### Sistema de Pontuação (`calculateAgencyScore`)

O sistema atribui **pontos** baseado em múltiplos fatores:

#### a) Nome do Anunciante contém Keywords (+2 pontos)
```javascript
// Procura palavras-chave no nome (mesma lista da Camada 1)
// Mas ignora se estiver em contexto negativo
// Exemplo: "Não sou imobiliária" → não conta
```

#### b) URL do Anunciante é de Agência (+2 pontos)
```javascript
// URLs que indicam agência:
- /empresas/
- /agencias-imobiliarias/
- /agencias/
- contém 'remax', 'era', 'century', 'century21', 'c21'
```

#### c) Descrição contém Padrões Profissionais (+1 ponto)
```javascript
// Padrões regex:
- /ref[:\s]+[\w\d]+/i          // "REF: 12345"
- /ami[:\s]+[\w\d]+/i          // "AMI: 67890"
- /tratado\s+por/i             // "Tratado por..."
- /gestor\s+de\s+produto/i
- /mediador\s+imobiliário/i
- /consultor\s+imobiliário/i
- /equipa\s+de\s+vendas/i
- /escritório/i
- /sede/i
- /agência\s+imobiliária/i
```

#### d) Total de Anúncios (+1 ou +2 pontos)
```javascript
if (totalAds >= 20) score += 2;  // Muitos anúncios = agência
else if (totalAds >= 5) score += 1;  // Alguns anúncios = possível agência
```

#### e) Frases Negativas (-2 pontos)
```javascript
// Se encontrar palavras de negação + palavras de agência:
// Exemplo: "Não aceito imobiliárias" → -2 pontos
NEGATION_WORDS = [
  'não', 'nao', 'nunca', 'sem', 'evitar', 'dispenso',
  'não desejo', 'não quero', 'não aceito', 'não pretendo',
  'não respondo', 'não contactar', 'recuso', 'excluir'
]
```

### Lógica Final da Camada 2:
```javascript
const score = calculateAgencyScore(data);
const isAgency = score >= 2;  // Se score >= 2 → é agência
```

## 🔄 Como as Duas Camadas Trabalham Juntas

### Fluxo Completo:

1. **Scraper extrai dados** do anúncio
2. **advertiserNormalizer** analisa anunciante:
   - Visita perfil (se necessário)
   - Extrai `total_ads`
   - Detecta agência por nome/URL/anúncios
   - Define `advertiser.is_agency`
3. **fsboSignals** analisa sinais completos:
   - Analisa título, descrição, fotos
   - Calcula score de agência
   - Define `signals.is_agency`
4. **Filtro final** usa ambos:
   ```javascript
   const isAgency = ad.signals?.is_agency || 
                    ad.advertiser?.is_agency || 
                    false;
   ```

## 📊 Exemplos Práticos

### Exemplo 1: Agência Clara
```
Nome: "REMAX Lisboa"
Total Ads: 45
URL: "/empresas/remax-lisboa"
Descrição: "REF: 12345, AMI: 67890"

Resultado:
- Camada 1: isAgencyByName = true → is_agency = true ✅
- Camada 2: score = 2+2+1+2 = 7 → is_agency = true ✅
- Filtrado: SIM
```

### Exemplo 2: Particular com Muitos Anúncios
```
Nome: "João Silva"
Total Ads: 8
URL: "/users/joao-silva"
Descrição: "Vendo moradia particular"

Resultado:
- Camada 1: isAgencyByName = false, isAgencyByAds = true → is_agency = true ⚠️
- Camada 2: score = 0+0+0+1 = 1 → is_agency = false ✅
- Filtrado: NÃO (Camada 2 prevalece)
```

### Exemplo 3: Particular com Negação
```
Nome: "Maria Santos"
Total Ads: 1
URL: "/users/maria-santos"
Descrição: "Não aceito imobiliárias, vendo diretamente"

Resultado:
- Camada 1: is_agency = false ✅
- Camada 2: score = 0-2 = -2 → is_agency = false ✅
- Filtrado: NÃO
```

### Exemplo 4: Agência com Padrões Profissionais
```
Nome: "Century 21 Porto"
Total Ads: 12
URL: "/empresas/century21"
Descrição: "REF: C21-123, Tratado por mediador certificado"

Resultado:
- Camada 1: isAgencyByName = true → is_agency = true ✅
- Camada 2: score = 2+2+1+1 = 6 → is_agency = true ✅
- Filtrado: SIM
```

## ⚙️ Configuração

### Thresholds Atuais:

| Fator | Threshold | Pontos |
|-------|-----------|--------|
| Nome com keywords | Qualquer match | +2 |
| URL de agência | Padrões específicos | +2 |
| Padrões profissionais | Qualquer match | +1 |
| Total anúncios | >= 20 | +2 |
| Total anúncios | >= 5 | +1 |
| Frases negativas | Match | -2 |
| **Score mínimo** | **>= 2** | **→ Agência** |

### Ajustar Thresholds:

Para tornar mais restritivo (menos falsos positivos):
```javascript
// Em fsboSignals.js, linha 282:
return score >= 3;  // Era 2, agora 3
```

Para tornar menos restritivo (mais agências detectadas):
```javascript
return score >= 1;  // Era 2, agora 1
```

## 🎯 Pontos Fortes

1. ✅ **Dupla verificação** - Duas camadas independentes
2. ✅ **Contexto negativo** - Ignora "não sou agência"
3. ✅ **Múltiplos fatores** - Não depende de um único sinal
4. ✅ **Visita perfil** - Extrai dados reais do perfil
5. ✅ **Scoring flexível** - Pode ajustar threshold

## ⚠️ Limitações Conhecidas

1. ⚠️ **Particulares com muitos anúncios** - Podem ser falsos positivos
   - Solução: Camada 2 (scoring) ajuda a filtrar
   
2. ⚠️ **Agências sem keywords óbvias** - Podem passar despercebidas
   - Solução: Scoring por padrões profissionais ajuda
   
3. ⚠️ **Dependência de perfil** - Se não conseguir visitar perfil, perde dados
   - Solução: Funciona mesmo sem `total_ads`

## 📝 Resumo

**Lógica Final:**
```javascript
// 1. advertiserNormalizer detecta por:
isAgency = (nome tem keywords) || (totalAds >= 5) || (URL indica agência)

// 2. fsboSignals calcula score:
score = nome(+2) + URL(+2) + padrões(+1) + anúncios(+1/+2) - negações(-2)
isAgency = score >= 2

// 3. Filtro usa ambos:
isAgency = signals.is_agency || advertiser.is_agency
```

**Resultado:** Se qualquer camada indicar agência → filtrado automaticamente

