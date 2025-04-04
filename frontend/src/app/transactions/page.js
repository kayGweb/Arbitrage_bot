'use client'

import { useState, useEffect, useRef } from 'react'
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle, 
    CardDescription 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { 
  ExternalLink, 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Download, 
  Filter,
  RefreshCw
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { fetchTransactions, fetchBlockchains, fetchTokenPairs, fetchDexes } from '@/lib/api'
import { formatCurrency, truncateAddress } from '@/lib/utils'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([])
  const [filteredTransactions, setFilteredTransactions] = useState([])
  const [blockchains, setBlockchains] = useState([])
  const [tokenPairs, setTokenPairs] = useState([])
  const [dexes, setDexes] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortColumn, setSortColumn] = useState('created_at')
  const [sortDirection, setSortDirection] = useState('desc')
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    blockchain_id: 'all',
    token_pair_id: 'all',
    status: 'all'
  })
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 10,
    total: 0
  })
  
  const searchInputRef = useRef(null)

  // Load transactions and related data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [txData, blockchainData, tokenPairData, dexData] = await Promise.all([
          fetchTransactions(100, 0), // Get latest 100 transactions
          fetchBlockchains(),
          fetchTokenPairs(),
          fetchDexes()
        ])
        
        setTransactions(txData)
        setFilteredTransactions(txData)
        setBlockchains(blockchainData)
        setTokenPairs(tokenPairData)
        setDexes(dexData)
        setPagination(prev => ({ ...prev, total: txData.length }))
      } catch (error) {
        console.error('Error loading transaction data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])

  // Apply sorting, filtering and pagination
  useEffect(() => {
    let result = [...transactions]
    
    // Apply filters
    if (filters.blockchain_id !== 'all') {
      result = result.filter(tx => tx.blockchain_id.toString() === filters.blockchain_id)
    }
    
    if (filters.token_pair_id !== 'all') {
      result = result.filter(tx => tx.token_pair_id.toString() === filters.token_pair_id)
    }
    
    if (filters.status !== 'all') {
      result = result.filter(tx => tx.status === filters.status)
    }
    
    // Apply search
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      result = result.filter(tx => 
        (tx.tx_hash && tx.tx_hash.toLowerCase().includes(search)) ||
        (tx.blockchain_name && tx.blockchain_name.toLowerCase().includes(search)) ||
        (tx.token0_symbol && tx.token0_symbol.toLowerCase().includes(search)) ||
        (tx.token1_symbol && tx.token1_symbol.toLowerCase().includes(search)) ||
        (tx.buy_dex_name && tx.buy_dex_name.toLowerCase().includes(search)) ||
        (tx.sell_dex_name && tx.sell_dex_name.toLowerCase().includes(search))
      )
    }
    
    // Apply sorting
    result.sort((a, b) => {
      const aValue = a[sortColumn]
      const bValue = b[sortColumn]
      
      // Handle numeric values
      if (sortColumn === 'profit' || sortColumn === 'amount_in' || sortColumn === 'amount_out') {
        return sortDirection === 'asc' 
          ? parseFloat(aValue) - parseFloat(bValue) 
          : parseFloat(bValue) - parseFloat(aValue)
      }
      
      // Handle dates
      if (sortColumn === 'created_at') {
        return sortDirection === 'asc' 
          ? new Date(aValue) - new Date(bValue) 
          : new Date(bValue) - new Date(aValue)
      }
      
      // Handle strings
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
    
    // Update total for pagination
    setPagination(prev => ({ ...prev, total: result.length }))
    
    // Apply pagination
    const startIndex = (pagination.page - 1) * pagination.perPage
    const paginatedResult = result.slice(startIndex, startIndex + pagination.perPage)
    
    setFilteredTransactions(paginatedResult)
  }, [transactions, filters, searchTerm, sortColumn, sortDirection, pagination.page, pagination.perPage])

  // Handle column sorting
  const handleSort = (column) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Set new column and default to ascending
      setSortColumn(column)
      setSortDirection('asc')
    }
  }
  
  // Get sort icon for column
  const getSortIcon = (column) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />
    }
    
    return sortDirection === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />
  }
  
  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page
  }
  
  // Handle search input
  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page
  }
  
  // Handle page change
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }
  
  // Get blockchain name
  const getBlockchainName = (blockchainId) => {
    const blockchain = blockchains.find(b => b.id === blockchainId)
    return blockchain ? blockchain.name : 'Unknown'
  }
  
  // Get token pair name
  const getTokenPairName = (tokenPairId) => {
    const pair = tokenPairs.find(p => p.id === tokenPairId)
    return pair ? `${pair.token0_symbol}/${pair.token1_symbol}` : 'Unknown'
  }
  
  // Get DEX name
  const getDexName = (dexId) => {
    const dex = dexes.find(d => d.id === dexId)
    return dex ? dex.name : 'Unknown'
  }

  // Get blockchain explorer URL
  const getExplorerUrl = (blockchain, txHash) => {
    if (!txHash) return null
    
    const chain = blockchains.find(b => b.id === blockchain.blockchain_id)
    if (!chain || !chain.explorer_url) return null
    
    return `${chain.explorer_url}/tx/${txHash}`
  }
  
  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date)
  }
  
  // Export transactions to CSV
  const exportToCSV = () => {
    // Get all transactions (not just filtered/paginated)
    let dataToExport = transactions
    
    // Apply filters if any
    if (filters.blockchain_id !== 'all') {
      dataToExport = dataToExport.filter(tx => tx.blockchain_id.toString() === filters.blockchain_id)
    }
    
    if (filters.token_pair_id !== 'all') {
      dataToExport = dataToExport.filter(tx => tx.token_pair_id.toString() === filters.token_pair_id)
    }
    
    if (filters.status !== 'all') {
      dataToExport = dataToExport.filter(tx => tx.status === filters.status)
    }
    
    // Apply search
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      dataToExport = dataToExport.filter(tx => 
        (tx.tx_hash && tx.tx_hash.toLowerCase().includes(search)) ||
        (tx.blockchain_name && tx.blockchain_name.toLowerCase().includes(search)) ||
        (tx.token0_symbol && tx.token0_symbol.toLowerCase().includes(search)) ||
        (tx.token1_symbol && tx.token1_symbol.toLowerCase().includes(search)) ||
        (tx.buy_dex_name && tx.buy_dex_name.toLowerCase().includes(search)) ||
        (tx.sell_dex_name && tx.sell_dex_name.toLowerCase().includes(search))
      )
    }
    
    // Create CSV content
    const headers = [
      'Transaction ID',
      'Blockchain',
      'Token Pair',
      'Buy DEX',
      'Sell DEX',
      'Amount In',
      'Amount Out',
      'Profit',
      'Status',
      'Date',
      'Transaction Hash'
    ].join(',')
    
    const rows = dataToExport.map(tx => [
      tx.id,
      tx.blockchain_name || getBlockchainName(tx.blockchain_id),
      tx.token0_symbol && tx.token1_symbol 
        ? `${tx.token0_symbol}/${tx.token1_symbol}` 
        : getTokenPairName(tx.token_pair_id),
      tx.buy_dex_name || getDexName(tx.buy_dex_id),
      tx.sell_dex_name || getDexName(tx.sell_dex_id),
      tx.amount_in,
      tx.amount_out,
      tx.profit,
      tx.status,
      tx.created_at,
      tx.tx_hash || 'N/A'
    ].join(','))
    
    const csvContent = [headers, ...rows].join('\n')
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `arbitrage_transactions_${new Date().toISOString()}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  // Refresh transactions data
  const refreshData = async () => {
    try {
      setLoading(true)
      const txData = await fetchTransactions(100, 0)
      setTransactions(txData)
      setPagination(prev => ({ ...prev, total: txData.length, page: 1 }))
    } catch (error) {
      console.error('Error refreshing transaction data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate pagination information
  const totalPages = Math.ceil(pagination.total / pagination.perPage)
  const startItem = ((pagination.page - 1) * pagination.perPage) + 1
  const endItem = Math.min(startItem + pagination.perPage - 1, pagination.total)

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Arbitrage Transactions</h1>
          <p className="text-gray-500">View and analyze all arbitrage trades executed by the bot</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshData} disabled={loading} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={exportToCSV} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Transaction Filters</CardTitle>
          <CardDescription>
            Filter and search through arbitrage transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search transactions..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={handleSearch}
                  ref={searchInputRef}
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Blockchain</label>
              <Select 
                value={filters.blockchain_id} 
                onValueChange={value => handleFilterChange('blockchain_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Blockchains" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Blockchains</SelectItem>
                  {blockchains.map(blockchain => (
                    <SelectItem 
                      key={blockchain.id} 
                      value={blockchain.id.toString()}
                    >
                      {blockchain.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Token Pair</label>
              <Select 
                value={filters.token_pair_id} 
                onValueChange={value => handleFilterChange('token_pair_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Token Pairs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Token Pairs</SelectItem>
                  {tokenPairs.map(pair => (
                    <SelectItem 
                      key={pair.id} 
                      value={pair.id.toString()}
                    >
                      {pair.token0_symbol}/{pair.token1_symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select 
                value={filters.status} 
                onValueChange={value => handleFilterChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-between items-center my-2">
            <div className="text-sm text-gray-500">
              {loading ? (
                <span>Loading transactions...</span>
              ) : (
                <span>Showing {startItem} to {endItem} of {pagination.total} transactions</span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Rows per page:</label>
              <Select 
                value={pagination.perPage.toString()} 
                onValueChange={value => setPagination(prev => ({ ...prev, perPage: parseInt(value), page: 1 }))}
              >
                <SelectTrigger className="w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-0 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('id')}
                >
                  <div className="flex items-center">
                    ID
                    {getSortIcon('id')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('blockchain_id')}
                >
                  <div className="flex items-center">
                    Blockchain
                    {getSortIcon('blockchain_id')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('token_pair_id')}
                >
                  <div className="flex items-center">
                    Token Pair
                    {getSortIcon('token_pair_id')}
                  </div>
                </TableHead>
                <TableHead>Route</TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('amount_in')}
                >
                  <div className="flex items-center">
                    Amount In
                    {getSortIcon('amount_in')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('amount_out')}
                >
                  <div className="flex items-center">
                    Amount Out
                    {getSortIcon('amount_out')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('profit')}
                >
                  <div className="flex items-center">
                    Profit
                    {getSortIcon('profit')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center">
                    Status
                    {getSortIcon('status')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center">
                    Date
                    {getSortIcon('created_at')}
                  </div>
                </TableHead>
                <TableHead>Hash</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-4">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                      Loading transaction data...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-4 text-gray-500">
                    No transactions found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((tx) => {
                  const profit = parseFloat(tx.profit)
                  const isProfitable = profit > 0
                  
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">{tx.id}</TableCell>
                      <TableCell>{tx.blockchain_name || getBlockchainName(tx.blockchain_id)}</TableCell>
                      <TableCell>
                        {tx.token0_symbol && tx.token1_symbol 
                          ? `${tx.token0_symbol}/${tx.token1_symbol}`
                          : getTokenPairName(tx.token_pair_id)
                        }
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {tx.buy_dex_name || getDexName(tx.buy_dex_id)} → {tx.sell_dex_name || getDexName(tx.sell_dex_id)}
                      </TableCell>
                      <TableCell className="font-mono text-right">
                        {formatCurrency(tx.amount_in)}
                      </TableCell>
                      <TableCell className="font-mono text-right">
                        {formatCurrency(tx.amount_out)}
                      </TableCell>
                      <TableCell 
                        className={`font-mono text-right ${
                          isProfitable ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {isProfitable ? '+' : ''}{formatCurrency(tx.profit)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            tx.status === 'completed' ? 'success' :
                            tx.status === 'pending' ? 'warning' : 'destructive'
                          }
                        >
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(tx.created_at)}
                      </TableCell>
                      <TableCell>
                        {tx.tx_hash ? (
                          <div className="flex items-center">
                          <span className="font-mono text-xs truncate max-w-[100px]">
                            {truncateAddress(tx.tx_hash, 6, 4)}
                          </span>
                          <a 
                            href={getExplorerUrl(tx, tx.tx_hash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-blue-500 hover:text-blue-700"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
                disabled={pagination.page === 1}
                className={pagination.page === 1 ? "pointer-events-none opacity-50" : ""} 
              />
            </PaginationItem>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                // Show first page, last page, current page, and pages around current
                return page === 1 || 
                       page === totalPages || 
                       (page >= pagination.page - 1 && page <= pagination.page + 1)
              })
              .map((page, index, array) => {
                // Add ellipsis where needed
                const prevPage = array[index - 1]
                const needsEllipsisBefore = prevPage && page - prevPage > 1
                
                return (
                  <React.Fragment key={page}>
                    {needsEllipsisBefore && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => handlePageChange(page)}
                        isActive={page === pagination.page}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  </React.Fragment>
                )
              })
            }
            
            <PaginationItem>
              <PaginationNext 
                onClick={() => handlePageChange(Math.min(totalPages, pagination.page + 1))}
                disabled={pagination.page === totalPages}
                className={pagination.page === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}