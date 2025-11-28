/**
 * Testes para pipeline/fsboScore.js
 */

const { calculateFsboScore, calculateFsboScores } = require('../pipeline/fsboScore');

console.log('\n🧪 Pipeline FSBO Score tests');

// Teste 1: Score básico para anúncio FSBO
const fsboAd = {
  source: 'olx',
  ad_id: 'test1',
  url: 'https://example.com/test1',
  title: 'Apartamento T2',
  description: 'Apartamento muito bonito para venda',
  price: '150000',
  photos: ['photo1.jpg', 'photo2.jpg'],
  advertiser: {
    name: 'João Silva',
    total_ads: '1',
    is_agency: false,
    phone: '+351912345678'
  },
  signals: {
    watermark: false,
    duplicate: false,
    professional_photos: false,
    agency_keywords: []
  }
};

const fsboScore = calculateFsboScore(fsboAd);
if (fsboScore.score >= 50 && fsboScore.reasons.length > 0) {
  console.log('  ✅ Test 1: Score calculado para FSBO (score:', fsboScore.score + ')');
} else {
  console.error('  ❌ Test 1 falhou:', fsboScore);
}

// Teste 2: Score para anúncio de agência
const agencyAd = {
  source: 'imovirtual',
  ad_id: 'test2',
  url: 'https://example.com/test2',
  title: 'Moradia T4',
  description: 'Excelente moradia',
  price: '300000',
  photos: Array(25).fill('photo.jpg'),
  advertiser: {
    name: 'REMAX PRO',
    total_ads: '50',
    is_agency: true,
    phone: '+351912345678'
  },
  signals: {
    watermark: true,
    duplicate: false,
    professional_photos: true,
    agency_keywords: ['remax', 'ami']
  }
};

const agencyScore = calculateFsboScore(agencyAd);
if (agencyScore.score < 50) {
  console.log('  ✅ Test 2: Score baixo para agência (score:', agencyScore.score + ')');
} else {
  console.error('  ❌ Test 2 falhou: score deveria ser baixo para agência', agencyScore);
}

// Teste 3: Calcular scores para múltiplos anúncios
const ads = [fsboAd, agencyAd];
const scoredAds = calculateFsboScores(ads);
if (scoredAds.length === 2 && 
    scoredAds[0]._fsbo_score !== undefined && 
    scoredAds[1]._fsbo_score !== undefined) {
  console.log('  ✅ Test 3: Scores calculados para múltiplos anúncios');
} else {
  console.error('  ❌ Test 3 falhou:', scoredAds);
}

console.log('\n✅ Pipeline FSBO Score tests completed');

