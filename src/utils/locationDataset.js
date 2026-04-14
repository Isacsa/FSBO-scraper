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
  
  // Viana do Castelo (concelho)
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
  'areosa': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.7150,
    lng: -8.8650
  },
  'darque': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.6800,
    lng: -8.8200
  },
  'santa marta de portuzelo': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.7200,
    lng: -8.8100
  },
  'afife': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.7550,
    lng: -8.8750
  },
  'carreco': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.7350,
    lng: -8.8700
  },
  'carreço': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.7350,
    lng: -8.8700
  },
  'barroselas': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.6550,
    lng: -8.7400
  },
  'lanheses': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.7350,
    lng: -8.7700
  },
  'deao': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.7400,
    lng: -8.7900
  },
  'deão': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.7400,
    lng: -8.7900
  },
  'perre': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.7150,
    lng: -8.8150
  },
  'neiva': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.6400,
    lng: -8.7700
  },
  'castelo do neiva': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.6300,
    lng: -8.7800
  },
  'vila de punhe': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.6600,
    lng: -8.7500
  },
  'chafe': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.6350,
    lng: -8.7900
  },
  'chafé': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.6350,
    lng: -8.7900
  },
  'cardielos': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.7100,
    lng: -8.7800
  },
  'montaria': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.7500,
    lng: -8.7600
  },
  'anha': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.6700,
    lng: -8.8100
  },
  'vila fria': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.6700,
    lng: -8.7600
  },
  'mujaes': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.6600,
    lng: -8.7700
  },
  'mujães': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.6600,
    lng: -8.7700
  },
  'alvaraes': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.6500,
    lng: -8.7600
  },
  'alvarães': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.6500,
    lng: -8.7600
  },
  'outeiro': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.6900,
    lng: -8.7900
  },
  'amorosa': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.6400,
    lng: -8.8000
  },
  'freixo de baixo': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.6800,
    lng: -8.7500
  },
  'portuzelo': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.7200,
    lng: -8.8100
  },
  'serreleis': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.6950,
    lng: -8.7800
  },
  'torre': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.7000,
    lng: -8.8000
  },
  'mazarefes': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.6500,
    lng: -8.7500
  },
  'subportela': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.7100,
    lng: -8.8000
  },
  'nogueira': {
    municipality: 'Viana do Castelo',
    district: 'Viana do Castelo',
    lat: 41.7050,
    lng: -8.7700
  },
  // Viana do Castelo — freguesias adicionais
  'amonde': { municipality: 'Viana do Castelo', district: 'Viana do Castelo', lat: 41.7200, lng: -8.7200 },
  'deocriste': { municipality: 'Viana do Castelo', district: 'Viana do Castelo', lat: 41.7000, lng: -8.8100 },
  'freixieiro de soutelo': { municipality: 'Viana do Castelo', district: 'Viana do Castelo', lat: 41.7400, lng: -8.7400 },
  'mazarefes e vila fria': { municipality: 'Viana do Castelo', district: 'Viana do Castelo', lat: 41.6700, lng: -8.7900 },
  'meixedo (viana do castelo)': { municipality: 'Viana do Castelo', district: 'Viana do Castelo', lat: 41.7300, lng: -8.8100 },
  'sao romao do neiva': { municipality: 'Viana do Castelo', district: 'Viana do Castelo', lat: 41.6700, lng: -8.7500 },
  'são romão do neiva': { municipality: 'Viana do Castelo', district: 'Viana do Castelo', lat: 41.6700, lng: -8.7500 },
  'serreleis': { municipality: 'Viana do Castelo', district: 'Viana do Castelo', lat: 41.7100, lng: -8.8200 },
  'vila franca': { municipality: 'Viana do Castelo', district: 'Viana do Castelo', lat: 41.7200, lng: -8.7900 },
  'vilar de murteda': { municipality: 'Viana do Castelo', district: 'Viana do Castelo', lat: 41.7300, lng: -8.7500 },

  // Ponte de Lima
  'ponte de lima': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7671,
    lng: -8.5838
  },
  'arcozelo': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7480,
    lng: -8.5990
  },
  'anais': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7350,
    lng: -8.5750
  },
  'correlhã': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7550,
    lng: -8.6100
  },
  'fontão': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7900,
    lng: -8.5700
  },
  'ribeira': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7700,
    lng: -8.5850
  },
  'labrujó, rendufe e vilar do monte': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7200,
    lng: -8.5600
  },
  'labrujó': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7200,
    lng: -8.5600
  },
  'labruj': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7200,
    lng: -8.5600
  },
  'freixo': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7800,
    lng: -8.5700
  },
  'brandara': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7600,
    lng: -8.6200
  },
  'refoios do lima': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7900,
    lng: -8.5600
  },
  'refoios': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7900,
    lng: -8.5600
  },
  'facha': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7400,
    lng: -8.5500
  },
  'bertiandos': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7500,
    lng: -8.6300
  },
  'estoraos': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7300,
    lng: -8.6000
  },
  'estorãos': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7300,
    lng: -8.6000
  },
  'moreira do lima': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7400,
    lng: -8.6200
  },
  'santa comba': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7500,
    lng: -8.5500
  },
  'calheiros': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7800,
    lng: -8.6100
  },
  'poiares': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.8000,
    lng: -8.5800
  },
  'calvelo': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7600,
    lng: -8.5500
  },
  'gemieira': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7500,
    lng: -8.5700
  },
  'barrio': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7300,
    lng: -8.5800
  },
  'bárrio': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7300,
    lng: -8.5800
  },
  'serdedelo': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7200,
    lng: -8.5700
  },
  'arca e ponte de lima': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7671,
    lng: -8.5838
  },
  'arca': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7650,
    lng: -8.5900
  },
  'beiral do lima': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7800,
    lng: -8.6300
  },
  'cepoes': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.8100,
    lng: -8.5500
  },
  'cepões': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.8100,
    lng: -8.5500
  },
  'friastelas': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7700,
    lng: -8.5600
  },
  'cabracao': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.8000,
    lng: -8.5400
  },
  'cabração': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.8000,
    lng: -8.5400
  },
  'feitosa': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7300,
    lng: -8.5600
  },
  'gaifar': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7400,
    lng: -8.5800
  },
  'queijada': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7100,
    lng: -8.5700
  },
  'rebordes santa maria': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7600,
    lng: -8.5700
  },
  'rebordes': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7600,
    lng: -8.5700
  },
  'sao pedro d arcos': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7500,
    lng: -8.5600
  },
  'são pedro d arcos': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7500,
    lng: -8.5600
  },
  'santa cruz do lima': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7400,
    lng: -8.5900
  },
  'vitorino das donas': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7200,
    lng: -8.5500
  },
  'boalhosa': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7100,
    lng: -8.5600
  },
  'fornelos': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7400,
    lng: -8.6100
  },
  'seara': {
    municipality: 'Ponte de Lima',
    district: 'Viana do Castelo',
    lat: 41.7900,
    lng: -8.5400
  },
  // Ponte de Lima — freguesias adicionais
  'arca e louturao': { municipality: 'Ponte de Lima', district: 'Viana do Castelo', lat: 41.7800, lng: -8.5800 },
  'arca e louturão': { municipality: 'Ponte de Lima', district: 'Viana do Castelo', lat: 41.7800, lng: -8.5800 },
  'bertiandos e sa': { municipality: 'Ponte de Lima', district: 'Viana do Castelo', lat: 41.7500, lng: -8.6100 },
  'bertiandos e sá': { municipality: 'Ponte de Lima', district: 'Viana do Castelo', lat: 41.7500, lng: -8.6100 },
  'cabacos e fojo lobal': { municipality: 'Ponte de Lima', district: 'Viana do Castelo', lat: 41.8000, lng: -8.5300 },
  'cabaços e fojo lobal': { municipality: 'Ponte de Lima', district: 'Viana do Castelo', lat: 41.8000, lng: -8.5300 },
  'cabracao e moreira do lima': { municipality: 'Ponte de Lima', district: 'Viana do Castelo', lat: 41.7900, lng: -8.5600 },
  'cabração e moreira do lima': { municipality: 'Ponte de Lima', district: 'Viana do Castelo', lat: 41.7900, lng: -8.5600 },
  'fornelos e queijada': { municipality: 'Ponte de Lima', district: 'Viana do Castelo', lat: 41.7700, lng: -8.5500 },
  'gandra (ponte de lima)': { municipality: 'Ponte de Lima', district: 'Viana do Castelo', lat: 41.7600, lng: -8.5800 },
  'navio e vitorino dos piaes': { municipality: 'Ponte de Lima', district: 'Viana do Castelo', lat: 41.7300, lng: -8.6000 },
  'navió e vitorino dos piães': { municipality: 'Ponte de Lima', district: 'Viana do Castelo', lat: 41.7300, lng: -8.6000 },
  'sao pedro de arcos': { municipality: 'Ponte de Lima', district: 'Viana do Castelo', lat: 41.7600, lng: -8.6200 },
  'são pedro de arcos': { municipality: 'Ponte de Lima', district: 'Viana do Castelo', lat: 41.7600, lng: -8.6200 },

  // Arcos de Valdevez
  'arcos de valdevez': {
    municipality: 'Arcos de Valdevez',
    district: 'Viana do Castelo',
    lat: 41.8467,
    lng: -8.4167
  },
  'guilhadeses e santar': {
    municipality: 'Arcos de Valdevez',
    district: 'Viana do Castelo',
    lat: 41.8600,
    lng: -8.3900
  },
  'paco': {
    municipality: 'Arcos de Valdevez',
    district: 'Viana do Castelo',
    lat: 41.8500,
    lng: -8.4300
  },
  'paço': {
    municipality: 'Arcos de Valdevez',
    district: 'Viana do Castelo',
    lat: 41.8500,
    lng: -8.4300
  },
  'jolda sao paio': {
    municipality: 'Arcos de Valdevez',
    district: 'Viana do Castelo',
    lat: 41.8900,
    lng: -8.4500
  },
  'jolda': {
    municipality: 'Arcos de Valdevez',
    district: 'Viana do Castelo',
    lat: 41.8900,
    lng: -8.4500
  },
  'sabadim': {
    municipality: 'Arcos de Valdevez',
    district: 'Viana do Castelo',
    lat: 41.8400,
    lng: -8.3800
  },
  'grade': {
    municipality: 'Arcos de Valdevez',
    district: 'Viana do Castelo',
    lat: 41.8200,
    lng: -8.4100
  },
  'prozelo': {
    municipality: 'Arcos de Valdevez',
    district: 'Viana do Castelo',
    lat: 41.8700,
    lng: -8.4200
  },
  'sao jorge': {
    municipality: 'Arcos de Valdevez',
    district: 'Viana do Castelo',
    lat: 41.8400,
    lng: -8.4400
  },
  'são jorge': {
    municipality: 'Arcos de Valdevez',
    district: 'Viana do Castelo',
    lat: 41.8400,
    lng: -8.4400
  },
  'giela': {
    municipality: 'Arcos de Valdevez',
    district: 'Viana do Castelo',
    lat: 41.8300,
    lng: -8.4200
  },
  'miranda': {
    municipality: 'Arcos de Valdevez',
    district: 'Viana do Castelo',
    lat: 41.8600,
    lng: -8.4000
  },
  'sistelo': {
    municipality: 'Arcos de Valdevez',
    district: 'Viana do Castelo',
    lat: 41.9500,
    lng: -8.3700
  },
  'soajo': {
    municipality: 'Arcos de Valdevez',
    district: 'Viana do Castelo',
    lat: 41.8700,
    lng: -8.2800
  },
  'azere': {
    municipality: 'Arcos de Valdevez',
    district: 'Viana do Castelo',
    lat: 41.8500,
    lng: -8.3600
  },
  'cabreiro': {
    municipality: 'Arcos de Valdevez',
    district: 'Viana do Castelo',
    lat: 41.8800,
    lng: -8.4300
  },
  'cendufe': {
    municipality: 'Arcos de Valdevez',
    district: 'Viana do Castelo',
    lat: 41.8300,
    lng: -8.3600
  },
  'eiras': {
    municipality: 'Arcos de Valdevez',
    district: 'Viana do Castelo',
    lat: 41.8200,
    lng: -8.4300
  },
  'ermelo': {
    municipality: 'Arcos de Valdevez',
    district: 'Viana do Castelo',
    lat: 41.8900,
    lng: -8.3100
  },
  'loureda': {
    municipality: 'Arcos de Valdevez',
    district: 'Viana do Castelo',
    lat: 41.8700,
    lng: -8.4600
  },
  'mei': {
    municipality: 'Arcos de Valdevez',
    district: 'Viana do Castelo',
    lat: 41.8400,
    lng: -8.4500
  },
  'monte redondo': {
    municipality: 'Arcos de Valdevez',
    district: 'Viana do Castelo',
    lat: 41.8600,
    lng: -8.4400
  },
  'oliveira': {
    municipality: 'Arcos de Valdevez',
    district: 'Viana do Castelo',
    lat: 41.8300,
    lng: -8.4000
  },
  'padreiro': {
    municipality: 'Arcos de Valdevez',
    district: 'Viana do Castelo',
    lat: 41.8500,
    lng: -8.4500
  },
  'portela': {
    municipality: 'Arcos de Valdevez',
    district: 'Viana do Castelo',
    lat: 41.8400,
    lng: -8.3700
  },
  'rio frio': {
    municipality: 'Arcos de Valdevez',
    district: 'Viana do Castelo',
    lat: 41.8600,
    lng: -8.3500
  },
  'senharei': {
    municipality: 'Arcos de Valdevez',
    district: 'Viana do Castelo',
    lat: 41.8200,
    lng: -8.4200
  },
  'tavora': {
    municipality: 'Arcos de Valdevez',
    district: 'Viana do Castelo',
    lat: 41.8700,
    lng: -8.4100
  },
  'távora': {
    municipality: 'Arcos de Valdevez',
    district: 'Viana do Castelo',
    lat: 41.8700,
    lng: -8.4100
  },
  'vale': {
    municipality: 'Arcos de Valdevez',
    district: 'Viana do Castelo',
    lat: 41.8300,
    lng: -8.4400
  },
  'vilela': {
    municipality: 'Arcos de Valdevez',
    district: 'Viana do Castelo',
    lat: 41.8500,
    lng: -8.4200
  },
  // Arcos de Valdevez — freguesias adicionais
  'aboim, gavieira e alvora': { municipality: 'Arcos de Valdevez', district: 'Viana do Castelo', lat: 41.9100, lng: -8.2800 },
  'aguia': { municipality: 'Arcos de Valdevez', district: 'Viana do Castelo', lat: 41.8700, lng: -8.4500 },
  'aguiã': { municipality: 'Arcos de Valdevez', district: 'Viana do Castelo', lat: 41.8700, lng: -8.4500 },
  'arcos de valdevez (salvador)': { municipality: 'Arcos de Valdevez', district: 'Viana do Castelo', lat: 41.8480, lng: -8.4160 },
  'azere': { municipality: 'Arcos de Valdevez', district: 'Viana do Castelo', lat: 41.8200, lng: -8.3800 },
  'ázere': { municipality: 'Arcos de Valdevez', district: 'Viana do Castelo', lat: 41.8200, lng: -8.3800 },
  'cabana maior': { municipality: 'Arcos de Valdevez', district: 'Viana do Castelo', lat: 41.9000, lng: -8.3200 },
  'couto': { municipality: 'Arcos de Valdevez', district: 'Viana do Castelo', lat: 41.8300, lng: -8.4300 },
  'extremo': { municipality: 'Arcos de Valdevez', district: 'Viana do Castelo', lat: 41.8600, lng: -8.3900 },
  'oliveira (arcos de valdevez)': { municipality: 'Arcos de Valdevez', district: 'Viana do Castelo', lat: 41.8400, lng: -8.4400 },
  'padreiro (salvador)': { municipality: 'Arcos de Valdevez', district: 'Viana do Castelo', lat: 41.8800, lng: -8.4300 },
  'padreiro (santa cristina)': { municipality: 'Arcos de Valdevez', district: 'Viana do Castelo', lat: 41.8900, lng: -8.4200 },
  'tavora (santa maria)': { municipality: 'Arcos de Valdevez', district: 'Viana do Castelo', lat: 41.8300, lng: -8.3600 },
  'távora (santa maria)': { municipality: 'Arcos de Valdevez', district: 'Viana do Castelo', lat: 41.8300, lng: -8.3600 },
  'tavora (sao vicente)': { municipality: 'Arcos de Valdevez', district: 'Viana do Castelo', lat: 41.8400, lng: -8.3500 },
  'távora (são vicente)': { municipality: 'Arcos de Valdevez', district: 'Viana do Castelo', lat: 41.8400, lng: -8.3500 },

  // Ponte da Barca
  'ponte da barca': {
    municipality: 'Ponte da Barca',
    district: 'Viana do Castelo',
    lat: 41.8094,
    lng: -8.4175
  },
  'vila nova de muia': {
    municipality: 'Ponte da Barca',
    district: 'Viana do Castelo',
    lat: 41.8200,
    lng: -8.3900
  },
  'vila nova de muía': {
    municipality: 'Ponte da Barca',
    district: 'Viana do Castelo',
    lat: 41.8200,
    lng: -8.3900
  },
  'bravaes': {
    municipality: 'Ponte da Barca',
    district: 'Viana do Castelo',
    lat: 41.8100,
    lng: -8.4300
  },
  'bravães': {
    municipality: 'Ponte da Barca',
    district: 'Viana do Castelo',
    lat: 41.8100,
    lng: -8.4300
  },
  'crasto': {
    municipality: 'Ponte da Barca',
    district: 'Viana do Castelo',
    lat: 41.8300,
    lng: -8.3700
  },
  'lindoso': {
    municipality: 'Ponte da Barca',
    district: 'Viana do Castelo',
    lat: 41.8700,
    lng: -8.2100
  },
  'entre ambos-os-rios': {
    municipality: 'Ponte da Barca',
    district: 'Viana do Castelo',
    lat: 41.8400,
    lng: -8.2500
  },
  'entre ambos os rios': {
    municipality: 'Ponte da Barca',
    district: 'Viana do Castelo',
    lat: 41.8400,
    lng: -8.2500
  },
  'britelo': {
    municipality: 'Ponte da Barca',
    district: 'Viana do Castelo',
    lat: 41.8200,
    lng: -8.4400
  },
  'germil': {
    municipality: 'Ponte da Barca',
    district: 'Viana do Castelo',
    lat: 41.8300,
    lng: -8.2800
  },
  'lavradas': {
    municipality: 'Ponte da Barca',
    district: 'Viana do Castelo',
    lat: 41.8000,
    lng: -8.3800
  },
  'oleiros': {
    municipality: 'Ponte da Barca',
    district: 'Viana do Castelo',
    lat: 41.8100,
    lng: -8.4000
  },
  'ruivos': {
    municipality: 'Ponte da Barca',
    district: 'Viana do Castelo',
    lat: 41.7900,
    lng: -8.3700
  },
  'sampriz': {
    municipality: 'Ponte da Barca',
    district: 'Viana do Castelo',
    lat: 41.7900,
    lng: -8.4200
  },
  'touvedo': {
    municipality: 'Ponte da Barca',
    district: 'Viana do Castelo',
    lat: 41.7800,
    lng: -8.3600
  },
  'vade': {
    municipality: 'Ponte da Barca',
    district: 'Viana do Castelo',
    lat: 41.8100,
    lng: -8.4500
  },
  // Ponte da Barca — freguesias adicionais
  'azias': { municipality: 'Ponte da Barca', district: 'Viana do Castelo', lat: 41.8300, lng: -8.4800 },
  'boivao (ponte da barca)': { municipality: 'Ponte da Barca', district: 'Viana do Castelo', lat: 41.8200, lng: -8.4600 },
  'boivão (ponte da barca)': { municipality: 'Ponte da Barca', district: 'Viana do Castelo', lat: 41.8200, lng: -8.4600 },
  'nogueira (ponte da barca)': { municipality: 'Ponte da Barca', district: 'Viana do Castelo', lat: 41.8000, lng: -8.4700 },
  'oleiros (ponte da barca)': { municipality: 'Ponte da Barca', district: 'Viana do Castelo', lat: 41.8100, lng: -8.4300 },
  'paco vedro de magalhaes': { municipality: 'Ponte da Barca', district: 'Viana do Castelo', lat: 41.7900, lng: -8.4400 },
  'paço vedro de magalhães': { municipality: 'Ponte da Barca', district: 'Viana do Castelo', lat: 41.7900, lng: -8.4400 },
  'vade': { municipality: 'Ponte da Barca', district: 'Viana do Castelo', lat: 41.7800, lng: -8.4200 },
  'vila cha': { municipality: 'Ponte da Barca', district: 'Viana do Castelo', lat: 41.8000, lng: -8.4900 },
  'vila chã': { municipality: 'Ponte da Barca', district: 'Viana do Castelo', lat: 41.8000, lng: -8.4900 },

  // Caminha
  'caminha': {
    municipality: 'Caminha',
    district: 'Viana do Castelo',
    lat: 41.8728,
    lng: -8.8389
  },
  'vila praia de ancora': {
    municipality: 'Caminha',
    district: 'Viana do Castelo',
    lat: 41.8150,
    lng: -8.8650
  },
  'vila praia de âncora': {
    municipality: 'Caminha',
    district: 'Viana do Castelo',
    lat: 41.8150,
    lng: -8.8650
  },
  'moledo': {
    municipality: 'Caminha',
    district: 'Viana do Castelo',
    lat: 41.8500,
    lng: -8.8600
  },
  'moledo do minho': {
    municipality: 'Caminha',
    district: 'Viana do Castelo',
    lat: 41.8500,
    lng: -8.8600
  },
  'seixas': {
    municipality: 'Caminha',
    district: 'Viana do Castelo',
    lat: 41.8800,
    lng: -8.8500
  },
  'argela': {
    municipality: 'Caminha',
    district: 'Viana do Castelo',
    lat: 41.8300,
    lng: -8.8300
  },
  'venade': {
    municipality: 'Caminha',
    district: 'Viana do Castelo',
    lat: 41.8600,
    lng: -8.8100
  },
  'vilarelho': {
    municipality: 'Caminha',
    district: 'Viana do Castelo',
    lat: 41.8700,
    lng: -8.8200
  },
  'azevedo': {
    municipality: 'Caminha',
    district: 'Viana do Castelo',
    lat: 41.8400,
    lng: -8.8200
  },
  'lanhelas': {
    municipality: 'Caminha',
    district: 'Viana do Castelo',
    lat: 41.8600,
    lng: -8.8400
  },
  'orbacém': {
    municipality: 'Caminha',
    district: 'Viana do Castelo',
    lat: 41.8500,
    lng: -8.8100
  },
  'orbacem': {
    municipality: 'Caminha',
    district: 'Viana do Castelo',
    lat: 41.8500,
    lng: -8.8100
  },
  'riba de ancora': {
    municipality: 'Caminha',
    district: 'Viana do Castelo',
    lat: 41.8200,
    lng: -8.8400
  },
  'riba de âncora': {
    municipality: 'Caminha',
    district: 'Viana do Castelo',
    lat: 41.8200,
    lng: -8.8400
  },
  'gondar': {
    municipality: 'Caminha',
    district: 'Viana do Castelo',
    lat: 41.8700,
    lng: -8.8000
  },
  'vilar de mouros': {
    municipality: 'Caminha',
    district: 'Viana do Castelo',
    lat: 41.8700,
    lng: -8.7800
  },
  // Caminha — freguesias adicionais
  'ancora': { municipality: 'Caminha', district: 'Viana do Castelo', lat: 41.8100, lng: -8.8600 },
  'âncora': { municipality: 'Caminha', district: 'Viana do Castelo', lat: 41.8100, lng: -8.8600 },
  'riba de ancora': { municipality: 'Caminha', district: 'Viana do Castelo', lat: 41.8200, lng: -8.8500 },
  'riba de âncora': { municipality: 'Caminha', district: 'Viana do Castelo', lat: 41.8200, lng: -8.8500 },
  'cristelo': { municipality: 'Caminha', district: 'Viana do Castelo', lat: 41.8500, lng: -8.8300 },
  'dem': { municipality: 'Caminha', district: 'Viana do Castelo', lat: 41.8600, lng: -8.8100 },

  // Valença
  'valença': {
    municipality: 'Valença',
    district: 'Viana do Castelo',
    lat: 42.0275,
    lng: -8.6425
  },
  'valenca': {
    municipality: 'Valença',
    district: 'Viana do Castelo',
    lat: 42.0275,
    lng: -8.6425
  },

  // Valença (freguesias)
  'ganfei': {
    municipality: 'Valença',
    district: 'Viana do Castelo',
    lat: 42.0100,
    lng: -8.6200
  },
  'sao pedro da torre': {
    municipality: 'Valença',
    district: 'Viana do Castelo',
    lat: 42.0000,
    lng: -8.6400
  },
  'são pedro da torre': {
    municipality: 'Valença',
    district: 'Viana do Castelo',
    lat: 42.0000,
    lng: -8.6400
  },
  'cristelo covo e arao': {
    municipality: 'Valença',
    district: 'Viana do Castelo',
    lat: 42.0200,
    lng: -8.6500
  },
  'cristelo covo e arão': {
    municipality: 'Valença',
    district: 'Viana do Castelo',
    lat: 42.0200,
    lng: -8.6500
  },
  'cerdal': {
    municipality: 'Valença',
    district: 'Viana do Castelo',
    lat: 42.0100,
    lng: -8.6600
  },
  'fontoura': {
    municipality: 'Valença',
    district: 'Viana do Castelo',
    lat: 42.0300,
    lng: -8.6100
  },
  'friestas': {
    municipality: 'Valença',
    district: 'Viana do Castelo',
    lat: 42.0500,
    lng: -8.5800
  },
  'silva': {
    municipality: 'Valença',
    district: 'Viana do Castelo',
    lat: 42.0400,
    lng: -8.6300
  },
  'verdoejo': {
    municipality: 'Valença',
    district: 'Viana do Castelo',
    lat: 42.0400,
    lng: -8.5900
  },
  // Valença — freguesias adicionais
  'boivao (valenca)': { municipality: 'Valença', district: 'Viana do Castelo', lat: 42.0100, lng: -8.6200 },
  'boivão (valença)': { municipality: 'Valença', district: 'Viana do Castelo', lat: 42.0100, lng: -8.6200 },
  'gandra (valenca)': { municipality: 'Valença', district: 'Viana do Castelo', lat: 42.0000, lng: -8.6500 },
  'gandra (valença)': { municipality: 'Valença', district: 'Viana do Castelo', lat: 42.0000, lng: -8.6500 },
  'silva (valenca)': { municipality: 'Valença', district: 'Viana do Castelo', lat: 42.0100, lng: -8.6100 },
  'silva (valença)': { municipality: 'Valença', district: 'Viana do Castelo', lat: 42.0100, lng: -8.6100 },

  // Monção
  'monção': {
    municipality: 'Monção',
    district: 'Viana do Castelo',
    lat: 42.0767,
    lng: -8.4817
  },
  'moncao': {
    municipality: 'Monção',
    district: 'Viana do Castelo',
    lat: 42.0767,
    lng: -8.4817
  },
  'ceivaes': {
    municipality: 'Monção',
    district: 'Viana do Castelo',
    lat: 42.0600,
    lng: -8.4500
  },
  'ceivães': {
    municipality: 'Monção',
    district: 'Viana do Castelo',
    lat: 42.0600,
    lng: -8.4500
  },
  'cortes': {
    municipality: 'Monção',
    district: 'Viana do Castelo',
    lat: 42.0500,
    lng: -8.4700
  },
  'longos vales': {
    municipality: 'Monção',
    district: 'Viana do Castelo',
    lat: 42.0700,
    lng: -8.5200
  },
  'mazedo': {
    municipality: 'Monção',
    district: 'Viana do Castelo',
    lat: 42.0600,
    lng: -8.5000
  },
  'merufe': {
    municipality: 'Monção',
    district: 'Viana do Castelo',
    lat: 42.0400,
    lng: -8.4800
  },
  'pinheiros': {
    municipality: 'Monção',
    district: 'Viana do Castelo',
    lat: 42.0500,
    lng: -8.4600
  },
  'podame': {
    municipality: 'Monção',
    district: 'Viana do Castelo',
    lat: 42.0600,
    lng: -8.4300
  },
  'riba de mouro': {
    municipality: 'Monção',
    district: 'Viana do Castelo',
    lat: 42.0300,
    lng: -8.4500
  },
  'sago': {
    municipality: 'Monção',
    district: 'Viana do Castelo',
    lat: 42.0500,
    lng: -8.4400
  },
  'tangil': {
    municipality: 'Monção',
    district: 'Viana do Castelo',
    lat: 42.0400,
    lng: -8.4600
  },
  'troporiz': {
    municipality: 'Monção',
    district: 'Viana do Castelo',
    lat: 42.0500,
    lng: -8.5100
  },
  'barbeita': {
    municipality: 'Monção',
    district: 'Viana do Castelo',
    lat: 42.0800,
    lng: -8.5000
  },
  'cambeses': {
    municipality: 'Monção',
    district: 'Viana do Castelo',
    lat: 42.0500,
    lng: -8.4900
  },
  'lapela': {
    municipality: 'Monção',
    district: 'Viana do Castelo',
    lat: 42.0900,
    lng: -8.5100
  },
  'segude': {
    municipality: 'Monção',
    district: 'Viana do Castelo',
    lat: 42.0600,
    lng: -8.5200
  },
  'trute': {
    municipality: 'Monção',
    district: 'Viana do Castelo',
    lat: 42.0800,
    lng: -8.4700
  },
  'valadares': {
    municipality: 'Monção',
    district: 'Viana do Castelo',
    lat: 42.0700,
    lng: -8.4500
  },
  // Monção — freguesias adicionais
  'abedim': { municipality: 'Monção', district: 'Viana do Castelo', lat: 42.0500, lng: -8.3700 },
  'anhoes': { municipality: 'Monção', district: 'Viana do Castelo', lat: 42.0300, lng: -8.3900 },
  'anhões': { municipality: 'Monção', district: 'Viana do Castelo', lat: 42.0300, lng: -8.3900 },
  'barrocas e taias': { municipality: 'Monção', district: 'Viana do Castelo', lat: 42.0400, lng: -8.4200 },
  'barroças e taias': { municipality: 'Monção', district: 'Viana do Castelo', lat: 42.0400, lng: -8.4200 },
  'bela': { municipality: 'Monção', district: 'Viana do Castelo', lat: 42.0600, lng: -8.4800 },
  'lara': { municipality: 'Monção', district: 'Viana do Castelo', lat: 42.0300, lng: -8.4600 },
  'lordemao': { municipality: 'Monção', district: 'Viana do Castelo', lat: 42.0500, lng: -8.4300 },
  'lordemão': { municipality: 'Monção', district: 'Viana do Castelo', lat: 42.0500, lng: -8.4300 },
  'messegaes': { municipality: 'Monção', district: 'Viana do Castelo', lat: 42.0200, lng: -8.4100 },
  'messegães': { municipality: 'Monção', district: 'Viana do Castelo', lat: 42.0200, lng: -8.4100 },
  'parada (moncao)': { municipality: 'Monção', district: 'Viana do Castelo', lat: 42.0600, lng: -8.4600 },
  'parada (monção)': { municipality: 'Monção', district: 'Viana do Castelo', lat: 42.0600, lng: -8.4600 },
  'portela (moncao)': { municipality: 'Monção', district: 'Viana do Castelo', lat: 42.0400, lng: -8.3800 },
  'portela (monção)': { municipality: 'Monção', district: 'Viana do Castelo', lat: 42.0400, lng: -8.3800 },

  // Melgaço
  'melgaço': {
    municipality: 'Melgaço',
    district: 'Viana do Castelo',
    lat: 42.1147,
    lng: -8.2597
  },
  'melgaco': {
    municipality: 'Melgaço',
    district: 'Viana do Castelo',
    lat: 42.1147,
    lng: -8.2597
  },
  'castro laboreiro': {
    municipality: 'Melgaço',
    district: 'Viana do Castelo',
    lat: 42.0300,
    lng: -8.1600
  },
  'paderne': {
    municipality: 'Melgaço',
    district: 'Viana do Castelo',
    lat: 42.0900,
    lng: -8.2400
  },
  'chaviaes': {
    municipality: 'Melgaço',
    district: 'Viana do Castelo',
    lat: 42.0800,
    lng: -8.2500
  },
  'chaviães': {
    municipality: 'Melgaço',
    district: 'Viana do Castelo',
    lat: 42.0800,
    lng: -8.2500
  },
  'cousso': {
    municipality: 'Melgaço',
    district: 'Viana do Castelo',
    lat: 42.0700,
    lng: -8.2300
  },
  'cristoval': {
    municipality: 'Melgaço',
    district: 'Viana do Castelo',
    lat: 42.1100,
    lng: -8.2700
  },
  'gave': {
    municipality: 'Melgaço',
    district: 'Viana do Castelo',
    lat: 42.1200,
    lng: -8.2900
  },
  'lamas de mouro': {
    municipality: 'Melgaço',
    district: 'Viana do Castelo',
    lat: 42.0500,
    lng: -8.2000
  },
  'parada do monte': {
    municipality: 'Melgaço',
    district: 'Viana do Castelo',
    lat: 42.0600,
    lng: -8.2200
  },
  'penso': {
    municipality: 'Melgaço',
    district: 'Viana do Castelo',
    lat: 42.0900,
    lng: -8.2800
  },
  'prado': {
    municipality: 'Melgaço',
    district: 'Viana do Castelo',
    lat: 42.1000,
    lng: -8.2600
  },
  'remoaes': {
    municipality: 'Melgaço',
    district: 'Viana do Castelo',
    lat: 42.1100,
    lng: -8.2500
  },
  'remoães': {
    municipality: 'Melgaço',
    district: 'Viana do Castelo',
    lat: 42.1100,
    lng: -8.2500
  },
  // Melgaço — freguesias adicionais
  'alvaredo': { municipality: 'Melgaço', district: 'Viana do Castelo', lat: 42.0900, lng: -8.2900 },
  'cubalhao': { municipality: 'Melgaço', district: 'Viana do Castelo', lat: 42.0800, lng: -8.2600 },
  'cubalhão': { municipality: 'Melgaço', district: 'Viana do Castelo', lat: 42.0800, lng: -8.2600 },
  'fiaes': { municipality: 'Melgaço', district: 'Viana do Castelo', lat: 42.0700, lng: -8.2400 },
  'fiães': { municipality: 'Melgaço', district: 'Viana do Castelo', lat: 42.0700, lng: -8.2400 },
  'piso': { municipality: 'Melgaço', district: 'Viana do Castelo', lat: 42.0800, lng: -8.2300 },

  // Paredes de Coura
  'paredes de coura': {
    municipality: 'Paredes de Coura',
    district: 'Viana do Castelo',
    lat: 41.9128,
    lng: -8.5614
  },
  'coura': {
    municipality: 'Paredes de Coura',
    district: 'Viana do Castelo',
    lat: 41.9128,
    lng: -8.5614
  },
  'infesta': {
    municipality: 'Paredes de Coura',
    district: 'Viana do Castelo',
    lat: 41.9200,
    lng: -8.5400
  },
  'resende': {
    municipality: 'Paredes de Coura',
    district: 'Viana do Castelo',
    lat: 41.9000,
    lng: -8.5500
  },
  'agualonga': {
    municipality: 'Paredes de Coura',
    district: 'Viana do Castelo',
    lat: 41.9300,
    lng: -8.5700
  },
  'bico': {
    municipality: 'Paredes de Coura',
    district: 'Viana do Castelo',
    lat: 41.9200,
    lng: -8.5800
  },
  'castanheira': {
    municipality: 'Paredes de Coura',
    district: 'Viana do Castelo',
    lat: 41.9400,
    lng: -8.5500
  },
  'cossourado': {
    municipality: 'Paredes de Coura',
    district: 'Viana do Castelo',
    lat: 41.8900,
    lng: -8.5500
  },
  'cunha': {
    municipality: 'Paredes de Coura',
    district: 'Viana do Castelo',
    lat: 41.9100,
    lng: -8.5700
  },
  'ferreira': {
    municipality: 'Paredes de Coura',
    district: 'Viana do Castelo',
    lat: 41.9300,
    lng: -8.5600
  },
  'formariz': {
    municipality: 'Paredes de Coura',
    district: 'Viana do Castelo',
    lat: 41.9200,
    lng: -8.5500
  },
  'linhares': {
    municipality: 'Paredes de Coura',
    district: 'Viana do Castelo',
    lat: 41.9000,
    lng: -8.5800
  },
  'moselos': {
    municipality: 'Paredes de Coura',
    district: 'Viana do Castelo',
    lat: 41.9100,
    lng: -8.5400
  },
  'padornelo': {
    municipality: 'Paredes de Coura',
    district: 'Viana do Castelo',
    lat: 41.9000,
    lng: -8.5600
  },
  'romarigaes': {
    municipality: 'Paredes de Coura',
    district: 'Viana do Castelo',
    lat: 41.9300,
    lng: -8.5400
  },
  'romarigães': {
    municipality: 'Paredes de Coura',
    district: 'Viana do Castelo',
    lat: 41.9300,
    lng: -8.5400
  },
  'rubiaes': {
    municipality: 'Paredes de Coura',
    district: 'Viana do Castelo',
    lat: 41.9400,
    lng: -8.5800
  },
  'rubiães': {
    municipality: 'Paredes de Coura',
    district: 'Viana do Castelo',
    lat: 41.9400,
    lng: -8.5800
  },
  // Paredes de Coura — freguesias adicionais
  'bico (paredes de coura)': { municipality: 'Paredes de Coura', district: 'Viana do Castelo', lat: 41.9200, lng: -8.5600 },
  'insalde': { municipality: 'Paredes de Coura', district: 'Viana do Castelo', lat: 41.9100, lng: -8.5500 },
  'parada (paredes de coura)': { municipality: 'Paredes de Coura', district: 'Viana do Castelo', lat: 41.9300, lng: -8.5400 },
  'vascoes': { municipality: 'Paredes de Coura', district: 'Viana do Castelo', lat: 41.9000, lng: -8.5700 },
  'vascões': { municipality: 'Paredes de Coura', district: 'Viana do Castelo', lat: 41.9000, lng: -8.5700 },

  // Vila Nova de Cerveira
  'vila nova de cerveira': {
    municipality: 'Vila Nova de Cerveira',
    district: 'Viana do Castelo',
    lat: 41.9417,
    lng: -8.7444
  },
  'campos': {
    municipality: 'Vila Nova de Cerveira',
    district: 'Viana do Castelo',
    lat: 41.9500,
    lng: -8.7300
  },
  'covas': {
    municipality: 'Vila Nova de Cerveira',
    district: 'Viana do Castelo',
    lat: 41.9600,
    lng: -8.7200
  },
  'gondarem': {
    municipality: 'Vila Nova de Cerveira',
    district: 'Viana do Castelo',
    lat: 41.9300,
    lng: -8.7600
  },
  'gondarém': {
    municipality: 'Vila Nova de Cerveira',
    district: 'Viana do Castelo',
    lat: 41.9300,
    lng: -8.7600
  },
  'loivo': {
    municipality: 'Vila Nova de Cerveira',
    district: 'Viana do Castelo',
    lat: 41.9400,
    lng: -8.7500
  },
  'reboreda': {
    municipality: 'Vila Nova de Cerveira',
    district: 'Viana do Castelo',
    lat: 41.9500,
    lng: -8.7100
  },
  'sapardos': {
    municipality: 'Vila Nova de Cerveira',
    district: 'Viana do Castelo',
    lat: 41.9600,
    lng: -8.7400
  },
  'sopo': {
    municipality: 'Vila Nova de Cerveira',
    district: 'Viana do Castelo',
    lat: 41.9500,
    lng: -8.7500
  },
  'candemil': {
    municipality: 'Vila Nova de Cerveira',
    district: 'Viana do Castelo',
    lat: 41.9700,
    lng: -8.7200
  },
  // Vila Nova de Cerveira — freguesias adicionais
  'mentrestido': { municipality: 'Vila Nova de Cerveira', district: 'Viana do Castelo', lat: 41.9400, lng: -8.7300 },
  'nogueira (cerveira)': { municipality: 'Vila Nova de Cerveira', district: 'Viana do Castelo', lat: 41.9600, lng: -8.7400 },
  'vila mea': { municipality: 'Vila Nova de Cerveira', district: 'Viana do Castelo', lat: 41.9300, lng: -8.7100 },
  'vila meã': { municipality: 'Vila Nova de Cerveira', district: 'Viana do Castelo', lat: 41.9300, lng: -8.7100 },
  'sopo': { municipality: 'Vila Nova de Cerveira', district: 'Viana do Castelo', lat: 41.9500, lng: -8.7600 },

  // Braga (concelhos limítrofes do Alto Minho)
  'barcelos': {
    municipality: 'Barcelos',
    district: 'Braga',
    lat: 41.5383,
    lng: -8.6148
  },
  'esposende': {
    municipality: 'Esposende',
    district: 'Braga',
    lat: 41.5344,
    lng: -8.7806
  },
  'marinhas': {
    municipality: 'Esposende',
    district: 'Braga',
    lat: 41.5200,
    lng: -8.7700
  },
  'antas': {
    municipality: 'Esposende',
    district: 'Braga',
    lat: 41.5100,
    lng: -8.7500
  },
  'forjaes': {
    municipality: 'Esposende',
    district: 'Braga',
    lat: 41.5400,
    lng: -8.7400
  },
  'forjães': {
    municipality: 'Esposende',
    district: 'Braga',
    lat: 41.5400,
    lng: -8.7400
  },
  'apulia': {
    municipality: 'Esposende',
    district: 'Braga',
    lat: 41.4800,
    lng: -8.7600
  },
  'apúlia': {
    municipality: 'Esposende',
    district: 'Braga',
    lat: 41.4800,
    lng: -8.7600
  },
  'fao': {
    municipality: 'Esposende',
    district: 'Braga',
    lat: 41.5200,
    lng: -8.7800
  },
  'fão': {
    municipality: 'Esposende',
    district: 'Braga',
    lat: 41.5200,
    lng: -8.7800
  },
  'vila verde': {
    municipality: 'Vila Verde',
    district: 'Braga',
    lat: 41.6481,
    lng: -8.4356
  },
  'terras de bouro': {
    municipality: 'Terras de Bouro',
    district: 'Braga',
    lat: 41.7172,
    lng: -8.3092
  },
  'campo do geres': {
    municipality: 'Terras de Bouro',
    district: 'Braga',
    lat: 41.7300,
    lng: -8.1700
  },
  'campo do gerês': {
    municipality: 'Terras de Bouro',
    district: 'Braga',
    lat: 41.7300,
    lng: -8.1700
  },
  'covide': {
    municipality: 'Terras de Bouro',
    district: 'Braga',
    lat: 41.7200,
    lng: -8.2000
  },
  'vilar da veiga': {
    municipality: 'Terras de Bouro',
    district: 'Braga',
    lat: 41.7400,
    lng: -8.1800
  },
  'amares': {
    municipality: 'Amares',
    district: 'Braga',
    lat: 41.6314,
    lng: -8.3531
  },
  'caldelas': {
    municipality: 'Amares',
    district: 'Braga',
    lat: 41.6400,
    lng: -8.3400
  },
  'ferreiros': {
    municipality: 'Amares',
    district: 'Braga',
    lat: 41.6300,
    lng: -8.3700
  },
  'lago': {
    municipality: 'Amares',
    district: 'Braga',
    lat: 41.6500,
    lng: -8.3600
  },

  // Barcelos — freguesias principais
  'barcelinhos': { municipality: 'Barcelos', district: 'Braga', lat: 41.5300, lng: -8.6200 },
  'vila boa': { municipality: 'Barcelos', district: 'Braga', lat: 41.5500, lng: -8.5800 },
  'abade de neiva': { municipality: 'Barcelos', district: 'Braga', lat: 41.5600, lng: -8.5900 },
  'alheira': { municipality: 'Barcelos', district: 'Braga', lat: 41.5700, lng: -8.5700 },
  'alvelos': { municipality: 'Barcelos', district: 'Braga', lat: 41.5200, lng: -8.5600 },
  'areias': { municipality: 'Barcelos', district: 'Braga', lat: 41.5100, lng: -8.6000 },
  'barqueiros': { municipality: 'Barcelos', district: 'Braga', lat: 41.4900, lng: -8.6300 },
  'campo': { municipality: 'Barcelos', district: 'Braga', lat: 41.5400, lng: -8.5500 },
  'carreira': { municipality: 'Barcelos', district: 'Braga', lat: 41.5000, lng: -8.5700 },
  'chorente': { municipality: 'Barcelos', district: 'Braga', lat: 41.5600, lng: -8.5500 },
  'courel': { municipality: 'Barcelos', district: 'Braga', lat: 41.5300, lng: -8.5400 },
  'durraes': { municipality: 'Barcelos', district: 'Braga', lat: 41.5500, lng: -8.5300 },
  'durrães': { municipality: 'Barcelos', district: 'Braga', lat: 41.5500, lng: -8.5300 },
  'encourados': { municipality: 'Barcelos', district: 'Braga', lat: 41.5800, lng: -8.5600 },
  'feitos': { municipality: 'Barcelos', district: 'Braga', lat: 41.5400, lng: -8.5700 },
  'gamil': { municipality: 'Barcelos', district: 'Braga', lat: 41.5000, lng: -8.5500 },
  'gilmonde': { municipality: 'Barcelos', district: 'Braga', lat: 41.5100, lng: -8.5800 },
  'lama': { municipality: 'Barcelos', district: 'Braga', lat: 41.5600, lng: -8.5200 },
  'lijo': { municipality: 'Barcelos', district: 'Braga', lat: 41.5300, lng: -8.6500 },
  'lijó': { municipality: 'Barcelos', district: 'Braga', lat: 41.5300, lng: -8.6500 },
  'manhente': { municipality: 'Barcelos', district: 'Braga', lat: 41.5800, lng: -8.5400 },
  'mariz': { municipality: 'Barcelos', district: 'Braga', lat: 41.5700, lng: -8.5100 },
  'midoes': { municipality: 'Barcelos', district: 'Braga', lat: 41.5100, lng: -8.5400 },
  'midões': { municipality: 'Barcelos', district: 'Braga', lat: 41.5100, lng: -8.5400 },
  'negreiros': { municipality: 'Barcelos', district: 'Braga', lat: 41.5400, lng: -8.5200 },
  'oliveira': { municipality: 'Barcelos', district: 'Braga', lat: 41.5200, lng: -8.5300 },
  'palme': { municipality: 'Barcelos', district: 'Braga', lat: 41.4900, lng: -8.5900 },
  'perelhal': { municipality: 'Barcelos', district: 'Braga', lat: 41.5000, lng: -8.6500 },
  'pousa': { municipality: 'Barcelos', district: 'Braga', lat: 41.5200, lng: -8.5700 },
  'quintiaes': { municipality: 'Barcelos', district: 'Braga', lat: 41.5600, lng: -8.6000 },
  'quintiães': { municipality: 'Barcelos', district: 'Braga', lat: 41.5600, lng: -8.6000 },
  'remelhe': { municipality: 'Barcelos', district: 'Braga', lat: 41.5100, lng: -8.6200 },
  'rio covo': { municipality: 'Barcelos', district: 'Braga', lat: 41.4900, lng: -8.5600 },
  'roriz': { municipality: 'Barcelos', district: 'Braga', lat: 41.5300, lng: -8.5100 },
  'silva': { municipality: 'Barcelos', district: 'Braga', lat: 41.5500, lng: -8.5500 },
  'tamel': { municipality: 'Barcelos', district: 'Braga', lat: 41.5500, lng: -8.6300 },
  'ucha': { municipality: 'Barcelos', district: 'Braga', lat: 41.5400, lng: -8.6400 },
  'viatodos': { municipality: 'Barcelos', district: 'Braga', lat: 41.5700, lng: -8.5800 },
  'vila cova': { municipality: 'Barcelos', district: 'Braga', lat: 41.5000, lng: -8.5200 },
  'vila frescainha': { municipality: 'Barcelos', district: 'Braga', lat: 41.5400, lng: -8.6100 },
  'vila seca': { municipality: 'Barcelos', district: 'Braga', lat: 41.5600, lng: -8.6200 },
  'aldreu': { municipality: 'Barcelos', district: 'Braga', lat: 41.4900, lng: -8.7300 },
  'aguiar': { municipality: 'Barcelos', district: 'Braga', lat: 41.5800, lng: -8.5900 },

  // Vila Verde — freguesias principais
  'barbudo': { municipality: 'Vila Verde', district: 'Braga', lat: 41.6300, lng: -8.4100 },
  'cervaes': { municipality: 'Vila Verde', district: 'Braga', lat: 41.6600, lng: -8.4200 },
  'cervães': { municipality: 'Vila Verde', district: 'Braga', lat: 41.6600, lng: -8.4200 },
  'coucieiro': { municipality: 'Vila Verde', district: 'Braga', lat: 41.6400, lng: -8.4500 },
  'dossaos': { municipality: 'Vila Verde', district: 'Braga', lat: 41.6800, lng: -8.4400 },
  'dossãos': { municipality: 'Vila Verde', district: 'Braga', lat: 41.6800, lng: -8.4400 },
  'esqueiros': { municipality: 'Vila Verde', district: 'Braga', lat: 41.6500, lng: -8.4600 },
  'geme': { municipality: 'Vila Verde', district: 'Braga', lat: 41.6200, lng: -8.4200 },
  'godinhacos': { municipality: 'Vila Verde', district: 'Braga', lat: 41.6700, lng: -8.4100 },
  'godinhaços': { municipality: 'Vila Verde', district: 'Braga', lat: 41.6700, lng: -8.4100 },
  'lanhas': { municipality: 'Vila Verde', district: 'Braga', lat: 41.6300, lng: -8.4600 },
  'laje': { municipality: 'Vila Verde', district: 'Braga', lat: 41.6600, lng: -8.4500 },
  'loureira': { municipality: 'Vila Verde', district: 'Braga', lat: 41.6800, lng: -8.4200 },
  'marrancos': { municipality: 'Vila Verde', district: 'Braga', lat: 41.6400, lng: -8.4300 },
  'moure': { municipality: 'Vila Verde', district: 'Braga', lat: 41.6200, lng: -8.4500 },
  'oleiros': { municipality: 'Vila Verde', district: 'Braga', lat: 41.6700, lng: -8.4600 },
  'parada de gatim': { municipality: 'Vila Verde', district: 'Braga', lat: 41.6500, lng: -8.4200 },
  'pico': { municipality: 'Vila Verde', district: 'Braga', lat: 41.6300, lng: -8.4400 },
  'prado': { municipality: 'Vila Verde', district: 'Braga', lat: 41.6100, lng: -8.4200 },
  'ribeira do neiva': { municipality: 'Vila Verde', district: 'Braga', lat: 41.6900, lng: -8.4300 },
  'sabariz': { municipality: 'Vila Verde', district: 'Braga', lat: 41.6500, lng: -8.4100 },
  'sande': { municipality: 'Vila Verde', district: 'Braga', lat: 41.6400, lng: -8.4000 },
  'soutelo': { municipality: 'Vila Verde', district: 'Braga', lat: 41.6600, lng: -8.3900 },
  'turiz': { municipality: 'Vila Verde', district: 'Braga', lat: 41.6700, lng: -8.4500 },
  'valdreu': { municipality: 'Vila Verde', district: 'Braga', lat: 41.6200, lng: -8.4300 },
  'vila de prado': { municipality: 'Vila Verde', district: 'Braga', lat: 41.6100, lng: -8.4500 },

  // Amares — freguesias adicionais
  'rendufe': { municipality: 'Amares', district: 'Braga', lat: 41.6200, lng: -8.3400 },
  'bouro santa maria': { municipality: 'Amares', district: 'Braga', lat: 41.6700, lng: -8.3200 },
  'bouro santa marta': { municipality: 'Amares', district: 'Braga', lat: 41.6800, lng: -8.3100 },
  'fiscal': { municipality: 'Amares', district: 'Braga', lat: 41.6400, lng: -8.3300 },
  'goaes': { municipality: 'Amares', district: 'Braga', lat: 41.6100, lng: -8.3600 },
  'goães': { municipality: 'Amares', district: 'Braga', lat: 41.6100, lng: -8.3600 },
  'barreiros': { municipality: 'Amares', district: 'Braga', lat: 41.6300, lng: -8.3800 },
  'bico': { municipality: 'Amares', district: 'Braga', lat: 41.6500, lng: -8.3400 },
  'paranhos': { municipality: 'Amares', district: 'Braga', lat: 41.6200, lng: -8.3200 },

  // Terras de Bouro — freguesias adicionais
  'rio caldo': { municipality: 'Terras de Bouro', district: 'Braga', lat: 41.7300, lng: -8.2200 },
  'chamoim': { municipality: 'Terras de Bouro', district: 'Braga', lat: 41.7100, lng: -8.2800 },
  'souto': { municipality: 'Terras de Bouro', district: 'Braga', lat: 41.7000, lng: -8.3100 },
  'ciboes': { municipality: 'Terras de Bouro', district: 'Braga', lat: 41.7000, lng: -8.2500 },
  'cibões': { municipality: 'Terras de Bouro', district: 'Braga', lat: 41.7000, lng: -8.2500 },
  'balanca': { municipality: 'Terras de Bouro', district: 'Braga', lat: 41.7200, lng: -8.2700 },
  'balança': { municipality: 'Terras de Bouro', district: 'Braga', lat: 41.7200, lng: -8.2700 },
  'moimenta': { municipality: 'Terras de Bouro', district: 'Braga', lat: 41.7100, lng: -8.3300 },
  'gondoriz': { municipality: 'Terras de Bouro', district: 'Braga', lat: 41.7200, lng: -8.3000 },

  // Esposende — freguesias adicionais
  'palmeira de faro': { municipality: 'Esposende', district: 'Braga', lat: 41.5300, lng: -8.7300 },
  'gemeses': { municipality: 'Esposende', district: 'Braga', lat: 41.5400, lng: -8.7200 },
  'fonte boa': { municipality: 'Esposende', district: 'Braga', lat: 41.5500, lng: -8.7100 },

  // Póvoa de Lanhoso — novo município limítrofe
  'povoa de lanhoso': { municipality: 'Póvoa de Lanhoso', district: 'Braga', lat: 41.5769, lng: -8.2714 },
  'póvoa de lanhoso': { municipality: 'Póvoa de Lanhoso', district: 'Braga', lat: 41.5769, lng: -8.2714 },
  'calvos': { municipality: 'Póvoa de Lanhoso', district: 'Braga', lat: 41.5900, lng: -8.2500 },
  'covelas': { municipality: 'Póvoa de Lanhoso', district: 'Braga', lat: 41.5600, lng: -8.2600 },
  'esperanca': { municipality: 'Póvoa de Lanhoso', district: 'Braga', lat: 41.5800, lng: -8.2900 },
  'esperança': { municipality: 'Póvoa de Lanhoso', district: 'Braga', lat: 41.5800, lng: -8.2900 },
  'fonte arcada': { municipality: 'Póvoa de Lanhoso', district: 'Braga', lat: 41.5700, lng: -8.3000 },
  'garfe': { municipality: 'Póvoa de Lanhoso', district: 'Braga', lat: 41.5500, lng: -8.2800 },
  'geraz do minho': { municipality: 'Póvoa de Lanhoso', district: 'Braga', lat: 41.5900, lng: -8.3100 },
  'lanhoso': { municipality: 'Póvoa de Lanhoso', district: 'Braga', lat: 41.5800, lng: -8.2700 },
  'monsul': { municipality: 'Póvoa de Lanhoso', district: 'Braga', lat: 41.5600, lng: -8.2900 },
  'rendufinho': { municipality: 'Póvoa de Lanhoso', district: 'Braga', lat: 41.6000, lng: -8.2800 },
  'sao joao de rei': { municipality: 'Póvoa de Lanhoso', district: 'Braga', lat: 41.5500, lng: -8.2500 },
  'são joão de rei': { municipality: 'Póvoa de Lanhoso', district: 'Braga', lat: 41.5500, lng: -8.2500 },
  'sobradelo da goma': { municipality: 'Póvoa de Lanhoso', district: 'Braga', lat: 41.5700, lng: -8.2500 },
  'taide': { municipality: 'Póvoa de Lanhoso', district: 'Braga', lat: 41.5800, lng: -8.2600 },
  'taíde': { municipality: 'Póvoa de Lanhoso', district: 'Braga', lat: 41.5800, lng: -8.2600 },
  'verim': { municipality: 'Póvoa de Lanhoso', district: 'Braga', lat: 41.5600, lng: -8.3100 },

  // Vieira do Minho — novo município limítrofe (Gerês)
  'vieira do minho': { municipality: 'Vieira do Minho', district: 'Braga', lat: 41.6336, lng: -8.1378 },
  'anisso': { municipality: 'Vieira do Minho', district: 'Braga', lat: 41.6500, lng: -8.1200 },
  'anissó': { municipality: 'Vieira do Minho', district: 'Braga', lat: 41.6500, lng: -8.1200 },
  'canicada': { municipality: 'Vieira do Minho', district: 'Braga', lat: 41.6800, lng: -8.1500 },
  'caniçada': { municipality: 'Vieira do Minho', district: 'Braga', lat: 41.6800, lng: -8.1500 },
  'cantelaes': { municipality: 'Vieira do Minho', district: 'Braga', lat: 41.6400, lng: -8.1600 },
  'cantelães': { municipality: 'Vieira do Minho', district: 'Braga', lat: 41.6400, lng: -8.1600 },
  'eira vedra': { municipality: 'Vieira do Minho', district: 'Braga', lat: 41.6200, lng: -8.1300 },
  'guilhofrei': { municipality: 'Vieira do Minho', district: 'Braga', lat: 41.6400, lng: -8.1100 },
  'louredo': { municipality: 'Vieira do Minho', district: 'Braga', lat: 41.6300, lng: -8.1500 },
  'mosteiro': { municipality: 'Vieira do Minho', district: 'Braga', lat: 41.6100, lng: -8.1200 },
  'pinheiro': { municipality: 'Vieira do Minho', district: 'Braga', lat: 41.6200, lng: -8.1700 },
  'rossas': { municipality: 'Vieira do Minho', district: 'Braga', lat: 41.6500, lng: -8.1700 },
  'ruivaes': { municipality: 'Vieira do Minho', district: 'Braga', lat: 41.6700, lng: -8.1300 },
  'ruivães': { municipality: 'Vieira do Minho', district: 'Braga', lat: 41.6700, lng: -8.1300 },
  'salamonde': { municipality: 'Vieira do Minho', district: 'Braga', lat: 41.6900, lng: -8.1000 },
  'tabuacas': { municipality: 'Vieira do Minho', district: 'Braga', lat: 41.6100, lng: -8.1600 },
  'tabuaças': { municipality: 'Vieira do Minho', district: 'Braga', lat: 41.6100, lng: -8.1600 },
  'ventosa': { municipality: 'Vieira do Minho', district: 'Braga', lat: 41.6600, lng: -8.1400 },

  // Montalegre — novo município limítrofe (Vila Real / Peneda-Gerês)
  'montalegre': { municipality: 'Montalegre', district: 'Vila Real', lat: 41.8228, lng: -7.7897 },
  'cabril': { municipality: 'Montalegre', district: 'Vila Real', lat: 41.7700, lng: -7.9200 },
  'cambeses do rio': { municipality: 'Montalegre', district: 'Vila Real', lat: 41.8000, lng: -7.7500 },
  'cervos': { municipality: 'Montalegre', district: 'Vila Real', lat: 41.8500, lng: -7.7600 },
  'cha': { municipality: 'Montalegre', district: 'Vila Real', lat: 41.8100, lng: -7.8200 },
  'chã': { municipality: 'Montalegre', district: 'Vila Real', lat: 41.8100, lng: -7.8200 },
  'covelaes': { municipality: 'Montalegre', district: 'Vila Real', lat: 41.8800, lng: -7.8300 },
  'covelães': { municipality: 'Montalegre', district: 'Vila Real', lat: 41.8800, lng: -7.8300 },
  'donoes': { municipality: 'Montalegre', district: 'Vila Real', lat: 41.8400, lng: -7.8000 },
  'donões': { municipality: 'Montalegre', district: 'Vila Real', lat: 41.8400, lng: -7.8000 },
  'fiaes do rio': { municipality: 'Montalegre', district: 'Vila Real', lat: 41.8600, lng: -7.7800 },
  'fiães do rio': { municipality: 'Montalegre', district: 'Vila Real', lat: 41.8600, lng: -7.7800 },
  'gralhas': { municipality: 'Montalegre', district: 'Vila Real', lat: 41.8300, lng: -7.7200 },
  'meixedo': { municipality: 'Montalegre', district: 'Vila Real', lat: 41.8100, lng: -7.7600 },
  'negroes': { municipality: 'Montalegre', district: 'Vila Real', lat: 41.8200, lng: -7.7300 },
  'negrões': { municipality: 'Montalegre', district: 'Vila Real', lat: 41.8200, lng: -7.7300 },
  'padornelos': { municipality: 'Montalegre', district: 'Vila Real', lat: 41.8700, lng: -7.8600 },
  'pitoes das junias': { municipality: 'Montalegre', district: 'Vila Real', lat: 41.8900, lng: -7.9400 },
  'pitões das júnias': { municipality: 'Montalegre', district: 'Vila Real', lat: 41.8900, lng: -7.9400 },
  'tourem': { municipality: 'Montalegre', district: 'Vila Real', lat: 41.9100, lng: -7.9600 },
  'tourém': { municipality: 'Montalegre', district: 'Vila Real', lat: 41.9100, lng: -7.9600 },
  'venda nova': { municipality: 'Montalegre', district: 'Vila Real', lat: 41.7800, lng: -7.9800 },
  'vila da ponte': { municipality: 'Montalegre', district: 'Vila Real', lat: 41.8300, lng: -7.7700 },
  'salto': { municipality: 'Montalegre', district: 'Vila Real', lat: 41.7900, lng: -7.8800 },
  'santo andre': { municipality: 'Montalegre', district: 'Vila Real', lat: 41.8400, lng: -7.7400 },
  'santo andré': { municipality: 'Montalegre', district: 'Vila Real', lat: 41.8400, lng: -7.7400 },

  // === CIM CÁVADO — Braga (sede de distrito) ===
  'sao victor': { municipality: 'Braga', district: 'Braga', lat: 41.5600, lng: -8.4200 },
  'são victor': { municipality: 'Braga', district: 'Braga', lat: 41.5600, lng: -8.4200 },
  'sao vicente': { municipality: 'Braga', district: 'Braga', lat: 41.5500, lng: -8.4300 },
  'são vicente': { municipality: 'Braga', district: 'Braga', lat: 41.5500, lng: -8.4300 },
  'maximinos': { municipality: 'Braga', district: 'Braga', lat: 41.5400, lng: -8.4300 },
  'palmeira': { municipality: 'Braga', district: 'Braga', lat: 41.5200, lng: -8.4100 },
  'gualtar': { municipality: 'Braga', district: 'Braga', lat: 41.5600, lng: -8.3900 },
  'fraiao': { municipality: 'Braga', district: 'Braga', lat: 41.5700, lng: -8.4000 },
  'fraião': { municipality: 'Braga', district: 'Braga', lat: 41.5700, lng: -8.4000 },
  'lamacaes': { municipality: 'Braga', district: 'Braga', lat: 41.5500, lng: -8.4500 },
  'lamaçães': { municipality: 'Braga', district: 'Braga', lat: 41.5500, lng: -8.4500 },
  'priscos': { municipality: 'Braga', district: 'Braga', lat: 41.5300, lng: -8.3800 },
  'tadim': { municipality: 'Braga', district: 'Braga', lat: 41.5700, lng: -8.3700 },
  'celeiros': { municipality: 'Braga', district: 'Braga', lat: 41.5800, lng: -8.4100 },
  'celeirós': { municipality: 'Braga', district: 'Braga', lat: 41.5800, lng: -8.4100 },
  'adaufe': { municipality: 'Braga', district: 'Braga', lat: 41.5300, lng: -8.3600 },
  'adaúfe': { municipality: 'Braga', district: 'Braga', lat: 41.5300, lng: -8.3600 },
  'espinho': { municipality: 'Braga', district: 'Braga', lat: 41.5200, lng: -8.3900 },
  'frossos': { municipality: 'Braga', district: 'Braga', lat: 41.5100, lng: -8.4200 },
  'gondizalves': { municipality: 'Braga', district: 'Braga', lat: 41.5400, lng: -8.3700 },
  'lomar': { municipality: 'Braga', district: 'Braga', lat: 41.5600, lng: -8.4400 },
  'merelim': { municipality: 'Braga', district: 'Braga', lat: 41.5800, lng: -8.4300 },
  'morreira': { municipality: 'Braga', district: 'Braga', lat: 41.5200, lng: -8.4400 },
  'navarra': { municipality: 'Braga', district: 'Braga', lat: 41.5300, lng: -8.4500 },
  'padim da graca': { municipality: 'Braga', district: 'Braga', lat: 41.5100, lng: -8.3800 },
  'padim da graça': { municipality: 'Braga', district: 'Braga', lat: 41.5100, lng: -8.3800 },
  'real': { municipality: 'Braga', district: 'Braga', lat: 41.5700, lng: -8.4500 },
  'ruilhe': { municipality: 'Braga', district: 'Braga', lat: 41.5800, lng: -8.4500 },
  'sequeira': { municipality: 'Braga', district: 'Braga', lat: 41.5300, lng: -8.4000 },
  'tenoes': { municipality: 'Braga', district: 'Braga', lat: 41.5600, lng: -8.3600 },
  'tenões': { municipality: 'Braga', district: 'Braga', lat: 41.5600, lng: -8.3600 },
  'trandeiras': { municipality: 'Braga', district: 'Braga', lat: 41.5400, lng: -8.4600 },
  'arentim': { municipality: 'Braga', district: 'Braga', lat: 41.5900, lng: -8.4200 },

  // === CIM DO AVE — Guimarães ===
  'guimaraes': { municipality: 'Guimarães', district: 'Braga', lat: 41.4425, lng: -8.2918 },
  'azurem': { municipality: 'Guimarães', district: 'Braga', lat: 41.4500, lng: -8.3000 },
  'azurém': { municipality: 'Guimarães', district: 'Braga', lat: 41.4500, lng: -8.3000 },
  'creixomil': { municipality: 'Guimarães', district: 'Braga', lat: 41.4300, lng: -8.3000 },
  'oliveira do castelo': { municipality: 'Guimarães', district: 'Braga', lat: 41.4400, lng: -8.2900 },
  'costa': { municipality: 'Guimarães', district: 'Braga', lat: 41.4200, lng: -8.3100 },
  'fermentoes': { municipality: 'Guimarães', district: 'Braga', lat: 41.4600, lng: -8.2800 },
  'fermentões': { municipality: 'Guimarães', district: 'Braga', lat: 41.4600, lng: -8.2800 },
  'mesao frio': { municipality: 'Guimarães', district: 'Braga', lat: 41.4500, lng: -8.2700 },
  'mesão frio': { municipality: 'Guimarães', district: 'Braga', lat: 41.4500, lng: -8.2700 },
  'moreira de conegos': { municipality: 'Guimarães', district: 'Braga', lat: 41.4100, lng: -8.3300 },
  'moreira de cónegos': { municipality: 'Guimarães', district: 'Braga', lat: 41.4100, lng: -8.3300 },
  'pevidem': { municipality: 'Guimarães', district: 'Braga', lat: 41.4200, lng: -8.3400 },
  'pevidém': { municipality: 'Guimarães', district: 'Braga', lat: 41.4200, lng: -8.3400 },
  'polvoreira': { municipality: 'Guimarães', district: 'Braga', lat: 41.4700, lng: -8.2900 },
  'ronfe': { municipality: 'Guimarães', district: 'Braga', lat: 41.4700, lng: -8.2700 },
  'selho': { municipality: 'Guimarães', district: 'Braga', lat: 41.4600, lng: -8.3100 },
  'silvares': { municipality: 'Guimarães', district: 'Braga', lat: 41.4300, lng: -8.2600 },
  'urgezes': { municipality: 'Guimarães', district: 'Braga', lat: 41.4500, lng: -8.3200 },
  'brito': { municipality: 'Guimarães', district: 'Braga', lat: 41.4200, lng: -8.2800 },
  'candoso': { municipality: 'Guimarães', district: 'Braga', lat: 41.4100, lng: -8.2700 },
  'gondar (guimaraes)': { municipality: 'Guimarães', district: 'Braga', lat: 41.4300, lng: -8.2500 },
  'lordelo': { municipality: 'Guimarães', district: 'Braga', lat: 41.4600, lng: -8.3200 },
  'nespereira': { municipality: 'Guimarães', district: 'Braga', lat: 41.4100, lng: -8.3100 },
  'pencelo': { municipality: 'Guimarães', district: 'Braga', lat: 41.4700, lng: -8.3100 },
  'serzedelo': { municipality: 'Guimarães', district: 'Braga', lat: 41.4000, lng: -8.3200 },
  'sao torcato': { municipality: 'Guimarães', district: 'Braga', lat: 41.4800, lng: -8.2800 },
  'são torcato': { municipality: 'Guimarães', district: 'Braga', lat: 41.4800, lng: -8.2800 },
  'abacao': { municipality: 'Guimarães', district: 'Braga', lat: 41.4300, lng: -8.2400 },
  'abação': { municipality: 'Guimarães', district: 'Braga', lat: 41.4300, lng: -8.2400 },
  'aldao': { municipality: 'Guimarães', district: 'Braga', lat: 41.4600, lng: -8.3300 },
  'aldão': { municipality: 'Guimarães', district: 'Braga', lat: 41.4600, lng: -8.3300 },
  'airao': { municipality: 'Guimarães', district: 'Braga', lat: 41.4700, lng: -8.3400 },
  'airão': { municipality: 'Guimarães', district: 'Braga', lat: 41.4700, lng: -8.3400 },

  // === CIM DO AVE — Fafe ===
  'fafe': { municipality: 'Fafe', district: 'Braga', lat: 41.4518, lng: -8.1720 },
  'aroes': { municipality: 'Fafe', district: 'Braga', lat: 41.4700, lng: -8.1500 },
  'arões': { municipality: 'Fafe', district: 'Braga', lat: 41.4700, lng: -8.1500 },
  'cepaes': { municipality: 'Fafe', district: 'Braga', lat: 41.4600, lng: -8.1900 },
  'cepães': { municipality: 'Fafe', district: 'Braga', lat: 41.4600, lng: -8.1900 },
  'fareja': { municipality: 'Fafe', district: 'Braga', lat: 41.4400, lng: -8.1600 },
  'fornelos (fafe)': { municipality: 'Fafe', district: 'Braga', lat: 41.4300, lng: -8.1800 },
  'freitas': { municipality: 'Fafe', district: 'Braga', lat: 41.4800, lng: -8.1700 },
  'golaes': { municipality: 'Fafe', district: 'Braga', lat: 41.4500, lng: -8.1400 },
  'golães': { municipality: 'Fafe', district: 'Braga', lat: 41.4500, lng: -8.1400 },
  'medelo': { municipality: 'Fafe', district: 'Braga', lat: 41.4400, lng: -8.2000 },
  'moreira do rei': { municipality: 'Fafe', district: 'Braga', lat: 41.4700, lng: -8.2100 },
  'quinchaes': { municipality: 'Fafe', district: 'Braga', lat: 41.4300, lng: -8.1500 },
  'quinchães': { municipality: 'Fafe', district: 'Braga', lat: 41.4300, lng: -8.1500 },
  'regadas': { municipality: 'Fafe', district: 'Braga', lat: 41.4600, lng: -8.1600 },
  'revelhe': { municipality: 'Fafe', district: 'Braga', lat: 41.4300, lng: -8.2100 },
  'ribeiros': { municipality: 'Fafe', district: 'Braga', lat: 41.4800, lng: -8.1400 },
  'serafao': { municipality: 'Fafe', district: 'Braga', lat: 41.4900, lng: -8.1600 },
  'serafão': { municipality: 'Fafe', district: 'Braga', lat: 41.4900, lng: -8.1600 },
  'travessos': { municipality: 'Fafe', district: 'Braga', lat: 41.4500, lng: -8.2000 },

  // === CIM DO AVE — Vila Nova de Famalicão ===
  'calendario': { municipality: 'Vila Nova de Famalicão', district: 'Braga', lat: 41.4100, lng: -8.5200 },
  'calendário': { municipality: 'Vila Nova de Famalicão', district: 'Braga', lat: 41.4100, lng: -8.5200 },
  'joane': { municipality: 'Vila Nova de Famalicão', district: 'Braga', lat: 41.4300, lng: -8.4500 },
  'riba de ave': { municipality: 'Vila Nova de Famalicão', district: 'Braga', lat: 41.3900, lng: -8.3700 },
  'ribeirao': { municipality: 'Vila Nova de Famalicão', district: 'Braga', lat: 41.3800, lng: -8.5000 },
  'ribeirão': { municipality: 'Vila Nova de Famalicão', district: 'Braga', lat: 41.3800, lng: -8.5000 },
  'nine': { municipality: 'Vila Nova de Famalicão', district: 'Braga', lat: 41.4400, lng: -8.5300 },
  'mogege': { municipality: 'Vila Nova de Famalicão', district: 'Braga', lat: 41.4200, lng: -8.4800 },
  'landim': { municipality: 'Vila Nova de Famalicão', district: 'Braga', lat: 41.4500, lng: -8.5100 },
  'lousado': { municipality: 'Vila Nova de Famalicão', district: 'Braga', lat: 41.3900, lng: -8.4600 },
  'gaviao': { municipality: 'Vila Nova de Famalicão', district: 'Braga', lat: 41.4000, lng: -8.5100 },
  'gavião': { municipality: 'Vila Nova de Famalicão', district: 'Braga', lat: 41.4000, lng: -8.5100 },
  'arnoso': { municipality: 'Vila Nova de Famalicão', district: 'Braga', lat: 41.4300, lng: -8.4700 },
  'bairro': { municipality: 'Vila Nova de Famalicão', district: 'Braga', lat: 41.4400, lng: -8.4600 },
  'brufe': { municipality: 'Vila Nova de Famalicão', district: 'Braga', lat: 41.4100, lng: -8.4400 },
  'cruz': { municipality: 'Vila Nova de Famalicão', district: 'Braga', lat: 41.4100, lng: -8.5300 },
  'delaes': { municipality: 'Vila Nova de Famalicão', district: 'Braga', lat: 41.4300, lng: -8.4300 },
  'delães': { municipality: 'Vila Nova de Famalicão', district: 'Braga', lat: 41.4300, lng: -8.4300 },
  'gondifelos': { municipality: 'Vila Nova de Famalicão', district: 'Braga', lat: 41.4200, lng: -8.5400 },
  'jesufrei': { municipality: 'Vila Nova de Famalicão', district: 'Braga', lat: 41.4400, lng: -8.4400 },
  'louro': { municipality: 'Vila Nova de Famalicão', district: 'Braga', lat: 41.3800, lng: -8.4300 },
  'mouquim': { municipality: 'Vila Nova de Famalicão', district: 'Braga', lat: 41.4500, lng: -8.4800 },
  'pedome': { municipality: 'Vila Nova de Famalicão', district: 'Braga', lat: 41.3900, lng: -8.4100 },
  'pousada de saramagos': { municipality: 'Vila Nova de Famalicão', district: 'Braga', lat: 41.4100, lng: -8.4700 },
  'requiao': { municipality: 'Vila Nova de Famalicão', district: 'Braga', lat: 41.4500, lng: -8.5200 },
  'requião': { municipality: 'Vila Nova de Famalicão', district: 'Braga', lat: 41.4500, lng: -8.5200 },
  'seide': { municipality: 'Vila Nova de Famalicão', district: 'Braga', lat: 41.4200, lng: -8.4200 },
  'vermoim': { municipality: 'Vila Nova de Famalicão', district: 'Braga', lat: 41.4000, lng: -8.5200 },

  // === CIM DO AVE — Vizela ===
  'vizela': { municipality: 'Vizela', district: 'Braga', lat: 41.3833, lng: -8.3089 },
  'caldas de vizela': { municipality: 'Vizela', district: 'Braga', lat: 41.3900, lng: -8.3100 },
  'infias': { municipality: 'Vizela', district: 'Braga', lat: 41.3800, lng: -8.3200 },
  'santa eulalia': { municipality: 'Vizela', district: 'Braga', lat: 41.3700, lng: -8.3000 },
  'santa eulália': { municipality: 'Vizela', district: 'Braga', lat: 41.3700, lng: -8.3000 },
  'santo adriao': { municipality: 'Vizela', district: 'Braga', lat: 41.3900, lng: -8.2900 },
  'santo adrião': { municipality: 'Vizela', district: 'Braga', lat: 41.3900, lng: -8.2900 },
  'tagilde': { municipality: 'Vizela', district: 'Braga', lat: 41.3700, lng: -8.3200 },

  // === CIM DO AVE — Cabeceiras de Basto ===
  'cabeceiras de basto': { municipality: 'Cabeceiras de Basto', district: 'Braga', lat: 41.5147, lng: -8.0048 },
  'abadim': { municipality: 'Cabeceiras de Basto', district: 'Braga', lat: 41.5300, lng: -8.0200 },
  'alvite': { municipality: 'Cabeceiras de Basto', district: 'Braga', lat: 41.5200, lng: -7.9800 },
  'arco de baulhe': { municipality: 'Cabeceiras de Basto', district: 'Braga', lat: 41.5400, lng: -7.9700 },
  'arco de baúlhe': { municipality: 'Cabeceiras de Basto', district: 'Braga', lat: 41.5400, lng: -7.9700 },
  'bucos': { municipality: 'Cabeceiras de Basto', district: 'Braga', lat: 41.5000, lng: -7.9900 },
  'cavez': { municipality: 'Cabeceiras de Basto', district: 'Braga', lat: 41.5300, lng: -7.9500 },
  'faia': { municipality: 'Cabeceiras de Basto', district: 'Braga', lat: 41.4900, lng: -8.0100 },
  'gondiaes': { municipality: 'Cabeceiras de Basto', district: 'Braga', lat: 41.5100, lng: -7.9600 },
  'gondiães': { municipality: 'Cabeceiras de Basto', district: 'Braga', lat: 41.5100, lng: -7.9600 },
  'pedraca': { municipality: 'Cabeceiras de Basto', district: 'Braga', lat: 41.5400, lng: -8.0300 },
  'pedraça': { municipality: 'Cabeceiras de Basto', district: 'Braga', lat: 41.5400, lng: -8.0300 },
  'refojos de basto': { municipality: 'Cabeceiras de Basto', district: 'Braga', lat: 41.5100, lng: -8.0100 },
  'rio douro': { municipality: 'Cabeceiras de Basto', district: 'Braga', lat: 41.5500, lng: -7.9800 },
  'vila nune': { municipality: 'Cabeceiras de Basto', district: 'Braga', lat: 41.5000, lng: -7.9700 },

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

