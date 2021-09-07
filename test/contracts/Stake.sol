pragma solidity ^0.6.0;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract Stake {
  using SafeMath for uint256;
  IERC20 public token;
  uint256 public reserve;

  constructor(address _token) public {
    token = IERC20(_token);
  }

  function addReserve(uint256 value) public {
    require(token.transferFrom(msg.sender, address(this), value));
    reserve = reserve.add(value);
  }
}
