pragma solidity ^0.5.16;

import "./Math/ABDKMath.sol";
import "./openzeppelin/Context.sol";
import "./openzeppelin/IERC20.sol";
import "./openzeppelin/SafeMath.sol";
import "./openzeppelin/Address.sol";

contract SIGH is Context, IERC20 {

    using SafeMath for uint256;    // Time based calculations
    using ABDKMath64x64 for int128;
    using Address for address;

    address private _owner;

    mapping (address => uint256) private balances;
    mapping (address => mapping (address => uint256)) private _allowances;

    uint256 private constant INITIAL_SUPPLY = 5 * 10**6 * 10**18; // 5 Million (with 18 decimals)
    uint256 public CURRENT_SUPPLY = INITIAL_SUPPLY ;
    uint256 public totalAmountBurnt = 0;

    bool public isSpeedControllerSet = false;
    address public SpeedController;

    uint256 public constant CYCLE_SECONDS = 60;  // 24*60*60 (i.e seconds in 1 day )
    uint256 public constant FINAL_CYCLE = 3711; // 10 years (3650 days) + 60 days
    uint256 public Current_Cycle; 
    uint256 public Current_Era;
    uint256 public currentDivisibilityFactor = 100;

    bool public mintingActivated = false;
    uint256 public previousMintTimeStamp;
    uint256 public recentlyMintedAmount;
    address public recentMinter;

    uint256 private prize_amount = 500 * 10**18;

    mapping ( uint256 => uint256 ) private mintHistory;

    struct Era {
        uint256 startCycle;
        uint256 endCycle;
        uint256 divisibilityFactor;
    }

    Era[11] private _eras;
    uint256 public _startTime;

    string public _name;
    string public _symbol;
    uint8 public _decimals;

    event NewCycle( uint prevCycle, uint newCycle, uint blockNumber, uint timeStamp );
    event NewEra( uint prevEra, uint newEra, uint blockNumber, uint timeStamp );

    event SpeedControllerChanged(address prevSpeedController, address newSpeedController, uint256 blockNumber);

    event SIGHMinted(uint256 cycle, uint256 Era, address minter, uint256 amountMinted, uint256 current_supply, uint256 block_number, uint timestamp);
    event SIGHBurned(address userAddress, uint256 amount, uint256 totalBurnedAmount, uint256 currentSupply);

    // constructing  
    constructor () public {
        _name = 'SIGH';
        _symbol = 'SIGH';
        _decimals = 18;
        _owner = _msgSender();
        balances[_owner] = INITIAL_SUPPLY;
        recentMinter = _owner;
        recentlyMintedAmount = INITIAL_SUPPLY;
        mintHistory[0] = INITIAL_SUPPLY;
        previousMintTimeStamp = now;
        emit SIGHMinted(Current_Cycle,Current_Era,_owner,INITIAL_SUPPLY,CURRENT_SUPPLY,block.number, now);
    }

    // ################################################
    // #######   FUNCTIONS TO INITIATE MINTING  #######
    // ################################################

    function changeSpeedController(address newSpeedController) public returns (bool) {
        require(_msgSender() == _owner, "Only the Admin can change SpeedController");
        require(newSpeedController != address(0), "Not a valid Speed Controller address");
        // require( !isSpeedControllerSet, " Speed Controller can be set only once ");

        address prevSpeedController = SpeedController;
        SpeedController = newSpeedController;
        isSpeedControllerSet = true;
        
        emit SpeedControllerChanged(prevSpeedController, SpeedController, block.number );
        return true;
    }
    
    function initMinting() public returns (bool) {
        require(_msgSender() == _owner,"Mining can only be initialized by the owner." );
        require( isSpeedControllerSet , "Speed Controller needs to be set before the Eras can begin" );
        require(!mintingActivated, "Minting can only be initialized once" );
        _initEras();
        _startTime = now;
        mintingActivated = true;
    }

    function _initEras() private {
        _eras[0] = Era(1, 5, 100 );        // 96 days
        _eras[1] = Era(97, 7, 200 );       // 1 year
        _eras[2] = Era(463, 7, 400 );      // 1 year
        _eras[3] = Era(829, 7, 800 );       // 1 year
        _eras[4] = Era(1195, 7, 1600 );     // 1 year
        _eras[5] = Era(1561, 7, 3200 );      // 1 year   
        _eras[6] = Era(1927, 7, 6400 );       // 1 year
        _eras[7] = Era(2293, 7, 12800 );        // 1 year
        _eras[8] = Era(2659, 7, 25600 );        // 1 year
        _eras[9] = Era(3025, 7, 51200 );        // 1 year
        _eras[10] = Era(3391, 7, 102400 );       // 1 year
        // _eras[0] = Era(1, 96, 100 );        // 96 days
        // _eras[1] = Era(97, 462, 200 );       // 1 year
        // _eras[2] = Era(463, 828, 400 );      // 1 year
        // _eras[3] = Era(829, 1194, 800 );       // 1 year
        // _eras[4] = Era(1195, 1560, 1600 );     // 1 year
        // _eras[5] = Era(1561, 1926, 3200 );      // 1 year   
        // _eras[6] = Era(1927, 2292, 6400 );       // 1 year
        // _eras[7] = Era(2293, 2658, 12800 );        // 1 year
        // _eras[8] = Era(2659, 3024, 25600 );        // 1 year
        // _eras[9] = Era(3025, 3390, 51200 );        // 1 year
        // _eras[10] = Era(3391, 3756, 102400 );       // 1 year
    }

    function isMintingActivated() external view returns(bool) {
        return mintingActivated;
    }

    // ################################################
    // ########   ALLOWANCE RELATED FUNCTONS   ########
    // ################################################

    function approve(address spender, uint256 amount) public  returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    function increaseAllowance(address spender, uint256 addedValue) public returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender].add(addedValue));
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) public returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender].sub(subtractedValue, "ERC20: decreased allowance below zero"));
        return true;
    }

    function _approve(address owner, address spender, uint256 amount) private {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    // ################################################
    // ############   TRANSFER FUNCTONS    ############
    // ################################################

    function transfer(address recipient, uint256 amount) external  returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    // User with allowance calls the transfer function
    function transferFrom(address spender, address recipient, uint256 amount) external  returns (bool) {
        require( _allowances[spender][_msgSender()] > amount,"Transfer amount exceeds Allowance");
        _transfer(spender, recipient, amount);
        _approve(spender, _msgSender(), _allowances[spender][_msgSender()].sub(amount, "ERC20: transfer amount exceeds allowance"));
        return true;
    }

    function _transfer(address sender, address recipient, uint256 amount) private {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");
        require(balances[sender] > amount, "ERC20: The Sender doesn't have the required balance");

        if (isMintingPossible()) {
             mintNewCoins();
        }

        balances[sender] = balances[sender].sub(amount);
        balances[recipient] = balances[recipient].add(amount);
        emit Transfer(sender, recipient, amount);
    }

    // ################################################
    // ############   MINT FUNCTONS    ############
    // ################################################

    function isMintingPossible() private returns (bool) {
        if ( mintingActivated && Current_Cycle < 3711 && _getElapsedSeconds(previousMintTimeStamp,now) > CYCLE_SECONDS ) {
            uint prevCycle = Current_Cycle;      
            uint newCycle = add(Current_Cycle,uint256(1),'Overflow');
            Current_Cycle = newCycle;  // CURRENT CYCLE IS UPDATED 
            emit NewCycle(prevCycle, Current_Cycle, block.number, now);
            return true;
        }
        else {
            return false;
        }
    }

    function mintCoins() external returns (bool) {
        require(isMintingPossible(), 'Minting not possible yet.');
        return mintNewCoins();
    }

    function mintNewCoins() private returns (bool) {

        if ( Current_Era < _CalculateCurrentEra() ) {
            uint prevEra = Current_Era;
            uint newEra = add(Current_Era,uint256(1),"NEW ERA : Addition gave error");
            Current_Era = newEra;
            currentDivisibilityFactor = _eras[Current_Era].divisibilityFactor;
            emit NewEra(prevEra, Current_Era, block.number, now);
        }

        uint256 newCoins = CURRENT_SUPPLY.div(_eras[Current_Era].divisibilityFactor);  // Calculate the number of new tokens to be minted.
        uint new_total_supply = add(CURRENT_SUPPLY,newCoins,"Total Supply: Addition gave error");
        CURRENT_SUPPLY = new_total_supply;


        balances[_msgSender()] = balances[_msgSender()].add(prize_amount);         // 500 coins given to caller for calling the mint successfully
        uint256 SpeedController_amount = newCoins.sub(prize_amount);
        balances[SpeedController] = balances[SpeedController].add(SpeedController_amount);     //newly minted coins provided to SpeedController

        recentMinter = _msgSender();
        recentlyMintedAmount = newCoins;
        mintHistory[Current_Cycle] = newCoins;
        previousMintTimeStamp = now;        

        emit SIGHMinted(Current_Cycle,Current_Era,_msgSender(),newCoins,CURRENT_SUPPLY,block.number, now);

        return true;        
    }

    function _getElapsedSeconds(uint256 startTime, uint256 currentTime) private pure returns(uint256) {
        return currentTime.sub(startTime);
    }

    function _CalculateCurrentEra() private view returns (uint256) {

        if (Current_Cycle <= 96 && Current_Cycle >= 0 ) {
            return uint256(0);
        }

        uint256 C_Era_sub = sub(Current_Cycle,uint256(96),'ERA: Subtraction gave error');
        uint256 _newEra = div(C_Era_sub,uint256(365),"ERA : Division gave error");

        if (_newEra <= 9 ) {
            return uint256(_newEra.add(1) );
        }

        return uint256(11);
    }

    // ################################################
    // ############   BURN FUNCTON    #################
    // ################################################

    function burn(uint amount) external returns (bool) {
        require(balances[msg.sender] > amount, "ERC20: The Sender doesn't have the required balance");
        balances[msg.sender] = balances[msg.sender].sub(amount);
        
        uint total_amount_burnt = add(totalAmountBurnt , amount, 'burn : Total Number of tokens burnt gave addition overflow');
        totalAmountBurnt = total_amount_burnt;
        CURRENT_SUPPLY = CURRENT_SUPPLY.sub(amount);

        emit SIGHBurned(msg.sender, amount, totalAmountBurnt, CURRENT_SUPPLY );
        return true;
    }


    // ################################################
    // ###########   MINT FUNCTONS (VIEW)   ###########
    // ################################################

   function getCurrentEra() public view returns (uint256) {
        return Current_Era;
    }

   function getCurrentCycle() public view returns (uint256) {
        return Current_Cycle;
    }

    function getRecentMinter() public view returns (address) {
        return recentMinter;
    }

    function getRecentyMintedAmount() public view returns (uint256) {
        return recentlyMintedAmount;
    }

    function getMintHistory(uint cycle) public view returns (uint256) {
        return mintHistory[cycle];
    }

    // ################################################
    // ##########    SIGH FUNCTIONS (VIEW)   ##########
    // ################################################

    function name() external view returns (string memory) {
        return _name;
    }

    function symbol() external view returns (string memory) {
        return _symbol;
    }

    function decimals() external view returns (uint8) {
        return _decimals;
    }

    function totalSupply() external view  returns (uint256) {
        return CURRENT_SUPPLY;
    }

    function balanceOf(address account) external view  returns (uint256) {
        return balances[account];
    }

    function allowance(address owner, address spender) external view  returns (uint256) {
        return _allowances[owner][spender];
    }

  /* Internal helper functions for safe math */

    function add(uint a, uint b, string memory errorMessage) internal pure returns (uint) {
        uint c = a + b;
        require(c >= a, errorMessage);
        return c;
    }

    function sub(uint a, uint b, string memory errorMessage) internal pure returns (uint) {
        require(b <= a, errorMessage);
        uint c = a - b;
        return c;
    }

    function mul(uint a, uint b, string memory errorMessage) internal pure returns (uint) {
        if (a == 0) {
        return 0;
        }
        uint c = a * b;
        require(c / a == b, errorMessage);
        return c;
    }

    function min(uint a, uint b) internal pure returns (uint) {
        if (a <= b) {
        return a;
        } else {
        return b;
        }
    }    

    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        return div(a, b, "SafeMath: division by zero");
    }

    function div(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        // Solidity only automatically asserts when dividing by 0
        require(b > 0, errorMessage);
        uint256 c = a / b;
        // assert(a == b * c + a % b); // There is no case in which this doesn't hold

        return c;
    }

}









