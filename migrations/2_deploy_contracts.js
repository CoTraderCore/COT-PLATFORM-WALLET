const CoTraderDAOWallet = artifacts.require('CoTraderDAOWallet')
const ConvertPortal = artifacts.require('ConvertPortal')
const Token = artifacts.require('Token');
const Stake = '0xF0089381815ED89B52FC9531bC2569c4f945079F'
const BancorRegistry = '0x178c68aefdcae5c9818e43addf6a2b66df534ed5'
const BancorEtherToken = '0xc0829421C1d260BD3cB3E0F06cfE2D52db2cE315'
const Kyber = '0x818E6FECD516Ecc3849DAf6845e3EC868087B755'
const BancorRatio = '0x3079a42efbd0027318baa0dd81d002c0929b502c'

module.exports = async (deployer) => {
  await deployer.deploy(Token, "TEST", "TST", 18, 100000000000)
  
  await deployer.deploy(
    ConvertPortal,
    BancorRegistry,
    BancorEtherToken,
    Kyber,
    Token.address,
    BancorRatio)

  await deployer.deploy(
    CoTraderDAOWallet,
    Token.address, Stake,
    ConvertPortal.address);
}
