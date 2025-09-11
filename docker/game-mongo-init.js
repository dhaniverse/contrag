// Game data population script for financial literacy game
db = db.getSiblingDB('contrag_test');

// Drop existing collections to start fresh
db.users.drop();
db.playerStates.drop();
db.bankAccounts.drop();
db.fixedDeposits.drop();
db.stockPortfolios.drop();
db.stockTransactions.drop();
db.gameSessions.drop();
db.chatMessages.drop();
db.multiplayerSessions.drop();
db.userSessions.drop();
db.leaderboards.drop();
db.achievements.drop();
db.bans.drop();
db.ipLogs.drop();
db.sessionLogs.drop();
db.announcements.drop();
db.activePlayers.drop();

// Generate ObjectIds for referential integrity
const user1Id = ObjectId("64a1b2c3d4e5f6789abcdef0");
const user2Id = ObjectId("64a1b2c3d4e5f6789abcdef1");
const user3Id = ObjectId("64a1b2c3d4e5f6789abcdef2");
const user4Id = ObjectId("64a1b2c3d4e5f6789abcdef3");

const account1Id = ObjectId("64a1b2c3d4e5f6789abcde10");
const account2Id = ObjectId("64a1b2c3d4e5f6789abcde11");
const account3Id = ObjectId("64a1b2c3d4e5f6789abcde12");

const portfolio1Id = ObjectId("64a1b2c3d4e5f6789abcde20");
const portfolio2Id = ObjectId("64a1b2c3d4e5f6789abcde21");

// 1. Users Collection - Game players with financial literacy progress
db.users.insertMany([
  {
    _id: user1Id,
    email: "maya.learner@game.com",
    passwordHash: "$2b$10$xyz123...",
    gameUsername: "MayaStudent",
    selectedCharacter: "C1",
    createdAt: new Date("2024-08-01T10:00:00Z"),
    googleId: "google_12345",
    internetIdentityPrincipal: "principal_abc123",
    gameData: {
      level: 15,
      experience: 2850,
      achievements: ["first_deposit", "stock_trader", "interest_earned", "budget_master"],
      preferences: {
        soundEnabled: true,
        musicEnabled: true,
        language: "en"
      }
    },
    lastLoginAt: new Date("2024-09-12T08:30:00Z"),
    isActive: true
  },
  {
    _id: user2Id,
    email: "alex.trader@game.com",
    passwordHash: "$2b$10$abc456...",
    gameUsername: "AlexInvestor",
    selectedCharacter: "C2",
    createdAt: new Date("2024-08-15T14:20:00Z"),
    gameData: {
      level: 22,
      experience: 4200,
      achievements: ["first_deposit", "stock_trader", "portfolio_diversified", "millionaire", "financial_advisor"],
      preferences: {
        soundEnabled: false,
        musicEnabled: true,
        language: "en"
      }
    },
    lastLoginAt: new Date("2024-09-12T09:15:00Z"),
    isActive: true
  },
  {
    _id: user3Id,
    email: "sara.saver@game.com",
    passwordHash: "$2b$10$def789...",
    gameUsername: "SaraTheSaver",
    selectedCharacter: "C3",
    createdAt: new Date("2024-09-01T16:45:00Z"),
    gameData: {
      level: 8,
      experience: 1200,
      achievements: ["first_deposit", "interest_earned"],
      preferences: {
        soundEnabled: true,
        musicEnabled: false,
        language: "en"
      }
    },
    lastLoginAt: new Date("2024-09-11T20:00:00Z"),
    isActive: true
  },
  {
    _id: user4Id,
    email: "ben.beginner@game.com",
    passwordHash: "$2b$10$ghi012...",
    gameUsername: "BeginnerBen",
    selectedCharacter: "C4",
    createdAt: new Date("2024-09-10T12:00:00Z"),
    gameData: {
      level: 3,
      experience: 450,
      achievements: ["tutorial_complete"],
      preferences: {
        soundEnabled: true,
        musicEnabled: true,
        language: "en"
      }
    },
    lastLoginAt: new Date("2024-09-12T07:45:00Z"),
    isActive: true
  }
]);

