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

