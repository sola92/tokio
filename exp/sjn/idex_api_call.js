const axios = require('axios');
const { soliditySha3 } = require('web3-utils');
const {
  hashPersonalMessage,
  bufferToHex,
  toBuffer,
  ecsign
} = require('ethereumjs-util');
const { mapValues } = require('lodash');

const ADDRESS = (addr) => ({ address: addr});
const MARKET = (ticker) => ({ market: 'ETH_' + ticker.toUpperCase() });
const FEE_RATIO = 0.05;
const ETH_TOKEN_ADDR = '0x0000000000000000000000000000000000000000';

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

function determinePrice(amount, asks) {
  var remainingAmount = amount;
  var totalPrice = 0;
  for (i = 0; i < asks.length && remainingAmount > 0; i++) {
    let fillableAmount = Math.min(asks[i].amount, remainingAmount);
    totalPrice += asks[i].price * fillableAmount;
    remainingAmount -= fillableAmount;
  }
  return totalPrice;
}

function getPriceForAmount(ticker, amount) {
  getOrderBook(ticker)
    .then(function (response) {
      let price = determinePrice(amount, response.data.asks);
      console.log('price: ' + price + ' ETH'); 
      console.log('fee adjusted price: ' + price * (1 + FEE_RATIO) + ' ETH');
    })
    .catch(function (error) {
      console.log(error);
    });
}

function getCurrencies() {
  return talkToIdex('returnCurrencies', {})
    .then(function (response) {
      console.log(response.data);
    })
    .catch(function (error) {
      console.log(error);
    });
}

function getBalance(address) {
  return talkToIdex('returnOrderBook', ADDRESS(address))
    .then(function (response) {
      console.log(response.data);
    })
    .catch(function (error) {
      console.log(error);
    });
}

function getContractAddress(address) {
  return talkToIdex('returnContractAddress', ADDRESS(address))
    .then(function (response) {
      console.log(response.data);
    })
    .catch(function (error) {
      console.log(error);
    });
}

function postOrder(contractAddr, tokenBuyAddr, amountBuy, tokenSellAddr, amountSell, nonce, walletAddr) {
  const raw = soliditySha3({
    t: 'address',
    v: contractAddr
  }, {
    t: 'address',
    v: tokenBuyAddr
  }, {
    t: 'uint256',
    v: amountBuy
  }, {
    t: 'address',
    v: tokenSellAddr
  }, {
    t: 'uint256',
    v: amountSell
  }, {
    t: 'uint256',
    v: /* expires */ 0,
  }, {
    t: 'uint256',
    v: nonce
  }, {
    t: 'address',
    v: walletAddr
  });
  const salted = hashPersonalMessage(toBuffer(raw))
  const {
    v,
    r,
    s
  } = mapValues(ecsign(salted, privateKeyBuffer), (value, key) => key === 'v' ? value : bufferToHex(value));
  talkToIdex(
     'order',
     {
       'tokenBuy': tokenAddr,
       'amountBuy' : amount,
       'tokenSell' : tokenSellAddr,
       'amountSell' : ethSellAmount,
       'address' : walletAddr,
       'nonce' : nonce, 
       'expires' : 0,
       'v' : v,
       'r' : r,
       's' : s
     });
}


// Buying a Token by Selling ETH
function postBuyOrder(contractAddr, tokenBuyAddr, price, amount, nonce, walletAddr) {
let ethSellAmount = price * amount;
 
 postOrder(contractAddr, tokenBuyAddr, amount, /* tokenSellAddr */ ETH_TOKEN_ADDR, ethSellAmount, nonce, walletAddr);
}

getPriceForAmount('link', 10000);
getBalance('0xa7f696c344e6573c2be6e5a25b0eb7b1f510f499');
getContractAddress('0xa7f696c344e6573c2be6e5a25b0eb7b1f510f499');
postBuyOrder(
    /* contractAddr */ '0x2a0c0dbecc7e4d658f48e01e3fa353f44050c208',
    /* tokenBuyAddr */ '0xc853ba17650d32daba343294998ea4e33e7a48b9',
    /* price */ 0,
    /* amount */ 0,
    /* nonce */ 0,
    /* walletAddr */ '0xa7f696c344e6573c2be6e5a25b0eb7b1f510f499');
getCurrencies();

// next steps, move the hash and signing into a separate module with a class.