// 2. Player States - Current game progress and financial status
db.playerStates.insertMany([
  {
    _id: ObjectId(),
    userId: user1Id.toString(),
    position: {
      x: 250,
      y: 180,
      scene: "bank_district"
    },
    financial: {
      rupees: 15750,
      totalWealth: 125000,
      bankBalance: 85000,
      stockPortfolioValue: 39250
    },
    inventory: {
      items: [
        { id: "financial_calculator", type: "tool", quantity: 1, acquiredAt: new Date("2024-08-05T10:00:00Z") },
        { id: "investment_guide", type: "book", quantity: 1, acquiredAt: new Date("2024-08-10T14:30:00Z") },
        { id: "trading_license", type: "certificate", quantity: 1, acquiredAt: new Date("2024-08-20T16:15:00Z") }
      ],
      capacity: 20
    },
    progress: {
      level: 15,
      experience: 2850,
      unlockedBuildings: ["bank", "stock_exchange", "insurance_office"],
      completedTutorials: ["basic_banking", "stock_trading", "fixed_deposits", "portfolio_management"]
    },
    onboarding: {
      hasMetMaya: true,
      hasFollowedMaya: true,
      hasClaimedMoney: true,
      hasCompletedBankOnboarding: true,
      hasReachedStockMarket: true,
      onboardingStep: 'reached_stock_market',
      unlockedBuildings: {
        "bank": true,
        "stock_exchange": true,
        "insurance_office": true,
        "real_estate": false,
        "crypto_exchange": false
      }
    },
    settings: {
      soundEnabled: true,
      musicEnabled: true,
      autoSave: true
    },
    lastUpdated: new Date("2024-09-12T08:30:00Z")
  },
  {
    _id: ObjectId(),
    userId: user2Id.toString(),
    position: {
      x: 400,
      y: 220,
      scene: "stock_exchange"
    },
    financial: {
      rupees: 25000,
      totalWealth: 250000,
      bankBalance: 75000,
      stockPortfolioValue: 175000
    },
    inventory: {
      items: [
        { id: "advanced_calculator", type: "tool", quantity: 1, acquiredAt: new Date("2024-08-18T11:00:00Z") },
        { id: "market_analysis_tool", type: "tool", quantity: 1, acquiredAt: new Date("2024-08-25T09:30:00Z") },
        { id: "diversification_guide", type: "book", quantity: 1, acquiredAt: new Date("2024-09-01T15:20:00Z") }
      ],
      capacity: 25
    },
    progress: {
      level: 22,
      experience: 4200,
      unlockedBuildings: ["bank", "stock_exchange", "insurance_office", "real_estate", "crypto_exchange"],
      completedTutorials: ["basic_banking", "stock_trading", "fixed_deposits", "portfolio_management", "risk_management", "market_analysis"]
    },
    onboarding: {
      hasMetMaya: true,
      hasFollowedMaya: true,
      hasClaimedMoney: true,
      hasCompletedBankOnboarding: true,
      hasReachedStockMarket: true,
      onboardingStep: 'reached_stock_market',
      unlockedBuildings: {
        "bank": true,
        "stock_exchange": true,
        "insurance_office": true,
        "real_estate": true,
        "crypto_exchange": true
      }
    },
    settings: {
      soundEnabled: false,
      musicEnabled: true,
      autoSave: true
    },
    lastUpdated: new Date("2024-09-12T09:15:00Z")
  },
  {
    _id: ObjectId(),
    userId: user3Id.toString(),
    position: {
      x: 180,
      y: 150,
      scene: "bank_district"
    },
    financial: {
      rupees: 8500,
      totalWealth: 45000,
      bankBalance: 36500,
      stockPortfolioValue: 0
    },
    inventory: {
      items: [
        { id: "savings_guide", type: "book", quantity: 1, acquiredAt: new Date("2024-09-02T14:00:00Z") },
        { id: "budget_planner", type: "tool", quantity: 1, acquiredAt: new Date("2024-09-05T10:30:00Z") }
      ],
      capacity: 15
    },
    progress: {
      level: 8,
      experience: 1200,
      unlockedBuildings: ["bank"],
      completedTutorials: ["basic_banking", "savings_account"]
    },
    onboarding: {
      hasMetMaya: true,
      hasFollowedMaya: true,
      hasClaimedMoney: true,
      hasCompletedBankOnboarding: true,
      hasReachedStockMarket: false,
      onboardingStep: 'bank_onboarding_completed',
      unlockedBuildings: {
        "bank": true,
        "stock_exchange": false,
        "insurance_office": false,
        "real_estate": false,
        "crypto_exchange": false
      }
    },
    settings: {
      soundEnabled: true,
      musicEnabled: false,
      autoSave: true
    },
    lastUpdated: new Date("2024-09-11T20:00:00Z")
  },
  {
    _id: ObjectId(),
    userId: user4Id.toString(),
    position: {
      x: 100,
      y: 100,
      scene: "tutorial_area"
    },
    financial: {
      rupees: 2000,
      totalWealth: 2000,
      bankBalance: 0,
      stockPortfolioValue: 0
    },
    inventory: {
      items: [
        { id: "starter_guide", type: "book", quantity: 1, acquiredAt: new Date("2024-09-10T12:05:00Z") }
      ],
      capacity: 10
    },
    progress: {
      level: 3,
      experience: 450,
      unlockedBuildings: [],
      completedTutorials: ["game_basics"]
    },
    onboarding: {
      hasMetMaya: true,
      hasFollowedMaya: true,
      hasClaimedMoney: false,
      hasCompletedBankOnboarding: false,
      hasReachedStockMarket: false,
      onboardingStep: 'at_bank_with_maya',
      unlockedBuildings: {
        "bank": false,
        "stock_exchange": false,
        "insurance_office": false,
        "real_estate": false,
        "crypto_exchange": false
      }
    },
    settings: {
      soundEnabled: true,
      musicEnabled: true,
      autoSave: true
    },
    lastUpdated: new Date("2024-09-12T07:45:00Z")
  }
]);

