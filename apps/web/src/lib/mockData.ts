import { Asset, AssetEvent } from '@coldDrawer/shared'

// Mock data for demonstration
export const mockAssets: Asset[] = [
  {
    tokenId: "1",
    chainId: "80002",
    category: "vehicle",
    title: "2019 Audi A4 Sedan",
    identifiers: {
      vin: "WAUKMAF49KA123456",
      plate: "ABC123"
    },
    attributes: {
      make: "Audi",
      model: "A4",
      year: 2019,
      color: "Black"
    },
    status: "owned",
    ownerAddress: "0x742d35Cc6635C0532925a3b8D598C1F2db5C23dE",
    note: "Well maintained, single owner, full service history",
    frozen: false,
    createdAt: 1703001600,
    updatedAt: 1703001600
  },
  {
    tokenId: "2",
    chainId: "80002", 
    category: "equipment",
    title: "MacBook Pro 16\" 2023",
    identifiers: {
      serial: "C02DJ0AHMD6T"
    },
    attributes: {
      make: "Apple",
      model: "MacBook Pro",
      year: 2023,
      color: "Space Gray"
    },
    status: "for_sale",
    ownerAddress: "0x742d35Cc6635C0532925a3b8D598C1F2db5C23dE",
    note: "Excellent condition, includes original box and charger",
    frozen: false,
    createdAt: 1703088000,
    updatedAt: 1703174400
  },
  {
    tokenId: "3",
    chainId: "80002",
    category: "property", 
    title: "Downtown Condo Unit 401",
    identifiers: {
      address: "123 Main St, Unit 401, Downtown"
    },
    attributes: {
      type: "Condominium",
      area: 850,
      year: 2018,
      rooms: 2
    },
    status: "owned",
    ownerAddress: "0x742d35Cc6635C0532925a3b8D598C1F2db5C23dE",
    note: "Modern condo with city views, recently renovated",
    frozen: false,
    createdAt: 1703174400,
    updatedAt: 1703174400
  },
  {
    tokenId: "4",
    chainId: "80002",
    category: "vehicle",
    title: "2021 Tesla Model 3",
    identifiers: {
      vin: "5YJ3E1EA1MF123789",
      plate: "TESLA01"
    },
    attributes: {
      make: "Tesla", 
      model: "Model 3",
      year: 2021,
      color: "Pearl White"
    },
    status: "escrow",
    ownerAddress: "0x742d35Cc6635C0532925a3b8D598C1F2db5C23dE",
    note: "Low mileage, autopilot enabled",
    frozen: false,
    createdAt: 1703260800,
    updatedAt: 1703347200
  },
  {
    tokenId: "5",
    chainId: "80002",
    category: "vehicle",
    title: "2020 BMW X5",
    identifiers: {
      vin: "5UXCR6C06L9B12345",
      plate: "BMW-X5"
    },
    attributes: {
      make: "BMW",
      model: "X5",
      year: 2020,
      color: "Alpine White"
    },
    status: "owned",
    ownerAddress: "0x742d35Cc6635C0532925a3b8D598C1F2db5C23dE",
    note: "Premium package, panoramic sunroof",
    frozen: false,
    createdAt: 1703347200,
    updatedAt: 1703347200
  },
  {
    tokenId: "6",
    chainId: "80002",
    category: "property",
    title: "Beach House Malibu",
    identifiers: {
      address: "21500 Pacific Coast Hwy, Malibu, CA"
    },
    attributes: {
      type: "Single Family Home",
      area: 2500,
      year: 2015,
      rooms: 4
    },
    status: "owned",
    ownerAddress: "0x742d35Cc6635C0532925a3b8D598C1F2db5C23dE",
    note: "Ocean view, private beach access, solar panels",
    frozen: false,
    createdAt: 1703433600,
    updatedAt: 1703433600
  },
  {
    tokenId: "7",
    chainId: "80002",
    category: "equipment",
    title: "DJI Mavic 3 Pro Drone",
    identifiers: {
      serial: "DJ001A23B456789"
    },
    attributes: {
      make: "DJI",
      model: "Mavic 3 Pro",
      year: 2023,
      condition: "Like New"
    },
    status: "owned",
    ownerAddress: "0x742d35Cc6635C0532925a3b8D598C1F2db5C23dE",
    note: "Professional cinematography drone with all accessories",
    frozen: false,
    createdAt: 1703520000,
    updatedAt: 1703520000
  },
  {
    tokenId: "8",
    chainId: "80002",
    category: "equipment",
    title: "Canon EOS R5 Camera Kit",
    identifiers: {
      serial: "CR5-789123456"
    },
    attributes: {
      make: "Canon",
      model: "EOS R5",
      year: 2022,
      megapixels: 45
    },
    status: "for_sale",
    ownerAddress: "0x742d35Cc6635C0532925a3b8D598C1F2db5C23dE",
    note: "Complete kit with 24-70mm lens, barely used",
    frozen: false,
    createdAt: 1703606400,
    updatedAt: 1703606400
  },
  {
    tokenId: "9",
    chainId: "80002",
    category: "other",
    title: "Rare Vintage Watch Collection",
    identifiers: {
      collection: "Rolex-Omega-Cartier-Set"
    },
    attributes: {
      count: 3,
      era: "1980s-1990s",
      condition: "Excellent",
      authenticated: "true"
    },
    status: "owned",
    ownerAddress: "0x742d35Cc6635C0532925a3b8D598C1F2db5C23dE",
    note: "Authenticated luxury watch collection with certificates",
    frozen: false,
    createdAt: 1703692800,
    updatedAt: 1703692800
  }
]

