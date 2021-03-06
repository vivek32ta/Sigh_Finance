pragma solidity ^0.5.16;

/**
 * @title Sigh Reservoir Contract
 * @notice Distributes a token to a different contract at a fixed rate.
 * @dev This contract must be poked via the `drip()` function every so often.
 * @author SighFinance
 */

import "../openzeppelin/EIP20Interface.sol";
 
contract SighSpeedController {

  /// @notice Reference to token to drip (immutable)
  EIP20Interface public token;

  address public admin;
  address private pendingAdmin;

  bool public isDripAllowed = false;  
  uint public lastDripBlockNumber;    
    
  address[] private storedSupportedProtocols; 
  mapping (address => bool) supportedProtocols;
  mapping (address => uint) distributionSpeeds;

  mapping (address => uint) public totalDrippedAmount; 
  mapping (address => uint) public recentlyDrippedAmount;

  event DistributionInitialized(uint blockNumber);

  event NewProtocolSupported (address protocolAddress, uint sighSpeed);
  event ProtocolRemoved(address protocolAddress, uint totalDrippedToProtocol);
  
  event DistributionSpeedChanged(address protocolAddress, uint prevSpeed , uint newSpeed );  
  event Dripped(address protocolAddress, uint currentBalance, uint AmountDripped, uint totalAmountDripped ); 

  event pendingAdminUpdated(address prevPendingAdmin, address pendingAdmin );
  event newAdminAssigned(address prevAdmin, address admin);

  /**
    * @notice Constructs a Reservoir
    * @param token_ The token to drip
    */
  constructor(EIP20Interface token_ ) public {
    admin = msg.sender;
    token = token_;
  }

// #############################################################################################
// ###########   SIGH DISTRIBUTION : INITIALIZED DRIPPING (Can be called only once)   ##########
// #############################################################################################

  function beginDripping () public returns (bool) {
    require(admin == msg.sender,"Dripping can only be initialized by the Admin");
    require(!isDripAllowed,"Dripping can only be initialized once");

    isDripAllowed = true;
    lastDripBlockNumber = block.number;

    emit DistributionInitialized( lastDripBlockNumber );
    return true;
  }

// ############################################################################################################
// ###########   SIGH DISTRIBUTION : ADDING / REMOVING NEW PROTOCOL WHICH WILL RECEIVE SIGH TOKENS   ##########
// ############################################################################################################

    event testing( uint b );

  function supportNewProtocol( address newProtocolAddress, uint sighSpeed ) public returns (bool)  {
    require(admin == msg.sender,"New Protocol can only be added by the Admin");
    bool checkIfSupported = supportedProtocols[newProtocolAddress];
    require (!checkIfSupported, 'This Protocol is already supported by the Sigh Speed Controller');
    
    storedSupportedProtocols.push(newProtocolAddress);
    
    supportedProtocols[newProtocolAddress] = true;
    distributionSpeeds[newProtocolAddress] = sighSpeed;
    totalDrippedAmount[newProtocolAddress] = 0;
    recentlyDrippedAmount[newProtocolAddress] = 0;
    
    require (supportedProtocols[newProtocolAddress], 'Error occured when adding the new protocol address to the supported protocols list.');
    require (distributionSpeeds[newProtocolAddress] == sighSpeed, 'SIGH Speed for the new protocl was not initialized properly.');
    
    emit NewProtocolSupported(newProtocolAddress, sighSpeed);
  }
  
  function removeSupportedProtocol(address protocolAddress_ ) public returns (bool) {
    require(admin == msg.sender,"Protocol can only be removed by the Admin");
    require(supportedProtocols[protocolAddress_],'The Protocol is already not Supported by the Sigh Speed Controller' );
    
    uint index = 0;
    uint len = storedSupportedProtocols.length;

    for (uint i=0; i< len; i++) {
        if ( storedSupportedProtocols[i] == protocolAddress_ ) {
            index = i;
            break;
        }
    }
    
    storedSupportedProtocols[index] = storedSupportedProtocols[len - 1];
    storedSupportedProtocols.length--;
    uint newLength = len - 1;
    require(storedSupportedProtocols.length == newLength, 'The length of the list was not properly decremented.' );
    
    supportedProtocols[protocolAddress_] = false;
    distributionSpeeds[protocolAddress_] = 0;

    require (supportedProtocols[protocolAddress_] == false, 'Error occured when removing the protocol.');
    require (distributionSpeeds[protocolAddress_] == 0, 'SIGH Speed was not properly assigned to 0.');

      emit ProtocolRemoved( protocolAddress_,  totalDrippedAmount[protocolAddress_] );
  }
  
// ######################################################################################
// ###########   SIGH DISTRIBUTION : FUNCTIONS TO UPDATE DISTRIBUTION SPEEDS   ##########
// ######################################################################################

  function changeProtocolSIGHSpeed (address targetAddress, uint newSpeed_) public returns (bool) {
    require(admin == msg.sender,"Drip rate can only be changed by the Admin");
    require(supportedProtocols[targetAddress],'The Protocol not Supported by the Sigh Speed Controller' );
    if (isDripAllowed) {
        drip();
    }
    uint prevSpeed = distributionSpeeds[targetAddress];
    distributionSpeeds[targetAddress] = newSpeed_;
    require(distributionSpeeds[targetAddress] == newSpeed_, " Protocol's SIGH speed was not properly updated");
    emit DistributionSpeedChanged(targetAddress, prevSpeed , distributionSpeeds[targetAddress]);
    return true;
  }


// #####################################################################
// ###########   SIGH DISTRIBUTION FUNCTION - DRIP FUNCTION   ##########
// #####################################################################

  /**
    * @notice Drips the maximum amount of tokens to match the drip rate since inception
    * @dev Note: this will only drip up to the amount of tokens available.
    * @return The amount of tokens dripped in this call
    */
  function drip() public returns (uint) {
    require(isDripAllowed,'Dripping has not been initialized by the Admin');    

    EIP20Interface token_ = token;
    
    address[] memory protocols = storedSupportedProtocols;
    uint length = protocols.length;
    
    if (length > 0) {
        
        for ( uint i=0; i < length; i++) {
            
            address current_protocol = protocols[i];
            
            if ( supportedProtocols[ current_protocol ] ) {
                
                uint reservoirBalance_ = token_.balanceOf(address(this)); 
                uint blockNumber_ = block.number;
                uint deltaDrip_ = mul(distributionSpeeds[ current_protocol ], blockNumber_ - lastDripBlockNumber, "dripTotal overflow");
                uint toDrip_ = min(reservoirBalance_, deltaDrip_);
            
                require(reservoirBalance_ != 0, 'Protocol Transfer: The reservoir currently does not have any SIGH tokens' );
                require(token_.transfer(current_protocol, toDrip_), 'Protocol Transfer: The transfer did not complete.' );
                
                uint prevDrippedAmount = totalDrippedAmount[current_protocol];
                totalDrippedAmount[current_protocol] = add(prevDrippedAmount,toDrip_,"Overflow");
                recentlyDrippedAmount[current_protocol] = toDrip_;
                reservoirBalance_ = token_.balanceOf(address(this)); // TODO: Verify this is a static call
            
                emit Dripped( current_protocol, reservoirBalance_, toDrip_ , totalDrippedAmount[current_protocol] ); 
            }
        }
    }
    lastDripBlockNumber = block.number;
  }

// ########################################################
// ###########   FUNCTIONS TO CHANGE THE ADMIN   ##########
// ########################################################

 function changeAdmin(address newAdmin) public returns (bool) {
    require(admin == msg.sender,"Stored Admin can only be changed by the current Admin");
    address prevPendingAdmin = pendingAdmin;
    pendingAdmin = newAdmin;
    emit pendingAdminUpdated(prevPendingAdmin,pendingAdmin );
    return true;
 }

 function acceptAdmin() public returns (bool) {
    require(pendingAdmin == msg.sender,"Only the pending admin can call this function");
    address prevAdmin = admin;
    admin = pendingAdmin;
    pendingAdmin = address(0);
    require (admin == pendingAdmin,'Admin not assigned properly');
    
    emit newAdminAssigned(prevAdmin, admin);
     
 } 
 

// ###############################################################
// ###########   EXTERNAL VIEW functions TO GET STATE   ##########
// ###############################################################

  function getSIGHBalance() external view returns (uint) {
    EIP20Interface token_ = token;   
    uint balance = token_.balanceOf(address(this));
    return balance;
  }

  function getSighAddress() external view returns (address) {
    return address(token);
  }

  function isThisProtocolSupported(address protocolAddress) external view returns (bool) {
    return supportedProtocols[protocolAddress];
  }

  function getTotalAmountDistributedToProtocol(address protocolAddress) external view returns (uint) {
    return totalDrippedAmount[protocolAddress];
  }

  function getRecentAmountDistributedToProtocol(address protocolAddress) external view returns (uint) {
    return recentlyDrippedAmount[protocolAddress];
  }
  
  function getSIGHSpeedForProtocol(address protocolAddress) external view returns (uint) {
      return distributionSpeeds[protocolAddress];
  }
  
  function totalProtocolsSupported() external view returns (uint) {
      uint len = storedSupportedProtocols.length;
      return len;
  }

// ###############################################################
// ########### Internal helper functions for safe math ###########
// ###############################################################

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
}

import "../openzeppelin/EIP20Interface.sol";
