// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.14;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./common/ERC2981.sol";

contract Collection721 is
    Context,
    ERC721Enumerable,
    ERC721Burnable,
    ERC721URIStorage,
    ERC2981,
    AccessControl
{
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdTracker;
    string private baseTokenURI;
    address public owner;
    address[] private whitelist;
    uint256 private whitelistCount;
    mapping(address => bool) private isMintingExceeds;


    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    constructor(
        string memory name,
        string memory symbol,
        string memory _baseTokenURI
    ) ERC721(name, symbol) 
    {
        baseTokenURI = _baseTokenURI;
        owner = _msgSender();
        _setupRole("ADMIN_ROLE", _msgSender());
        _tokenIdTracker.increment();
        _setRoyalty(_msgSender(), 500);
    }

    function transferOwnership(address newOwner)
        external
        onlyRole("ADMIN_ROLE")
        returns (bool)
    {
        require(
            newOwner != address(0),
            "Ownable: new owner is the zero address"
        );
        _revokeRole("ADMIN_ROLE", owner);
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
        _setupRole("ADMIN_ROLE", newOwner);
        return true;
    }

    function baseURI() 
        external 
        view 
        returns (string memory) 
    {
        return _baseURI();
    }

    function setBaseURI(string memory _baseTokenURI) 
        external  
        onlyRole("ADMIN_ROLE") {
        baseTokenURI = _baseTokenURI;
    }

    function setRoyalty(
        address _receiver,
        uint96 _feePermile
    ) external
    onlyRole("ADMIN_ROLE")
    {
        require(_receiver != address(0),"ERC2981: fee shouldn't be zero");
        _setRoyalty(_receiver, _feePermile);
    }

    function addWhitelistAddress(
        address[] memory whitelistAddress) 
        external  
        onlyRole(
        "ADMIN_ROLE") 
    {
        require(
            whitelistAddress.length > 0, 
            "Whitelist: length must be greater than 0"
        );
        for(
            uint256 i=0; 
            i < whitelistAddress.length; 
            i++) {
            if(
                !hasRole("WHITELIST_ROLE", whitelistAddress[i])
            )
                _setupRole("WHITELIST_ROLE",whitelistAddress[i]); 
        }
        whitelistCount += whitelistAddress.length;
    }

    function removeWhitelistAddress(
        address[] memory whitelistAddress) 
        external  
        onlyRole(
        "ADMIN_ROLE") 
    {
        require(
            whitelistAddress.length > 0, 
            "Whitelist: length must be greater than 0"
        );
        for(
            uint256 i=0; 
            i < whitelistAddress.length; 
            i++) {
            if(
                hasRole("WHITELIST_ROLE", whitelistAddress[i])
            )
                _revokeRole("WHITELIST_ROLE",whitelistAddress[i]); 
        }
        whitelistCount -= whitelistAddress.length;
    }

    function mint(
        string memory _tokenURI) 
        external 
        virtual
        onlyRole(
        "WHITELIST_ROLE") 
        returns (
        uint256 _tokenId) 
    {
        _tokenId = _tokenIdTracker.current();
        require(_tokenId <= 3000,"Mint: totalSupply exceeds");
        require(!isMintingExceeds[_msgSender()],"Mint: User minting limit exceeds");
        _mint(_msgSender(), _tokenId);
        _setTokenURI(_tokenId, _tokenURI);
        _tokenIdTracker.increment();
        isMintingExceeds[_msgSender()] = true;
        return _tokenId;
    }

    function _burn(
        uint256 tokenId)
        internal
        override(
        ERC721,
        ERC721URIStorage)
    {
        super._burn(tokenId);
    }

    function tokenURI(
        uint256 tokenId)
        public
        view
        override(
        ERC721,
        ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function _baseURI() 
        internal 
        view 
        override 
        returns (string memory) 
    {
        return baseTokenURI;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId)
        internal 
        virtual 
        override(ERC721, ERC721Enumerable) 
    {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(
        bytes4 interfaceId)
        public
        view
        virtual
        override(
        ERC721,
        ERC721Enumerable,
        ERC2981,
        AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

}
