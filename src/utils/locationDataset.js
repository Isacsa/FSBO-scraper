/**
 * Dataset de localidades de Portugal
 * Contém distritos, concelhos e freguesias principais
 * Estrutura: { freguesia: { municipality, district, lat, lng } }
 */

const locationDataset = {
  // Porto e região
  'freamunde': {
    municipality: 'Paços de Ferreira',
    district: 'Porto',
    lat: 41.28882,
    lng: -8.37901
  },
  'paços de ferreira': {
    municipality: 'Paços de Ferreira',
    district: 'Porto',
    lat: 41.2775,
    lng: -8.3761
  },
  'porto': {
    municipality: 'Porto',
    district: 'Porto',
    lat: 41.1579,
    lng: -8.6291
  },
  'cedofeita': {
    municipality: 'Porto',
    district: 'Porto',
    lat: 41.1523,
    lng: -8.6254
  },
  'cedofeita, santo ildefonso e sé': {
    municipality: 'Porto',
    district: 'Porto',
    lat: 41.1523,
    lng: -8.6254
  },
  'santo ildefonso': {
    municipality: 'Porto',
    district: 'Porto',
    lat: 41.1523,
    lng: -8.6254
  },
  'sé': {
    municipality: 'Porto',
    district: 'Porto',
    lat: 41.1425,
    lng: -8.6167
  },
  'lumiar': {
    municipality: 'Lisboa',
    district: 'Lisboa',
    lat: 38.7706,
    lng: -9.1603
  },
  'campo de ourique': {
    municipality: 'Lisboa',
    district: 'Lisboa',
    lat: 38.7144,
    lng: -9.1608
  },
  'azeitão': {
    municipality: 'Setúbal',
    district: 'Setúbal',
    lat: 38.5208,
    lng: -9.0114
  },
  'azeitão (são lourenço e são simão)': {
    municipality: 'Setúbal',
    district: 'Setúbal',
    lat: 38.5208,
    lng: -9.0114
  },
  'são lourenço': {
    municipality: 'Setúbal',
    district: 'Setúbal',
    lat: 38.5208,
    lng: -9.0114
  },
  'ericeira': {
    municipality: 'Mafra',
    district: 'Lisboa',
    lat: 39.0217,
    lng: -9.4156
  },
  'vila nova de gaia': {
    municipality: 'Vila Nova de Gaia',
    district: 'Porto',
    lat: 41.1239,
    lng: -8.6118
  },
  'gaia': {
    municipality: 'Vila Nova de Gaia',
    district: 'Porto',
    lat: 41.1239,
    lng: -8.6118
  },
  
  // Viana do Castelo
  'viana do castelo': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.6918,
    lng: -8.8347
  },
  'meadela': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.7052,
    lng: -8.8437
  },
  'santa maria maior e monserrate e meadela': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.7052,
    lng: -8.8437
  },
  'beco da fonte do branco': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.7052,
    lng: -8.8437
  },
  
  // Lisboa
  'lisboa': {
    municipality: 'Lisboa',
    district: 'Lisboa',
    lat: 38.7223,
    lng: -9.1393
  },
  'carnide': {
    municipality: 'Lisboa',
    district: 'Lisboa',
    lat: 38.7606,
    lng: -9.1925
  },
  'amadora': {
    municipality: 'Amadora',
    district: 'Lisboa',
    lat: 38.7538,
    lng: -9.2308
  },
  'sintra': {
    municipality: 'Sintra',
    district: 'Lisboa',
    lat: 38.8029,
    lng: -9.3817
  },
  'cascais': {
    municipality: 'Cascais',
    district: 'Lisboa',
    lat: 38.6979,
    lng: -9.4215
  },
  'oeiras': {
    municipality: 'Oeiras',
    district: 'Lisboa',
    lat: 38.6910,
    lng: -9.3107
  },
  
  // Setúbal
  'setúbal': {
    municipality: 'Setúbal',
    district: 'Setúbal',
    lat: 38.5244,
    lng: -8.8882
  },
  'almada': {
    municipality: 'Almada',
    district: 'Setúbal',
    lat: 38.6790,
    lng: -9.1567
  },
  'seixal': {
    municipality: 'Seixal',
    district: 'Setúbal',
    lat: 38.6400,
    lng: -9.1011
  },
  'barreiro': {
    municipality: 'Barreiro',
    district: 'Setúbal',
    lat: 38.6609,
    lng: -9.0724
  },
  
  // Braga
  'braga': {
    municipality: 'Braga',
    district: 'Braga',
    lat: 41.5518,
    lng: -8.4229
  },
  'guimarães': {
    municipality: 'Guimarães',
    district: 'Braga',
    lat: 41.4444,
    lng: -8.2962
  },
  'famalicão': {
    municipality: 'Vila Nova de Famalicão',
    district: 'Braga',
    lat: 41.4081,
    lng: -8.5198
  },
  'vila nova de famalicão': {
    municipality: 'Vila Nova de Famalicão',
    district: 'Braga',
    lat: 41.4081,
    lng: -8.5198
  },
  
  // Aveiro
  'aveiro': {
    municipality: 'Aveiro',
    district: 'Aveiro',
    lat: 40.6405,
    lng: -8.6538
  },
  'oliveira do bairro': {
    municipality: 'Oliveira do Bairro',
    district: 'Aveiro',
    lat: 40.5147,
    lng: -8.4936
  },
  
  // Coimbra
  'coimbra': {
    municipality: 'Coimbra',
    district: 'Coimbra',
    lat: 40.2033,
    lng: -8.4103
  },
  
  // Leiria
  'leiria': {
    municipality: 'Leiria',
    district: 'Leiria',
    lat: 39.7436,
    lng: -8.8071
  },
  'marinha grande': {
    municipality: 'Marinha Grande',
    district: 'Leiria',
    lat: 39.7472,
    lng: -8.9322
  },
  
  // Santarém
  'santarém': {
    municipality: 'Santarém',
    district: 'Santarém',
    lat: 39.2362,
    lng: -8.6860
  },
  
  // Évora
  'évora': {
    municipality: 'Évora',
    district: 'Évora',
    lat: 38.5665,
    lng: -7.9132
  },
  'evora': {
    municipality: 'Évora',
    district: 'Évora',
    lat: 38.5665,
    lng: -7.9132
  },
  
  // Faro
  'faro': {
    municipality: 'Faro',
    district: 'Faro',
    lat: 37.0194,
    lng: -7.9322
  },
  'portimão': {
    municipality: 'Portimão',
    district: 'Faro',
    lat: 37.1386,
    lng: -8.5378
  },
  'lagos': {
    municipality: 'Lagos',
    district: 'Faro',
    lat: 37.1020,
    lng: -8.6756
  },
  'tavira': {
    municipality: 'Tavira',
    district: 'Faro',
    lat: 37.1266,
    lng: -7.6484
  },
  
  // Madeira
  'funchal': {
    municipality: 'Funchal',
    district: 'Ilha da Madeira',
    lat: 32.6497,
    lng: -16.9084
  },
  'câmara de lobos': {
    municipality: 'Câmara de Lobos',
    district: 'Ilha da Madeira',
    lat: 32.6500,
    lng: -16.9767
  },
  'camara de lobos': {
    municipality: 'Câmara de Lobos',
    district: 'Ilha da Madeira',
    lat: 32.6500,
    lng: -16.9767
  },
  
  // Açores
  'ponta delgada': {
    municipality: 'Ponta Delgada',
    district: 'Ilha de São Miguel',
    lat: 37.7394,
    lng: -25.6687
  },
  'angra do heroísmo': {
    municipality: 'Angra do Heroísmo',
    district: 'Ilha Terceira',
    lat: 38.6583,
    lng: -27.2208
  },
  'angra do heroismo': {
    municipality: 'Angra do Heroísmo',
    district: 'Ilha Terceira',
    lat: 38.6583,
    lng: -27.2208
  }
};

