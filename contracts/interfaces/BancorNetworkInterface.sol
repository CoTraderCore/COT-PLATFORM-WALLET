import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

interface BancorNetworkInterface {
   function getReturnByPath(ERC20[] memory _path, uint256 _amount) external view returns (uint256, uint256);

    function convert(
        IERC20[] memory _path,
        uint256 _amount,
        uint256 _minReturn
    ) external payable returns (uint256);

    function claimAndConvert(
        IERC20[] memory _path,
        uint256 _amount,
        uint256 _minReturn
    ) external returns (uint256);

    function convertFor(
        IERC20[] memory _path,
        uint256 _amount,
        uint256 _minReturn,
        address _for
    ) external payable returns (uint256);

    function claimAndConvertFor(
        IERC20[]memory _path,
        uint256 _amount,
        uint256 _minReturn,
        address _for
    ) external returns (uint256);

}
