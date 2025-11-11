import { useState, useEffect } from 'react'
import './App.css'
import { Button } from '@/components/ui/button'
import { Ship, Target, Anchor, Trophy, RotateCw } from 'lucide-react'

type CellState = 'empty' | 'ship' | 'hit' | 'miss' | 'sunk'
type GamePhase = 'welcome' | 'difficulty' | 'placement' | 'battle' | 'gameover'
type Difficulty = 'easy' | 'medium' | 'hard'
type Orientation = 'horizontal' | 'vertical'

interface ShipType {
  name: string
  length: number
  placed: boolean
}

interface Cell {
  state: CellState
  shipId?: number
}

interface Coordinate {
  row: number
  col: number
}

const BOARD_SIZE = 10
const SHIPS: ShipType[] = [
  { name: 'Carrier', length: 5, placed: false },
  { name: 'Battleship', length: 4, placed: false },
  { name: 'Cruiser', length: 3, placed: false },
  { name: 'Submarine', length: 3, placed: false },
  { name: 'Destroyer', length: 2, placed: false },
]

function App() {
  const [gamePhase, setGamePhase] = useState<GamePhase>('welcome')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [playerBoard, setPlayerBoard] = useState<Cell[][]>([])
  const [aiBoard, setAIBoard] = useState<Cell[][]>([])
  const [playerShips, setPlayerShips] = useState<ShipType[]>(SHIPS.map(s => ({ ...s })))
  const [currentShipIndex, setCurrentShipIndex] = useState(0)
  const [shipOrientation, setShipOrientation] = useState<Orientation>('horizontal')
  const [hoveredCells, setHoveredCells] = useState<Coordinate[]>([])
  const [isPlayerTurn, setIsPlayerTurn] = useState(true)
  const [winner, setWinner] = useState<'player' | 'ai' | null>(null)
  const [aiMemory, setAIMemory] = useState<{
    lastHit?: Coordinate
    huntMode: boolean
    targetQueue: Coordinate[]
    hitShipCells: Coordinate[]
  }>({ huntMode: false, targetQueue: [], hitShipCells: [] })
  const [playerScore, setPlayerScore] = useState(0)
  const [aiScore, setAIScore] = useState(0)
  const [message, setMessage] = useState('')

  useEffect(() => {
    initializeBoards()
  }, [])

  const initializeBoards = () => {
    const emptyBoard = Array(BOARD_SIZE).fill(null).map(() =>
      Array(BOARD_SIZE).fill(null).map(() => ({ state: 'empty' as CellState }))
    )
    setPlayerBoard(JSON.parse(JSON.stringify(emptyBoard)))
    setAIBoard(JSON.parse(JSON.stringify(emptyBoard)))
  }

  const startGame = () => {
    setGamePhase('difficulty')
  }

  const selectDifficulty = (diff: Difficulty) => {
    setDifficulty(diff)
    setGamePhase('placement')
    setMessage('Place your ships on the board')
  }

  const canPlaceShip = (board: Cell[][], row: number, col: number, length: number, orientation: Orientation): boolean => {
    if (orientation === 'horizontal') {
      if (col + length > BOARD_SIZE) return false
      for (let i = 0; i < length; i++) {
        if (board[row][col + i].state === 'ship') return false
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const newRow = row + dr
            const newCol = col + i + dc
            if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE) {
              if (board[newRow][newCol].state === 'ship') return false
            }
          }
        }
      }
    } else {
      if (row + length > BOARD_SIZE) return false
      for (let i = 0; i < length; i++) {
        if (board[row + i][col].state === 'ship') return false
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const newRow = row + i + dr
            const newCol = col + dc
            if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE) {
              if (board[newRow][newCol].state === 'ship') return false
            }
          }
        }
      }
    }
    return true
  }

  const placeShip = (board: Cell[][], row: number, col: number, length: number, orientation: Orientation, shipId: number): Cell[][] => {
    const newBoard = JSON.parse(JSON.stringify(board))
    if (orientation === 'horizontal') {
      for (let i = 0; i < length; i++) {
        newBoard[row][col + i] = { state: 'ship' as CellState, shipId }
      }
    } else {
      for (let i = 0; i < length; i++) {
        newBoard[row + i][col] = { state: 'ship' as CellState, shipId }
      }
    }
    return newBoard
  }

  const handleCellHover = (row: number, col: number) => {
    if (gamePhase !== 'placement' || currentShipIndex >= playerShips.length) return
    
    const ship = playerShips[currentShipIndex]
    const cells: Coordinate[] = []
    
    if (canPlaceShip(playerBoard, row, col, ship.length, shipOrientation)) {
      if (shipOrientation === 'horizontal') {
        for (let i = 0; i < ship.length; i++) {
          cells.push({ row, col: col + i })
        }
      } else {
        for (let i = 0; i < ship.length; i++) {
          cells.push({ row: row + i, col })
        }
      }
    }
    setHoveredCells(cells)
  }

  const handleCellClick = (row: number, col: number) => {
    if (gamePhase === 'placement' && currentShipIndex < playerShips.length) {
      const ship = playerShips[currentShipIndex]
      if (canPlaceShip(playerBoard, row, col, ship.length, shipOrientation)) {
        const newBoard = placeShip(playerBoard, row, col, ship.length, shipOrientation, currentShipIndex)
        setPlayerBoard(newBoard)
        
        const newShips = [...playerShips]
        newShips[currentShipIndex].placed = true
        setPlayerShips(newShips)
        
        if (currentShipIndex === playerShips.length - 1) {
          placeAIShips()
          setGamePhase('battle')
          setMessage("Battle begins! Click on the opponent's board to fire")
        } else {
          setCurrentShipIndex(currentShipIndex + 1)
          setMessage(`Place your ${playerShips[currentShipIndex + 1].name}`)
        }
        setHoveredCells([])
      }
    } else if (gamePhase === 'battle' && isPlayerTurn) {
      handlePlayerShot(row, col)
    }
  }

  const placeAIShips = () => {
    let newBoard = JSON.parse(JSON.stringify(aiBoard))
    
    SHIPS.forEach((ship, shipId) => {
      let placed = false
      let attempts = 0
      while (!placed && attempts < 100) {
        const row = Math.floor(Math.random() * BOARD_SIZE)
        const col = Math.floor(Math.random() * BOARD_SIZE)
        const orientation: Orientation = Math.random() > 0.5 ? 'horizontal' : 'vertical'
        
        if (canPlaceShip(newBoard, row, col, ship.length, orientation)) {
          newBoard = placeShip(newBoard, row, col, ship.length, orientation, shipId)
          placed = true
        }
        attempts++
      }
    })
    
    setAIBoard(newBoard)
  }

  const handlePlayerShot = (row: number, col: number) => {
    if (aiBoard[row][col].state === 'hit' || aiBoard[row][col].state === 'miss') return
    
    const newBoard = JSON.parse(JSON.stringify(aiBoard))
    const isHit = newBoard[row][col].state === 'ship'
    
    if (isHit) {
      newBoard[row][col].state = 'hit'
      setMessage('Hit! Take another shot!')
      setPlayerScore(playerScore + 1)
      
      const shipId = newBoard[row][col].shipId
      if (isShipSunk(newBoard, shipId!)) {
        markShipAsSunk(newBoard, shipId!)
        setMessage(`You sunk the AI's ${SHIPS[shipId!].name}!`)
      }
      
      if (checkWin(newBoard)) {
        setWinner('player')
        setGamePhase('gameover')
        setMessage('Victory! You defeated the AI!')
      }
    } else {
      newBoard[row][col].state = 'miss'
      setMessage("Miss! AI's turn...")
      setIsPlayerTurn(false)
      setTimeout(() => handleAITurn(), 1000)
    }
    
    setAIBoard(newBoard)
  }

  const handleAITurn = () => {
    let target: Coordinate | null = null
    
    if (difficulty === 'easy') {
      target = getRandomTarget()
    } else if (difficulty === 'medium') {
      target = getMediumAITarget()
    } else {
      target = getHardAITarget()
    }
    
    if (!target) {
      setIsPlayerTurn(true)
      return
    }
    
    const newBoard = JSON.parse(JSON.stringify(playerBoard))
    const isHit = newBoard[target.row][target.col].state === 'ship'
    
    if (isHit) {
      newBoard[target.row][target.col].state = 'hit'
      setMessage(`AI hit your ship at ${String.fromCharCode(65 + target.row)}${target.col + 1}!`)
      setAIScore(aiScore + 1)
      
      const newMemory = { ...aiMemory }
      newMemory.huntMode = true
      newMemory.lastHit = target
      newMemory.hitShipCells.push(target)
      
      if (difficulty !== 'easy') {
        const adjacentCells = getAdjacentCells(target.row, target.col)
        adjacentCells.forEach(cell => {
          if (!newMemory.targetQueue.some(t => t.row === cell.row && t.col === cell.col)) {
            newMemory.targetQueue.push(cell)
          }
        })
      }
      
      const shipId = newBoard[target.row][target.col].shipId
      if (isShipSunk(newBoard, shipId!)) {
        markShipAsSunk(newBoard, shipId!)
        setMessage(`AI sunk your ${SHIPS[shipId!].name}!`)
        newMemory.huntMode = false
        newMemory.targetQueue = []
        newMemory.hitShipCells = []
      }
      
      setAIMemory(newMemory)
      
      if (checkWin(newBoard)) {
        setWinner('ai')
        setGamePhase('gameover')
        setMessage('Defeat! The AI won this battle.')
      } else {
        setTimeout(() => handleAITurn(), 1000)
      }
    } else {
      newBoard[target.row][target.col].state = 'miss'
      setMessage(`AI missed at ${String.fromCharCode(65 + target.row)}${target.col + 1}. Your turn!`)
      
      if (difficulty !== 'easy' && aiMemory.targetQueue.length > 0) {
        const newMemory = { ...aiMemory }
        newMemory.targetQueue = newMemory.targetQueue.filter(
          t => !(t.row === target!.row && t.col === target!.col)
        )
        setAIMemory(newMemory)
      }
      
      setIsPlayerTurn(true)
    }
    
    setPlayerBoard(newBoard)
  }

  const getRandomTarget = (): Coordinate | null => {
    const available: Coordinate[] = []
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (playerBoard[row][col].state !== 'hit' && playerBoard[row][col].state !== 'miss') {
          available.push({ row, col })
        }
      }
    }
    return available.length > 0 ? available[Math.floor(Math.random() * available.length)] : null
  }

  const getMediumAITarget = (): Coordinate | null => {
    if (aiMemory.targetQueue.length > 0) {
      const target = aiMemory.targetQueue[0]
      if (playerBoard[target.row][target.col].state !== 'hit' && 
          playerBoard[target.row][target.col].state !== 'miss') {
        return target
      }
      const newMemory = { ...aiMemory }
      newMemory.targetQueue.shift()
      setAIMemory(newMemory)
      return getMediumAITarget()
    }
    return getRandomTarget()
  }

  const getHardAITarget = (): Coordinate | null => {
    if (aiMemory.targetQueue.length > 0) {
      if (aiMemory.hitShipCells.length >= 2) {
        const sortedHits = [...aiMemory.hitShipCells].sort((a, b) => {
          if (a.row === b.row) return a.col - b.col
          return a.row - b.row
        })
        
        const isHorizontal = sortedHits[0].row === sortedHits[1].row
        
        if (isHorizontal) {
          const row = sortedHits[0].row
          const minCol = Math.min(...sortedHits.map(h => h.col))
          const maxCol = Math.max(...sortedHits.map(h => h.col))
          
          if (maxCol + 1 < BOARD_SIZE && 
              playerBoard[row][maxCol + 1].state !== 'hit' && 
              playerBoard[row][maxCol + 1].state !== 'miss') {
            return { row, col: maxCol + 1 }
          }
          if (minCol - 1 >= 0 && 
              playerBoard[row][minCol - 1].state !== 'hit' && 
              playerBoard[row][minCol - 1].state !== 'miss') {
            return { row, col: minCol - 1 }
          }
        } else {
          const col = sortedHits[0].col
          const minRow = Math.min(...sortedHits.map(h => h.row))
          const maxRow = Math.max(...sortedHits.map(h => h.row))
          
          if (maxRow + 1 < BOARD_SIZE && 
              playerBoard[maxRow + 1][col].state !== 'hit' && 
              playerBoard[maxRow + 1][col].state !== 'miss') {
            return { row: maxRow + 1, col }
          }
          if (minRow - 1 >= 0 && 
              playerBoard[minRow - 1][col].state !== 'hit' && 
              playerBoard[minRow - 1][col].state !== 'miss') {
            return { row: minRow - 1, col }
          }
        }
      }
      
      const target = aiMemory.targetQueue[0]
      if (playerBoard[target.row][target.col].state !== 'hit' && 
          playerBoard[target.row][target.col].state !== 'miss') {
        return target
      }
      const newMemory = { ...aiMemory }
      newMemory.targetQueue.shift()
      setAIMemory(newMemory)
      return getHardAITarget()
    }
    
    const probMap: number[][] = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0))
    
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (playerBoard[row][col].state === 'hit' || playerBoard[row][col].state === 'miss') {
          continue
        }
        
        SHIPS.forEach(ship => {
          ['horizontal', 'vertical'].forEach(orientation => {
            if (canPlaceShip(playerBoard, row, col, ship.length, orientation as Orientation)) {
              if (orientation === 'horizontal') {
                for (let i = 0; i < ship.length; i++) {
                  probMap[row][col + i]++
                }
              } else {
                for (let i = 0; i < ship.length; i++) {
                  probMap[row + i][col]++
                }
              }
            }
          })
        })
      }
    }
    
    let maxProb = 0
    const bestTargets: Coordinate[] = []
    
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (playerBoard[row][col].state !== 'hit' && playerBoard[row][col].state !== 'miss') {
          if (probMap[row][col] > maxProb) {
            maxProb = probMap[row][col]
            bestTargets.length = 0
            bestTargets.push({ row, col })
          } else if (probMap[row][col] === maxProb) {
            bestTargets.push({ row, col })
          }
        }
      }
    }
    
    return bestTargets.length > 0 ? bestTargets[Math.floor(Math.random() * bestTargets.length)] : getRandomTarget()
  }

  const getAdjacentCells = (row: number, col: number): Coordinate[] => {
    const adjacent: Coordinate[] = []
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]
    
    directions.forEach(([dr, dc]) => {
      const newRow = row + dr
      const newCol = col + dc
      if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE) {
        if (playerBoard[newRow][newCol].state !== 'hit' && 
            playerBoard[newRow][newCol].state !== 'miss') {
          adjacent.push({ row: newRow, col: newCol })
        }
      }
    })
    
    return adjacent
  }

  const isShipSunk = (board: Cell[][], shipId: number): boolean => {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (board[row][col].shipId === shipId && board[row][col].state === 'ship') {
          return false
        }
      }
    }
    return true
  }

  const markShipAsSunk = (board: Cell[][], shipId: number) => {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (board[row][col].shipId === shipId) {
          board[row][col].state = 'sunk'
        }
      }
    }
  }

  const checkWin = (board: Cell[][]): boolean => {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (board[row][col].state === 'ship') {
          return false
        }
      }
    }
    return true
  }

  const resetGame = () => {
    initializeBoards()
    setPlayerShips(SHIPS.map(s => ({ ...s })))
    setCurrentShipIndex(0)
    setShipOrientation('horizontal')
    setHoveredCells([])
    setIsPlayerTurn(true)
    setWinner(null)
    setAIMemory({ huntMode: false, targetQueue: [], hitShipCells: [] })
    setPlayerScore(0)
    setAIScore(0)
    setMessage('')
    setGamePhase('welcome')
  }

  const renderCell = (row: number, col: number, isPlayerBoard: boolean) => {
    const board = isPlayerBoard ? playerBoard : aiBoard
    const cell = board[row][col]
    const isHovered = hoveredCells.some(c => c.row === row && c.col === col)
    
    let bgColor = 'bg-blue-400'
    let content = null
    
    if (isPlayerBoard && cell.state === 'ship') {
      bgColor = 'bg-gray-600'
      content = <Ship className="w-4 h-4 text-gray-300" />
    }
    
    if (cell.state === 'hit') {
      bgColor = 'bg-red-600'
      content = <Target className="w-4 h-4 text-white" />
    } else if (cell.state === 'miss') {
      bgColor = 'bg-blue-200'
      content = <div className="w-2 h-2 bg-white rounded-full" />
    } else if (cell.state === 'sunk') {
      bgColor = 'bg-red-800'
      content = <Anchor className="w-4 h-4 text-gray-300" />
    }
    
    if (isHovered && gamePhase === 'placement') {
      bgColor = 'bg-green-400'
    }
    
    return (
      <div
        key={`${row}-${col}`}
        className={`${bgColor} border border-blue-600 flex items-center justify-center cursor-pointer hover:opacity-80 transition-all`}
        style={{ width: '100%', paddingBottom: '100%', position: 'relative' }}
        onMouseEnter={() => isPlayerBoard && handleCellHover(row, col)}
        onMouseLeave={() => setHoveredCells([])}
        onClick={() => handleCellClick(row, col)}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          {content}
        </div>
      </div>
    )
  }

  const renderBoard = (isPlayerBoard: boolean) => {
    const scale = isPlayerBoard ? 'scale-100' : 'scale-75'
    const opacity = isPlayerBoard ? 'opacity-100' : 'opacity-90'
    
    return (
      <div className={`${scale} ${opacity} transition-all`}>
        <div className="grid grid-cols-11 gap-1 bg-amber-800 p-4 rounded-lg shadow-2xl border-4 border-amber-900">
          <div></div>
          {Array.from({ length: BOARD_SIZE }, (_, i) => (
            <div key={i} className="text-center text-amber-100 font-bold text-sm">
              {i + 1}
            </div>
          ))}
          {Array.from({ length: BOARD_SIZE }, (_, row) => (
            <>
              <div key={`label-${row}`} className="flex items-center justify-center text-amber-100 font-bold text-sm">
                {String.fromCharCode(65 + row)}
              </div>
              {Array.from({ length: BOARD_SIZE }, (_, col) => renderCell(row, col, isPlayerBoard))}
            </>
          ))}
        </div>
      </div>
    )
  }

  if (gamePhase === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-900 via-amber-800 to-amber-900 flex items-center justify-center p-8">
        <div className="text-center space-y-8 max-w-2xl">
          <div className="space-y-4">
            <Ship className="w-24 h-24 mx-auto text-amber-100" />
            <h1 className="text-6xl font-bold text-amber-100 tracking-wider">BATTLESHIP</h1>
            <p className="text-xl text-amber-200">Command your fleet and sink the enemy!</p>
          </div>
          <Button 
            onClick={startGame}
            className="bg-red-700 hover:bg-red-800 text-white text-2xl px-12 py-6 rounded-lg shadow-lg"
          >
            Start Battle
          </Button>
        </div>
      </div>
    )
  }

  if (gamePhase === 'difficulty') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-900 via-amber-800 to-amber-900 flex items-center justify-center p-8">
        <div className="text-center space-y-8 max-w-2xl">
          <h2 className="text-4xl font-bold text-amber-100">Select Difficulty</h2>
          <div className="space-y-4">
            <Button 
              onClick={() => selectDifficulty('easy')}
              className="w-full bg-green-600 hover:bg-green-700 text-white text-xl px-8 py-6 rounded-lg shadow-lg"
            >
              Easy - Random AI
            </Button>
            <Button 
              onClick={() => selectDifficulty('medium')}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white text-xl px-8 py-6 rounded-lg shadow-lg"
            >
              Medium - Hunting AI
            </Button>
            <Button 
              onClick={() => selectDifficulty('hard')}
              className="w-full bg-red-600 hover:bg-red-700 text-white text-xl px-8 py-6 rounded-lg shadow-lg"
            >
              Hard - Strategic AI
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (gamePhase === 'gameover') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-900 via-amber-800 to-amber-900 flex items-center justify-center p-8">
        <div className="text-center space-y-8 max-w-2xl">
          <Trophy className={`w-32 h-32 mx-auto ${winner === 'player' ? 'text-yellow-400' : 'text-gray-400'}`} />
          <h2 className="text-5xl font-bold text-amber-100">
            {winner === 'player' ? 'VICTORY!' : 'DEFEAT'}
          </h2>
          <div className="text-2xl text-amber-200 space-y-2">
            <p>Your Hits: {playerScore}</p>
            <p>AI Hits: {aiScore}</p>
          </div>
          <Button 
            onClick={resetGame}
            className="bg-blue-700 hover:bg-blue-800 text-white text-2xl px-12 py-6 rounded-lg shadow-lg"
          >
            Play Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-8"
      style={{
        background: 'linear-gradient(135deg, #8B4513 0%, #A0522D 50%, #8B4513 100%)',
        backgroundImage: `
          repeating-linear-gradient(90deg, rgba(139, 69, 19, 0.3) 0px, transparent 1px, transparent 100px, rgba(139, 69, 19, 0.3) 101px),
          repeating-linear-gradient(0deg, rgba(139, 69, 19, 0.3) 0px, transparent 1px, transparent 100px, rgba(139, 69, 19, 0.3) 101px)
        `
      }}
    >
      <div className="mb-6 text-center space-y-2">
        <h1 className="text-4xl font-bold text-amber-100 tracking-wider">BATTLESHIP</h1>
        <p className="text-xl text-amber-200">{message}</p>
        {gamePhase === 'battle' && (
          <div className="flex gap-8 justify-center text-amber-100 text-lg">
            <div>Your Hits: {playerScore}</div>
            <div>AI Hits: {aiScore}</div>
          </div>
        )}
      </div>

      {gamePhase === 'placement' && (
        <div className="mb-6 space-y-4">
          <div className="flex gap-4 justify-center">
            {playerShips.map((ship, idx) => (
              <div 
                key={ship.name}
                className={`px-4 py-2 rounded ${
                  ship.placed ? 'bg-green-700' : idx === currentShipIndex ? 'bg-blue-700' : 'bg-gray-700'
                } text-white`}
              >
                {ship.name} ({ship.length})
              </div>
            ))}
          </div>
          <Button
            onClick={() => setShipOrientation(shipOrientation === 'horizontal' ? 'vertical' : 'horizontal')}
            className="bg-amber-700 hover:bg-amber-800 text-white"
          >
            <RotateCw className="w-4 h-4 mr-2" />
            Rotate ({shipOrientation})
          </Button>
        </div>
      )}

      <div className="flex gap-16 items-center">
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-amber-100 text-center">Your Fleet</h3>
          {renderBoard(true)}
        </div>

        {gamePhase === 'battle' && (
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-amber-100 text-center">Enemy Waters</h3>
            {renderBoard(false)}
          </div>
        )}
      </div>

      {gamePhase === 'battle' && (
        <Button
          onClick={resetGame}
          className="mt-8 bg-gray-700 hover:bg-gray-800 text-white"
        >
          New Game
        </Button>
      )}
    </div>
  )
}

export default App
