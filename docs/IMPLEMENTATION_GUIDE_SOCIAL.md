# Implementation Guide: Building a Decentralized Social Network

This guide walks through implementing a complete decentralized social media platform using PayRox Go
Beyond, from concept to deployment.

## Project Overview

**Platform Name**: SocialChain **Target**: 10M users in Year 1 **Revenue Model**: Creator
subscriptions, tips, NFTs, premium features **Key Features**: Censorship resistance, creator
monetization, community governance

## Architecture Planning

### Core Components

1. **SocialFacet** - Posts, likes, follows, feeds
2. **MonetizationFacet** - Tips, subscriptions, exclusive content
3. **ModerationFacet** - Community-driven content moderation
4. **NFTFacet** - Profile pictures, collectibles, badges
5. **GovernanceFacet** - Platform decisions, token distribution

## Step 1: Setup Development Environment

```bash
# Clone PayRox system
git clone https://github.com/PayRpc/PayRox-Go-Beyond.git
cd PayRox-Go-Beyond

# Install dependencies
npm install

# Create project structure
mkdir contracts/social-platform
mkdir scripts/social-platform
mkdir test/social-platform
```

## Step 2: Design Smart Contracts

### SocialFacet.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../utils/AccessControl.sol";
import "../utils/Events.sol";

/**
 * @title SocialFacet
 * @notice Core social media functionality
 */
