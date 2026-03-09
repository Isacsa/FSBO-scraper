module.exports = {
  accepted: [
    {
      name: 'olx owner-direct with mobile phone',
      source: 'olx',
      item: {
        url: 'https://www.olx.pt/d/anuncio/moradia-t3-viana-ID123.html',
        title: 'Moradia T3 em Meadela',
        description: 'Venda particular. Sem imobiliarias. Contacto direto do proprietario.',
        advertiser: {
          name: 'Maria Lopes',
          is_agency: false,
          phone: '+351961234567',
        },
        fsbo_score: 82,
        fsbo_decision: 'fsbo',
      },
    },
    {
      name: 'idealista fsbo with explicit portal decision',
      source: 'idealista',
      item: {
        url: 'https://www.idealista.pt/imovel/123456/',
        title: 'Apartamento T2 em Lisboa',
        description: 'Particular a particular. Sem agencias.',
        advertiser: {
          name: 'Joao Costa',
          is_agency: false,
        },
        signals: {
          fsbo_decision: 'fsbo',
          fsbo_score: 78,
        },
      },
    },
  ],
  uncertain: [
    {
      name: 'casasapo weak evidence with unknown advertiser',
      source: 'casasapo',
      item: {
        url: 'https://casa.sapo.pt/comprar-apartamento-t2-viana-do-castelo-123.aspx',
        title: 'Apartamento T2 com varanda',
        description: 'Apartamento renovado no centro.',
        advertiser: {
          name: 'Anunciante',
          is_agency: null,
        },
        fsbo_score: 48,
        fsbo_decision: 'uncertain',
      },
    },
    {
      name: 'custojusto without positive fsbo evidence',
      source: 'custojusto',
      item: {
        url: 'https://www.custojusto.pt/braga/imobiliario/apartamentos/t2-braga-44325290',
        title: 'Apartamento T2',
        description: 'Apartamento remodelado e com varanda.',
        advertiser: {
          name: 'Jose Silva',
          is_agency: null,
        },
        fsbo_score: 45,
      },
    },
  ],
  rejected: [
    {
      name: 'olx garage listing',
      source: 'olx',
      item: {
        url: 'https://www.olx.pt/d/anuncio/garagem-no-centro-ID999.html',
        title: 'Garagem no centro',
        property: { type: 'garagem' },
        advertiser: {
          name: 'Joao Silva',
          is_agency: false,
        },
      },
    },
    {
      name: 'imovirtual agency listing',
      source: 'imovirtual',
      item: {
        url: 'https://www.imovirtual.com/pt/anuncio/moradia-t4-IDagency.html',
        title: 'Moradia T4',
        description: 'Consultor imobiliario. AMI 1234.',
        advertiser: {
          name: 'REMAX Braga',
          is_agency: true,
        },
        fsbo_score: 20,
        fsbo_decision: 'agency',
      },
    },
  ],
};
