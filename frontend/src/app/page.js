// src/app/page.js
'use client'

import { useState, useEffect } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import OpportunityList from '@/components/OpportunityList'
import StatsCards from '@/components/StatsCards'
import { fetchDashboardData } from '@/lib/api'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
)

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalProfit: 0,
      totalTrades: 0,
      successRate: 0,
      activeMonitors: 0,
    },
    recentTrades: [],
    opportunities: [],
    profitChart: {
      labels: [],
      datasets: [{
        label: 'Profit',
        data: [],
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      }]
    },
    volumeChart: {
      labels: [],
      datasets: [{
        label: 'Volume',
        data: [],
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
      }]
    }
  })

  // Fetch dashboard data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchDashboardData()
        setDashboardData(data)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      {/* Stats Cards */}
      <StatsCards stats={dashboardData.stats} />
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profit History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Line 
                data={dashboardData.profitChart} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Profit (USD)'
                      }
                    },
                    x: {
                      title: {
                        display: true,
                        text: 'Date'
                      },
                      ticks: {
                        maxRotation: 45,
                        minRotation: 45
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      position: 'top',
                    }
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Trading Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Bar 
                data={dashboardData.volumeChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Volume (USD)'
                      }
                    },
                    x: {
                      title: {
                        display: true,
                        text: 'Date'
                      },
                      ticks: {
                        maxRotation: 45,
                        minRotation: 45
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      position: 'top',
                    }
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Opportunities */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Arbitrage Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          <OpportunityList opportunities={dashboardData.opportunities} />
        </CardContent>
      </Card>
    </div>
  )
}
