import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatPercent } from '@/lib/utils';

interface Opportunity {
  blockchain?: string;
  tokenPair?: string;
  buyDex?: {
    name: string;
  };
  sellDex?: {
    name: string;
  };
  priceDifference?: number;
  estimatedProfit?: number;
  timestamp?: number;
}

interface OpportunityListProps {
  opportunities?: Opportunity[];
}

export default function OpportunityList({ opportunities = [] }: OpportunityListProps) {
  if (!opportunities || opportunities.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        No recent arbitrage opportunities detected.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Blockchain</TableHead>
            <TableHead>Token Pair</TableHead>
            <TableHead>Buy On</TableHead>
            <TableHead>Sell On</TableHead>
            <TableHead>Price Difference</TableHead>
            <TableHead>Estimated Profit</TableHead>
            <TableHead>Timestamp</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {opportunities.map((opportunity, index) => (
            <TableRow key={index}>
              <TableCell>{opportunity.blockchain || 'Unknown'}</TableCell>
              <TableCell>{opportunity.tokenPair || 'Unknown/Unknown'}</TableCell>
              <TableCell>{opportunity.buyDex?.name || 'Unknown'}</TableCell>
              <TableCell>{opportunity.sellDex?.name || 'Unknown'}</TableCell>
              <TableCell>
                <Badge variant="outline" className="bg-blue-50">
                  {formatPercent ? formatPercent(opportunity.priceDifference) : `${opportunity.priceDifference?.toFixed(2)}%`}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={opportunity.estimatedProfit && opportunity.estimatedProfit > 0 ? "default" : "secondary"}>
                  {formatPercent ? formatPercent(opportunity.estimatedProfit) : `${opportunity.estimatedProfit?.toFixed(2)}%`}
                </Badge>
              </TableCell>
              <TableCell>
                {opportunity.timestamp ? new Date(opportunity.timestamp).toLocaleString() : 'Unknown'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}