// 3. Bank Accounts - Financial accounts with transaction history
db.bankAccounts.insertMany([
  {
    _id: account1Id,
    userId: user1Id.toString(),
    accountNumber: "DIN-001534",
    accountHolder: "Maya Student",
    balance: 85000,
    transactions: [
      { id: "txn_001", type: "deposit", amount: 50000, timestamp: new Date("2024-08-05T10:15:00Z"), description: "Initial deposit after Maya tutorial" },
      { id: "txn_002", type: "deposit", amount: 15000, timestamp: new Date("2024-08-10T14:20:00Z"), description: "Game quest reward" },
      { id: "txn_003", type: "withdrawal", amount: 5000, timestamp: new Date("2024-08-15T09:30:00Z"), description: "Stock purchase" },
      { id: "txn_004", type: "deposit", amount: 8500, timestamp: new Date("2024-08-25T16:45:00Z"), description: "Fixed deposit interest" },
      { id: "txn_005", type: "deposit", amount: 25000, timestamp: new Date("2024-09-01T11:00:00Z"), description: "Stock dividend payment" },
      { id: "txn_006", type: "withdrawal", amount: 8500, timestamp: new Date("2024-09-05T13:15:00Z"), description: "New stock investment" }
    ],
    createdAt: new Date("2024-08-05T10:00:00Z"),
    lastUpdated: new Date("2024-09-05T13:15:00Z")
  },
  {
    _id: account2Id,
    userId: user2Id.toString(),
    accountNumber: "DIN-002187",
    accountHolder: "Alex Investor",
    balance: 75000,
    transactions: [
      { id: "txn_007", type: "deposit", amount: 100000, timestamp: new Date("2024-08-16T09:00:00Z"), description: "Large initial investment" },
      { id: "txn_008", type: "withdrawal", amount: 50000, timestamp: new Date("2024-08-20T14:30:00Z"), description: "Diversified stock purchase" },
      { id: "txn_009", type: "deposit", amount: 35000, timestamp: new Date("2024-08-30T10:20:00Z"), description: "Trading profits" },
      { id: "txn_010", type: "withdrawal", amount: 25000, timestamp: new Date("2024-09-03T15:45:00Z"), description: "Real estate investment" },
      { id: "txn_011", type: "deposit", amount: 15000, timestamp: new Date("2024-09-08T12:00:00Z"), description: "Portfolio rebalancing" }
    ],
    createdAt: new Date("2024-08-16T09:00:00Z"),
    lastUpdated: new Date("2024-09-08T12:00:00Z")
  },
  {
    _id: account3Id,
    userId: user3Id.toString(),
    accountNumber: "DIN-003291",
    accountHolder: "Sara The Saver",
    balance: 36500,
    transactions: [
      { id: "txn_012", type: "deposit", amount: 20000, timestamp: new Date("2024-09-02T10:00:00Z"), description: "Initial conservative deposit" },
      { id: "txn_013", type: "deposit", amount: 10000, timestamp: new Date("2024-09-05T14:15:00Z"), description: "Monthly savings goal" },
      { id: "txn_014", type: "deposit", amount: 6500, timestamp: new Date("2024-09-08T09:30:00Z"), description: "Interest earned on savings" }
    ],
    createdAt: new Date("2024-09-02T10:00:00Z"),
    lastUpdated: new Date("2024-09-08T09:30:00Z")
  }
]);

