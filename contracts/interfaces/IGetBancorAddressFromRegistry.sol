contract IGetBancorAddressFromRegistry{
  function getBancorContractAddresByName(string memory _name) public view returns (address result);
}
