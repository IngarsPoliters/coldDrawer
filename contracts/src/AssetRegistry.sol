// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IAssetRegistry.sol";

contract AssetRegistry is ERC721, Ownable, ReentrancyGuard, IAssetRegistry {
    mapping(uint256 => AssetMetadata) private _assetMetadata;
    mapping(uint256 => SaleEscrow) private _saleEscrows;
    
    uint256 private _tokenIdCounter;
    
    // Constants
    uint256 public constant MAX_NOTE_LENGTH = 140;
    uint256 public constant MAX_TITLE_LENGTH = 100;
    uint256 public constant MAX_JSON_LENGTH = 500;
    uint256 public constant MIN_ESCROW_DURATION = 1 hours;
    uint256 public constant MAX_ESCROW_DURATION = 30 days;

    constructor() ERC721("coldDrawer Asset Registry", "CDAR") Ownable(msg.sender) {
        _tokenIdCounter = 1; // Start from 1
    }

    modifier onlyTokenOwner(uint256 tokenId) {
        require(ownerOf(tokenId) == msg.sender, "Not the token owner");
        _;
    }

    modifier tokenExists(uint256 tokenId) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        _;
    }

    modifier notInEscrow(uint256 tokenId) {
        require(!_saleEscrows[tokenId].active, "Token is in escrow");
        _;
    }

    modifier inEscrow(uint256 tokenId) {
        require(_saleEscrows[tokenId].active, "Token is not in escrow");
        _;
    }

    function mint(
        uint256 tokenId,
        string calldata title,
        string calldata category,
        string calldata identifiers,
        string calldata attributes,
        string calldata note
    ) external override {
        require(tokenId > 0, "Token ID must be greater than 0");
        require(bytes(title).length > 0 && bytes(title).length <= MAX_TITLE_LENGTH, "Invalid title length");
        require(bytes(category).length > 0, "Category cannot be empty");
        require(bytes(identifiers).length <= MAX_JSON_LENGTH, "Identifiers too long");
        require(bytes(attributes).length <= MAX_JSON_LENGTH, "Attributes too long");
        require(bytes(note).length <= MAX_NOTE_LENGTH, "Note too long");

        _safeMint(msg.sender, tokenId);

        _assetMetadata[tokenId] = AssetMetadata({
            title: title,
            category: category,
            identifiers: identifiers,
            attributes: attributes,
            note: note,
            frozen: false
        });

        emit Minted(tokenId, msg.sender, title, category);
        
        if (bytes(note).length > 0) {
            emit NoteAdded(tokenId, msg.sender, note);
        }
    }

    function setNote(uint256 tokenId, string calldata note) 
        external 
        override 
        onlyTokenOwner(tokenId) 
        tokenExists(tokenId) 
        notInEscrow(tokenId) 
    {
        require(bytes(note).length <= MAX_NOTE_LENGTH, "Note too long");
        require(!_assetMetadata[tokenId].frozen, "Metadata is frozen");

        _assetMetadata[tokenId].note = note;
        emit NoteAdded(tokenId, msg.sender, note);
    }

    function freezeMetadata(uint256 tokenId) 
        external 
        override 
        onlyTokenOwner(tokenId) 
        tokenExists(tokenId) 
        notInEscrow(tokenId) 
    {
        require(!_assetMetadata[tokenId].frozen, "Metadata already frozen");
        
        _assetMetadata[tokenId].frozen = true;
        emit MetadataFrozen(tokenId, msg.sender);
    }

    function saleOpen(
        uint256 tokenId,
        address buyer,
        bytes32 hashH,
        uint256 expiryTimestamp,
        uint256 priceBTC
    ) external override onlyTokenOwner(tokenId) tokenExists(tokenId) notInEscrow(tokenId) {
        require(buyer != address(0), "Invalid buyer address");
        require(buyer != msg.sender, "Cannot sell to yourself");
        require(hashH != bytes32(0), "Invalid hash");
        require(priceBTC > 0, "Price must be greater than 0");
        require(
            expiryTimestamp > block.timestamp + MIN_ESCROW_DURATION,
            "Expiry too soon"
        );
        require(
            expiryTimestamp <= block.timestamp + MAX_ESCROW_DURATION,
            "Expiry too far"
        );

        _saleEscrows[tokenId] = SaleEscrow({
            seller: msg.sender,
            buyer: buyer,
            hashH: hashH,
            expiryTimestamp: expiryTimestamp,
            priceBTC: priceBTC,
            active: true
        });

        emit SaleOpen(tokenId, msg.sender, buyer, hashH, priceBTC, expiryTimestamp);
    }

    function claim(uint256 tokenId, bytes32 secretS) 
        external 
        override 
        nonReentrant 
        tokenExists(tokenId) 
        inEscrow(tokenId) 
    {
        SaleEscrow storage escrow = _saleEscrows[tokenId];
        
        require(block.timestamp < escrow.expiryTimestamp, "Escrow expired");
        require(msg.sender == escrow.buyer, "Only buyer can claim");
        require(sha256(abi.encodePacked(secretS)) == escrow.hashH, "Invalid secret");

        address seller = escrow.seller;
        address buyer = escrow.buyer;
        bytes32 hashH = escrow.hashH;

        // Clear escrow before transfer to prevent reentrancy
        delete _saleEscrows[tokenId];

        // Transfer the token
        _transfer(seller, buyer, tokenId);

        emit SaleSettle(tokenId, seller, buyer, hashH, secretS);
    }

    function refund(uint256 tokenId) 
        external 
        override 
        nonReentrant 
        tokenExists(tokenId) 
        inEscrow(tokenId) 
    {
        SaleEscrow storage escrow = _saleEscrows[tokenId];
        
        require(
            block.timestamp >= escrow.expiryTimestamp || 
            msg.sender == escrow.seller, 
            "Cannot refund yet"
        );

        address seller = escrow.seller;
        address buyer = escrow.buyer;
        bytes32 hashH = escrow.hashH;

        // Clear escrow
        delete _saleEscrows[tokenId];

        emit SaleRefund(tokenId, seller, buyer, hashH);
    }

    function transferFrom(address from, address to, uint256 tokenId) 
        public 
        override(ERC721, IERC721) 
        notInEscrow(tokenId) 
    {
        super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) 
        public 
        override(ERC721, IERC721) 
        notInEscrow(tokenId) 
    {
        super.safeTransferFrom(from, to, tokenId, data);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) 
        public 
        override(ERC721, IERC721) 
        notInEscrow(tokenId) 
    {
        super.safeTransferFrom(from, to, tokenId);
    }

    // View functions
    function getAssetMetadata(uint256 tokenId) 
        external 
        view 
        override 
        tokenExists(tokenId) 
        returns (AssetMetadata memory) 
    {
        return _assetMetadata[tokenId];
    }

    function getSaleEscrow(uint256 tokenId) 
        external 
        view 
        override 
        tokenExists(tokenId) 
        returns (SaleEscrow memory) 
    {
        return _saleEscrows[tokenId];
    }

    function isInEscrow(uint256 tokenId) 
        external 
        view 
        override 
        tokenExists(tokenId) 
        returns (bool) 
    {
        return _saleEscrows[tokenId].active;
    }

    function canClaim(uint256 tokenId, bytes32 secretS) 
        external 
        view 
        override 
        tokenExists(tokenId) 
        returns (bool) 
    {
        SaleEscrow storage escrow = _saleEscrows[tokenId];
        
        return escrow.active && 
               block.timestamp < escrow.expiryTimestamp &&
               sha256(abi.encodePacked(secretS)) == escrow.hashH;
    }

    function canRefund(uint256 tokenId) 
        external 
        view 
        override 
        tokenExists(tokenId) 
        returns (bool) 
    {
        SaleEscrow storage escrow = _saleEscrows[tokenId];
        
        return escrow.active && block.timestamp >= escrow.expiryTimestamp;
    }

    function nextTokenId() external view returns (uint256) {
        return _tokenIdCounter;
    }

    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(ERC721, IERC165) 
        returns (bool) 
    {
        return interfaceId == type(IAssetRegistry).interfaceId || super.supportsInterface(interfaceId);
    }
}