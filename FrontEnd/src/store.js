import Vue from 'vue';
import Vuex from 'vuex';
import {
  dateToDisplayTime,
} from '@/utils/utility';
import Web3 from 'web3';

import whitePaperInterestRateModel from '@/contracts/WhitePaperInterestRateModel.json';
import jumpRateModel from '@/contracts/JumpRateModel.json';
import jumpRateModelV2 from '@/contracts/JumpRateModelV2.json';

// import { SSL_OP_NO_SESSION_RESUMPTION_ON_RENEGOTIATION } from "constants";

Vue.use(Vuex);

const store = new Vuex.Store({
  state: {
    themeMode: 'default',
    theme: {
      'default': {
        'main-bg-color': '#0e1e23',
        'header-bg-color': '#203238',
        'header-border-color': '#415b62',
        'tab-button-background-color': '#39545d',
        'primary-text-color': '#ffffff',
        'miner-sub-text-color': '#909ca0',
        'mobile-bg-color': '#edba9f',
        'green-color': '#5fd66a',
        'red-color': '#ff5353',
        'sec-mobile-bg-color': '#b37863',
        'pri-label-color': '#879fad',
        'just-black ': '#000000',
        'placeholder-color': '#999999',
        'border-bottom-color': '#1e2c31',
        'border-right-color ': '#445f66',
        'tab-color': '#38545d',
        'silder-bg-color': '#d3d3d3,',
        'secondary-modal-bg-color': '#0F1E23',
        'container-bg-color': '#121E22',
      },
    },
    username: null, //Added
    ledger: [],
    websocketStatus: 'Closed',
    activeOrders: [],       //handles orders
    recentTrades: [],       //handles recent trades
    loaderCounter: 0,
    markets: [],  //added
    mappedMarkets: new Map(),   //Added (mapped by ID)
    mappedMarketsbyName: new Map(),   //Added (mapped by name)
    loaderCancellable: false,
    isLoggedIn: true,
    sidebarOpen: false,
    tradePaneClosed: false,
    bookPaneClosed: false,
    liveTradePrice: 1,
    tickerCache: {},
    priceAnalysisSnapShot: {},
    selectedPair: 'BTC/USD',
    pubkeysArray: [],

    selectedVegaMarketName: 'ETHBTC/DEC20',    //Added
    selectedVegaMarketId: 'RTJVFCMFZZQQLLYVSXTWEN62P6AH6OCN',     //Added
    selectedVegaMarketSummary: 'December 2020 ETH vs BTC future',     //Added
    selectedVegaMarketbaseName: 'ETHBTC', //Added
    selectedVegaMarketquoteName: 'BTC', //Added

    selectedVegaMarketTradeId: 'RTJVFCMFZZQQLLYVSXTWEN62P6AH6OCN',     //Added
    selectedVegaMarketNameTrade: 'ETHBTC/DEC20',    //Added
    selectedVegaMarketSummaryTrade: 'December 2020 ETH vs BTC future',     //Added
    selectedVegaMarketbaseNameTrade: 'ETHBTC', //Added
    selectedVegaMarketquoteNameTrade: 'BTC', //Added

    totalRealizedPNL_VUSD: 0,          //Realized PNL
    totalUnrealizedPNL_VUSD: 0,        //Unrealized PNL
    totalRealizedPNL_BTC: 0,          //Realized PNL
    totalUnrealizedPNL_BTC: 0,        //Unrealized PNL

    // totalRealizedPNL: 0,
    selectedExchange: 'bitfinex',
    supportedPairs: [],
    totalPortfolioValue: 0,
    tpvCurrency: 'USD',
    limitTab: false,
    marketIOCTab: true, //Added
    limitGTCTab: false, //Added
    limitFOKTab:false,  //Added
    limitIOCTab: false, //Added
    tickerData: {},
    availablePairs: [],
    buyPrice: 0,
    sellPrice: 0,
    precision: 0.0001,


    web3: {} ,  //WEB3 INSTANCE
    web3Account: '',
    networkId: '',

  },


  getters: {
    username(state) {     //Added
      return state.username;
    },
    websocketStatus(state) {
      return state.websocketStatus;
    },
    themeMode(state) {
      return state.themeMode;
    },
    limitTab(state) {
      return state.limitTab;
    },
    marketIOCTab(state) {     //Added
      return state.marketIOCTab;
    },
    limitGTCTab(state) {      //Added
      return state.limitGTCTab;
    },
    limitFOKTab(state) {      //Added
      return state.limitFOKTab;
    },
    limitIOCTab(state) {      //Added
      return state.limitIOCTab;
    },
    supportedPairs(state) {
      return [...new Set(state.supportedPairs), ];
    },
    selectedPair(state) {
      return state.selectedPair;
    },
    selectedVegaMarket(state) {   //Added
      return {'selectedVegaMarketName':state.selectedVegaMarketName,'selectedVegaMarketId':state.selectedVegaMarketName,};
    },
    selectedVegaMarketName(state) {   //Added
      return state.selectedVegaMarketName;
    },
    pubkeysArray(state) {           //returns array having pubkeys
      return state.pubkeysArray;
    },
    selectedVegaMarketId(state) {     //Added
      return state.selectedVegaMarketId;
    },
    selectedVegaMarketSummary(state) {  //Added
      return state.selectedVegaMarketSummary;
    },
    selectedVegaMarketbaseName(state) {   //Added
      return state.selectedVegaMarketbaseName;
    },
    selectedVegaMarketquoteName(state) {    //Added
      return state.selectedVegaMarketquoteName;
    },

    selectedVegaMarketNameTrade(state) {   //Added
      return state.selectedVegaMarketNameTrade;
    },
    selectedVegaMarketTradeId(state) {     //Added
      return state.selectedVegaMarketTradeId;
    },
    selectedVegaMarketSummaryTrade(state) {  //Added
      return state.selectedVegaMarketSummaryTrade;
    },
    selectedVegaMarketbaseNameTrade(state) {   //Added
      return state.selectedVegaMarketbaseNameTrade;
    },
    selectedVegaMarketquoteNameTrade(state) {    //Added
      return state.selectedVegaMarketquoteNameTrade;
    },
    
    isLoggedIn(state) {
      return state.isLoggedIn;
    },
    currentTime() {
      return dateToDisplayTime();
    },
    ledger(state) {
      return state.ledger;
    },
    activeOrders(state) {     //returns activeOrders
      return state.activeOrders;
    },
    markets(state) {      //Added. Should store markets data
      return state.markets;
    },    
    mappedMarkets(state) {  //Added. Should store markets data
      return state.mappedMarkets;
    },
    mappedMarketsbyName(state) {  //Added. Should store markets data
      return state.mappedMarketsbyName;
    },    
    recentTrades(state) {       //gets recent trades
      return state.recentTrades;
    },
    totalUnrealizedPNL_VUSD(state) {   //totalUnrealizedPNL 
      return state.totalUnrealizedPNL_VUSD;
    },
    totalRealizedPNL_VUSD(state) {     //totalRealizedPNL
      return state.totalRealizedPNL_VUSD;
    },
    totalUnrealizedPNL_BTC(state) {   //totalUnrealizedPNL 
      return state.totalUnrealizedPNL_BTC;
    },
    totalRealizedPNL_BTC(state) {     //totalRealizedPNL
      return state.totalRealizedPNL_BTC;
    },

    showLoader(state) {
      return state > 0;
    },
    loaderCancellable(state) {
      return state.loaderCancellable;
    },
    sidebarOpen(state) {
      return state.sidebarOpen;
    },
    liveTradePrice(state) {
      return state.liveTradePrice;
    },
    tickerCache(state) {
      return state.tickerCache;
    },
    priceAnalysisSnapShot(state) {
      return state.priceAnalysisSnapShot;
    },
    selectedExchange(state) {
      return state.selectedExchange;
    },
    formattedSelectedExchange(state) {
      switch (state.selectedExchange) {
        case 'vegaProtocol':
          return 'vegaProtocol';
        default:
          return (
            state.selectedExchange.charAt(0).toUpperCase() +
                        state.selectedExchange.slice(1)
          );
      }
    },
    getTickerData(state) {
      return state.tickerData;
    },
    getccTickerData(state) {
      return state.tickerData[state.selectedPair.split('/')[0]][state.selectedPair].exchanges;
    },
    getAvailablePairs(state) {
      return state.availablePairs;
    },
    buyPrice(state) {
      return state.buyPrice;
    },
    sellPrice(state) {
      return state.sellPrice;
    },
    precisionSelectedpair(state) {
      return state.precision;
    },
  },


  mutations: {
    updateusername(state,name) {  //Added
      state.username = name;
    },
    changeWebsocketStatus(state, websocketStatus) {
      state.websocketStatus = websocketStatus;
    },
    changeHedgeTab(state) {     //Added
      state.limitTab = true;
    },
    changeToLimitFOKTab(state) {     //Added
      state.limitFOKTab = true;
    },
    changeToLimitGTCTab(state) {     //Added
      state.limitGTCTab = true;
    },
    changeToLimitIOCTab(state) {     //Added
      state.limitIOCTab = true;
    },
    changeInvestTab(state) {    //Added
      state.limitTab = false;
    },
    totalUnrealizedPNL_VUSD(state,val) {  //Added
      state.totalUnrealizedPNL_VUSD = val;
    },
    totalRealizedPNL_VUSD(state,val) {      //Added
      state.totalRealizedPNL_VUSD = val;
    },    
    totalUnrealizedPNL_BTC(state,val) {  //Added
      state.totalUnrealizedPNL_BTC = val;
    },
    totalRealizedPNL_BTC(state,val) {      //Added
      state.totalRealizedPNL_BTC = val;
    },    
    changeInvest_Invest_Tab(state) {
      state.marketIOCTab = false;
    },
    changeInvest_Withdraw_Tab(state) {
      state.marketIOCTab = true;
    },

    isLoggedIn(state, isLoggedIn) {
      state.isLoggedIn = isLoggedIn;
    },
    ledger(state, newLedger) {
      state.ledger = newLedger;
      store.commit('totalPortfolioValue');
    },
    activeOrders(state, newValue) {   //Replace all orders
      state.activeOrders = newValue;
    },
    addToActiveOrders(state,newOrder) {   //Add new order 
      state.activeOrders.unshift(newOrder);
      // console.log(state.activeOrders);
      if (state.activeOrders.length > 50) {
        state.activeOrders.pop();
      }
    },
    removeFromActiveOrders(state,orderID) {
      for (let i=0; i<state.activeOrders.length; i++) {
        if (state.activeOrders[i].id == orderID) {
          let cur = state.activeOrders[i];
          let index = state.activeOrders.indexOf(cur);
          // console.log('DELETING ORDER - ' + cur + ' ' + index); 
          state.activeOrders.splice(index,1);
          // console.log(state.activeOrders);
        }
      }
    },
    markets(state, newMarkets) {  //Added for markets. Should function properly
      // console.log(newMarkets);
      state.markets = newMarkets;
      // console.log(state.markets);
    },
    mappedMarkets(state,newMarket) {  //Added for markets. Should function properly
      // console.log(newMarket);
      state.mappedMarkets.set(newMarket.id,newMarket.data);
      // console.log(state.mappedMarkets);
    },
    mappedMarketsbyName(state,newMarket) {  //Added for markets. Should function properly
      // console.log(newMarket);
      state.mappedMarketsbyName.set(newMarket.data.name,newMarket); 
      // console.log('MAPPED MARKETS BY NAME -' - state.mappedMarketsbyName);
    },    
    recentTrades(state, newValue) {     //sets the recent trades
      state.recentTrades = newValue;
    },
    addToRecentTrades(state,trade) {    //Adds new trade to recent Trades
      state.recentTrades.unshift(trade);
      if (state.recentTrades.length > 50) {
        state.recentTrades.pop();
      }
    },
    addLoaderTask(state, count, cancellable = false) {
      // // console.log(count);
      state.loaderCounter += count;
      state.loaderCancellable = cancellable;
    },
    removeLoaderTask(state, count) {
      // // console.log(count);
      if (state.loaderCounter > 0) {
        state.loaderCounter -= count;
        state.loaderCancellable = false;
      } else if (state.loaderCounter < 0) {
        state.loaderCounter = 0;
      }
    },
    toggleSidebar(state) {    //Disables/Enables page scroll when side-bar is loaded (mobile)
      if (!state.sidebarOpen) {
        document.body.classList.add('no-scroll');
      } else {
        document.body.classList.remove('no-scroll');
      }
      state.sidebarOpen = !state.sidebarOpen;
    },
    toggleTradePaneClosed(state) {
      state.tradePaneClosed = !state.tradePaneClosed;
    },
    toggleBookPaneClosed(state) {
      state.bookPaneClosed = !state.bookPaneClosed;
    },
    closeSidebar(state) {
      if (!state.sidebarOpen) {
        return;
      }
      this.commit('toggleSidebar');
    },
    liveTradePrice(state, ltp) {
      state.liveTradePrice = ltp;
    },
    tickerCache(state, ticker) {
      state.tickerCache = ticker;
    },
    priceAnalysisSnapShot(state, snapshot) {
      state.priceAnalysisSnapShot = snapshot;
    },
    selectedExchange(state, exchange) {
      state.selectedExchange = exchange;
    },
    selectedPair(state, exchange) {
      state.selectedPair = exchange;
    },
    changeSelectedVegaMarket(state,newMarket) { //ADDED
      // console.log('In Store - ' );
      state.selectedVegaMarketName = newMarket.Name;
      state.selectedVegaMarketId = newMarket.Id;
      // console.log(typeof(newMarket.Id));
      // console.log(state.selectedVegaMarketName + ' ' + state.selectedVegaMarketId );
      // console.log(typeof(state.selectedVegaMarketId));
      state.selectedVegaMarketId = toString(state.selectedVegaMarketId);
      // console.log(typeof(state.selectedVegaMarketId));
    },
    changeSelectedVegaMarketSummary(state,summary) {  //Added
      state.selectedVegaMarketSummary = summary;
    },
    changeSelectedVegaMarketbaseName(state,baseName) {  //Added
      state.selectedVegaMarketbaseName = baseName;
    },
    changeSelectedVegaMarketquoteName(state,quoteName) {  //Added
      state.selectedVegaMarketquoteName = quoteName;
    },
////////////////////
    changeSelectedVegaMarketNameTrade(state,Name) {  //Added (TradeTab)
      state.selectedVegaMarketNameTrade = Name;
    },    
    changeSelectedVegaMarketTradeId(state,Id) {  //Added (TradeTab)
      state.selectedVegaMarketTradeId = Id;
    },    
    changeSelectedVegaMarketSummaryTrade(state,summary) {  //Added (TradeTab)
      state.selectedVegaMarketSummaryTrade = summary;
    },
    changeSelectedVegaMarketbaseNameTrade(state,baseName) {  //Added (TradeTab)
      state.selectedVegaMarketbaseNameTrade = baseName;
    },
    changeSelectedVegaMarketquoteNameTrade(state,quoteName) {  //Added (TradeTab)
      state.selectedVegaMarketquoteNameTrade = quoteName;
    },
    



    addSupportedPair() {
      // state.supportedPairs.push(pair);
    },
    totalPortfolioValue(state) {
      state.totalPortfolioValue = state.ledger
                .reduce((tpv, {
                  currency,
                  total,
                }) => {
                  currency = currency.toUpperCase();
                  let sellPrice = 1;
                  if (currency !== state.tpvCurrency) {
                    sellPrice =
                            ((((
                              (state.tickerData[currency] || {})[
                                    `${currency}/${state.tpvCurrency}`
                              ] || {}
                            ).best || {}).bids || {})[0] || {}).price || 0;
                  }
                  tpv += sellPrice * total;
                  return tpv;
                }, 0)
                .toFixed(3);
    },
    changeTickerData(state, data) {
      // alert("change");
      state.tickerData = data;
    },
    changePairData(state, data) {
      state.availablePairs = data;
    },
    buyPrice(state, price) {
      state.buyPrice = price;
    },
    sellPrice(state, price) {
      state.sellPrice = price;
    },
    precisionMap(state, map) {
      state.precision = map;
    },
    // SIGH FINANCE DEVELOPMENTS
    SET_WEB3(state, payload) {
      state.web3 = payload;
      console.log(payload);
      console.log(state.web3);
    },
    SET_ACCOUNT(state, payload) {
      state.web3Account = payload;
      console.log(payload);
      console.log(state.web3Account);
    },
    SET_NETWORK_ID(state, payload) {
      state.networkId = payload;
      console.log(payload);
      console.log(state.networkId);
    }

  },


  actions: {

    // CONNECTS TO WEB3 NETWORK (GANACHE/KOVAN/ETHEREUM/BSC ETC)
    loadWeb3: async ({ commit }) => {
      if (window.ethereum) {
        const provider = new Web3.providers.HttpProvider('http://127.0.0.1:7545');  //CONNECTING TO GANACHE
        const web3 = new Web3(provider);
        commit('SET_WEB3',web3);
        // state.web3 = new Web3(window.ethereum);

        // try {        // Request account access if needed
        //   await window.ethereum.enable();
        //   return state.web3;
        // } 
        // catch (error) {
        //   console.log('NOT enabled');        
        //   console.error(error);
        // }
      }
      // // For older version dapp browsers ...
      else if (window.web3) {      //   // Use Mist / MetaMask's provider.
        const provider = new Web3.providers.HttpProvider('http://127.0.0.1:7545');  //CONNECTING TO GANACHE
        const web3 = new Web3(provider);
        commit('SET_WEB3',web3);
        // state.web3 = window.web3;
        // console.log('Injected web3 detected.', window.web3);
        return web3;
      }
      // If the provider is not found, it will default to the local network ...
      else {
        const provider = new Web3.providers.HttpProvider('http://127.0.0.1:7545');  //CONNECTING TO GANACHE
        const web3 = new Web3(provider);
        commit('SET_WEB3',web3);
        console.log('No web3 instance injected, using Local web3.');
        return web3;
      }
    },

    // SETS ACCOUNT AND NETWORK ID
    getBlockchainData: async ({commit,state}) => {
      const web3 = state.web3;
      const accounts = await web3.eth.getAccounts();
      console.log(accounts);
      commit('SET_ACCOUNT',accounts[0]);
      const networkId = await web3.eth.net.getId(); 
      commit('SET_NETWORK_ID',networkId);
     },

    //  WHITEPAPER_INTEREST_RATE_MODEL CONTRACT CALLS (START)

    whitePaperModelChangeBaseParamters: async ({commit,state},{baseRatePerYear, multiplierPerYear}) => {
      const web3 = state.web3;
      console.log(web3);
      const whitePaperModel = whitePaperInterestRateModel.networks[state.networkId];
      console.log(whitePaperModel);
      if (whitePaperModel) {
        const interestRateModel = new web3.eth.Contract(whitePaperInterestRateModel.abi, whitePaperModel.address );
        console.log(interestRateModel);
        interestRateModel.methods.setBaseParameters(baseRatePerYear,multiplierPerYear).send({from: state.web3Account,gas: 100,})
        .then(receipt => { 
          console.log(receipt);
          })
        .catch(error => {
          console.log(error);
        })
      }
      else {
        console.log('Contract not deployed');
      }
    },

    
    whitePaperModelUtilRate: async ({commit,state},{cash, borrows, reserves}) => {
      const web3 = state.web3;
      console.log(web3);
      const whitePaperModel = whitePaperInterestRateModel.networks[state.networkId];
      console.log(whitePaperModel);
      if (whitePaperModel) {
        const interestRateModel = new web3.eth.Contract(whitePaperInterestRateModel.abi, whitePaperModel.address );
        console.log(interestRateModel);
        const utilRate = await interestRateModel.methods.utilizationRate(cash,borrows,reserves).call();        
        console.log( 'UTIL RATE - ' + utilRate);
      }
      else {
        console.log('Contract not deployed');
      }
    },
 
     whitePaperModelBorrowRate: async ({commit,state},{cash, borrows, reserves}) => {
      const web3 = state.web3;
      console.log(web3);
      const whitePaperModel = whitePaperInterestRateModel.networks[state.networkId];
      console.log(whitePaperModel);
      if (whitePaperModel) {
        const interestRateModel = new web3.eth.Contract(whitePaperInterestRateModel.abi, whitePaperModel.address );
        console.log(interestRateModel);
        const borrowRate = await interestRateModel.methods.getBorrowRate(cash,borrows,reserves).call();
        console.log( 'BORROW RATE - ' + borrowRate);
      }
    },

    whitePaperModelSupplyRate: async ({commit,state},{cash, borrows, reserves, reserveMantissa}) => {
      const web3 = state.web3;
      console.log(web3);
      const whitePaperModel = whitePaperInterestRateModel.networks[state.networkId];
      console.log(whitePaperModel);
      if (whitePaperModel) {
        const interestRateModel = new web3.eth.Contract(whitePaperInterestRateModel.abi, whitePaperModel.address );
        console.log(interestRateModel);
        const supplyRate = await interestRateModel.methods.getSupplyRate(cash,borrows,reserves,reserveMantissa).call();
        console.log( 'SUPPLY RATE - ' + supplyRate);
      }
    },

    //  WHITEPAPER_INTEREST_RATE_MODEL CONTRACT CALLS (END)

    //  JUMP_INTEREST_RATE_MODEL CONTRACT CALLS (START)

    jumpModelUtilRate: async ({commit,state},{cash, borrows, reserves}) => {
      const web3 = state.web3;
      console.log(web3);
      const jumpModel = jumpRateModel.networks[state.networkId];
      console.log(jumpModel);
      if (jumpModel) {
        const jumpModel_ = new web3.eth.Contract(jumpRateModel.abi, jumpModel.address );
        console.log(jumpModel_);
        const utilRate = await jumpModel_.methods.utilizationRate(cash,borrows,reserves).call();        
        console.log( 'UTIL RATE - ' + utilRate);
      }
      else {

      }
    },

    jumpModelBorrowRate: async ({commit,state},{cash, borrows, reserves}) => {
     const web3 = state.web3;
     console.log(web3);
     const jumpModel = jumpRateModel.networks[state.networkId];
     console.log(jumpModel);
     if (jumpModel) {
       const jumpModel_ = new web3.eth.Contract(jumpRateModel.abi, jumpModel.address );
       console.log(jumpModel_);
       const borrowRate = await jumpModel_.methods.getBorrowRate(cash,borrows,reserves).call();
       console.log( 'BORROW RATE - ' + borrowRate);
     }
   },

    jumpModelSupplyRate: async ({commit,state},{cash, borrows, reserves, reserveMantissa}) => {
     const web3 = state.web3;
     console.log(web3);
     const jumpModel = jumpRateModel.networks[state.networkId];
     console.log(jumpModel);
     if (jumpModel) {
       const jumpModel_ = new web3.eth.Contract(jumpRateModel.abi, jumpModel.address );
       console.log(jumpModel_);
       const supplyRate = await jumpModel_.methods.getSupplyRate(cash,borrows,reserves,reserveMantissa).call();
       console.log( 'SUPPLY RATE - ' + supplyRate);
     }
   },

   //  JUMP_INTEREST_RATE_MODEL CONTRACT CALLS (END)

    //  JUMP_INTEREST_RATE_MODEL__V2 CONTRACT CALLS (START)

    jumpV2ModelUtilRate: async ({commit,state},{cash, borrows, reserves}) => {
      const web3 = state.web3;
      console.log(web3);
      const jumpModelV2 = jumpRateModelV2.networks[state.networkId];
      console.log(jumpModelV2);
      if (jumpModelV2) {
        const jumpModel_V2 = new web3.eth.Contract(jumpRateModelV2.abi, jumpModelV2.address );
        console.log(jumpModel_V2);
        const utilRate = await jumpModel_V2.methods.utilizationRate(cash,borrows,reserves).call();        
        console.log( 'UTIL RATE - ' + utilRate);
      }
      else {

      }
    },

    jumpV2ModelBorrowRate: async ({commit,state},{cash, borrows, reserves}) => {
     const web3 = state.web3;
     console.log(web3);
     const jumpModelV2 = jumpRateModelV2.networks[state.networkId];
     console.log(jumpModelV2);
     if (jumpModelV2) {
       const jumpModel_V2 = new web3.eth.Contract(jumpRateModelV2.abi, jumpModelV2.address );
       console.log(jumpModel_V2);
       const borrowRate = await jumpModel_V2.methods.getBorrowRate(cash,borrows,reserves).call();
       console.log( 'BORROW RATE - ' + borrowRate);
     }
   },

    jumpV2ModelSupplyRate: async ({commit,state},{cash, borrows, reserves, reserveMantissa}) => {
     const web3 = state.web3;
     console.log(web3);
     const jumpModelV2 = jumpRateModelV2.networks[state.networkId];
     console.log(jumpModelV2);
     if (jumpModelV2) {
       const jumpModel_V2 = new web3.eth.Contract(jumpRateModelV2.abi, jumpModelV2.address );
       console.log(jumpModel_V2);
       const supplyRate = await jumpModel_V2.methods.getSupplyRate(cash,borrows,reserves,reserveMantissa).call();
       console.log( 'SUPPLY RATE - ' + supplyRate);
     }
   },

   //  JUMP_INTEREST_RATE_MODEL___V2 CONTRACT CALLS (END)










    //  import DaiToken from '../abis/daitoken.json'
    //  const daiTokenData = DaiToken.networks[networkId]; // address of teh contract if it is deployed on current network Id
    //  if (daiTokenData) {
    //    const daiToken = new web3.eth.Contract(DaiToken.abi, daiTokenData.address); // creating a web3 version for interacting with the contract
    //    daiBalance = await daiToken.methods.balanceOf(state.web3Account).call();
    //    state.DaiBalance = daiTokenBalance.toString();
    //  }
    //  else {
    //    window.alert('DAI token not deployed on the network');
    //  }



    toggleTheme({state,}, themeMode) {
      state.themeMode = themeMode;
      const themeObj = Object.keys(state.theme[themeMode]);
      for (let i = 0; i < themeObj.length; i++) {
        document.documentElement.style.setProperty(`--${themeObj[i]}`, state.theme[themeMode][themeObj[i]]);
      }
    },
  },

});


export default store;