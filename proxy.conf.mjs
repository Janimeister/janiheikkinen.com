// Dev-server proxies, so the browser never needs third-party CORS or API keys.
// Digitransit needs a subscription key: set DIGITRANSIT_SUBSCRIPTION_KEY before `npm start`
// (https://portal-api.digitransit.fi). Without one the departures page shows its error card.
const digitransitKey = process.env['DIGITRANSIT_SUBSCRIPTION_KEY'];

export default {
  '/api/porssisahko': {
    target: 'https://api.porssisahko.net',
    secure: true,
    changeOrigin: true,
    pathRewrite: {
      '^/api/porssisahko': '',
    },
  },
  '/api/digitransit': {
    target: 'https://api.digitransit.fi',
    secure: true,
    changeOrigin: true,
    pathRewrite: {
      '^/api/digitransit': '/routing/v2/hsl/gtfs/v1',
    },
    headers: digitransitKey ? { 'digitransit-subscription-key': digitransitKey } : {},
  },
};
