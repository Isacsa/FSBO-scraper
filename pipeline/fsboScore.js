const { analyzeFsboSignals } = require('../src/services/fsboSignals');

function humanizeEvidence(entry) {
  const labels = {
    owner_direct_phrase: 'Frases de contacto direto do proprietário',
    anti_agency_phrase: 'Texto explícito contra mediação/agências',
    advertiser_marked_private: 'Anunciante marcado como particular',
    advertiser_marked_agency: 'Anunciante marcado como agência',
    agency_keywords: 'Palavras-chave de agência detetadas',
    professional_pattern: 'Padrões profissionais no texto',
    watermark: 'Watermark ou marca comercial nas fotos',
    professional_photos: 'Fotos com padrão profissional',
    duplicate: 'Possível anúncio duplicado',
    many_ads: 'Anunciante com muitos anúncios',
    several_ads: 'Anunciante com vários anúncios',
    few_ads: 'Anunciante com poucos anúncios',
    portal_fsbo_decision: 'Portal classificou explicitamente como FSBO',
    portal_agency_decision: 'Portal classificou explicitamente como agência',
    portal_uncertain_decision: 'Portal classificou como incerto',
    mobile_prefix_96: 'Telefone com prefixo móvel 96',
    mobile_prefix_9: 'Telefone com prefixo móvel particular',
    landline_prefix: 'Telefone fixo/comercial',
  };

  return labels[entry] || entry;
}

function calculateFsboScore(ad) {
  const platform = ad?.source || 'olx';
  const signals = analyzeFsboSignals(ad || {}, platform);
  const reasons = [
    ...(signals.positive_evidence || []).map((entry) => `+ ${humanizeEvidence(entry)}`),
    ...(signals.negative_evidence || []).map((entry) => `- ${humanizeEvidence(entry)}`),
  ];

  return {
    score: signals.fsbo_score,
    decision: signals.fsbo_decision,
    reasons: reasons.length > 0 ? reasons : ['Sem evidência suficiente para explicar o score'],
    signals,
  };
}

function calculateFsboScores(ads) {
  return ads.map((ad) => {
    const scoreResult = calculateFsboScore(ad);
    return {
      ...ad,
      fsbo_score: typeof ad?.fsbo_score === 'number' ? ad.fsbo_score : scoreResult.score,
      signals: {
        ...(ad?.signals && typeof ad.signals === 'object' ? ad.signals : {}),
        ...scoreResult.signals,
      },
      _fsbo_score: scoreResult.score,
      _fsbo_reasons: scoreResult.reasons,
      _fsbo_decision: scoreResult.decision,
    };
  });
}

module.exports = {
  calculateFsboScore,
  calculateFsboScores,
};

