const axios = require('axios');

const MARKET = (ticker) => ({ market: 'ETH_' + ticker.toUpperCase() });

function talkToIdex(method, args) {
  return axios.post('https://api.idex.market/' + method, args);
}

function printTickerInfo(ticker) {
  talkToIdex('returnTicker', MARKET(ticker))
    .then(function (response) {
      console.log(response.data);
    })
    .catch(function (error) {
      console.log(error);
    });
}

function getOrderBook(ticker) {
  return talkToIdex('returnOrderBook', MARKET(ticker));
}

function determinePrice(ticker, quantity) {
  getOrderBook(ticker)
    .then((function (response) {
      if (response.data.asks.length <= 0) {
        return;
      }

      var remainingQuantity = quantity;
      var totalPrice = 0;
      for (i = 0; i < response.data.asks.length && remainingQuantity > 0; i++) {
        let fillableQuantity = Math.min(response.data.asks[i].amount, remainingQuantity);
        totalPrice += response.data.asks[i].price * fillableQuantity;
        remainingQuantity -= fillableQuantity;
      }
      console.log('price: ' + totalPrice + ' ETH'); 
    }));
}


printTickerInfo('link');
determinePrice('link', 10000);
