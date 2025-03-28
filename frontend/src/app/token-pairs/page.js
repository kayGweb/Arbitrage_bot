// src/app/token-pairs/page.js
'use client'

import { useState, useEffect } from 'react'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Plus, PlusCircle, Activity } from 'lucide-react'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { 
  fetchTokenPairs,
  fetchBlockchains,
  fetchTokens,
  addTokenPair,
  updateTokenPair,
  toggleTokenPairStatus,
  startMonitoring,
  stopMonitoring
} from '@/lib/api'
import { useForm } from 'react-hook-form'
import PriceChart from '@/components/PriceChart'

export default function TokenPairsPage() {
  const [tokenPairs, setTokenPairs] = useState([])
  const [blockchains, setBlockchains] = useState([])
  const [tokens, setTokens] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPair, setEditingPair] = useState(null)
  const [selectedBlockchain, setSelectedBlockchain] = useState(null)
  const [filteredTokens, setFilteredTokens] = useState([])
  const [selectedPair, setSelectedPair] = useState(null)
  const [isMonitoring, setIsMonitoring] = useState(true)
  
  const form = useForm({
    defaultValues: {
      blockchain_id: '',
      token0_id: '',
      token1_id: '',
      min_price_difference: '0.5'
    }
  })

  // Load token pairs, blockchains, and tokens
  useEffect(() => {
    const loadData = async () => {
      try {
        const [pairsData, blockchainData, tokenData] = await Promise.all([
          fetchTokenPairs(),
          fetchBlockchains(),
          fetchTokens()
        ])
        
        setTokenPairs(pairsData)
        setBlockchains(blockchainData)
        setTokens(tokenData)
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])

  // Filter tokens by selected blockchain
  useEffect(() => {
    if (selectedBlockchain) {
      setFilteredTokens(tokens.filter(token => 
        token.blockchain_id.toString() === selectedBlockchain &&
        token.is_active
      ))
    } else {
      setFilteredTokens([])
    }
  }, [selectedBlockchain, tokens])

  // Handle blockchain change
  const handleBlockchainChange = (value) => {
    setSelectedBlockchain(value)
    form.setValue('token0_id', '')
    form.setValue('token1_id', '')
  }

  // Handle form submission
  const onSubmit = async (data) => {
    try {
      if (editingPair) {
        // Update existing pair
        const updated = await updateTokenPair(editingPair.id, data)
        setTokenPairs(tokenPairs.map(pair => 
          pair.id === editingPair.id ? updated : pair
        ))
      } else {
        // Add new pair
        const newPair = await addTokenPair(data)
        setTokenPairs([...tokenPairs, newPair])
      }
      
      // Close dialog and reset form
      setDialogOpen(false)
      setEditingPair(null)
      form.reset()
    } catch (error) {
      console.error('Error saving token pair:', error)
    }
  }

  // Edit token pair
  const handleEdit = (pair) => {
    setEditingPair(pair)
    setSelectedBlockchain(pair.blockchain_id.toString())
    form.reset({
      blockchain_id: pair.blockchain_id.toString(),
      token0_id: pair.token0_id.toString(),
      token1_id: pair.token1_id.toString(),
      min_price_difference: pair.min_price_difference.toString()
    })
    setDialogOpen(true)
  }

  // Toggle token pair status
  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await toggleTokenPairStatus(id, !currentStatus)
      setTokenPairs(tokenPairs.map(pair => 
        pair.id === id ? { ...pair, is_active: !currentStatus } : pair
      ))
    } catch (error) {
      console.error('Error toggling token pair status:', error)
    }
  }

  // Get blockchain name
  const getBlockchainName = (blockchainId) => {
    const blockchain = blockchains.find(b => b.id === blockchainId)
    return blockchain ? blockchain.name : 'Unknown'
  }

  // Get token symbol
  const getTokenSymbol = (tokenId) => {
    const token = tokens.find(t => t.id === tokenId)
    return token ? token.symbol : 'Unknown'
  }

  // Toggle monitoring
  const toggleMonitoring = async () => {
    try {
      if (isMonitoring) {
        await stopMonitoring()
      } else {
        await startMonitoring()
      }
      setIsMonitoring(!isMonitoring)
    } catch (error) {
      console.error('Error toggling monitoring:', error)
    }
  }

  // View price chart
  const handleViewChart = (pair) => {
    setSelectedPair(pair)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Token Pairs</h1>
        <div className="flex space-x-2">
          <Button 
            variant={isMonitoring ? "destructive" : "default"}
            onClick={toggleMonitoring}
          >
            <Activity className="mr-2 h-4 w-4" />
            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </Button>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingPair(null)
                setSelectedBlockchain(null)
                form.reset({
                  blockchain_id: '',
                  token0_id: '',
                  token1_id: '',
                  min_price_difference: '0.5'
                })
              }}>
                <Plus className="mr-2 h-4 w-4" /> Add Token Pair
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingPair ? 'Edit Token Pair' : 'Add New Token Pair'}
                </DialogTitle>
                <DialogDescription>
                  Configure a token pair for arbitrage monitoring.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="blockchain_id"
                    rules={{ required: 'Blockchain is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Blockchain</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value)
                            handleBlockchainChange(value)
                          }} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select blockchain" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="token0_id"
                    rules={{ required: 'Token 0 is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Token 0 (Base)</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          disabled={!selectedBlockchain}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select token" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredTokens.map(token => (
                              <SelectItem 
                                key={token.id} 
                                value={token.id.toString()}
                              >
                                {token.symbol} - {token.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Usually a stablecoin or wrapped native token (e.g., WETH)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="token1_id"
                    rules={{ 
                      required: 'Token 1 is required',
                      validate: value => value !== form.getValues('token0_id') || 'Cannot use the same token'
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Token 1 (Quote)</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          disabled={!selectedBlockchain}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select token" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredTokens.map(token => (
                              <SelectItem 
                                key={token.id} 
                                value={token.id.toString()}
                              >
                                {token.symbol} - {token.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="min_price_difference"
                    rules={{ 
                      required: 'Minimum price difference is required',
                      pattern: {
                        value: /^\d*\.?\d+$/,
                        message: 'Must be a number'
                      }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Price Difference (%)</FormLabel>
                        <FormControl>
                          <Input placeholder="0.5" {...field} />
                        </FormControl>
                        <FormDescription>
                          Minimum price difference (in %) required to consider an arbitrage opportunity
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button type="submit">
                      {editingPair ? 'Update' : 'Add'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Configured Token Pairs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pair</TableHead>
                <TableHead>Blockchain</TableHead>
                <TableHead>Min Price Difference</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokenPairs.map((pair) => (
                <TableRow key={pair.id}>
                  <TableCell className="font-medium">
                    {getTokenSymbol(pair.token0_id)}/{getTokenSymbol(pair.token1_id)}
                  </TableCell>
                  <TableCell>{getBlockchainName(pair.blockchain_id)}</TableCell>
                  <TableCell>{pair.min_price_difference}%</TableCell>
                  <TableCell>
                    <Badge variant={pair.is_active ? "success" : "secondary"}>
                      {pair.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleViewChart(pair)}
                      >
                        Chart
                      </Button>
                      <Switch 
                        checked={pair.is_active} 
                        onCheckedChange={() => handleToggleStatus(pair.id, pair.is_active)}
                      />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEdit(pair)}
                      >
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              
              {tokenPairs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                    No token pairs configured yet. Add one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {selectedPair && (
        <Card>
          <CardHeader>
            <CardTitle>
              Price Chart: {getTokenSymbol(selectedPair.token0_id)}/{getTokenSymbol(selectedPair.token1_id)} on {getBlockchainName(selectedPair.blockchain_id)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <PriceChart pairId={selectedPair.id} />
            </div>
          </CardContent>
        </Card>
      )}
      
      {(blockchains.length === 0 || tokens.length === 0) && (
        <div className="bg-amber-100 border border-amber-300 rounded-md p-4">
          <p className="text-amber-800">
            You need to add at least one blockchain and two tokens before you can add token pairs.
          </p>
          {blockchains.length === 0 && (
            <Button 
              variant="link" 
              onClick={() => window.location.href = '/blockchains'}
              className="text-amber-800 p-0 mr-4"
            >
              <PlusCircle className="mr-1 h-4 w-4" />
              Add Blockchain
            </Button>
          )}
          {tokens.length < 2 && (
            <Button 
              variant="link" 
              onClick={() => window.location.href = '/tokens'}
              className="text-amber-800 p-0"
            >
              <PlusCircle className="mr-1 h-4 w-4" />
              Add Tokens
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
