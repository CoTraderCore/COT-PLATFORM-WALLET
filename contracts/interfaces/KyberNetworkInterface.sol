import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

interface KyberNetworkInterface {
  function trade(
    IERC20 src,
    uint srcAmount,
    IERC20 dest,
    address destAddress,
    uint maxDestAmount,
    uint minConversionRate,
    address walletId
  )
    external
    payable
    returns(uint);

  function getExpectedRate(IERC20 src, IERC20 dest, uint srcQty) external view
    returns (uint expectedRate, uint slippageRate);
}
