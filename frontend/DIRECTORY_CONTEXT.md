# Frontend Directory Structure

This document provides a reference for the frontend directory structure of the Multi-Chain DEX Arbitrage Bot application, based on available documentation. This guide helps AI assistants understand the organization of frontend-related files.

## Overview

The frontend appears to be built with Next.js using the App Router pattern and is styled with Tailwind CSS and Shadcn UI components. It provides a dashboard for monitoring and managing arbitrage opportunities across multiple blockchains and DEXes.

## Confirmed Application Pages

Based on the available files, the application includes these pages:

- **Dashboard**: Main page showing statistics, charts, and recent arbitrage opportunities
- **Blockchains Management**: Page for managing blockchain connections
- **DEXes Management**: Page for managing DEX configurations
- **Tokens Management**: Page for managing token information
- **Token Pairs Management**: Page for configuring token pairs to monitor for arbitrage

## Page File Structure

From the uploaded documents, we can confirm these page files:

```
app/
├── blockchains/
│   └── page.js           # Blockchain management page
├── dexes/
│   └── page.js           # DEX management page
├── tokens/
│   └── page.js           # Token management page
├── token-pairs/
│   └── page.js           # Token pair management page
├── layout.js             # Root layout component
└── page.js               # Dashboard page (home)
```

## Components

The application uses components that include:

- UI components from the Shadcn UI library
- Custom components for displaying:
  - Statistics cards
  - Opportunity lists
  - Price charts
  - Tables for various entity management

## Utility and API Code

The application likely includes:

- API client code for communication with the backend
- WebSocket integration for real-time updates
- Utility functions for data formatting and calculations

## Example Page Structure

Based on the uploaded files like "Dashboard Page.txt" and "Blockchain Management Page.txt", pages generally follow this pattern:

```javascript
'use client'

import { useState, useEffect } from 'react'
import { fetchData } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// Other UI component imports

export default function SomePage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Data fetching logic
  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await fetchData()
        setData(result)
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])

  // Page rendering
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Page Title</h1>
      
      {/* Content specific to each page */}
    </div>
  )
}
```

## UI Components Used

Based on imports seen in the uploaded files, the application uses these Shadcn UI components:

- Button
- Card, CardContent, CardHeader, CardTitle
- Table, TableBody, TableCell, TableHead, TableHeader, TableRow
- Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
- Form components
- Tabs components
- Badge
- Switch
- Select, Input
- And others

## Assumed Directory Structure

While we cannot confirm the exact file structure, based on standard Next.js practices and component imports seen in the code, the frontend likely follows a structure similar to:

```
frontend/
├── src/
│   ├── app/                      # Next.js App Router pages (confirmed)
│   │   ├── blockchains/          
│   │   ├── dexes/                
│   │   ├── tokens/               
│   │   ├── token-pairs/          
│   │   ├── globals.css           
│   │   ├── layout.js             
│   │   └── page.js               
│   ├── components/               # Components (structure not confirmed)
│   │   ├── ui/                   # Shadcn UI components
│   │   └── [other components]    # Custom components
│   └── lib/                      # Utility functions (structure not confirmed)
│       ├── api.js                # API client functions
│       └── [other utilities]     # Other utility functions
```

## Note on Accuracy

This document represents our best understanding of the frontend structure based on available documentation. The actual structure may differ, especially regarding the exact file paths for components and utility functions.
