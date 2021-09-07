interface IGetBancorAddressFromRegistry{
  function getBancorContractAddresByName(string memory _name) external view returns (address result);
}
