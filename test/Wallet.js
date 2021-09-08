import { BN, fromWei, toWei } from 'web3-utils'

import ether from './helpers/ether'
import EVMRevert from './helpers/EVMRevert'
import { duration } from './helpers/duration'
import latestTime from './helpers/latestTime'
import advanceTimeAndBlock from './helpers/advanceTimeAndBlock'
const BigNumber = BN

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

const CoTraderDAOWallet = artifacts.require('./CoTraderDAOWallet.sol')
const ConvertPortal = artifacts.require('./ConvertPortal.sol')
const Token = artifacts.require('Token')

const Stake = artifacts.require('./Stake')
const UniswapV2Factory = artifacts.require('./dex/UniswapV2Factory.sol')
const UniswapV2Router = artifacts.require('./dex/UniswapV2Router02.sol')
const UniswapV2Pair = artifacts.require('./dex/UniswapV2Pair.sol')
const WETH = artifacts.require('./dex/WETH9.sol')


contract('CoTraderDAOWallet', function([userOne, userTwo, userThree]) {
  beforeEach(async function() {
    this.ETH_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

    // Deploy COT Token
    this.cot = await Token.new(
      "CoTrader",
      "COT",
      18,
      toWei(String(5000000))
    )

    // Deploy COT Token
    this.testToken = await Token.new(
      "TEST",
      "TST",
      18,
      toWei(String(5000000))
    )

    // deploy DEX
    this.uniswapV2Factory = await UniswapV2Factory.new(userOne)
    this.weth = await WETH.new()
    this.uniswapV2Router = await UniswapV2Router.new(this.uniswapV2Factory.address, this.weth.address)

    // add token liquidity
    await this.cot.approve(this.uniswapV2Router.address, toWei(String(100)))

    await this.uniswapV2Router.addLiquidityETH(
      this.cot.address,
      toWei(String(100)),
      1,
      1,
      userOne,
      "1111111111111111111111"
    , { from:userOne, value:toWei(String(100)) })

    // Deploy Stake
    this.stake = await Stake.new(this.cot.address)
    this.stake2 = await Stake.new(this.cot.address)

    // Deploy ConvertPortal
    this.convertPortal = await ConvertPortal.new(this.cot.address, this.uniswapV2Router.address)

    // Send some amount of COT to convertPortalMock
    await this.cot.transfer(this.convertPortal.address, toWei(String(1000000)))

    // Deploy daoWallet
    this.daoWallet = await CoTraderDAOWallet.new(
      this.cot.address,
      this.stake.address,
      this.convertPortal.address)
  })

  describe('INIT', function() {
    it('Correct init CoTrader token', async function() {
      const name = await this.cot.name()
      const symbol = await this.cot.symbol()
      const decimals = await this.cot.decimals()

      assert.equal("CoTrader", name)
      assert.equal("COT", symbol)
      assert.equal(18, decimals)
    })

    it('Correct init TEST token', async function() {
      const name = await this.testToken.name()
      const symbol = await this.testToken.symbol()
      const decimals = await this.testToken.decimals()

      assert.equal("TEST", name)
      assert.equal("TST", symbol)
      assert.equal(18, decimals)
    })

    it('Correct init stake', async function() {
      const reserve = await this.stake.reserve()
      assert.equal(0, reserve)

      const token = await this.daoWallet.COT()
      assert.equal(this.cot.address, token)
    })
  })

  describe('Update stake address', function() {
    it('Not owner can not update stake address ', async function() {
      await this.daoWallet.updateStakeAddress(
        this.stake2.address,
        { from:userTwo }
      ).should.be.rejectedWith(EVMRevert)
    })

    it('Owner can update stake address ', async function() {
      await this.daoWallet.updateStakeAddress(
        this.stake2.address
      )
    })
  })


  describe('Update destribution percent', function() {
    it('Now owner can not update destribution', async function() {
      await this.daoWallet.updateDestributionPercent(
        40,
        40,
        20,
        { from:userTwo }
      ).should.be.rejectedWith(EVMRevert)
    })

    it('Owner can update destribution', async function() {
      await this.daoWallet.updateDestributionPercent(
        40,
        40,
        20
      )
    })

    it('Owner can not set more than 40% for withdraw', async function() {
      await this.daoWallet.updateDestributionPercent(
        20,
        20,
        60
      ).should.be.rejectedWith(EVMRevert)
    })
  })


  describe('Wallet', function() {
    it('Correct init wallet', async function() {
      const COT = await this.daoWallet.COT()
      assert.equal(this.cot.address, COT)

      const owner = await this.daoWallet.owner()
      assert.equal(userOne, owner)
    })

    it('Owner get 40% COT, stake get 10% COT, burn address get 50% COT after destribute', async function() {
      await this.cot.transfer(this.daoWallet.address, toWei(String(100)))
      const ownerBalance = await this.cot.balanceOf(userOne)
      // transfer all COT to user two for correct calculation userOne cot balance
      await this.cot.transfer(userTwo, ownerBalance)

      await this.daoWallet.destribute([this.cot.address])
      const burnAddress = await this.daoWallet.deadAddress()

      assert.equal(await this.cot.balanceOf(userOne), toWei(String(40)))
      assert.equal(await this.cot.balanceOf(this.stake.address), toWei(String(10)))
      assert.equal(await this.cot.balanceOf(burnAddress), toWei(String(50)))

      assert.equal(await this.cot.balanceOf(this.daoWallet.address), 0)
    })

    it('Owner get 40% COT, stake get 10% COT, burn address get 50% COT after destribute not equal amount', async function() {
      await this.cot.transfer(this.daoWallet.address, toWei(String(99)))
      const ownerBalance = await this.cot.balanceOf(userOne)
      // transfer all COT to user two for correct calculation userOne cot balance
      await this.cot.transfer(userTwo, ownerBalance)

      await this.daoWallet.destribute([this.cot.address])

      const burnAddress = await this.daoWallet.deadAddress()


      assert.equal(await this.cot.balanceOf(userOne), toWei(String(39.6)))
      assert.equal(await this.cot.balanceOf(this.stake.address), toWei(String(9.9)))
      assert.equal(await this.cot.balanceOf(burnAddress), toWei(String(49.5)))

      assert.equal(await this.cot.balanceOf(this.daoWallet.address), 0)
    })

    it('Owner get 40% ETH, stake get 10% COT from ETH, burn address get 50% COT from ETH after destribute', async function() {
      const ownerBalanceBefore = await web3.eth.getBalance(userOne)
      const burnAddress = await this.daoWallet.deadAddress()

      // burn and stake don't hold any COt before burn
      // stake get 10% ETH in COT (1 ETH = 3 COT)
      assert.equal(fromWei(await this.cot.balanceOf(this.stake.address)), 0)

      // burn get 50% ETH in COT (1 ETH = 3 COT)
      assert.equal(fromWei(await this.cot.balanceOf(burnAddress)), 0)


      // send ETH to DAO wallet from userTwo
      await this.daoWallet.sendTransaction({
        value: toWei(String(10)),
        from: userTwo
      });

      let DaoWalletBalance = await web3.eth.getBalance(this.daoWallet.address);
      assert.equal(fromWei(String(DaoWalletBalance)), 10)

      await this.daoWallet.destribute([this.ETH_TOKEN_ADDRESS], { from:userTwo })

      DaoWalletBalance = await web3.eth.getBalance(this.daoWallet.address)

      assert.equal(DaoWalletBalance, 0)

      const ownerBalanceAfter = await web3.eth.getBalance(userOne)

      // owner get 40% ETH
      assert.equal(fromWei(String(ownerBalanceAfter)) - fromWei(String(ownerBalanceBefore)), 4)

      // stake get 10% ETH in COT (1 ETH = 3 COT)
      assert.isTrue(fromWei(await this.cot.balanceOf(this.stake.address)) > 0)

      // burn get 50% ETH in COT (1 ETH = 3 COT)
      assert.isTrue(fromWei(await this.cot.balanceOf(burnAddress)) > 0)

      assert.equal(await web3.eth.getBalance(this.daoWallet.address), 0)
    })

    it('Owner get 40% TST, stake get 10% COT from TST and burn address get 50% COT from TST after destribute', async function() {
      await this.testToken.transfer(this.daoWallet.address, toWei(String(100)))
      // transfer all tst to userTwo for correct calculation for userOne
      this.testToken.transfer(userTwo, toWei(String(100)))

      // add liquidity for test token
      // add token liquidity
      await this.testToken.approve(this.uniswapV2Router.address, toWei(String(100)))

      await this.uniswapV2Router.addLiquidityETH(
        this.testToken.address,
        toWei(String(100)),
        1,
        1,
        userOne,
        "1111111111111111111111"
      , { from:userOne, value:toWei(String(100)) })

      // clear user 1 balance
      await this.testToken.transfer(userTwo, await this.testToken.balanceOf(userOne))

      await this.daoWallet.destribute([this.testToken.address])

      const burnAddress = await this.daoWallet.deadAddress()

      // should destribute convert to COT and destribute
      assert.isTrue(await this.cot.balanceOf(this.stake.address) > 0)
      assert.isTrue(await this.cot.balanceOf(burnAddress) > 0)

      // should just destribute
      assert.equal(Number(await this.testToken.balanceOf(userOne)), toWei(String(40)))
      assert.equal(await this.testToken.balanceOf(this.daoWallet.address), 0)
    })

    it('destribute COT, ETH, and TST token', async function() {
     // transfer COT token to DAO wallet
     await this.cot.transfer(this.daoWallet.address, toWei(String(10)))
     // transfer test token to DAO wallet
     await this.testToken.transfer(this.daoWallet.address, toWei(String(10)))
     // transfer ETH to DAO wallet
     // transfer from user two for correct calcualte owner wei
     await this.daoWallet.sendTransaction({
       value: toWei(String(10)),
       from: userTwo
     });

     const burnAddress = await this.daoWallet.deadAddress()

     // Wallet get assets
     assert.notEqual(await this.testToken.balanceOf(this.daoWallet.address), 0)
     assert.notEqual(await this.cot.balanceOf(this.daoWallet.address), 0)
     assert.notEqual(await web3.eth.getBalance(this.daoWallet.address), 0)

     // add liquidity for test token
     await this.testToken.approve(this.uniswapV2Router.address, toWei(String(100)))

     await this.uniswapV2Router.addLiquidityETH(
       this.testToken.address,
       toWei(String(100)),
       1,
       1,
       userOne,
       "1111111111111111111111"
     , { from:userOne, value:toWei(String(100)) })

      // destribute
      // NOTE: any user can execude destribute
      await this.daoWallet.destribute(
         [this.cot.address,
         this.testToken.address,
         this.ETH_TOKEN_ADDRESS], {from:userTwo})

      // Wallet destribute assets
      assert.equal(await this.testToken.balanceOf(this.daoWallet.address), 0)
      assert.equal(await this.cot.balanceOf(this.daoWallet.address), 0)
      assert.equal(await web3.eth.getBalance(this.daoWallet.address), 0)
    })
  })


  describe('Vote', function() {
    it('User can not register the same wallet address for vote twice', async function() {
      await this.daoWallet.voterRegister({from: userOne}).should.be.fulfilled
      await this.daoWallet.voterRegister({from: userOne}).should.be.rejectedWith(EVMRevert)
    })

    it('User can not vote from non register wallet', async function() {
      await this.daoWallet.vote(userTwo, {from: userTwo}).should.be.rejectedWith(EVMRevert)
    })

    it('User can not change owner if there are no 51% COT supply', async function() {
      await this.daoWallet.voterRegister({from: userTwo})
      await this.daoWallet.vote(userTwo, {from: userTwo})
      await this.daoWallet.changeOwner(userTwo).should.be.rejectedWith(EVMRevert)
    })

    it('User can not change owner if 51% user holder vote, but then transfer balance', async function() {
      await this.daoWallet.voterRegister({from: userOne})
      await this.daoWallet.vote(userTwo, {from: userOne})
      // make sure userOne hold more then 50% COT
      assert.isTrue(await this.cot.balanceOf(userOne) > await this.daoWallet.calculateCOTHalfSupply())
      // transfer all balance
      const userOneBalance = await this.cot.balanceOf(userOne)
      await this.cot.transfer(userThree, userOneBalance)

      await this.daoWallet.changeOwner(userTwo, {from: userOne}).should.be.rejectedWith(EVMRevert)
    })

    it('User can not change owner if there are only 50% COT supply', async function() {
      // transfer 50% tokens
      const totalSupply = await this.cot.totalSupply()
      const halfSupply = fromWei(String(totalSupply)) / 2
      await this.cot.transfer(userThree, toWei(String(halfSupply)))

      // make sure userThree hold 50% COT
      assert.equal(fromWei(await this.cot.balanceOf(userThree)), fromWei(await this.daoWallet.calculateCOTHalfSupply()))

      // vote from userThree with 50% balance
      await this.daoWallet.voterRegister({from: userThree})
      await this.daoWallet.vote(userTwo, {from: userThree})
      await this.daoWallet.changeOwner(userTwo, {from: userThree}).should.be.rejectedWith(EVMRevert)
    })

    it('User can change owner if there are 51% of COT supply', async function() {
      assert.equal(await await this.daoWallet.owner(), userOne)
      // transfer 50% tokens to userTwo
      const totalSupply = await this.cot.totalSupply()
      const halfSupply = fromWei(String(totalSupply)) / 2
      await this.cot.transfer(userTwo, toWei(String(halfSupply)))

      // vote from user two
      await this.daoWallet.voterRegister({from: userTwo})
      await this.daoWallet.vote(userTwo, {from: userTwo})

      // execude change owner
      // should fails because there are no 51%
      await this.daoWallet.changeOwner(userTwo, {from: userTwo}).should.be.rejectedWith(EVMRevert)

      // transfer 1 wei to userThree for make 51%
      await this.cot.transfer(userThree, 1)
      // vote from user three
      await this.daoWallet.voterRegister({from: userThree})
      await this.daoWallet.vote(userTwo, {from: userThree})

      // execude change owner
      await this.daoWallet.changeOwner(userTwo, {from: userTwo}).should.be.fulfilled
      assert.equal(await await this.daoWallet.owner(), userTwo)
    })

    it('new owner get 40% after destribute', async function() {
      // Change owner
      await this.daoWallet.voterRegister({from: userOne})
      await this.daoWallet.vote(userTwo, {from: userOne})
      await this.daoWallet.changeOwner(userTwo, {from: userTwo}).should.be.fulfilled
      const newOwner = await this.daoWallet.owner()
      assert.equal(newOwner, userTwo)
      // Transfer assets
      await this.cot.transfer(this.daoWallet.address, 100)
      // Balance before
      const newOwnerBalanceBefore = await this.cot.balanceOf(userTwo)
      assert.equal(newOwnerBalanceBefore, 0)
      // destribute
      await this.daoWallet.destribute([this.cot.address])
      // Balance after
      const newOwnerBalanceAfter = await this.cot.balanceOf(userTwo)

      assert.equal(newOwnerBalanceAfter, 40)
      assert.isTrue(newOwnerBalanceAfter > newOwnerBalanceBefore)
    })

    it('Owner can not call withdrawNonConvertibleERC if this ERC convertible', async function() {
      await this.testToken.transfer(this.daoWallet.address, 5000000)

      // ADD LD in ETH
      this.testToken.approve(this.uniswapV2Router.address, toWei(String(100)))
      await this.uniswapV2Router.addLiquidityETH(
        this.testToken.address,
        toWei(String(100)),
        1,
        1,
        userOne,
        "1111111111111111111111"
      , { from:userOne, value:toWei(String(100)) })


      await this.daoWallet.withdrawNonConvertibleERC(this.testToken.address, 5000000)
      .should.be.rejectedWith(EVMRevert)
    })

    it('Owner can call withdrawNonConvertibleERC and get this ERC if this ERC non convertible', async function() {
      const tstSupply = await this.testToken.totalSupply()
      // transfer ALL TST tokens to DAO wallet
      await this.testToken.transfer(this.daoWallet.address, tstSupply)
      assert.equal(await this.testToken.balanceOf(userOne), 0)

      // get back tokens
      await this.daoWallet.withdrawNonConvertibleERC(this.testToken.address, tstSupply)
      .should.be.fulfilled
      const ownerBalance = await this.testToken.balanceOf(userOne)
      assert.equal(fromWei(String(ownerBalance)), fromWei(String(tstSupply)))
    })

    it('Not owner can NOT call withdrawNonConvertibleERC and get this ERC if this ERC non convertible', async function() {
      await this.testToken.transfer(this.daoWallet.address, 5000000)
      await this.daoWallet.withdrawNonConvertibleERC(this.testToken.address, 5000000, {from: userTwo})
      .should.be.rejectedWith(EVMRevert)
    })
  })
})