contract SocialFacet is AccessControl {
    struct Post {
        uint256 id;
        address author;
        string contentHash; // IPFS hash
        PostType postType;
        uint256 timestamp;
        uint256 likes;
        uint256 shares;
        bool isExclusive;
        uint256 price; // For exclusive content
    }

    struct UserProfile {
        string username;
        string profileImageHash;
        string bio;
        uint256 followerCount;
        uint256 followingCount;
        uint256 postCount;
        bool isVerified;
        uint256 joinDate;
    }

    enum PostType { TEXT, IMAGE, VIDEO, AUDIO, POLL }

    mapping(uint256 => Post) public posts;
    mapping(address => UserProfile) public profiles;
    mapping(address => mapping(address => bool)) public isFollowing;
    mapping(uint256 => mapping(address => bool)) public hasLiked;
    mapping(uint256 => address[]) public postComments;

    uint256 public postCounter;
    uint256 public constant MAX_POST_LENGTH = 280;

    event PostCreated(uint256 indexed postId, address indexed author, PostType postType);
    event PostLiked(uint256 indexed postId, address indexed liker);
    event PostShared(uint256 indexed postId, address indexed sharer);
    event UserFollowed(address indexed follower, address indexed following);
    event ProfileUpdated(address indexed user, string username);

    error PostTooLong();
    error PostNotFound();
    error AlreadyLiked();
    error NotAuthorized();
    error InvalidPrice();

    /**
     * @notice Create a new post
     * @param contentHash IPFS hash of the content
     * @param postType Type of post (text, image, video, etc.)
     * @param isExclusive Whether post requires payment to view
     * @param price Price in wei for exclusive content (0 for public)
     */
    function createPost(
        string memory contentHash,
        PostType postType,
        bool isExclusive,
        uint256 price
    ) external returns (uint256) {
        if (isExclusive && price == 0) revert InvalidPrice();

        postCounter++;

        posts[postCounter] = Post({
            id: postCounter,
            author: msg.sender,
            contentHash: contentHash,
            postType: postType,
            timestamp: block.timestamp,
            likes: 0,
            shares: 0,
            isExclusive: isExclusive,
            price: price
        });

        profiles[msg.sender].postCount++;

        emit PostCreated(postCounter, msg.sender, postType);
        return postCounter;
    }

    /**
     * @notice Like a post
     * @param postId ID of the post to like
     */
    function likePost(uint256 postId) external {
        if (posts[postId].author == address(0)) revert PostNotFound();
        if (hasLiked[postId][msg.sender]) revert AlreadyLiked();

        hasLiked[postId][msg.sender] = true;
        posts[postId].likes++;

        emit PostLiked(postId, msg.sender);
    }

    /**
     * @notice Share/repost a post
     * @param postId ID of the post to share
     */
    function sharePost(uint256 postId) external {
        if (posts[postId].author == address(0)) revert PostNotFound();

        posts[postId].shares++;

        emit PostShared(postId, msg.sender);
    }

    /**
     * @notice Follow another user
     * @param userToFollow Address of user to follow
     */
    function followUser(address userToFollow) external {
        require(userToFollow != msg.sender, "Cannot follow yourself");
        require(!isFollowing[msg.sender][userToFollow], "Already following");

        isFollowing[msg.sender][userToFollow] = true;
        profiles[msg.sender].followingCount++;
        profiles[userToFollow].followerCount++;

        emit UserFollowed(msg.sender, userToFollow);
    }

    /**
     * @notice Update user profile
     * @param username New username
     * @param profileImageHash IPFS hash of profile image
     * @param bio User bio
     */
    function updateProfile(
        string memory username,
        string memory profileImageHash,
        string memory bio
    ) external {
        UserProfile storage profile = profiles[msg.sender];

        if (profile.joinDate == 0) {
            profile.joinDate = block.timestamp;
        }

        profile.username = username;
        profile.profileImageHash = profileImageHash;
        profile.bio = bio;

        emit ProfileUpdated(msg.sender, username);
    }

    /**
     * @notice Get user feed (posts from followed users)
     * @param user Address of user requesting feed
     * @param offset Starting position for pagination
     * @param limit Number of posts to return
     */
    function getUserFeed(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (Post[] memory) {
        // Implementation for feed algorithm
        // This would typically be handled off-chain for efficiency
        Post[] memory feed = new Post[](limit);
        uint256 feedIndex = 0;

        // Simplified feed: get recent posts from followed users
        for (uint256 i = postCounter; i > offset && feedIndex < limit; i--) {
            if (isFollowing[user][posts[i].author] || posts[i].author == user) {
                feed[feedIndex] = posts[i];
                feedIndex++;
            }
        }

        return feed;
    }

    /**
     * @notice Get trending posts
     * @param timeWindow Time window in seconds for trending calculation
     * @param limit Number of posts to return
     */
    function getTrendingPosts(
        uint256 timeWindow,
        uint256 limit
    ) external view returns (Post[] memory) {
        // Simplified trending algorithm based on engagement
        Post[] memory trending = new Post[](limit);
        uint256 trendingIndex = 0;
        uint256 cutoffTime = block.timestamp - timeWindow;

        for (uint256 i = postCounter; i > 0 && trendingIndex < limit; i--) {
            if (posts[i].timestamp > cutoffTime) {
                // Calculate engagement score (likes + shares)
                uint256 engagement = posts[i].likes + posts[i].shares;
                if (engagement > 10) { // Minimum engagement threshold
                    trending[trendingIndex] = posts[i];
                    trendingIndex++;
                }
            }
        }

        return trending;
    }
}
```

### MonetizationFacet.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../utils/AccessControl.sol";
import "./SocialFacet.sol";

/**
 * @title MonetizationFacet
 * @notice Creator monetization features
 */
contract MonetizationFacet is AccessControl {
    struct Subscription {
        address subscriber;
        address creator;
        uint256 tier;
        uint256 startDate;
        uint256 endDate;
        bool isActive;
    }

    struct CreatorTier {
        uint256 price;
        string benefits;
        bool exists;
    }

    mapping(address => mapping(uint256 => CreatorTier)) public creatorTiers;
    mapping(bytes32 => Subscription) public subscriptions;
    mapping(address => uint256) public creatorEarnings;
    mapping(address => uint256) public totalTips;

    uint256 public constant PLATFORM_FEE = 500; // 5%
    uint256 public constant FEE_DENOMINATOR = 10000;

    event TipSent(address indexed tipper, address indexed creator, uint256 amount);
    event SubscriptionCreated(address indexed subscriber, address indexed creator, uint256 tier);
    event CreatorTierSet(address indexed creator, uint256 tier, uint256 price);
    event ExclusiveContentPurchased(address indexed buyer, uint256 indexed postId, uint256 amount);

    error InsufficientPayment();
    error SubscriptionNotActive();
    error TierNotExists();
    error WithdrawalFailed();

    /**
     * @notice Send tip to creator
     * @param creator Address of the creator to tip
     */
    function tipCreator(address creator) external payable {
        require(msg.value > 0, "Tip must be greater than 0");

        uint256 platformFee = (msg.value * PLATFORM_FEE) / FEE_DENOMINATOR;
        uint256 creatorAmount = msg.value - platformFee;

        creatorEarnings[creator] += creatorAmount;
        totalTips[creator] += msg.value;

        emit TipSent(msg.sender, creator, msg.value);
    }

    /**
     * @notice Set creator subscription tier
     * @param tier Tier number (1, 2, 3, etc.)
     * @param price Monthly price in wei
     * @param benefits Description of tier benefits
     */
    function setCreatorTier(
        uint256 tier,
        uint256 price,
        string memory benefits
    ) external {
        require(tier > 0 && tier <= 5, "Invalid tier");
        require(price > 0, "Price must be greater than 0");

        creatorTiers[msg.sender][tier] = CreatorTier({
            price: price,
            benefits: benefits,
            exists: true
        });

        emit CreatorTierSet(msg.sender, tier, price);
    }

    /**
     * @notice Subscribe to creator tier
     * @param creator Address of creator to subscribe to
     * @param tier Tier to subscribe to
     * @param duration Duration in months
     */
    function subscribeToCreator(
        address creator,
        uint256 tier,
        uint256 duration
    ) external payable {
        CreatorTier memory creatorTier = creatorTiers[creator][tier];
        if (!creatorTier.exists) revert TierNotExists();

        uint256 totalCost = creatorTier.price * duration;
        if (msg.value < totalCost) revert InsufficientPayment();

        bytes32 subscriptionId = keccak256(
            abi.encodePacked(msg.sender, creator, tier, block.timestamp)
        );

        uint256 platformFee = (msg.value * PLATFORM_FEE) / FEE_DENOMINATOR;
        uint256 creatorAmount = msg.value - platformFee;

        creatorEarnings[creator] += creatorAmount;

        subscriptions[subscriptionId] = Subscription({
            subscriber: msg.sender,
            creator: creator,
            tier: tier,
            startDate: block.timestamp,
            endDate: block.timestamp + (duration * 30 days),
            isActive: true
        });

        emit SubscriptionCreated(msg.sender, creator, tier);
    }

    /**
     * @notice Purchase exclusive content
     * @param postId ID of the exclusive post
     */
    function purchaseExclusiveContent(uint256 postId) external payable {
        // Get post details from SocialFacet
        SocialFacet socialFacet = SocialFacet(address(this));
        (,address author,,,,,, bool isExclusive, uint256 price) = socialFacet.posts(postId);

        require(isExclusive, "Post is not exclusive");
        if (msg.value < price) revert InsufficientPayment();

        uint256 platformFee = (msg.value * PLATFORM_FEE) / FEE_DENOMINATOR;
        uint256 creatorAmount = msg.value - platformFee;

        creatorEarnings[author] += creatorAmount;

        emit ExclusiveContentPurchased(msg.sender, postId, msg.value);
    }

    /**
     * @notice Creator withdraws earnings
     */
    function withdrawEarnings() external {
        uint256 amount = creatorEarnings[msg.sender];
        require(amount > 0, "No earnings to withdraw");

        creatorEarnings[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert WithdrawalFailed();
    }

    /**
     * @notice Check if user has active subscription to creator
     * @param subscriber Address of subscriber
     * @param creator Address of creator
     * @param tier Tier to check
     */
    function hasActiveSubscription(
        address subscriber,
        address creator,
        uint256 tier
    ) external view returns (bool) {
        bytes32 subscriptionId = keccak256(
            abi.encodePacked(subscriber, creator, tier, block.timestamp)
        );

        Subscription memory sub = subscriptions[subscriptionId];
        return sub.isActive && sub.endDate > block.timestamp;
    }

    /**
     * @notice Get creator statistics
     * @param creator Address of creator
     */
    function getCreatorStats(address creator) external view returns (
        uint256 totalEarnings,
        uint256 totalTipsReceived,
        uint256 subscriberCount
    ) {
        totalEarnings = creatorEarnings[creator];
        totalTipsReceived = totalTips[creator];

        // Subscriber count would be tracked separately
        // This is a simplified version
        subscriberCount = 0;
    }
}
```

## Step 3: Deploy Contracts

### Deployment Script

```typescript
// scripts/social-platform/deploy-social-platform.ts
import { ethers } from 'hardhat';
import { writeFileSync } from 'fs';

async function main() {
  console.log('🚀 Deploying SocialChain Platform...');

  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);

  // Deploy Factory (if not already deployed)
  const Factory = await ethers.getContractFactory('DeterministicChunkFactory');
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  console.log('✅ Factory deployed to:', await factory.getAddress());

  // Deploy Dispatcher (if not already deployed)
  const Dispatcher = await ethers.getContractFactory('ManifestDispatcher');
  const dispatcher = await Dispatcher.deploy();
  await dispatcher.waitForDeployment();
  console.log('✅ Dispatcher deployed to:', await dispatcher.getAddress());

  // Deploy Social Facets
  const SocialFacet = await ethers.getContractFactory('SocialFacet');
  const socialFacet = await SocialFacet.deploy();
  await socialFacet.waitForDeployment();
  console.log('✅ SocialFacet deployed to:', await socialFacet.getAddress());

  const MonetizationFacet = await ethers.getContractFactory('MonetizationFacet');
  const monetizationFacet = await MonetizationFacet.deploy();
  await monetizationFacet.waitForDeployment();
  console.log('✅ MonetizationFacet deployed to:', await monetizationFacet.getAddress());

  // Save deployment addresses
  const deployment = {
    network: 'localhost',
    timestamp: new Date().toISOString(),
    contracts: {
      factory: await factory.getAddress(),
      dispatcher: await dispatcher.getAddress(),
      socialFacet: await socialFacet.getAddress(),
      monetizationFacet: await monetizationFacet.getAddress(),
    },
  };

  writeFileSync(`deployments/localhost/social-platform.json`, JSON.stringify(deployment, null, 2));

  console.log('🎉 SocialChain Platform deployment complete!');
  console.log('📄 Deployment details saved to deployments/localhost/social-platform.json');

  // Build manifest
  console.log('📦 Building platform manifest...');
  await buildSocialPlatformManifest(deployment.contracts);
}

async function buildSocialPlatformManifest(contracts: any) {
  const manifest = {
    version: '1.0.0',
    name: 'SocialChain Platform',
    description: 'Decentralized social media platform with creator monetization',
    timestamp: new Date().toISOString(),
    network: 'localhost',
    contracts: contracts,
    facets: [
      {
        name: 'SocialFacet',
        address: contracts.socialFacet,
        functions: [
          'createPost(string,uint8,bool,uint256)',
          'likePost(uint256)',
          'sharePost(uint256)',
          'followUser(address)',
          'updateProfile(string,string,string)',
          'getUserFeed(address,uint256,uint256)',
          'getTrendingPosts(uint256,uint256)',
        ],
      },
      {
        name: 'MonetizationFacet',
        address: contracts.monetizationFacet,
        functions: [
          'tipCreator(address)',
          'setCreatorTier(uint256,uint256,string)',
          'subscribeToCreator(address,uint256,uint256)',
          'purchaseExclusiveContent(uint256)',
          'withdrawEarnings()',
          'hasActiveSubscription(address,address,uint256)',
        ],
      },
    ],
  };

  writeFileSync(`manifests/social-platform.manifest.json`, JSON.stringify(manifest, null, 2));

  console.log('✅ Platform manifest created');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
```

## Step 4: Build Frontend Interface

### React Component Example

```typescript
// frontend/components/CreatePost.tsx
import React, { useState } from 'react';
import { ethers } from 'ethers';
import { uploadToIPFS } from '../utils/ipfs';

interface CreatePostProps {
  socialContract: ethers.Contract;
  userAddress: string;
}

export const CreatePost: React.FC<CreatePostProps> = ({ socialContract, userAddress }) => {
  const [content, setContent] = useState('');
  const [isExclusive, setIsExclusive] = useState(false);
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreatePost = async () => {
    if (!content.trim()) return;

    setLoading(true);
    try {
      // Upload content to IPFS
      const contentHash = await uploadToIPFS(content);

      // Create post on blockchain
      const priceInWei = isExclusive ? ethers.parseEther(price || '0') : 0;

      const tx = await socialContract.createPost(
        contentHash,
        0, // TEXT post type
        isExclusive,
        priceInWei
      );

      await tx.wait();

      setContent('');
      setIsExclusive(false);
      setPrice('');

      alert('Post created successfully!');
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-post-container">
      <h3>Create New Post</h3>

      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="What's on your mind?"
        maxLength={280}
        className="post-textarea"
      />

      <div className="post-options">
        <label>
          <input
            type="checkbox"
            checked={isExclusive}
            onChange={e => setIsExclusive(e.target.checked)}
          />
          Exclusive Content
        </label>

        {isExclusive && (
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="Price in ETH"
            className="price-input"
          />
        )}
      </div>

      <button
        onClick={handleCreatePost}
        disabled={loading || !content.trim()}
        className="create-post-btn"
      >
        {loading ? 'Creating...' : 'Create Post'}
      </button>
    </div>
  );
};
```

## Step 5: Testing & Validation

### Comprehensive Test Suite

```typescript
// test/social-platform/SocialPlatform.spec.ts
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { SocialFacet, MonetizationFacet } from '../../typechain-types';

describe('SocialChain Platform', function () {
  let socialFacet: SocialFacet;
  let monetizationFacet: MonetizationFacet;
  let owner: any, user1: any, user2: any, creator: any;

  beforeEach(async function () {
    [owner, user1, user2, creator] = await ethers.getSigners();

    const SocialFacet = await ethers.getContractFactory('SocialFacet');
    socialFacet = await SocialFacet.deploy();

    const MonetizationFacet = await ethers.getContractFactory('MonetizationFacet');
    monetizationFacet = await MonetizationFacet.deploy();
  });

  describe('Social Features', function () {
    it('Should create a post', async function () {
      const contentHash = 'QmTestHash123';

      await expect(socialFacet.connect(user1).createPost(contentHash, 0, false, 0)).to.emit(
        socialFacet,
        'PostCreated'
      );

      const post = await socialFacet.posts(1);
      expect(post.author).to.equal(user1.address);
      expect(post.contentHash).to.equal(contentHash);
    });

    it('Should like a post', async function () {
      await socialFacet.connect(user1).createPost('QmTestHash', 0, false, 0);

      await expect(socialFacet.connect(user2).likePost(1)).to.emit(socialFacet, 'PostLiked');

      const post = await socialFacet.posts(1);
      expect(post.likes).to.equal(1);
    });

    it('Should follow users', async function () {
      await expect(socialFacet.connect(user1).followUser(user2.address)).to.emit(
        socialFacet,
        'UserFollowed'
      );

      const isFollowing = await socialFacet.isFollowing(user1.address, user2.address);
      expect(isFollowing).to.be.true;
    });
  });

  describe('Monetization Features', function () {
    it('Should send tips to creators', async function () {
      const tipAmount = ethers.parseEther('0.1');

      await expect(
        monetizationFacet.connect(user1).tipCreator(creator.address, { value: tipAmount })
      ).to.emit(monetizationFacet, 'TipSent');

      const earnings = await monetizationFacet.creatorEarnings(creator.address);
      expect(earnings).to.be.gt(0);
    });

    it('Should handle creator subscriptions', async function () {
      const tierPrice = ethers.parseEther('0.01');

      // Set creator tier
      await monetizationFacet
        .connect(creator)
        .setCreatorTier(1, tierPrice, 'Premium content access');

      // Subscribe to creator
      await expect(
        monetizationFacet
          .connect(user1)
          .subscribeToCreator(creator.address, 1, 1, { value: tierPrice })
      ).to.emit(monetizationFacet, 'SubscriptionCreated');
    });

    it('Should allow exclusive content purchases', async function () {
      const exclusivePrice = ethers.parseEther('0.05');

      // Create exclusive post
      await socialFacet.connect(creator).createPost('QmExclusiveContent', 0, true, exclusivePrice);

      // Purchase exclusive content
      await expect(
        monetizationFacet.connect(user1).purchaseExclusiveContent(1, { value: exclusivePrice })
      ).to.emit(monetizationFacet, 'ExclusiveContentPurchased');
    });
  });

  describe('Business Logic', function () {
    it('Should calculate platform fees correctly', async function () {
      const tipAmount = ethers.parseEther('1.0');
      const expectedFee = (tipAmount * BigInt(500)) / BigInt(10000); // 5%
      const expectedCreatorAmount = tipAmount - expectedFee;

      await monetizationFacet.connect(user1).tipCreator(creator.address, { value: tipAmount });

      const creatorEarnings = await monetizationFacet.creatorEarnings(creator.address);
      expect(creatorEarnings).to.equal(expectedCreatorAmount);
    });

    it('Should handle trending posts correctly', async function () {
      // Create posts with different engagement
      await socialFacet.connect(user1).createPost('QmPost1', 0, false, 0);
      await socialFacet.connect(user2).createPost('QmPost2', 0, false, 0);

      // Add likes to make post trending
      for (let i = 0; i < 15; i++) {
        const signer = await ethers.getImpersonatedSigner(`0x${'1'.repeat(40)}`);
        await socialFacet.connect(signer).likePost(1);
      }

      const trendingPosts = await socialFacet.getTrendingPosts(86400, 10);
      expect(trendingPosts.length).to.be.gt(0);
    });
  });
});
```

## Step 6: Production Deployment

### Deployment Checklist

```bash
# 1. Compile contracts
npm run compile

# 2. Run full test suite
npm run test

# 3. Deploy to testnet
npx hardhat run scripts/social-platform/deploy-social-platform.ts --network goerli

# 4. Verify contracts on Etherscan
npx hardhat verify --network goerli DEPLOYED_CONTRACT_ADDRESS

# 5. Deploy to mainnet
npx hardhat run scripts/social-platform/deploy-social-platform.ts --network mainnet

# 6. Set up monitoring
npx hardhat payrox:ops:watch --dispatcher DISPATCHER_ADDRESS --network mainnet
```

## Business Model Implementation

### Revenue Streams

1. **Creator Subscriptions** (70% to creator, 30% platform)
2. **Transaction Fees** (5% on tips, exclusive content)
3. **Premium Features** ($10-50/month per user)
4. **NFT Marketplace** (2.5% on sales)
5. **Advertising Revenue** (Revenue sharing with creators)

### Scaling Strategy

1. **Year 1**: 100K users, $1M revenue
2. **Year 2**: 1M users, $10M revenue
3. **Year 3**: 10M users, $100M revenue

### Key Metrics to Track

- Daily/Monthly Active Users (DAU/MAU)
- Creator earnings and retention
- Average revenue per user (ARPU)
- Content engagement rates
- Platform transaction volume

## Security Considerations

### Smart Contract Security

1. **Access Controls**: Role-based permissions
2. **Reentrancy Protection**: NonReentrant modifiers
3. **Input Validation**: Comprehensive input checks
4. **Emergency Pause**: Circuit breaker functionality
5. **Upgrade Safety**: Timelock for critical changes

### Content Moderation

1. **Community Governance**: Token-based voting
2. **Reputation System**: User and creator scoring
3. **Automated Detection**: AI-powered content filtering
4. **Appeal Process**: Transparent dispute resolution

## Next Steps

1. **MVP Launch**: Deploy basic social features
2. **Creator Onboarding**: Partner with influencers
3. **Mobile App**: React Native implementation
4. **Advanced Features**: Stories, live streaming, groups
5. **DAO Governance**: Transition to community control

---

**Ready to launch your social platform?** This implementation provides a solid foundation for
building the next generation of decentralized social media.

For technical support and consulting: [enterprise@payrox.io](mailto:enterprise@payrox.io)