// 4. Fixed Deposits - Long-term savings with interest
db.fixedDeposits.insertMany([
  {
    _id: ObjectId(),
    userId: user1Id.toString(),
    accountId: account1Id.toString(),
    amount: 50000,
    interestRate: 6.5,
    startDate: new Date("2024-08-10T10:00:00Z"),
    duration: 365,
    maturityDate: new Date("2025-08-10T10:00:00Z"),
    matured: false,
    status: 'active',
    createdAt: new Date("2024-08-10T10:00:00Z"),
    updatedAt: new Date("2024-08-10T10:00:00Z")
  },
  {
    _id: ObjectId(),
    userId: user3Id.toString(),
    accountId: account3Id.toString(),
    amount: 15000,
    interestRate: 5.8,
    startDate: new Date("2024-09-05T14:30:00Z"),
    duration: 180,
    maturityDate: new Date("2025-03-04T14:30:00Z"),
    matured: false,
    status: 'active',
    createdAt: new Date("2024-09-05T14:30:00Z"),
    updatedAt: new Date("2024-09-05T14:30:00Z")
  }
]);

// 5. Stock Portfolios - Investment portfolios
db.stockPortfolios.insertMany([
  {
    _id: portfolio1Id,
    userId: user1Id.toString(),
    holdings: [
      {
        symbol: "TECH",
        name: "TechCorp Industries",
        quantity: 50,
        averagePrice: 485.20,
        currentPrice: 512.30,
        totalValue: 25615,
        gainLoss: 1355,
        gainLossPercentage: 5.58,
        purchaseDate: new Date("2024-08-15T10:00:00Z")
      },
      {
        symbol: "BANK",
        name: "National Banking Corp",
        quantity: 25,
        averagePrice: 342.80,
        currentPrice: 356.40,
        totalValue: 8910,
        gainLoss: 340,
        gainLossPercentage: 3.97,
        purchaseDate: new Date("2024-08-25T14:30:00Z")
      },
      {
        symbol: "ENERGY",
        name: "Green Energy Solutions",
        quantity: 15,
        averagePrice: 298.50,
        currentPrice: 315.75,
        totalValue: 4736.25,
        gainLoss: 258.75,
        gainLossPercentage: 5.78,
        purchaseDate: new Date("2024-09-05T11:15:00Z")
      }
    ],
    totalValue: 39261.25,
    totalInvested: 37307.50,
    totalGainLoss: 1953.75,
    createdAt: new Date("2024-08-15T10:00:00Z"),
    lastUpdated: new Date("2024-09-12T09:00:00Z")
  },
  {
    _id: portfolio2Id,
    userId: user2Id.toString(),
    holdings: [
      {
        symbol: "TECH",
        name: "TechCorp Industries",
        quantity: 100,
        averagePrice: 478.90,
        currentPrice: 512.30,
        totalValue: 51230,
        gainLoss: 3340,
        gainLossPercentage: 6.98,
        purchaseDate: new Date("2024-08-20T09:30:00Z")
      },
      {
        symbol: "FINANCE",
        name: "Global Finance Group",
        quantity: 75,
        averagePrice: 425.60,
        currentPrice: 445.80,
        totalValue: 33435,
        gainLoss: 1515,
        gainLossPercentage: 4.74,
        purchaseDate: new Date("2024-08-25T13:45:00Z")
      },
      {
        symbol: "HEALTH",
        name: "MediTech Healthcare",
        quantity: 60,
        averagePrice: 678.90,
        currentPrice: 698.50,
        totalValue: 41910,
        gainLoss: 1176,
        gainLossPercentage: 2.89,
        purchaseDate: new Date("2024-09-01T10:20:00Z")
      },
      {
        symbol: "RETAIL",
        name: "Smart Retail Chain",
        quantity: 125,
        averagePrice: 156.40,
        currentPrice: 162.85,
        totalValue: 20356.25,
        gainLoss: 806.25,
        gainLossPercentage: 4.12,
        purchaseDate: new Date("2024-09-08T15:00:00Z")
      }
    ],
    totalValue: 146931.25,
    totalInvested: 139004.50,
    totalGainLoss: 7926.75,
    createdAt: new Date("2024-08-20T09:30:00Z"),
    lastUpdated: new Date("2024-09-12T09:00:00Z")
  }
]);

