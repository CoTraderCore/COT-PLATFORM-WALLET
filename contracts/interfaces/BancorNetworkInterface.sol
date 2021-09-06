import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract BancorNetworkInterface {
   function getReturnByPath(ERC20[] memory _path, uint256 _amount) public view returns (uint256, uint256);

    function convert(
        ERC20[] memory _path,
        uint256 _amount,
        uint256 _minReturn
    ) public payable returns (uint256);

    function claimAndConvert(
        ERC20[] memory _path,
        uint256 _amount,
        uint256 _minReturn
    ) public returns (uint256);

    function convertFor(
        ERC20[] memory _path,
        uint256 _amount,
        uint256 _minReturn,
        address _for
    ) public payable returns (uint256);

    function claimAndConvertFor(
        ERC20[]memory _path,
        uint256 _amount,
        uint256 _minReturn,
        address _for
    ) public returns (uint256);

}
