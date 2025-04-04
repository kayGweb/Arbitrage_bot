# Frontend Installation Guide

This guide provides detailed instructions for setting up the Next.js frontend with Shadcn UI components for the Multi-Chain DEX Arbitrage Bot.

## Prerequisites

- Node.js 16+ installed
- npm or yarn package manager
- Backend project already set up

## Step 1: Create and Navigate to Frontend Directory

If starting from scratch:

```bash
mkdir -p frontend/src/app
cd frontend
```

If using the existing project:

```bash
cd frontend
```

## Step 2: Initialize Next.js Project (if not already created)

```bash
npx create-next-app@latest .
```

When prompted:

- TypeScript: Your preference (Yes recommended)
- ESLint: Yes
- Tailwind CSS: Yes
- `src/` directory: Yes
- App Router: Yes
- Import alias: Yes (default `@/*`)

## Step 3: Install Required Dependencies

```bash
# React and Next.js core dependencies
npm install react react-dom next

# Chart libraries for data visualization
npm install chart.js react-chartjs-2

# Socket.io client for real-time updates
npm install socket.io-client

# Form handling
npm install react-hook-form

# Utility libraries
npm install lucide-react
```

## Step 4: Set Up Tailwind CSS

Tailwind should be installed during Next.js setup, but if not:

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Update `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ["class"],
	content: ["./pages/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
	theme: {
		extend: {}
	},
	plugins: []
};
```

## Step 5: Install and Configure Shadcn UI

```bash
# Install Shadcn
npm install -D @shadcn/ui

# Initialize Shadcn UI
npx shadcn@latest init
```

When prompted:

- Style: Default
- Use CSS variables: Yes
- Global CSS path: `src/app/globals.css`
- Components location: `@/components`
- Utility location: `@/lib/utils`
- Color theme: Your preference (e.g., slate, zinc, neutral, etc.)

## Step 6: Install Required UI Components

```bash
# Install all the components used in the application
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add table
npx shadcn@latest add badge
npx shadcn@latest add switch
npx shadcn@latest add dialog
npx shadcn@latest add form
npx shadcn@latest add input
npx shadcn@latest add select
npx shadcn@latest add tabs
npx shadcn@latest add pagination
npx shadcn@latest add dropdown-menu
```

## Step 7: Create Directory Structure

Ensure you have the following directory structure:

```
frontend/
├── src/
│   ├── app/
│   │   ├── blockchains/
│   │   │   └── page.js
│   │   ├── dexes/
│   │   │   └── page.js
│   │   ├── tokens/
│   │   │   └── page.js
│   │   ├── token-pairs/
│   │   │   └── page.js
│   │   ├── globals.css
│   │   ├── layout.js
│   │   └── page.js
│   ├── components/
│   │   ├── ui/
│   │   │   └── ... (Shadcn components)
│   │   ├── Header.jsx
│   │   ├── Sidebar.jsx
│   │   ├── StatsCards.jsx
│   │   ├── OpportunityList.jsx
│   │   └── PriceChart.jsx
│   └── lib/
│       ├── api.js
│       └── utils.js
├── public/
├── package.json
├── tailwind.config.js
├── next.config.js
└── jsconfig.json (or tsconfig.json)
```

## Step 8: Configure Path Aliases

Make sure your `jsconfig.json` (or `tsconfig.json` if using TypeScript) includes:

```json
{
	"compilerOptions": {
		"baseUrl": ".",
		"paths": {
			"@/*": ["./src/*"]
		}
	}
}
```

## Step 9: Set Up API Client

Create or modify `src/lib/api.js` to include all the necessary API endpoints and WebSocket connections.

## Step 10: Create Environment Variables

Create a `.env.local` file in the frontend directory:

```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

## Step 11: Test the Setup

```bash
# Start development server
npm run dev
```

Visit `http://localhost:3000` to see if the application is running correctly.

## Step 12: Build for Production

```bash
# Create optimized production build
npm run build

# Test production build locally
npm run start
```

## Troubleshooting

### Missing UI Components

If you see errors about missing UI components:

1. Double-check that you've run the correct `npx shadcn@latest add [component]` commands
2. Ensure the component directory exists at `src/components/ui/`
3. Make sure path aliases in `jsconfig.json` or `tsconfig.json` are correctly set up

### Import Errors

If you see errors like `Module not found: Can't resolve '@/components/ui/button'`:

1. Check that the `@` alias is properly configured
2. Make sure the component exists at the specified path
3. Try running `npm run dev` with the `--turbo` flag for better error reporting

### CSS Issues

If components don't look right:

1. Make sure Tailwind is properly configured
2. Check that `globals.css` is importing the Tailwind directives
3. Verify that you've used the correct Shadcn theme settings

### Socket.io Connection Issues

If real-time updates aren't working:

1. Verify that the backend server is running
2. Check that `NEXT_PUBLIC_SOCKET_URL` is set correctly
3. Look for connection errors in the browser console
