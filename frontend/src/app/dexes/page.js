// src/app/dexes/page.js
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
import { Plus, PlusCircle } from 'lucide-react'
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
  fetchDexes, 
  fetchBlockchains, 
  addDex, 
  updateDex, 
  toggleDexStatus 
} from '@/lib/api'
import { useForm } from 'react-hook-form'

export default function DexesPage() {
  const [dexes, setDexes] = useState([])
  const [blockchains, setBlockchains] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDex, setEditingDex] = useState(null)
  
  const form = useForm({
    defaultValues: {
      blockchain_id: '',
      name: '',
      router_address: '',
      factory_address: '',
      version: 'v2'
    }
  })

  // Load dexes and blockchains
  useEffect(() => {
    const loadData = async () => {
      try {
        const [dexData, blockchainData] = await Promise.all([
          fetchDexes(),
          fetchBlockchains()
        ])
        
        setDexes(dexData)
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
      if (editingDex) {
        // Update existing DEX
        const updated = await updateDex(editingDex.id, data)
        setDexes(dexes.map(dex => 
          dex.id === editingDex.id ? updated : dex
        ))
      } else {
        // Add new DEX
        const newDex = await addDex(data)
        setDexes([...dexes, newDex])
      }
      
      // Close dialog and reset form
      setDialogOpen(false)
      setEditingDex(null)
      form.reset()
    } catch (error) {
      console.error('Error saving DEX:', error)
    }
  }

  // Edit DEX
  const handleEdit = (dex) => {
    setEditingDex(dex)
    form.reset({
      blockchain_id: dex.blockchain_id.toString(),
      name: dex.name,
      router_address: dex.router_address,
      factory_address: dex.factory_address,
      version: dex.version || 'v2'
    })
    setDialogOpen(true)
  }

  // Toggle DEX status
  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await toggleDexStatus(id, !currentStatus)
      setDexes(dexes.map(dex => 
        dex.id === id ? { ...dex, is_active: !currentStatus } : dex
      ))
    } catch (error) {
      console.error('Error toggling DEX status:', error)
    }
  }

  // Get blockchain name
  const getBlockchainName = (blockchainId) => {
    const blockchain = blockchains.find(b => b.id === blockchainId)
    return blockchain ? blockchain.name : 'Unknown'
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
        <h1 className="text-3xl font-bold">DEX Management</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingDex(null)
              form.reset({
                blockchain_id: '',
                name: '',
                router_address: '',
                factory_address: '',
                version: 'v2'
              })
            }}>
              <Plus className="mr-2 h-4 w-4" /> Add DEX
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingDex ? 'Edit DEX' : 'Add New DEX'}
              </DialogTitle>
              <DialogDescription>
                Configure a decentralized exchange for arbitrage monitoring.
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
                  name="name"
                  rules={{ required: 'Name is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Uniswap" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="router_address"
                  rules={{ 
                    required: 'Router address is required',
                    pattern: {
                      value: /^0x[a-fA-F0-9]{40}$/,
                      message: 'Must be a valid Ethereum address'
                    }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Router Address</FormLabel>
                      <FormControl>
                        <Input placeholder="0x..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="factory_address"
                  rules={{ 
                    required: 'Factory address is required',
                    pattern: {
                      value: /^0x[a-fA-F0-9]{40}$/,
                      message: 'Must be a valid Ethereum address'
                    }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Factory Address</FormLabel>
                      <FormControl>
                        <Input placeholder="0x..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="version"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DEX Version</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select version" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="v2">V2</SelectItem>
                          <SelectItem value="v3">V3</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Currently only V2 is fully supported
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="submit">
                    {editingDex ? 'Update' : 'Add'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Configured DEXes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Blockchain</TableHead>
                <TableHead>Router Address</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dexes.map((dex) => (
                <TableRow key={dex.id}>
                  <TableCell className="font-medium">{dex.name}</TableCell>
                  <TableCell>{getBlockchainName(dex.blockchain_id)}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {dex.router_address.substring(0, 6)}...{dex.router_address.substring(38)}
                  </TableCell>
                  <TableCell>{dex.version || 'v2'}</TableCell>
                  <TableCell>
                    <Badge variant={dex.is_active ? "success" : "secondary"}>
                      {dex.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Switch 
                        checked={dex.is_active} 
                        onCheckedChange={() => handleToggleStatus(dex.id, dex.is_active)}
                      />
                      <Button variant="outline" size="sm" onClick={() => handleEdit(dex)}>
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              
              {dexes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                    No DEXes configured yet. Add one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {blockchains.length === 0 && (
        <div className="bg-amber-100 border border-amber-300 rounded-md p-4">
          <p className="text-amber-800">
            You need to add at least one blockchain before you can add DEXes.
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
