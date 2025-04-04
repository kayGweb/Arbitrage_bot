'use client'

import { useState, useEffect } from 'react'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
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
import { 
  AlertCircle, 
  Plus, 
  Info, 
  Check, 
  X, 
  AlertTriangle 
} from 'lucide-react'
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  fetchBlockchains, 
  fetchDexes,
  addBlockchain, 
  updateBlockchain, 
  toggleBlockchainStatus 
} from '@/lib/api'
import { useForm } from 'react-hook-form'

export default function BlockchainsPage() {
  const [blockchains, setBlockchains] = useState([])
  const [dexesByChain, setDexesByChain] = useState({})
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBlockchain, setEditingBlockchain] = useState(null)
  
  const form = useForm({
    defaultValues: {
      name: '',
      chain_id: '',
      rpc_url: '',
      ws_url: '',
      explorer_url: '',
      native_token: '',
      gas_multiplier: '1.1'
    }
  })

  // Load blockchains and DEX data
  useEffect(() => {
    const loadData = async () => {
      try {
        const chainsData = await fetchBlockchains()
        setBlockchains(chainsData)
        
        // Fetch DEXes for each blockchain
        const dexData = {}
        
        for (const chain of chainsData) {
          const dexes = await fetchDexes(chain.id)
          dexData[chain.id] = dexes
        }
        
        setDexesByChain(dexData)
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])

  // Handle form submission
  const onSubmit = async (data) => {
    try {
      if (editingBlockchain) {
        // Update existing blockchain
        const updated = await updateBlockchain(editingBlockchain.id, data)
        setBlockchains(blockchains.map(chain => 
          chain.id === editingBlockchain.id ? updated : chain
        ))
      } else {
        // Add new blockchain
        const newBlockchain = await addBlockchain(data)
        setBlockchains([...blockchains, newBlockchain])
        
        // Initialize empty DEX array for this chain
        setDexesByChain({
          ...dexesByChain,
          [newBlockchain.id]: []
        })
      }
      
      // Close dialog and reset form
      setDialogOpen(false)
      setEditingBlockchain(null)
      form.reset()
    } catch (error) {
      console.error('Error saving blockchain:', error)
    }
  }

  // Edit blockchain
  const handleEdit = (blockchain) => {
    setEditingBlockchain(blockchain)
    form.reset({
      name: blockchain.name,
      chain_id: blockchain.chain_id.toString(),
      rpc_url: blockchain.rpc_url,
      ws_url: blockchain.ws_url || '',
      explorer_url: blockchain.explorer_url || '',
      native_token: blockchain.native_token,
      gas_multiplier: blockchain.gas_multiplier.toString()
    })
    setDialogOpen(true)
  }

  // Toggle blockchain status
  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await toggleBlockchainStatus(id, !currentStatus)
      setBlockchains(blockchains.map(chain => 
        chain.id === id ? { ...chain, is_active: !currentStatus } : chain
      ))
    } catch (error) {
      console.error('Error toggling blockchain status:', error)
    }
  }

  // Check if a blockchain has enough DEXes for arbitrage
  const hasEnoughDexes = (chainId) => {
    return dexesByChain[chainId] && dexesByChain[chainId].length >= 2
  }

  // Get count of active DEXes for a blockchain
  const getActiveDexCount = (chainId) => {
    if (!dexesByChain[chainId]) return 0
    return dexesByChain[chainId].filter(dex => dex.is_active).length
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
        <h1 className="text-3xl font-bold">Blockchains</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingBlockchain(null)
              form.reset({
                name: '',
                chain_id: '',
                rpc_url: '',
                ws_url: '',
                explorer_url: '',
                native_token: '',
                gas_multiplier: '1.1'
              })
            }}>
              <Plus className="mr-2 h-4 w-4" /> Add Blockchain
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingBlockchain ? 'Edit Blockchain' : 'Add New Blockchain'}
              </DialogTitle>
              <DialogDescription>
                Configure a blockchain network for arbitrage monitoring.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  rules={{ required: 'Name is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Ethereum" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="chain_id"
                  rules={{ 
                    required: 'Chain ID is required',
                    pattern: {
                      value: /^\d+$/,
                      message: 'Must be a number'
                    }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chain ID</FormLabel>
                      <FormControl>
                        <Input placeholder="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="rpc_url"
                  rules={{ required: 'RPC URL is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RPC URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormDescription>
                        You can use environment variables with ${'{VAR_NAME}'} syntax
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="ws_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WebSocket URL (Recommended)</FormLabel>
                      <FormControl>
                        <Input placeholder="wss://..." {...field} />
                      </FormControl>
                      <FormDescription>
                        WebSocket is preferred for real-time event monitoring
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="explorer_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Explorer URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://etherscan.io" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="native_token"
                  rules={{ required: 'Native token is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Native Token Symbol</FormLabel>
                      <FormControl>
                        <Input placeholder="ETH" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="gas_multiplier"
                  rules={{ 
                    required: 'Gas multiplier is required',
                    pattern: {
                      value: /^\d*\.?\d+$/,
                      message: 'Must be a number'
                    }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gas Multiplier</FormLabel>
                      <FormControl>
                        <Input placeholder="1.1" {...field} />
                      </FormControl>
                      <FormDescription>
                        Multiplier applied to gas price for transactions
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="submit">
                    {editingBlockchain ? 'Update' : 'Add'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Important</AlertTitle>
        <AlertDescription>
          For arbitrage to work effectively, a blockchain must have at least two active DEXes with liquidity for the same token pairs.
        </AlertDescription>
      </Alert>
      
      <Card>
        <CardHeader>
          <CardTitle>Configured Networks</CardTitle>
          <CardDescription>
            EVM-compatible blockchains available for arbitrage monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Chain ID</TableHead>
                <TableHead>Native Token</TableHead>
                <TableHead>DEXes</TableHead>
                <TableHead>Arbitrage Ready</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blockchains.map((blockchain) => {
                const activeDexCount = getActiveDexCount(blockchain.id);
                const isArbitrageReady = activeDexCount >= 2;
                
                return (
                  <TableRow key={blockchain.id} className={!isArbitrageReady ? "bg-amber-50" : ""}>
                    <TableCell className="font-medium">{blockchain.name}</TableCell>
                    <TableCell>{blockchain.chain_id}</TableCell>
                    <TableCell>{blockchain.native_token}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Badge variant="outline">{activeDexCount} active</Badge>
                        {activeDexCount < 2 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertTriangle className="h-4 w-4 ml-2 text-amber-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">At least 2 active DEXes are required for arbitrage</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isArbitrageReady ? (
                        <Badge variant="success" className="flex items-center gap-1">
                          <Check className="h-3 w-3" /> Ready
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <X className="h-3 w-3" /> Not Ready
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={blockchain.is_active ? "success" : "secondary"}>
                        {blockchain.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Switch 
                          checked={blockchain.is_active} 
                          onCheckedChange={() => handleToggleStatus(blockchain.id, blockchain.is_active)}
                          disabled={blockchain.is_active && !isArbitrageReady}
                        />
                        <Button variant="outline" size="sm" onClick={() => handleEdit(blockchain)}>
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.location.href = `/dexes?blockchain=${blockchain.id}`}
                        >
                          Manage DEXes
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              
              {blockchains.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4 text-gray-500">
                    No blockchains configured yet. Add one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Blockchain Status Summary</CardTitle>
          <CardDescription>
            Overview of blockchain configuration and readiness for arbitrage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {blockchains.map(blockchain => (
              <Card key={blockchain.id} className={!hasEnoughDexes(blockchain.id) ? "border-amber-300 bg-amber-50" : "border-green-300 bg-green-50"}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{blockchain.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Chain ID:</span>
                      <span>{blockchain.chain_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Native Token:</span>
                      <span>{blockchain.native_token}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Active DEXes:</span>
                      <span className="font-medium">{getActiveDexCount(blockchain.id)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Status:</span>
                      <Badge variant={blockchain.is_active ? "success" : "secondary"}>
                        {blockchain.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-sm text-gray-500">Arbitrage Ready:</span>
                      {hasEnoughDexes(blockchain.id) ? (
                        <Badge variant="success" className="flex items-center gap-1">
                          <Check className="h-3 w-3" /> Ready
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="flex items-center gap-1 bg-amber-100 text-amber-800 border-amber-300">
                          <AlertTriangle className="h-3 w-3" /> Need more DEXes
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}