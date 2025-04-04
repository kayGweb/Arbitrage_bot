'use client';

import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { fetchPriceHistory } from '@/lib/utils';

interface PriceChartProps {
  pairId: number | string;
}

interface PriceData {
  dex_name: string;
  price: string;
  timestamp: string;
}

export default function PriceChart({ pairId }: PriceChartProps) {
  const [chartData, setChartData] = useState<any>({
    labels: [],
    datasets: []
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadPriceData = async () => {
      try {
        const data = await fetchPriceHistory(pairId);
        
        // Group by DEX
        const dexMap: Record<string, any> = {};
        
        data.forEach((item: PriceData) => {
          if (!dexMap[item.dex_name]) {
            dexMap[item.dex_name] = {
              label: item.dex_name,
              data: [],
              timestamps: [],
              borderColor: getRandomColor(),
              fill: false,
              tension: 0.1
            };
          }
          
          dexMap[item.dex_name].data.push(parseFloat(item.price));
          dexMap[item.dex_name].timestamps.push(new Date(item.timestamp).toLocaleString());
        });
        
        // Get all timestamps and sort them
        const allTimestamps = Array.from(new Set(data.map((item: PriceData) => item.timestamp))).sort();
        
        // Create chart data
        setChartData({
          labels: allTimestamps.map((ts: string) => new Date(ts).toLocaleString()),
          datasets: Object.values(dexMap)
        });
      } catch (error) {
        console.error('Error loading price history:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (pairId) {
      loadPriceData();
    }
  }, [pairId]);
  
  // Generate random colors for chart lines
  function getRandomColor(): string {
    const colors = [
      'rgb(53, 162, 235)',
      'rgb(255, 99, 132)',
      'rgb(75, 192, 192)',
      'rgb(255, 205, 86)',
      'rgb(153, 102, 255)',
      'rgb(255, 159, 64)',
      'rgb(54, 162, 235)',
      'rgb(201, 203, 207)'
    ];
    
    return colors[Math.floor(Math.random() * colors.length)];
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <Line 
      data={chartData}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: 'Price'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Time'
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context: any) {
                return `${context.dataset.label}: ${context.parsed.y}`;
              }
            }
          }
        }
      }}
    />
  );
}