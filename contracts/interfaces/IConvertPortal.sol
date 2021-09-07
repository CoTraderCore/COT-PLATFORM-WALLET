interface IConvertPortal {
  function isConvertibleToCOT(address _token, uint256 _amount)
  external
  view
  returns(uint256);

  function isConvertibleToETH(address _token, uint256 _amount)
  external
  view
  returns(uint256);

  function convertTokentoCOT(address _token, uint256 _amount)
  external
  payable
  returns (uint256 cotAmount);

  function convertTokentoCOTviaETH(address _token, uint256 _amount)
  external
  returns (uint256 cotAmount);
}