// 6. Stock Transactions - Trading history
db.stockTransactions.insertMany([
  { _id: ObjectId(), userId: user1Id.toString(), stockId: "TECH", stockName: "TechCorp Industries", type: "buy", price: 485.20, quantity: 50, total: 24260, timestamp: new Date("2024-08-15T10:00:00Z"), portfolioId: portfolio1Id.toString() },
  { _id: ObjectId(), userId: user1Id.toString(), stockId: "BANK", stockName: "National Banking Corp", type: "buy", price: 342.80, quantity: 25, total: 8570, timestamp: new Date("2024-08-25T14:30:00Z"), portfolioId: portfolio1Id.toString() },
  { _id: ObjectId(), userId: user1Id.toString(), stockId: "ENERGY", stockName: "Green Energy Solutions", type: "buy", price: 298.50, quantity: 15, total: 4477.50, timestamp: new Date("2024-09-05T11:15:00Z"), portfolioId: portfolio1Id.toString() },
  
  { _id: ObjectId(), userId: user2Id.toString(), stockId: "TECH", stockName: "TechCorp Industries", type: "buy", price: 478.90, quantity: 100, total: 47890, timestamp: new Date("2024-08-20T09:30:00Z"), portfolioId: portfolio2Id.toString() },
  { _id: ObjectId(), userId: user2Id.toString(), stockId: "FINANCE", stockName: "Global Finance Group", type: "buy", price: 425.60, quantity: 75, total: 31920, timestamp: new Date("2024-08-25T13:45:00Z"), portfolioId: portfolio2Id.toString() },
  { _id: ObjectId(), userId: user2Id.toString(), stockId: "HEALTH", stockName: "MediTech Healthcare", type: "buy", price: 678.90, quantity: 60, total: 40734, timestamp: new Date("2024-09-01T10:20:00Z"), portfolioId: portfolio2Id.toString() },
  { _id: ObjectId(), userId: user2Id.toString(), stockId: "RETAIL", stockName: "Smart Retail Chain", type: "buy", price: 156.40, quantity: 125, total: 19550, timestamp: new Date("2024-09-08T15:00:00Z"), portfolioId: portfolio2Id.toString() }
]);

// 7. Game Sessions - Player activity tracking
db.gameSessions.insertMany([
  {
    _id: ObjectId(),
    userId: user1Id.toString(),
    sessionId: "session_maya_001",
    startTime: new Date("2024-09-12T08:30:00Z"),
    endTime: new Date("2024-09-12T09:45:00Z"),
    duration: 4500000, // 75 minutes in milliseconds
    activitiesPerformed: [
      { activity: "checked_portfolio", timestamp: new Date("2024-09-12T08:35:00Z"), data: { totalValue: 39261.25 } },
      { activity: "visited_bank", timestamp: new Date("2024-09-12T08:50:00Z"), data: { balance: 85000 } },
      { activity: "completed_financial_quiz", timestamp: new Date("2024-09-12T09:15:00Z"), data: { score: 85, topic: "compound_interest" } },
      { activity: "chat_with_maya", timestamp: new Date("2024-09-12T09:30:00Z"), data: { topic: "investment_strategy" } }
    ],
    rupeesEarnedInSession: 500,
    rupeesSpentInSession: 0
  },
  {
    _id: ObjectId(),
    userId: user2Id.toString(),
    sessionId: "session_alex_002",
    startTime: new Date("2024-09-12T09:15:00Z"),
    endTime: new Date("2024-09-12T10:30:00Z"),
    duration: 4500000, // 75 minutes
    activitiesPerformed: [
      { activity: "analyzed_market", timestamp: new Date("2024-09-12T09:20:00Z"), data: { sectors: ["tech", "finance", "healthcare"] } },
      { activity: "rebalanced_portfolio", timestamp: new Date("2024-09-12T09:45:00Z"), data: { changes: "increased_tech_allocation" } },
      { activity: "participated_trading_competition", timestamp: new Date("2024-09-12T10:10:00Z"), data: { rank: 3, profit: 2500 } }
    ],
    rupeesEarnedInSession: 2500,
    rupeesSpentInSession: 0
  }
]);

