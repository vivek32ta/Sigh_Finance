/* eslint-disable prefer-const */ // to satisfy AS compiler
import {
    Mint,
    Redeem,
    Borrow,
    RepayBorrow,
    LiquidateBorrow,
    Transfer,
    AccrueInterest,
    NewReserveFactor,
    NewMarketInterestRateModel,
    NewPendingAdmin,
    NewAdmin,
    NewSightroller,
    ReservesAdded,
    ReservesReduced,
  } from '../../generated/POLY/cToken'
  import { UserAccount_IndividualMarketStats, Market, Account } from '../../generated/schema'
  
  import { createMarket, updateMarket, } from '../helpers'
  import {createUserAccount,updateUserAccount_IndividualMarketStats,exponentToBigDecimal,cTokenDecimalsBD,cTokenDecimals,zeroBD,} from '../helpers'
  import { log } from '@graphprotocol/graph-ts'





  /* Transferring of cTokens
   *
   * event.params.from = sender of cTokens
   * event.params.to = receiver of cTokens
   * event.params.amount = amount sent
   *
   * Notes
   *    Possible ways to emit Transfer:
   *      seize() - i.e. a Liquidation Transfer (does not emit anything else)
   *      redeemFresh() - i.e. redeeming your cTokens for underlying asset
   *      mintFresh() - i.e. you are lending underlying assets to create ctokens
   *      transfer() - i.e. a basic transfer
   *    ************ This function handles all 4 cases. Transfer is emitted alongside the mint, redeem, and seize
   *    events. So for those events, we do not update cToken balances. *************
   */
  export function handleTransfer(event: Transfer): void {
    // We only updateMarket() if accrual block number is not up to date. This will only happen
    // with normal transfers, since mint, redeem, and seize transfers will already run updateMarket()
    let marketID = event.address.toHexString()
    let market = Market.load(marketID)
    if (market == null) {
        market = createMarket(marketID)
      }
  
    if (market.accrualBlockNumber != event.block.number.toI32()) {
      market = updateMarket(event.address,event.block.number.toI32(),event.block.timestamp.toI32(),)
    }
  
    let amountUnderlying = market.exchangeRate.times(event.params.amount.toBigDecimal().div(cTokenDecimalsBD),)
    log.info('handleTransfer : market.exchangeRate : {}',[market.exchangeRate.toString()] )
    log.info('handleTransfer : event.params.amount.toBigDecimal().div(cTokenDecimalsBD): {}',[event.params.amount.toBigDecimal().div(cTokenDecimalsBD).toString()] )
    // log.info('handleTransfer : amountUnderlying : {}',amountUnderlying )
    let amountUnderylingTruncated = amountUnderlying.truncate(market.underlyingDecimals)
    // log.info('handleTransfer : amountUnderylingTruncated : {}',[amountUnderylingTruncated.toString()])
  
    let accountFromID = event.params.from.toHex()
  
    // Checking if the tx is FROM the cToken contract (i.e. this will not run when minting)
    // If so, it is a mint, and we don't need to run these calculations
    if (accountFromID != marketID) {

      let accountFrom = Account.load(accountFromID)
      if (accountFrom == null) {
        createUserAccount(accountFromID)
      }
  
      // Update cTokenStats common for all events, and return the stats to update unique values for each event
      let MarketStatsFrom = updateUserAccount_IndividualMarketStats(market.id,market.symbol,accountFromID,event.transaction.hash,event.block.timestamp.toI32(),event.block.number.toI32(),)
  
      log.info('handleTransfer : cTokenBalance (before) : {}',[MarketStatsFrom.cTokenBalance.toString()] )
      MarketStatsFrom.cTokenBalance = MarketStatsFrom.cTokenBalance.minus(event.params.amount.toBigDecimal().div(cTokenDecimalsBD).truncate(cTokenDecimals),)
      log.info('handleTransfer : cTokenBalance (after) : {}',[MarketStatsFrom.cTokenBalance.toString()] )

      log.info('handleTransfer : MarketStatsFrom.totalUnderlyingRedeemed (before) : {}',[MarketStatsFrom.totalUnderlyingRedeemed.toString()] )      
      MarketStatsFrom.totalUnderlyingRedeemed = MarketStatsFrom.totalUnderlyingRedeemed.plus(amountUnderylingTruncated,)
      log.info('handleTransfer : MarketStatsFrom.totalUnderlyingRedeemed (after) : {}',[MarketStatsFrom.totalUnderlyingRedeemed.toString()] )
      MarketStatsFrom.save()
  
      if (MarketStatsFrom.cTokenBalance.equals(zeroBD)) {
        market.numberOfSuppliers = market.numberOfSuppliers - 1
        // log.info('handleTransfer : market.numberOfSuppliers (after) : {}',[market.numberOfSuppliers.toString()] )
        market.save()
      }
    }
  
    let accountToID = event.params.to.toHex()
    // Checking if the tx is TO the cToken contract (i.e. this will not run when redeeming)
    // If so, we ignore it. this leaves an edge case, where someone who accidentally sends
    // cTokens to a cToken contract, where it will not get recorded. Right now it would
    // be messy to include, so we are leaving it out for now (TODO fix this in future)
    if (accountToID != marketID) {
      let accountTo = Account.load(accountToID)
      if (accountTo == null) {
        createUserAccount(accountToID)
      }
  
      // Update cTokenStats common for all events, and return the stats to update unique
      // values for each event
      let cTokenStatsTo = updateUserAccount_IndividualMarketStats(market.id,market.symbol,accountToID,event.transaction.hash,event.block.timestamp.toI32(),event.block.number.toI32(),)
  
      log.info('handleTransfer : cTokenStatsTo.cTokenBalance (before) : {}',[cTokenStatsTo.cTokenBalance.toString()] )
      let previousCTokenBalanceTo = cTokenStatsTo.cTokenBalance
      cTokenStatsTo.cTokenBalance = cTokenStatsTo.cTokenBalance.plus(event.params.amount.toBigDecimal().div(cTokenDecimalsBD).truncate(cTokenDecimals),)
      log.info('handleTransfer : cTokenStatsTo.cTokenBalance (after) : {}',[cTokenStatsTo.cTokenBalance.toString() ])
      cTokenStatsTo.totalUnderlyingSupplied = cTokenStatsTo.totalUnderlyingSupplied.plus(amountUnderylingTruncated,)
      log.info('handleTransfer : cTokenStatsTo.totalUnderlyingSupplied (after) : {}',[cTokenStatsTo.totalUnderlyingSupplied.toString()] )
      cTokenStatsTo.save()
  
      if ( previousCTokenBalanceTo.equals(zeroBD) && !event.params.amount.toBigDecimal().equals(zeroBD)) // checking edge case for transfers of 0) {
        market.numberOfSuppliers = market.numberOfSuppliers + 1
        market.save()
      }
    }
  






    export function handleAccrueInterest(event: AccrueInterest): void {
        updateMarket(event.address, event.block.number.toI32(), event.block.timestamp.toI32())
      }
    




  
  /* Borrow assets from the protocol. All values either ETH or ERC20
   *
   * event.params.totalBorrows = of the whole market (not used right now)
   * event.params.accountBorrows = total of the account
   * event.params.borrowAmount = that was added in this event
   * event.params.borrower = the account
   * Notes
   *    No need to updateMarket(), handleAccrueInterest() ALWAYS runs before this
   */
  export function handleBorrow(event: Borrow): void {
    let market = Market.load(event.address.toHexString())
    let accountID = event.params.borrower.toHex()
  
    // Update cTokenStats common for all events, and return the stats to update unique values for each event
    let UserAccountMarketStats = updateUserAccount_IndividualMarketStats(market.id,market.symbol,accountID,event.transaction.hash,event.block.timestamp.toI32(),event.block.number.toI32(),)
  
    let borrowAmountBD = event.params.borrowAmount.toBigDecimal().div(exponentToBigDecimal(market.underlyingDecimals))
    let previousBorrow = UserAccountMarketStats.storedBorrowBalance
    UserAccountMarketStats.totalUnderlyingBorrowed = UserAccountMarketStats.totalUnderlyingBorrowed.plus(borrowAmountBD,)
    UserAccountMarketStats.storedBorrowBalance = event.params.accountBorrows.toBigDecimal().div(exponentToBigDecimal(market.underlyingDecimals)).truncate(market.underlyingDecimals)  
    UserAccountMarketStats.accountBorrowIndex = market.borrowIndex
    UserAccountMarketStats.save()
  
    let account = Account.load(accountID)
    if (account == null) {
      account = createUserAccount(accountID)
    }
    account.hasBorrowed = true
    account.save()
  
    if ( previousBorrow.equals(zeroBD) && !event.params.accountBorrows.toBigDecimal().equals(zeroBD) ) { // checking edge case for borrwing 0) {
      market.numberOfBorrowers = market.numberOfBorrowers + 1
      market.save()
    }
  }
  






  /* Repay some amount borrowed. Anyone can repay anyones balance
   *
   * event.params.totalBorrows = of the whole market (not used right now)
   * event.params.accountBorrows = total of the account (not used right now)
   * event.params.repayAmount = that was added in this event
   * event.params.borrower = the borrower
   * event.params.payer = the payer
   *
   * Notes
   *    No need to updateMarket(), handleAccrueInterest() ALWAYS runs before this
   *    Once a account totally repays a borrow, it still has its account interest index set to the
   *    markets value. We keep this, even though you might think it would reset to 0 upon full repay.
   */
  export function handleRepayBorrow(event: RepayBorrow): void {
    let market = Market.load(event.address.toHexString())
    let accountID = event.params.borrower.toHex()
  
    // Update cTokenStats common for all events, and return the stats to update unique values for each event
    let cTokenStats = updateUserAccount_IndividualMarketStats(market.id,market.symbol,accountID,event.transaction.hash,event.block.timestamp.toI32(),event.block.number.toI32(),)  
    let repayAmountBD = event.params.repayAmount.toBigDecimal().div(exponentToBigDecimal(market.underlyingDecimals))
    cTokenStats.totalUnderlyingRepaid = cTokenStats.totalUnderlyingRepaid.plus(repayAmountBD,) 
    cTokenStats.storedBorrowBalance = event.params.accountBorrows.toBigDecimal().div(exponentToBigDecimal(market.underlyingDecimals)).truncate(market.underlyingDecimals)
    cTokenStats.accountBorrowIndex = market.borrowIndex
    cTokenStats.save()
  
    let account = Account.load(accountID)
    if (account == null) {
      createUserAccount(accountID)
    }
  
    if (cTokenStats.storedBorrowBalance.equals(zeroBD)) {
      market.numberOfBorrowers = market.numberOfBorrowers - 1
      market.save()
    }
  }



  
  
  /*
   * Liquidate an account who has fell below the collateral factor.
   *
   * event.params.borrower - the borrower who is getting liquidated of their cTokens
   * event.params.cTokenCollateral - the market ADDRESS of the ctoken being liquidated
   * event.params.liquidator - the liquidator
   * event.params.repayAmount - the amount of underlying to be repaid
   * event.params.seizeTokens - cTokens seized (transfer event should handle this)
   *
   * Notes
   *    No need to updateMarket(), handleAccrueInterest() ALWAYS runs before this.
   *    When calling this function, event RepayBorrow, and event Transfer will be called every
   *    time. This means we can ignore repayAmount. Seize tokens only changes state
   *    of the cTokens, which is covered by transfer. Therefore we only
   *    add liquidation counts in this handler.
   */
  export function handleLiquidateBorrow(event: LiquidateBorrow): void {
    let liquidatorID = event.params.liquidator.toHex()
    let liquidator = Account.load(liquidatorID)
    if (liquidator == null) {
      liquidator = createUserAccount(liquidatorID)
    }
    liquidator.countLiquidator = liquidator.countLiquidator + 1
    liquidator.save()
  
    let borrowerID = event.params.borrower.toHex()
    let borrower = Account.load(borrowerID)
    if (borrower == null) {
      borrower = createUserAccount(borrowerID)
    }
    borrower.countLiquidated = borrower.countLiquidated + 1
    borrower.save()
  }
  



  export function handleNewPendingAdmin(event: NewPendingAdmin): void {
    let marketID = event.address.toHex()
    let market = Market.load(marketID)
    if (market == null) {
        market = createMarket(marketID)
    }  
    market.pendingAdmin = event.params.newPendingAdmin
    market.save()
  }


  
  export function handleNewAdmin(event: NewAdmin): void {
    let marketID = event.address.toHex()
    let market = Market.load(marketID)
    if (market == null) {
        market = createMarket(marketID)
    }  
    market.admin = event.params.newAdmin
    market.save()
  }



  export function handleNewSightroller(event: NewSightroller): void {
    let marketID = event.address.toHex()
    let market = Market.load(marketID)
    if (market == null) {
        market = createMarket(marketID)
    }  
    market.sightroller = event.params.newSightroller
    market.save()
  }




  export function handleNewMarketInterestRateModel(event: NewMarketInterestRateModel,): void {
    let marketID = event.address.toHex()
    let market = Market.load(marketID)
    if (market == null) {
      market = createMarket(marketID)
    }
    market.interestRateModelAddress = event.params.newInterestRateModel
    market.save()
  }

  


  export function handleNewReserveFactor(event: NewReserveFactor): void {
    let marketID = event.address.toHex()
    let market = Market.load(marketID)
    if (market == null) {
        market = createMarket(marketID)
    }  
    market.reserveFactor = event.params.newReserveFactorMantissa
    market.save()
  }
  





/* Account supplies assets into market and receives cTokens in exchange
   *
   * event.mintAmount is the underlying asset
   * event.mintTokens is the amount of cTokens minted
   * event.minter is the account
   *
   * Notes
   *    Transfer event will always get emitted with this
   *    Mints originate from the cToken address, not 0x000000, which is typical of ERC-20s
   *    No need to updateMarket(), handleAccrueInterest() ALWAYS runs before this
   *    No need to updateUserAccount_IndividualMarketStats, handleTransfer() will
   *    No need to update cTokenBalance, handleTransfer() will
   */
  export function handleMint(event: Mint): void {
}







/*  Account supplies cTokens into market and receives underlying asset in exchange
 *
 *  event.redeemAmount is the underlying asset
 *  event.redeemTokens is the cTokens
 *  event.redeemer is the account
 *
 *  Notes
 *    Transfer event will always get emitted with this
 *    No need to updateMarket(), handleAccrueInterest() ALWAYS runs before this
 *    No need to updateCommonCTokenStats, handleTransfer() will
 *    No need to update cTokenBalance, handleTransfer() will
 */
export function handleRedeem(event: Redeem): void {
}