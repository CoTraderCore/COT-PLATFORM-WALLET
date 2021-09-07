/**
* This contract get 10% from CoTrader managers profit and then distributes assets
*
* 50% convert to COT and burn
* 10% convert to COT and send to stake reserve
* 40% to owner of this contract (CoTrader team)
*
* NOTE: 51% CoTrader token holders can change owner of this contract
*/

pragma solidity ^0.6.0;

import "./interfaces/IStake.sol";
import "./interfaces/IConvertPortal.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract CoTraderDAOWallet is Ownable{
  using SafeMath for uint256;
  // COT address
  IERC20 public COT;
  // exchange portal for convert tokens to COT
  IConvertPortal public convertPortal;
  // stake contract
  IStake public stake;
  // array of voters
  address[] public voters;
  // voter => candidate
  mapping(address => address) public candidatesMap;
  // voter => register status
  mapping(address => bool) public votersMap;
  // this contract recognize ETH by this address
  IERC20 constant private ETH_TOKEN_ADDRESS = IERC20(0x00eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee);
  // burn address
  address public deadAddress = address(0x000000000000000000000000000000000000dEaD);


  /**
  * @dev contructor
  *
  * @param _COT                           address of CoTrader ERC20
  * @param _stake                         address of Stake contract
  * @param _convertPortal                 address of exchange contract
  */
  constructor(address _COT, address _stake, address _convertPortal) public {
    COT = IERC20(_COT);
    stake = IStake(_stake);
    convertPortal = IConvertPortal(_convertPortal);
  }

  // send assets to burn address
  function _burn(IERC20 _token, uint256 _amount) private {
    uint256 cotAmount = (_token == COT)
    ? _amount
    : convertTokenToCOT(_token, _amount);
    if(cotAmount > 0)
      COT.transfer(deadAddress, cotAmount);
  }

  // send assets to stake contract
  function _stake(IERC20 _token, uint256 _amount) private {
    uint256 cotAmount = (_token == COT)
    ? _amount
    : convertTokenToCOT(_token, _amount);

    if(cotAmount > 0){
      COT.approve(address(stake), cotAmount);
      stake.addReserve(cotAmount);
    }
  }

  // send assets to owner
  function _withdraw(IERC20 _token, uint256 _amount) private {
    if(_amount > 0)
      if(_token == ETH_TOKEN_ADDRESS){
        address(owner).transfer(_amount);
      }else{
        _token.transfer(owner, _amount);
      }
  }

  /**
  * @dev destribute assest from this contract to stake, burn, and owner of this contract
  *
  * @param tokens                          array of token addresses for destribute
  */
  function destribute(IERC20[] memory tokens) {
   for(uint i = 0; i < tokens.length; i++){
      // get current token balance
      uint256 curentTokenTotalBalance = getTokenBalance(tokens[i]);
      // get 50% of balance for burn
      uint256 burnAmount = curentTokenTotalBalance.div(2);
      // get 10% of balance
      uint256 stakeAmount = burnAmount.div(5);
      // get 40% of balance
      uint256 managerAmount = stakeAmount.mul(4);

      // 50% burn
      _burn(tokens[i], burnAmount);
      // 10% stake
      _stake(tokens[i], stakeAmount);
      // 40% to owner address
      _withdraw(tokens[i], managerAmount);
    }
  }

  // return balance of ERC20 or ETH for this contract
  function getTokenBalance(IERC20 _token) public view returns(uint256){
    if(_token == ETH_TOKEN_ADDRESS){
      return address(this).balance;
    }else{
      return _token.balanceOf(address(this));
    }
  }

  /**
  * @dev Owner can withdraw non convertible token if this token,
  * can't be converted to COT directly or to COT via ETH
  *
  *
  * @param _token                          address of token
  * @param _amount                         amount of token
  */
  function withdrawNonConvertibleERC(IERC20 _token, uint256 _amount) public onlyOwner {
    uint256 cotReturnAmount = convertPortal.isConvertibleToCOT(_token, _amount);
    uint256 ethReturnAmount = convertPortal.isConvertibleToETH(_token, _amount);

    require(_token != ETH_TOKEN_ADDRESS, "token can not be a ETH");
    require(cotReturnAmount == 0, "token can not be converted to COT");
    require(ethReturnAmount == 0, "token can not be converted to ETH");

    _token.transfer(owner, _amount);
  }


  /**
  * @dev this function try convert token to COT via DEXs which has COT in circulation
  * if there are no such pair on this COT supporting DEXs, function try convert to COT on another DEXs
  * via convert ERC20 input to ETH, and then ETH to COT on COT supporting DEXs.
  * If such a conversion is not possible return 0 for cotAmount
  *
  *
  * @param _token                          address of token
  * @param _amount                         amount of token
  */
  function convertTokenToCOT(address _token, uint256 _amount)
  private
  returns(uint256 cotAmount)
  {
    // try convert current token to COT
    uint256 cotReturnAmount = convertPortal.isConvertibleToCOT(_token, _amount);
    if(cotReturnAmount > 0) {
      if(IERC20(_token) == ETH_TOKEN_ADDRESS){
        cotAmount = convertPortal.convertTokentoCOT.value(_amount)(_token, _amount);
      }
      else{
        IERC20(_token).approve(address(convertPortal), _amount);
        cotAmount = convertPortal.convertTokentoCOT(_token, _amount);
      }
    }
    // try convert current token to COT via ETH
    else {
      uint256 ethReturnAmount = convertPortal.isConvertibleToETH(_token, _amount);
      if(ethReturnAmount > 0) {
        IERC20(_token).approve(address(convertPortal), _amount);
        cotAmount = convertPortal.convertTokentoCOTviaETH(_token, _amount);
      }
      // there are no way convert token to COT
      else{
        cotAmount = 0;
      }
    }
  }

  // owner can change version of exchange portal contract
  function changeConvertPortal(address _newConvertPortal)
  public
  onlyOwner
  {
    convertPortal = IConvertPortal(_newConvertPortal);
  }

  // any user can donate to stake reserve from msg.sender balance
  function addStakeReserveFromSender(uint256 _amount) public {
    require(COT.transferFrom(msg.sender, address(this), _amount));
    COT.approve(address(stake), _amount);
    stake.addReserve(_amount);
  }


  /*
  ** VOTE LOGIC
  *
  *  users can change owner if total COT balance of all voters for a certain candidate
  *  more than 50% of COT total supply
  *
  */

  // register a new vote wallet
  function voterRegister() public {
    require(!votersMap[msg.sender], "not allowed register the same wallet twice");
    // register a new wallet
    voters.push(msg.sender);
    votersMap[msg.sender] = true;
  }

  // vote for a certain candidate address
  function vote(address _candidate) public {
    require(votersMap[msg.sender], "wallet must be registered to vote");
    // vote for a certain candidate
    candidatesMap[msg.sender] = _candidate;
  }

  // return half of (total supply - burned balance)
  function calculateCOTHalfSupply() public view returns(uint256){
    uint256 supply = COT.totalSupply();
    uint256 burned = COT.balanceOf(deadAddress);
    return supply.sub(burned).div(2);
  }

  // calculate all vote subscribers for a certain candidate
  // return balance of COT of all voters of a certain candidate
  function calculateVoters(address _candidate)public view returns(uint256){
    uint256 count;
    for(uint i = 0; i<voters.length; i++){
      // take into account current voter balance
      // if this user voted for current candidate
      if(_candidate == candidatesMap[voters[i]]){
          count = count.add(COT.balanceOf(voters[i]));
      }
    }
    return count;
  }

  // Any user can change owner with a certain candidate
  // if this candidate address have 51% voters
  function changeOwner(address _newOwner) public {
    // get vote data
    uint256 totalVotersBalance = calculateVoters(_newOwner);
    // get half of COT supply in market circulation
    uint256 totalCOT = calculateCOTHalfSupply();
    // require 51% COT on voters balance
    require(totalVotersBalance > totalCOT);
    // change owner
    super._transferOwnership(_newOwner);
  }

  // fallback payable function to receive ether from other contract addresses
  fallback() external payable {}
}