export const mockEvents: AssetEvent[] = [
  {
    type: "mint",
    tokenId: "1",
    txid: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    blockNumber: 45123456,
    timestamp: 1703001600,
    minter: "0x742d35Cc6635C0532925a3b8D598C1F2db5C23dE",
    title: "2019 Audi A4 Sedan",
    category: "vehicle"
  },
  {
    type: "mint",
    tokenId: "2", 
    txid: "0x2345678901bcdef12345678901bcdef12345678901bcdef12345678901bcdef1",
    blockNumber: 45123789,
    timestamp: 1703088000,
    minter: "0x742d35Cc6635C0532925a3b8D598C1F2db5C23dE",
    title: "MacBook Pro 16\" 2023",
    category: "equipment"
  },
  {
    type: "sale_open",
    tokenId: "2",
    txid: "0x3456789012cdef123456789012cdef123456789012cdef123456789012cdef12",
    blockNumber: 45124000,
    timestamp: 1703174400,
    seller: "0x742d35Cc6635C0532925a3b8D598C1F2db5C23dE",
    buyer: "0x8ba1f109551bD432803012645Hac136c60143",
    hashH: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    priceBTC: "120000000",
    expiryTimestamp: 1703260800
  },
  {
    type: "mint",
    tokenId: "3",
    txid: "0x4567890123def1234567890123def1234567890123def1234567890123def123",
    blockNumber: 45124100,
    timestamp: 1703174400,
    minter: "0x742d35Cc6635C0532925a3b8D598C1F2db5C23dE", 
    title: "Downtown Condo Unit 401",
    category: "property"
  },
  {
    type: "mint", 
    tokenId: "4",
    txid: "0x567890134ef1234567890134ef1234567890134ef1234567890134ef1234567",
    blockNumber: 45124500,
    timestamp: 1703260800,
    minter: "0x742d35Cc6635C0532925a3b8D598C1F2db5C23dE",
    title: "2021 Tesla Model 3", 
    category: "vehicle"
  },
  {
    type: "sale_open",
    tokenId: "4",
    txid: "0x67890145f1234567890145f1234567890145f1234567890145f1234567890145",
    blockNumber: 45125000,
    timestamp: 1703347200,
    seller: "0x742d35Cc6635C0532925a3b8D598C1F2db5C23dE",
    buyer: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE",
    hashH: "0xdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc",
    priceBTC: "180000000",
    expiryTimestamp: 1703433600
  }
]

// Initialize mock data in stores
export const initializeMockData = () => {
  // This would be called when the app starts if we want to show demo data
  const { useAppStore } = require('@/stores/appStore')
  const { setAssets, setEvents, setStats } = useAppStore.getState()
  
  setAssets(mockAssets)
  setEvents(mockEvents)
  setStats({
    totalAssets: mockAssets.length,
    totalEvents: mockEvents.length,
    lastBlockProcessed: 45125000,
    assetsByStatus: {
      owned: mockAssets.filter(a => a.status === 'owned').length,
      for_sale: mockAssets.filter(a => a.status === 'for_sale').length,
      escrow: mockAssets.filter(a => a.status === 'escrow').length,
      settled: mockAssets.filter(a => a.status === 'settled').length,
      refunded: mockAssets.filter(a => a.status === 'refunded').length,
    },
    assetsByCategory: {
      vehicle: mockAssets.filter(a => a.category === 'vehicle').length,
      property: mockAssets.filter(a => a.category === 'property').length,
      equipment: mockAssets.filter(a => a.category === 'equipment').length,
      other: mockAssets.filter(a => a.category === 'other').length,
    }
  })
}