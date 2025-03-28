// src/app/tokens/page.js
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
import { Plus, PlusCircle, Search } from 'lucide-react'
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
  fetchTokens, 
  fetchBlockchains, 
  addToken, 
  updateToken, 
  toggleTokenStatus,
  lookupTokenInfo 
} from '@/lib/api'
import { useForm } from 'react-hook-form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function TokensPage() {
  const [tokens, setTokens] = useState([])
  const [blockchains, setBlockchains] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingToken, setEditingToken] = useState(null)
  const [lookupOpen, setLookupOpen] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [selectedBlockchain, setSelectedBlockchain] = useState('all')
  
  const form = useForm({
    defaultValues: {
      blockchain_id: '',
      address: '',
      symbol: '',
      name: '',
      decimals: '18'
    }
  })
  
  const lookupForm = useForm({
    defaultValues: {
      blockchain_id: '',
      address: ''
    }
  })

  // Load tokens and blockchains
  useEffect(() => {
    const loadData = async () => {
      try {
        const [tokenData, blockchainData] = await Promise.all([
          fetchTokens(),
          fetchBlockchains()
        ])
        
        setTokens(tokenData)
        setBlockchains(blockchainData)
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
      if (editingToken) {
        // Update existing token
        const updated = await updateToken(editingToken.id, data)
        setTokens(tokens.map(token => 
          token.id === editingToken.id ? updated : token
        ))
      } else {
        // Add new token
        const newToken = await addToken(data)
        setTokens([...tokens, newToken])
      }
      
      // Close dialog and reset form
      setDialogOpen(false)
      setEditingToken(null)
      form.reset()
    } catch (error) {
      console.error('Error saving token:', error)
    }
  }

  // Lookup token info
  const onLookup = async (data) => {
    setLookupLoading(true)
    try {
      const tokenInfo = await lookupTokenInfo(data.blockchain_id, data.address)
      
      // Fill the main form with the token info
      form.setValue('blockchain_id', data.blockchain_id)
      form.setValue('address', data.address)
      form.setValue('symbol', tokenInfo.symbol)
      form.setValue('name', tokenInfo.name)
      form.setValue('decimals', tokenInfo.decimals.toString())
      
      // Close lookup dialog and open the main dialog
      setLookupOpen(false)
      setEditingToken(null)
      setDialogOpen(true)
    } catch (error) {
      console.error('Error looking up token:', error)
    } finally {
      setLookupLoading(false)
    }
  }

  // Edit token
  const handleEdit = (token) => {
    setEditingToken(token)
    form.reset({
      blockchain_id: token.blockchain_id.toString(),
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals.toString()
    })
    setDialogOpen(true)
  }

  // Toggle token status
  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await toggleTokenStatus(id, !currentStatus)
      setTokens(tokens.map(token => 
        token.id === id ? { ...token, is_active: !currentStatus } : token
      ))
    } catch (error) {
      console.error('Error toggling token status:', error)
    }
  }

  // Get blockchain name
  const getBlockchainName = (blockchainId) => {
    const blockchain = blockchains.find(b => b.id === blockchainId)
    return blockchain ? blockchain.name : 'Unknown'
  }

  // Filter tokens by blockchain
  const filteredTokens = selectedBlockchain === 'all'
    ? tokens
    : tokens.filter(token => token.blockchain_id.toString() === selectedBlockchain)

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
        <h1 className="text-3xl font-bold">Token Management</h1>
        <div className="flex space-x-2">
          <Dialog open={lookupOpen} onOpenChange={setLookupOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Search className="mr-2 h-4 w-4" /> Lookup Token
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Lookup Token Information</DialogTitle>
                <DialogDescription>
                  Enter a blockchain and token address to fetch its information automatically.
                </DialogDescription>
              </DialogHeader>
              <Form {...lookupForm}>
                <form onSubmit={lookupForm.handleSubmit(onLookup)} className="space-y-4">
                  <FormField
                    control={lookupForm.control}
                    name="blockchain_id"
                    rules={{ required: 'Blockchain is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Blockchain</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
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
                    control={lookupForm.control}
                    name="address"
                    rules={{ 
                      required: 'Token address is required',
                      pattern: {
                        value: /^0x[a-fA-F0-9]{40}$/,
                        message: 'Must be a valid Ethereum address'
                      }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Token Address</FormLabel>
                        <FormControl>
                          <Input placeholder="0x..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button type="submit" disabled={lookupLoading}>
                      {lookupLoading ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                          Looking up...
                        </>
                      ) : (
                        'Lookup'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingToken(null)
                form.reset({
                  blockchain_id: '',
                  address: '',
                  symbol: '',
                  name: '',
                  decimals: '18'
                })
              }}>
                <Plus className="mr-2 h-4 w-4" /> Add Token
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingToken ? 'Edit Token' : 'Add New Token'}
                </DialogTitle>
                <DialogDescription>
                  Configure a token for arbitrage monitoring.
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
                          onValueChange={field.onChange} 
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
                    name="address"
                    rules={{ 
                      required: 'Token address is required',
                      pattern: {
                        value: /^0x[a-fA-F0-9]{40}$/,
                        message: 'Must be a valid Ethereum address'
                      }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Token Address</FormLabel>
                        <FormControl>
                          <Input placeholder="0x..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="symbol"
                    rules={{ required: 'Symbol is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Symbol</FormLabel>
                        <FormControl>
                          <Input placeholder="WETH" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="name"
                    rules={{ required: 'Name is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Wrapped Ethereum" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="decimals"
                    rules={{ 
                      required: 'Decimals is required',
                      pattern: {
                        value: /^\d+$/,
                        message: 'Must be a number'
                      }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Decimals</FormLabel>
                        <FormControl>
                          <Input placeholder="18" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button type="submit">
                      {editingToken ? 'Update' : 'Add'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="bg-white rounded-md shadow">
        <div className="p-4 border-b">
          <Tabs 
            defaultValue={selectedBlockchain} 
            onValueChange={setSelectedBlockchain}
            className="w-full"
          >
            <TabsList className="grid grid-cols-3 sm:grid-cols-5 md:flex">
              <TabsTrigger value="all">All Blockchains</TabsTrigger>
              {blockchains.map(blockchain => (
                <TabsTrigger 
                  key={blockchain.id} 
                  value={blockchain.id.toString()}
                >
                  {blockchain.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        
        <div className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Blockchain</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Decimals</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTokens.map((token) => (
                <TableRow key={token.id}>
                  <TableCell className="font-medium">{token.symbol}</TableCell>
                  <TableCell>{token.name}</TableCell>
                  <TableCell>{getBlockchainName(token.blockchain_id)}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {token.address.substring(0, 6)}...{token.address.substring(38)}
                  </TableCell>
                  <TableCell>{token.decimals}</TableCell>
                  <TableCell>
                    <Badge variant={token.is_active ? "success" : "secondary"}>
                      {token.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Switch 
                        checked={token.is_active} 
                        onCheckedChange={() => handleToggleStatus(token.id, token.is_active)}
                      />
                      <Button variant="outline" size="sm" onClick={() => handleEdit(token)}>
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              
              {filteredTokens.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4 text-gray-500">
                    No tokens found. Add tokens to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      {blockchains.length === 0 && (
        <div className="bg-amber-100 border border-amber-300 rounded-md p-4">
          <p className="text-amber-800">
            You need to add at least one blockchain before you can add tokens.
          </p>
          <Button 
            variant="link" 
            onClick={() => window.location.href = '/blockchains'}
            className="text-amber-800 p-0"
          >
            <PlusCircle className="mr-1 h-4 w-4" />
            Add Blockchain
          </Button>
        </div>
      )}
    </div>
  )
}
