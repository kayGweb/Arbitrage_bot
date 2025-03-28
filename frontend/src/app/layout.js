// src/app/layout.js
import { Inter } from 'next/font/google'
import './globals.css'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Multi-Chain DEX Arbitrage Bot',
  description: 'Control panel for managing and monitoring multi-chain DEX arbitrage',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex h-screen bg-gray-100">
          <Sidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-4">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}