/**
 * Normaliza nome de localidade para busca
 */
function normalizeLocationName(name) {
  if (!name || typeof name !== 'string') return '';
  
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s]/g, ' ') // Remove pontuação
    .replace(/\s+/g, ' ') // Normaliza espaços
    .trim();
}

/**
 * Busca localidade no dataset
 */
function findInDataset(locationName) {
  const normalized = normalizeLocationName(locationName);
  
  // Busca exata
  if (locationDataset[normalized]) {
    return locationDataset[normalized];
  }
  
  // Busca parcial (fuzzy)
  for (const [key, value] of Object.entries(locationDataset)) {
    if (key.includes(normalized) || normalized.includes(key)) {
      return value;
    }
  }
  
  return null;
}

/**
 * Busca por concelho
 */
function findMunicipality(municipalityName) {
  const normalized = normalizeLocationName(municipalityName);
  
  for (const [key, value] of Object.entries(locationDataset)) {
    if (normalizeLocationName(value.municipality) === normalized) {
      return value;
    }
  }
  
  return null;
}

/**
 * Busca por distrito
 */
function findDistrict(districtName) {
  const normalized = normalizeLocationName(districtName);
  
  // Retornar primeiro concelho do distrito
  for (const [key, value] of Object.entries(locationDataset)) {
    if (normalizeLocationName(value.district) === normalized) {
      return value;
    }
  }
  
  return null;
}

module.exports = {
  locationDataset,
  normalizeLocationName,
  findInDataset,
  findMunicipality,
  findDistrict
};

