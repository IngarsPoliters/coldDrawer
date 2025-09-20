// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IAssetRegistry is IERC721 {
    struct AssetMetadata {
        string title;
        string category;
        string identifiers; // JSON string
        string attributes;  // JSON string
        string note;
        bool frozen;
    }

    struct SaleEscrow {
        address seller;
        address buyer;
        bytes32 hashH;
        uint256 expiryTimestamp;
        uint256 priceBTC;
        bool active;
    }

    // Events
    event Minted(
        uint256 indexed tokenId,
        address indexed owner,
        string title,
        string category
    );

    event NoteAdded(
        uint256 indexed tokenId,
        address indexed owner,
        string note
    );

    event MetadataFrozen(
        uint256 indexed tokenId,
        address indexed owner
    );

    event SaleOpen(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        bytes32 hashH,
        uint256 priceBTC,
        uint256 expiryTimestamp
    );

    event SaleSettle(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        bytes32 hashH,
        bytes32 secretS
    );

    event SaleRefund(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        bytes32 hashH
    );

    // Functions
    function mint(
        uint256 tokenId,
        string calldata title,
        string calldata category,
        string calldata identifiers,
        string calldata attributes,
        string calldata note
    ) external;

    function setNote(uint256 tokenId, string calldata note) external;
    
    function freezeMetadata(uint256 tokenId) external;

    function saleOpen(
        uint256 tokenId,
        address buyer,
        bytes32 hashH,
        uint256 expiryTimestamp,
        uint256 priceBTC
    ) external;

    function claim(uint256 tokenId, bytes32 secretS) external;

    function refund(uint256 tokenId) external;

    // View functions
    function getAssetMetadata(uint256 tokenId) external view returns (AssetMetadata memory);
    
    function getSaleEscrow(uint256 tokenId) external view returns (SaleEscrow memory);
    
    function isInEscrow(uint256 tokenId) external view returns (bool);
    
    function canClaim(uint256 tokenId, bytes32 secretS) external view returns (bool);
    
    function canRefund(uint256 tokenId) external view returns (bool);
}