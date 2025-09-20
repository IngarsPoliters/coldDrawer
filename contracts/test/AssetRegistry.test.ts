import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { deployAssetRegistryFixture, SAMPLE_ASSET, SAMPLE_HTLC } from "./fixtures/deploy";

describe("AssetRegistry", function () {
  async function setup() {
    return await deployAssetRegistryFixture();
  }

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      const { assetRegistry } = await setup();
      
      expect(await assetRegistry.name()).to.equal("coldDrawer Asset Registry");
      expect(await assetRegistry.symbol()).to.equal("CDAR");
    });

    it("Should set the deployer as owner", async function () {
      const { assetRegistry, owner } = await setup();
      
      expect(await assetRegistry.owner()).to.equal(owner.address);
    });

    it("Should start token counter at 1", async function () {
      const { assetRegistry } = await setup();
      
      expect(await assetRegistry.nextTokenId()).to.equal(1);
    });
  });

  describe("Minting", function () {
    it("Should mint an asset with valid metadata", async function () {
      const { assetRegistry, seller } = await setup();
      
      await expect(
        assetRegistry.connect(seller).mint(
          SAMPLE_ASSET.tokenId,
          SAMPLE_ASSET.title,
          SAMPLE_ASSET.category,
          SAMPLE_ASSET.identifiers,
          SAMPLE_ASSET.attributes,
          SAMPLE_ASSET.note
        )
      ).to.emit(assetRegistry, "Minted")
        .withArgs(SAMPLE_ASSET.tokenId, seller.address, SAMPLE_ASSET.title, SAMPLE_ASSET.category)
        .and.to.emit(assetRegistry, "NoteAdded")
        .withArgs(SAMPLE_ASSET.tokenId, seller.address, SAMPLE_ASSET.note);

      expect(await assetRegistry.ownerOf(SAMPLE_ASSET.tokenId)).to.equal(seller.address);
      
      const metadata = await assetRegistry.getAssetMetadata(SAMPLE_ASSET.tokenId);
      expect(metadata.title).to.equal(SAMPLE_ASSET.title);
      expect(metadata.category).to.equal(SAMPLE_ASSET.category);
      expect(metadata.identifiers).to.equal(SAMPLE_ASSET.identifiers);
      expect(metadata.attributes).to.equal(SAMPLE_ASSET.attributes);
      expect(metadata.note).to.equal(SAMPLE_ASSET.note);
      expect(metadata.frozen).to.be.false;
    });

    it("Should reject invalid token ID", async function () {
      const { assetRegistry, seller } = await setup();
      
      await expect(
        assetRegistry.connect(seller).mint(
          0,
          SAMPLE_ASSET.title,
          SAMPLE_ASSET.category,
          SAMPLE_ASSET.identifiers,
          SAMPLE_ASSET.attributes,
          SAMPLE_ASSET.note
        )
      ).to.be.revertedWith("Token ID must be greater than 0");
    });

    it("Should reject empty title", async function () {
      const { assetRegistry, seller } = await setup();
      
      await expect(
        assetRegistry.connect(seller).mint(
          SAMPLE_ASSET.tokenId,
          "",
          SAMPLE_ASSET.category,
          SAMPLE_ASSET.identifiers,
          SAMPLE_ASSET.attributes,
          SAMPLE_ASSET.note
        )
      ).to.be.revertedWith("Invalid title length");
    });

    it("Should reject title too long", async function () {
      const { assetRegistry, seller } = await setup();
      
      const longTitle = "a".repeat(101);
      await expect(
        assetRegistry.connect(seller).mint(
          SAMPLE_ASSET.tokenId,
          longTitle,
          SAMPLE_ASSET.category,
          SAMPLE_ASSET.identifiers,
          SAMPLE_ASSET.attributes,
          SAMPLE_ASSET.note
        )
      ).to.be.revertedWith("Invalid title length");
    });

    it("Should reject note too long", async function () {
      const { assetRegistry, seller } = await setup();
      
      const longNote = "a".repeat(141);
      await expect(
        assetRegistry.connect(seller).mint(
          SAMPLE_ASSET.tokenId,
          SAMPLE_ASSET.title,
          SAMPLE_ASSET.category,
          SAMPLE_ASSET.identifiers,
          SAMPLE_ASSET.attributes,
          longNote
        )
      ).to.be.revertedWith("Note too long");
    });

    it("Should prevent minting duplicate token ID", async function () {
      const { assetRegistry, seller } = await setup();
      
      // Mint first asset
      await assetRegistry.connect(seller).mint(
        SAMPLE_ASSET.tokenId,
        SAMPLE_ASSET.title,
        SAMPLE_ASSET.category,
        SAMPLE_ASSET.identifiers,
        SAMPLE_ASSET.attributes,
        SAMPLE_ASSET.note
      );

      // Try to mint with same token ID
      await expect(
        assetRegistry.connect(seller).mint(
          SAMPLE_ASSET.tokenId,
          "Another Asset",
          SAMPLE_ASSET.category,
          SAMPLE_ASSET.identifiers,
          SAMPLE_ASSET.attributes,
          SAMPLE_ASSET.note
        )
      ).to.be.revertedWith("ERC721: token already minted");
    });
  });

  describe("Notes", function () {
    beforeEach(async function () {
      const { assetRegistry, seller } = await setup();
      this.assetRegistry = assetRegistry;
      this.seller = seller;

      await assetRegistry.connect(seller).mint(
        SAMPLE_ASSET.tokenId,
        SAMPLE_ASSET.title,
        SAMPLE_ASSET.category,
        SAMPLE_ASSET.identifiers,
        SAMPLE_ASSET.attributes,
        ""
      );
    });

    it("Should allow owner to set note", async function () {
      const newNote = "Updated note";
      
      await expect(
        this.assetRegistry.connect(this.seller).setNote(SAMPLE_ASSET.tokenId, newNote)
      ).to.emit(this.assetRegistry, "NoteAdded")
        .withArgs(SAMPLE_ASSET.tokenId, this.seller.address, newNote);

      const metadata = await this.assetRegistry.getAssetMetadata(SAMPLE_ASSET.tokenId);
      expect(metadata.note).to.equal(newNote);
    });

    it("Should reject note from non-owner", async function () {
      const { buyer } = await setup();
      
      await expect(
        this.assetRegistry.connect(buyer).setNote(SAMPLE_ASSET.tokenId, "Hacker note")
      ).to.be.revertedWith("Not the token owner");
    });

    it("Should reject note when frozen", async function () {
      await this.assetRegistry.connect(this.seller).freezeMetadata(SAMPLE_ASSET.tokenId);
      
      await expect(
        this.assetRegistry.connect(this.seller).setNote(SAMPLE_ASSET.tokenId, "New note")
      ).to.be.revertedWith("Metadata is frozen");
    });
  });

  describe("Metadata Freezing", function () {
    beforeEach(async function () {
      const { assetRegistry, seller } = await setup();
      this.assetRegistry = assetRegistry;
      this.seller = seller;

      await assetRegistry.connect(seller).mint(
        SAMPLE_ASSET.tokenId,
        SAMPLE_ASSET.title,
        SAMPLE_ASSET.category,
        SAMPLE_ASSET.identifiers,
        SAMPLE_ASSET.attributes,
        SAMPLE_ASSET.note
      );
    });

    it("Should allow owner to freeze metadata", async function () {
      await expect(
        this.assetRegistry.connect(this.seller).freezeMetadata(SAMPLE_ASSET.tokenId)
      ).to.emit(this.assetRegistry, "MetadataFrozen")
        .withArgs(SAMPLE_ASSET.tokenId, this.seller.address);

      const metadata = await this.assetRegistry.getAssetMetadata(SAMPLE_ASSET.tokenId);
      expect(metadata.frozen).to.be.true;
    });

    it("Should reject freeze from non-owner", async function () {
      const { buyer } = await setup();
      
      await expect(
        this.assetRegistry.connect(buyer).freezeMetadata(SAMPLE_ASSET.tokenId)
      ).to.be.revertedWith("Not the token owner");
    });

    it("Should reject double freeze", async function () {
      await this.assetRegistry.connect(this.seller).freezeMetadata(SAMPLE_ASSET.tokenId);
      
      await expect(
        this.assetRegistry.connect(this.seller).freezeMetadata(SAMPLE_ASSET.tokenId)
      ).to.be.revertedWith("Metadata already frozen");
    });
  });

  describe("Sale Escrow", function () {
    beforeEach(async function () {
      const { assetRegistry, seller, buyer } = await setup();
      this.assetRegistry = assetRegistry;
      this.seller = seller;
      this.buyer = buyer;

      await assetRegistry.connect(seller).mint(
        SAMPLE_ASSET.tokenId,
        SAMPLE_ASSET.title,
        SAMPLE_ASSET.category,
        SAMPLE_ASSET.identifiers,
        SAMPLE_ASSET.attributes,
        SAMPLE_ASSET.note
      );
    });

    it("Should open sale escrow", async function () {
      const expiryTimestamp = (await time.latest()) + 3600; // 1 hour from now
      
      await expect(
        this.assetRegistry.connect(this.seller).saleOpen(
          SAMPLE_ASSET.tokenId,
          this.buyer.address,
          SAMPLE_HTLC.hash,
          expiryTimestamp,
          SAMPLE_HTLC.priceBTC
        )
      ).to.emit(this.assetRegistry, "SaleOpen")
        .withArgs(
          SAMPLE_ASSET.tokenId,
          this.seller.address,
          this.buyer.address,
          SAMPLE_HTLC.hash,
          SAMPLE_HTLC.priceBTC,
          expiryTimestamp
        );

      expect(await this.assetRegistry.isInEscrow(SAMPLE_ASSET.tokenId)).to.be.true;
      
      const escrow = await this.assetRegistry.getSaleEscrow(SAMPLE_ASSET.tokenId);
      expect(escrow.seller).to.equal(this.seller.address);
      expect(escrow.buyer).to.equal(this.buyer.address);
      expect(escrow.hashH).to.equal(SAMPLE_HTLC.hash);
      expect(escrow.priceBTC).to.equal(SAMPLE_HTLC.priceBTC);
      expect(escrow.active).to.be.true;
    });

    it("Should reject sale to zero address", async function () {
      const expiryTimestamp = (await time.latest()) + 3600;
      
      await expect(
        this.assetRegistry.connect(this.seller).saleOpen(
          SAMPLE_ASSET.tokenId,
          ethers.ZeroAddress,
          SAMPLE_HTLC.hash,
          expiryTimestamp,
          SAMPLE_HTLC.priceBTC
        )
      ).to.be.revertedWith("Invalid buyer address");
    });

    it("Should reject sale to self", async function () {
      const expiryTimestamp = (await time.latest()) + 3600;
      
      await expect(
        this.assetRegistry.connect(this.seller).saleOpen(
          SAMPLE_ASSET.tokenId,
          this.seller.address,
          SAMPLE_HTLC.hash,
          expiryTimestamp,
          SAMPLE_HTLC.priceBTC
        )
      ).to.be.revertedWith("Cannot sell to yourself");
    });

    it("Should reject invalid expiry timestamp", async function () {
      const shortExpiry = (await time.latest()) + 1800; // 30 minutes (too short)
      
      await expect(
        this.assetRegistry.connect(this.seller).saleOpen(
          SAMPLE_ASSET.tokenId,
          this.buyer.address,
          SAMPLE_HTLC.hash,
          shortExpiry,
          SAMPLE_HTLC.priceBTC
        )
      ).to.be.revertedWith("Expiry too soon");
    });

    it("Should prevent transfer when in escrow", async function () {
      const expiryTimestamp = (await time.latest()) + 3600;
      
      await this.assetRegistry.connect(this.seller).saleOpen(
        SAMPLE_ASSET.tokenId,
        this.buyer.address,
        SAMPLE_HTLC.hash,
        expiryTimestamp,
        SAMPLE_HTLC.priceBTC
      );

      await expect(
        this.assetRegistry.connect(this.seller).transferFrom(
          this.seller.address,
          this.buyer.address,
          SAMPLE_ASSET.tokenId
        )
      ).to.be.revertedWith("Token is in escrow");
    });
  });

  describe("Claim", function () {
    beforeEach(async function () {
      const { assetRegistry, seller, buyer } = await setup();
      this.assetRegistry = assetRegistry;
      this.seller = seller;
      this.buyer = buyer;

      await assetRegistry.connect(seller).mint(
        SAMPLE_ASSET.tokenId,
        SAMPLE_ASSET.title,
        SAMPLE_ASSET.category,
        SAMPLE_ASSET.identifiers,
        SAMPLE_ASSET.attributes,
        SAMPLE_ASSET.note
      );

      this.expiryTimestamp = (await time.latest()) + 3600;
      await assetRegistry.connect(seller).saleOpen(
        SAMPLE_ASSET.tokenId,
        buyer.address,
        SAMPLE_HTLC.hash,
        this.expiryTimestamp,
        SAMPLE_HTLC.priceBTC
      );
    });

    it("Should allow buyer to claim with correct secret", async function () {
      await expect(
        this.assetRegistry.connect(this.buyer).claim(SAMPLE_ASSET.tokenId, SAMPLE_HTLC.secret)
      ).to.emit(this.assetRegistry, "SaleSettle")
        .withArgs(
          SAMPLE_ASSET.tokenId,
          this.seller.address,
          this.buyer.address,
          SAMPLE_HTLC.hash,
          SAMPLE_HTLC.secret
        )
        .and.to.emit(this.assetRegistry, "Transfer")
        .withArgs(this.seller.address, this.buyer.address, SAMPLE_ASSET.tokenId);

      expect(await this.assetRegistry.ownerOf(SAMPLE_ASSET.tokenId)).to.equal(this.buyer.address);
      expect(await this.assetRegistry.isInEscrow(SAMPLE_ASSET.tokenId)).to.be.false;
    });

    it("Should reject claim with wrong secret", async function () {
      const wrongSecret = "0x" + "b".repeat(64);
      
      await expect(
        this.assetRegistry.connect(this.buyer).claim(SAMPLE_ASSET.tokenId, wrongSecret)
      ).to.be.revertedWith("Invalid secret");
    });

    it("Should reject claim from non-buyer", async function () {
      const { other } = await setup();
      
      await expect(
        this.assetRegistry.connect(other).claim(SAMPLE_ASSET.tokenId, SAMPLE_HTLC.secret)
      ).to.be.revertedWith("Only buyer can claim");
    });

    it("Should reject claim after expiry", async function () {
      await time.increaseTo(this.expiryTimestamp + 1);
      
      await expect(
        this.assetRegistry.connect(this.buyer).claim(SAMPLE_ASSET.tokenId, SAMPLE_HTLC.secret)
      ).to.be.revertedWith("Escrow expired");
    });
  });

  describe("Refund", function () {
    beforeEach(async function () {
      const { assetRegistry, seller, buyer } = await setup();
      this.assetRegistry = assetRegistry;
      this.seller = seller;
      this.buyer = buyer;

      await assetRegistry.connect(seller).mint(
        SAMPLE_ASSET.tokenId,
        SAMPLE_ASSET.title,
        SAMPLE_ASSET.category,
        SAMPLE_ASSET.identifiers,
        SAMPLE_ASSET.attributes,
        SAMPLE_ASSET.note
      );

      this.expiryTimestamp = (await time.latest()) + 3600;
      await assetRegistry.connect(seller).saleOpen(
        SAMPLE_ASSET.tokenId,
        buyer.address,
        SAMPLE_HTLC.hash,
        this.expiryTimestamp,
        SAMPLE_HTLC.priceBTC
      );
    });

    it("Should allow seller to refund early", async function () {
      await expect(
        this.assetRegistry.connect(this.seller).refund(SAMPLE_ASSET.tokenId)
      ).to.emit(this.assetRegistry, "SaleRefund")
        .withArgs(
          SAMPLE_ASSET.tokenId,
          this.seller.address,
          this.buyer.address,
          SAMPLE_HTLC.hash
        );

      expect(await this.assetRegistry.ownerOf(SAMPLE_ASSET.tokenId)).to.equal(this.seller.address);
      expect(await this.assetRegistry.isInEscrow(SAMPLE_ASSET.tokenId)).to.be.false;
    });

    it("Should allow anyone to refund after expiry", async function () {
      const { other } = await setup();
      
      await time.increaseTo(this.expiryTimestamp + 1);
      
      await expect(
        this.assetRegistry.connect(other).refund(SAMPLE_ASSET.tokenId)
      ).to.emit(this.assetRegistry, "SaleRefund");

      expect(await this.assetRegistry.ownerOf(SAMPLE_ASSET.tokenId)).to.equal(this.seller.address);
      expect(await this.assetRegistry.isInEscrow(SAMPLE_ASSET.tokenId)).to.be.false;
    });

    it("Should reject early refund from non-seller", async function () {
      const { other } = await setup();
      
      await expect(
        this.assetRegistry.connect(other).refund(SAMPLE_ASSET.tokenId)
      ).to.be.revertedWith("Cannot refund yet");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      const { assetRegistry, seller, buyer } = await setup();
      this.assetRegistry = assetRegistry;
      this.seller = seller;
      this.buyer = buyer;

      await assetRegistry.connect(seller).mint(
        SAMPLE_ASSET.tokenId,
        SAMPLE_ASSET.title,
        SAMPLE_ASSET.category,
        SAMPLE_ASSET.identifiers,
        SAMPLE_ASSET.attributes,
        SAMPLE_ASSET.note
      );
    });

    it("Should return correct canClaim status", async function () {
      const expiryTimestamp = (await time.latest()) + 3600;
      
      await this.assetRegistry.connect(this.seller).saleOpen(
        SAMPLE_ASSET.tokenId,
        this.buyer.address,
        SAMPLE_HTLC.hash,
        expiryTimestamp,
        SAMPLE_HTLC.priceBTC
      );

      expect(await this.assetRegistry.canClaim(SAMPLE_ASSET.tokenId, SAMPLE_HTLC.secret)).to.be.true;
      expect(await this.assetRegistry.canClaim(SAMPLE_ASSET.tokenId, "0x" + "b".repeat(64))).to.be.false;
    });

    it("Should return correct canRefund status", async function () {
      const expiryTimestamp = (await time.latest()) + 3600;
      
      await this.assetRegistry.connect(this.seller).saleOpen(
        SAMPLE_ASSET.tokenId,
        this.buyer.address,
        SAMPLE_HTLC.hash,
        expiryTimestamp,
        SAMPLE_HTLC.priceBTC
      );

      expect(await this.assetRegistry.canRefund(SAMPLE_ASSET.tokenId)).to.be.false;
      
      await time.increaseTo(expiryTimestamp + 1);
      expect(await this.assetRegistry.canRefund(SAMPLE_ASSET.tokenId)).to.be.true;
    });
  });
});