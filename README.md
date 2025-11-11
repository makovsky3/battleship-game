# Battleship Game

A modern, interactive Battleship game built with React, TypeScript, and Tailwind CSS. Play against an AI opponent with three difficulty levels on a beautifully designed wooden table interface.

## 🎮 Live Demo

Play the game here: [https://battleship-game-app-m2fzdzw5.devinapps.com](https://battleship-game-app-m2fzdzw5.devinapps.com)

## ✨ Features

- **Three AI Difficulty Levels**
  - **Easy**: Random targeting AI
  - **Medium**: Hunting mode AI that targets adjacent cells after hits
  - **Hard**: Strategic AI with probability mapping and directional targeting

- **Beautiful Wooden Table Aesthetic**: Immersive POV design that makes you feel like you're playing on a real wooden table

- **Classic Battleship Rules**: 
  - 5 ships: Carrier (5), Battleship (4), Cruiser (3), Submarine (3), Destroyer (2)
  - 10x10 grid
  - Turn-based gameplay

- **Interactive Ship Placement**: Click to place ships with rotation support

- **Visual Feedback**: 
  - Ship icons on your board
  - Hit markers (red with target icon)
  - Miss markers (white dots)
  - Sunk ship indicators (dark red with anchor icon)

- **Score Tracking**: Real-time hit counters for both player and AI

- **Responsive Design**: Works on desktop and mobile devices

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/makovsky3/battleship-game.git
cd battleship-game
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## 🎯 How to Play

1. **Start the Game**: Click "Start Battle" on the welcome screen
2. **Select Difficulty**: Choose Easy, Medium, or Hard
3. **Place Your Ships**: 
   - Click on the board to place each ship
   - Use the "Rotate" button to switch between horizontal and vertical orientation
   - Ships cannot overlap or touch each other
4. **Battle Phase**: 
   - Click on the opponent's board to fire
   - Red markers indicate hits
   - White dots indicate misses
   - Try to sink all enemy ships before they sink yours!
5. **Win or Lose**: The game ends when all ships from one side are sunk

## 🛠️ Technology Stack

- **React 18**: Modern UI library
- **TypeScript**: Type-safe code
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Pre-built UI components
- **Lucide React**: Beautiful icon library

## 🧠 AI Implementation

### Easy Mode
Random shot selection with no memory of previous hits.

### Medium Mode
- Remembers hit locations
- Targets adjacent cells (up, down, left, right) after a hit
- Continues hunting until ship is sunk

### Hard Mode
- All Medium mode features
- Directional targeting: Once two hits are detected in a line, continues in that direction
- Probability mapping: Calculates most likely ship locations based on remaining ships and board state
- Strategic shot selection based on probability distribution

## 📁 Project Structure

```
battleship-game/
├── src/
│   ├── App.tsx          # Main game component with all game logic
│   ├── App.css          # Custom styles
│   ├── main.tsx         # Application entry point
│   └── components/
│       └── ui/          # shadcn/ui components
├── public/              # Static assets
├── dist/                # Production build output
└── package.json         # Dependencies and scripts
```

## 🎨 Customization

### Changing Colors
The game uses Tailwind CSS classes. To modify colors, edit the className properties in `src/App.tsx`:
- Board background: `bg-amber-800`
- Water cells: `bg-blue-400`
- Hit markers: `bg-red-600`
- Miss markers: `bg-blue-200`

### Modifying Ship Configuration
Edit the `SHIPS` array in `src/App.tsx` to change ship types, lengths, or add new ships.

### Adjusting Board Size
Change the `BOARD_SIZE` constant in `src/App.tsx` (default is 10).

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## 📝 License

This project is open source and available under the MIT License.

## 👤 Author

Created by Tani Makovsky (@makovsky3)

## 🙏 Acknowledgments

- Built with guidance from Devin AI
- UI components from shadcn/ui
- Icons from Lucide React
