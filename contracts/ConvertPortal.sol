pragma solidity ^0.6.0;

import "./interfaces/IUniswapV2Router.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";


contract ConvertPortal {
  address public cotToken;
  IUniswapV2Router public router;
  address public weth;
  address constant private ETH_TOKEN_ADDRESS = address(0x00eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee);

  /**
  * @dev contructor
  *
  * @param _cotToken               address of CoTrader erc20 contract
  * @param _router                 address of Uniswap v2
  */
  constructor(
    address _cotToken,
    address _router
    )
    public
  {
    cotToken = _cotToken;
    router = IUniswapV2Router(_router);
    weth = router.WETH();
  }

  // check if token can be converted to COT in Uniswap v2
  function isConvertibleToCOT(address _token, uint256 _amount)
   public
   view
  returns(uint256 cotAmount)
  {
    address[] memory path = new address[](2);
    path[0] = _token;
    path[1] = cotToken;
    try router.getAmountsOut(_amount, path) returns(uint256[] memory res){
      cotAmount = res[1];
    }catch{
      cotAmount = 0;
    }
  }

  // check if token can be converted to ETH in Uniswap v2
  function isConvertibleToETH(address _token, uint256 _amount)
   public
   view
  returns(uint256 ethAmount)
  {
    address[] memory path = new address[](2);
    path[0] = _token;
    path[1] = weth;
    try router.getAmountsOut(_amount, path) returns(uint256[] memory res){
      ethAmount = res[1];
    }catch{
      ethAmount = 0;
    }
  }

  // Convert ETH to COT directly
  function convertETHToCOT(uint256 _amount)
   public
   payable
   returns (uint256 cotAmount)
  {
    require(msg.value == _amount, "wrong ETH amount");
    address[] memory path = new address[](2);
    path[0] = weth;
    path[1] = cotToken;
    uint256 deadline = now + 20 minutes;

    uint256[] memory amounts = router.swapExactETHForTokens(_amount,
      path,
      msg.sender,
      deadline
    );

    // send eth remains
    uint256 remains = address(this).balance;
    if(remains > 0)
      payable(msg.sender).transfer(remains);

    cotAmount = amounts[1];
  }

  // convert Token to COT directly
  function convertTokenToCOT(address _token, uint256 _amount)
   external
   returns (uint256 cotAmount)
  {
    _transferFromSenderAndApproveTo(IERC20(_token), _amount, address(router));
    address[] memory path = new address[](2);
    path[0] = _token;
    path[1] = cotToken;
    uint256 deadline = now + 20 minutes;

    uint256[] memory amounts = router.swapExactTokensForTokens(
      _amount,
      1,
      path,
      msg.sender,
      deadline
    );

    // send token remains
    uint256 remains = IERC20(_token).balanceOf(address(this));
    if(remains > 0)
      IERC20(_token).transfer(msg.sender, remains);

    cotAmount = amounts[1];
  }

  // convert Token to COT via ETH
  function convertTokenToCOTViaETH(address _token, uint256 _amount)
   external
   returns (uint256 cotAmount)
  {
    _transferFromSenderAndApproveTo(IERC20(_token), _amount, address(router));
    address[] memory path = new address[](3);
    path[0] = _token;
    path[1] = weth;
    path[2] = cotToken;
    uint256 deadline = now + 20 minutes;

    uint256[] memory amounts = router.swapExactTokensForTokens(
      _amount,
      1,
      path,
      msg.sender,
      deadline
    );

    // send token remains
    uint256 remains = IERC20(_token).balanceOf(address(this));
    if(remains > 0)
      IERC20(_token).transfer(msg.sender, remains);

    cotAmount = amounts[1];
  }

 /**
  * @dev Transfers tokens to this contract and approves them to another address
  *
  * @param _source          Token to transfer and approve
  * @param _sourceAmount    The amount to transfer and approve (in _source token)
  * @param _to              Address to approve to
  */
  function _transferFromSenderAndApproveTo(IERC20 _source, uint256 _sourceAmount, address _to) private {
    require(_source.transferFrom(msg.sender, address(this), _sourceAmount));

    _source.approve(_to, _sourceAmount);
  }

  // fallback payable function to receive ether from other contract addresses
  fallback() external payable {}
}
