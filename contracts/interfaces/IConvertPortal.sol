interface IConvertPortal {
  function isConvertibleToCOT(address _token, uint256 _amount)
  external
  view
  returns(uint256);

  function isConvertibleToETH(address _token, uint256 _amount)
  external
  view
  returns(uint256);

  function convertTokenToCOT(address _token, uint256 _amount)
  external
  returns (uint256 cotAmount);

  function convertETHToCOT(uint256 _amount)
  external
  payable
  returns (uint256 cotAmount);

  function convertTokenToCOTViaETHHelp(address _token, uint256 _amount)
  external
  returns (uint256 cotAmount);
}