// 8. Chat Messages - In-game communication
db.chatMessages.insertMany([
  { _id: ObjectId(), userId: user1Id.toString(), username: "MayaStudent", message: "Just learned about compound interest! Maya is such a great teacher!", timestamp: new Date("2024-09-12T08:40:00Z"), messageType: "chat" },
  { _id: ObjectId(), userId: user2Id.toString(), username: "AlexInvestor", message: "Anyone want to discuss portfolio diversification strategies?", timestamp: new Date("2024-09-12T09:25:00Z"), messageType: "chat" },
  { _id: ObjectId(), userId: user3Id.toString(), username: "SaraTheSaver", message: "My savings account just earned interest! Slow and steady wins the race 🐢", timestamp: new Date("2024-09-11T20:15:00Z"), messageType: "chat" },
  { _id: ObjectId(), userId: user1Id.toString(), username: "MayaStudent", message: "@AlexInvestor I'd love to learn more about diversification!", timestamp: new Date("2024-09-12T09:30:00Z"), messageType: "chat" },
  { _id: ObjectId(), userId: "system", username: "GameSystem", message: "Daily market update: TechCorp Industries up 3.2% today!", timestamp: new Date("2024-09-12T10:00:00Z"), messageType: "system" }
]);

// 9. Multiplayer Sessions - Real-time collaboration
db.multiplayerSessions.insertMany([
  {
    _id: ObjectId(),
    roomCode: "LEARN001",
    hostUserId: user1Id.toString(),
    participants: [
      { userId: user1Id.toString(), username: "MayaStudent", joinedAt: new Date("2024-09-12T08:30:00Z"), lastSeen: new Date("2024-09-12T09:45:00Z"), position: { x: 250, y: 180 }, status: "active" },
      { userId: user2Id.toString(), username: "AlexInvestor", joinedAt: new Date("2024-09-12T08:35:00Z"), lastSeen: new Date("2024-09-12T09:40:00Z"), position: { x: 400, y: 220 }, status: "active" }
    ],
    createdAt: new Date("2024-09-12T08:30:00Z"),
    updatedAt: new Date("2024-09-12T09:45:00Z"),
    status: "ended"
  }
]);

// 10. Achievements - Player accomplishments
db.achievements.insertMany([
  { _id: ObjectId(), userId: user1Id.toString(), achievementId: "first_deposit", title: "First Deposit", description: "Made your first bank deposit", category: "banking", points: 100, unlockedAt: new Date("2024-08-05T10:15:00Z"), criteria: { amount: 50000 } },
  { _id: ObjectId(), userId: user1Id.toString(), achievementId: "stock_trader", title: "Stock Trader", description: "Purchased your first stock", category: "investing", points: 200, unlockedAt: new Date("2024-08-15T10:00:00Z"), criteria: { symbol: "TECH" } },
  { _id: ObjectId(), userId: user1Id.toString(), achievementId: "interest_earned", title: "Interest Earned", description: "Earned your first interest payment", category: "banking", points: 150, unlockedAt: new Date("2024-08-25T16:45:00Z"), criteria: { amount: 8500 } },
  
  { _id: ObjectId(), userId: user2Id.toString(), achievementId: "millionaire", title: "Millionaire", description: "Reached total wealth of 1 million rupees", category: "wealth", points: 1000, unlockedAt: new Date("2024-09-01T12:00:00Z"), criteria: { totalWealth: 1000000 } },
  { _id: ObjectId(), userId: user2Id.toString(), achievementId: "portfolio_diversified", title: "Diversified Portfolio", description: "Hold stocks from 4+ different sectors", category: "investing", points: 500, unlockedAt: new Date("2024-09-08T15:00:00Z"), criteria: { sectors: 4 } },
  
  { _id: ObjectId(), userId: user3Id.toString(), achievementId: "consistent_saver", title: "Consistent Saver", description: "Make deposits for 7 consecutive days", category: "banking", points: 300, unlockedAt: new Date("2024-09-08T09:30:00Z"), criteria: { days: 7 } }
]);

// 11. Leaderboards - Competition rankings
db.leaderboards.insertMany([
  {
    _id: ObjectId(),
    category: "wealth",
    period: "monthly",
    entries: [
      { userId: user2Id.toString(), username: "AlexInvestor", score: 250000, rank: 1, achievedAt: new Date("2024-09-12T09:00:00Z") },
      { userId: user1Id.toString(), username: "MayaStudent", score: 125000, rank: 2, achievedAt: new Date("2024-09-12T08:30:00Z") },
      { userId: user3Id.toString(), username: "SaraTheSaver", score: 45000, rank: 3, achievedAt: new Date("2024-09-11T20:00:00Z") },
      { userId: user4Id.toString(), username: "BeginnerBen", score: 2000, rank: 4, achievedAt: new Date("2024-09-12T07:45:00Z") }
    ],
    lastUpdated: new Date("2024-09-12T10:00:00Z")
  },
  {
    _id: ObjectId(),
    category: "trading_profit",
    period: "weekly",
    entries: [
      { userId: user2Id.toString(), username: "AlexInvestor", score: 7926.75, rank: 1, achievedAt: new Date("2024-09-12T09:00:00Z") },
      { userId: user1Id.toString(), username: "MayaStudent", score: 1953.75, rank: 2, achievedAt: new Date("2024-09-12T08:30:00Z") }
    ],
    lastUpdated: new Date("2024-09-12T10:00:00Z")
  }
]);

// 12. Active Players - Current online status
db.activePlayers.insertMany([
  { _id: ObjectId(), userId: user1Id.toString(), username: "MayaStudent", email: "maya.learner@game.com", position: { x: 250, y: 180 }, animation: "idle", skin: "C1", updatedAt: new Date("2024-09-12T10:00:00Z") },
  { _id: ObjectId(), userId: user2Id.toString(), username: "AlexInvestor", email: "alex.trader@game.com", position: { x: 400, y: 220 }, animation: "trading", skin: "C2", updatedAt: new Date("2024-09-12T10:00:00Z") }
]);

// 13. Announcements - System messages
db.announcements.insertMany([
  { _id: ObjectId(), message: "New stock market tutorial available! Learn about options trading with Maya.", createdAt: new Date("2024-09-12T09:00:00Z"), createdBy: "admin@game.com" },
  { _id: ObjectId(), message: "Weekly trading competition starts Monday! Prizes up to 10,000 rupees!", createdAt: new Date("2024-09-11T18:00:00Z"), createdBy: "admin@game.com" }
]);

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ gameUsername: 1 }, { unique: true });
db.users.createIndex({ lastLoginAt: -1 });

db.playerStates.createIndex({ userId: 1 }, { unique: true });
db.playerStates.createIndex({ "financial.totalWealth": -1 });

db.bankAccounts.createIndex({ userId: 1 });
db.bankAccounts.createIndex({ accountNumber: 1 }, { unique: true });

db.stockPortfolios.createIndex({ userId: 1 });
db.stockTransactions.createIndex({ userId: 1 });
db.stockTransactions.createIndex({ timestamp: -1 });

db.gameSessions.createIndex({ userId: 1 });
db.gameSessions.createIndex({ startTime: -1 });

db.chatMessages.createIndex({ timestamp: -1 });
db.chatMessages.createIndex({ userId: 1 });

db.achievements.createIndex({ userId: 1 });
db.achievements.createIndex({ unlockedAt: -1 });

db.leaderboards.createIndex({ category: 1, period: 1 });

print("Game database initialized with comprehensive financial literacy data!");
print("Collections created:");
print("- " + db.users.countDocuments() + " users");
print("- " + db.playerStates.countDocuments() + " player states");
print("- " + db.bankAccounts.countDocuments() + " bank accounts");
print("- " + db.fixedDeposits.countDocuments() + " fixed deposits");
print("- " + db.stockPortfolios.countDocuments() + " stock portfolios");
print("- " + db.stockTransactions.countDocuments() + " stock transactions");
print("- " + db.gameSessions.countDocuments() + " game sessions");
print("- " + db.chatMessages.countDocuments() + " chat messages");
print("- " + db.achievements.countDocuments() + " achievements");
print("- " + db.leaderboards.countDocuments() + " leaderboard entries");
print("- " + db.activePlayers.countDocuments() + " active players");
print("- " + db.announcements.countDocuments() + " announcements");
