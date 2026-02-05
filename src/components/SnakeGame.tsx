import { useState, useEffect, useCallback, useRef } from 'react';
import microsoftLogo from '@/assets/microsoft-logo.jpg';
import acmLogo from '@/assets/acm-logo.jpg';
import googleLogo from '@/assets/google-logo.jpg';

const GRID_SIZE = 15;
const CELL_SIZE = 40;
const INITIAL_SPEED = 150;
const SPEED_INCREASE = 5;
const MIN_SPEED = 50;

type Position = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface Obstacle {
  position: Position;
  logo: string;
  id: number;
}

const SnakeGame = () => {
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Position>({ x: 5, y: 5 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);

  const directionRef = useRef(direction);
  const obstacleIdRef = useRef(0);

  // Get all positions within a 1-tile radius of the snake
  const getSnakeBufferZone = useCallback((snakePositions: Position[]): Position[] => {
    const bufferZone: Position[] = [];
    snakePositions.forEach(pos => {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const bufferPos = { x: pos.x + dx, y: pos.y + dy };
          if (bufferPos.x >= 0 && bufferPos.x < GRID_SIZE &&
            bufferPos.y >= 0 && bufferPos.y < GRID_SIZE) {
            bufferZone.push(bufferPos);
          }
        }
      }
    });
    return bufferZone;
  }, []);

  const generateRandomPosition = useCallback((excludePositions: Position[]): Position => {
    let newPosition: Position;
    do {
      newPosition = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (
      excludePositions.some(pos => pos.x === newPosition.x && pos.y === newPosition.y)
    );
    return newPosition;
  }, []);

  const generateObstacles = useCallback((count: number, snakePositions: Position[], foodPosition: Position): Obstacle[] => {
    const newObstacles: Obstacle[] = [];
    const logos = [acmLogo, googleLogo];

    // Exclude snake, buffer zone around snake, and food position
    const bufferZone = getSnakeBufferZone(snakePositions);
    const excludePositions = [...snakePositions, ...bufferZone, foodPosition];

    for (let i = 0; i < count; i++) {
      const position = generateRandomPosition([...excludePositions, ...newObstacles.map(o => o.position)]);
      newObstacles.push({
        position,
        logo: logos[i % logos.length],
        id: obstacleIdRef.current++,
      });
    }
    return newObstacles;
  }, [generateRandomPosition, getSnakeBufferZone]);

  const initGame = useCallback(() => {
    const initialSnake = [{ x: 10, y: 10 }];
    setSnake(initialSnake);
    setDirection('RIGHT');
    directionRef.current = 'RIGHT';
    setGameOver(false);
    setScore(0);
    setSpeed(INITIAL_SPEED);

    const bufferZone = getSnakeBufferZone(initialSnake);
    const newFood = generateRandomPosition([...initialSnake, ...bufferZone]);
    setFood(newFood);

    const newObstacles = generateObstacles(3, initialSnake, newFood);
    setObstacles(newObstacles);
  }, [generateRandomPosition, generateObstacles, getSnakeBufferZone]);

  const startGame = () => {
    setGameStarted(true);
    initGame();
  };

  const moveSnake = useCallback(() => {
    if (gameOver || isPaused || !gameStarted) return;

    setSnake(prevSnake => {
      const head = { ...prevSnake[0] };
      const currentDirection = directionRef.current;

      switch (currentDirection) {
        case 'UP':
          head.y -= 1;
          break;
        case 'DOWN':
          head.y += 1;
          break;
        case 'LEFT':
          head.x -= 1;
          break;
        case 'RIGHT':
          head.x += 1;
          break;
      }

      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        setGameOver(true);
        if (score > highScore) {
          setHighScore(score);
        }
        return prevSnake;
      }

      if (prevSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
        setGameOver(true);
        if (score > highScore) {
          setHighScore(score);
        }
        return prevSnake;
      }

      if (obstacles.some(obs => obs.position.x === head.x && obs.position.y === head.y)) {
        setGameOver(true);
        if (score > highScore) {
          setHighScore(score);
        }
        return prevSnake;
      }

      const newSnake = [head, ...prevSnake];

      if (head.x === food.x && head.y === food.y) {
        setScore(prev => prev + 10);
        setSpeed(prev => Math.max(MIN_SPEED, prev - SPEED_INCREASE));

        // Generate new food position (exclude snake and buffer zone)
        const bufferZone = getSnakeBufferZone(newSnake);
        const newFood = generateRandomPosition([...newSnake, ...bufferZone]);
        setFood(newFood);

        // Randomize all obstacles on every food consumption
        const obstacleCount = Math.min(3 + Math.floor((score + 10) / 50), 8); // Gradually increase obstacles, max 8
        const newObstacles = generateObstacles(obstacleCount, newSnake, newFood);
        setObstacles(newObstacles);

        return newSnake;
      }

      newSnake.pop();
      return newSnake;
    });
  }, [gameOver, isPaused, gameStarted, food, obstacles, score, highScore, generateRandomPosition, generateObstacles, getSnakeBufferZone]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!gameStarted) return;

      if (e.key === ' ') {
        e.preventDefault();
        if (gameOver) {
          initGame();
        } else {
          setIsPaused(prev => !prev);
        }
        return;
      }

      if (gameOver || isPaused) return;

      const currentDir = directionRef.current;
      let newDirection: Direction | null = null;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (currentDir !== 'DOWN') newDirection = 'UP';
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (currentDir !== 'UP') newDirection = 'DOWN';
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (currentDir !== 'RIGHT') newDirection = 'LEFT';
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (currentDir !== 'LEFT') newDirection = 'RIGHT';
          break;
      }

      if (newDirection) {
        directionRef.current = newDirection;
        setDirection(newDirection);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameOver, isPaused, gameStarted, initGame]);

  useEffect(() => {
    const gameLoop = setInterval(moveSnake, speed);
    return () => clearInterval(gameLoop);
  }, [moveSnake, speed]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background cyber-grid relative overflow-hidden">
      {/* Scanlines overlay */}
      <div className="absolute inset-0 scanlines" />

      {/* Glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

      {/* Title */}
      <h1 className="text-4xl md:text-6xl font-cyber font-bold mb-4 neon-text-cyan tracking-wider">
        MTC SNAKE
      </h1>

      {/* Score display */}
      <div className="flex gap-8 mb-4 font-cyber-alt text-xl">
        <div className="px-6 py-2 border-2 border-primary rounded-lg neon-border-cyan bg-card/50">
          <span className="text-muted-foreground">SCORE: </span>
          <span className="neon-text-cyan">{score}</span>
        </div>
        <div className="px-6 py-2 border-2 border-secondary rounded-lg neon-border-red bg-card/50">
          <span className="text-muted-foreground">HIGH: </span>
          <span className="neon-text-red">{highScore}</span>
        </div>
      </div>

      {/* Game board */}
      <div
        className="relative border-4 border-primary rounded-lg neon-border-cyan bg-cyber-dark/80 backdrop-blur-sm"
        style={{
          width: GRID_SIZE * CELL_SIZE + 8,
          height: GRID_SIZE * CELL_SIZE + 8
        }}
      >
        {/* Grid lines */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--neon-cyan) / 0.3) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--neon-cyan) / 0.3) 1px, transparent 1px)
            `,
            backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
          }}
        />

        {/* Snake */}
        {snake.map((segment, index) => (
          <div
            key={index}
            className="absolute rounded-xl transition-all duration-75"
            style={{
              left: segment.x * CELL_SIZE + 2,
              top: segment.y * CELL_SIZE + 2,
              width: CELL_SIZE - 4,
              height: CELL_SIZE - 4,
              background: index === 0
                ? 'linear-gradient(135deg, hsl(270 60% 50%), hsl(220 70% 50%))'
                : `linear-gradient(135deg, hsl(270 60% ${55 - index * 3}%), hsl(220 70% ${50 - index * 3}%))`,
              boxShadow: index === 0
                ? '0 0 15px hsl(270 60% 50% / 0.8), 0 0 30px hsl(270 60% 50% / 0.4)'
                : '0 0 10px hsl(270 60% 50% / 0.5)',
              border: '2px solid hsl(270 50% 40%)',
            }}
          />
        ))}

        {/* Food (Microsoft logo) */}
        <div
          className="absolute rounded-full overflow-hidden pulse-glow"
          style={{
            left: food.x * CELL_SIZE + 2,
            top: food.y * CELL_SIZE + 2,
            width: CELL_SIZE - 4,
            height: CELL_SIZE - 4,
            boxShadow: '0 0 15px hsl(195 100% 55% / 0.8), 0 0 25px hsl(195 100% 55% / 0.4)',
          }}
        >
          <img
            src={microsoftLogo}
            alt="Microsoft"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Obstacles (ACM & Google logos) */}
        {obstacles.map((obstacle) => (
          <div
            key={obstacle.id}
            className="absolute rounded-full overflow-hidden"
            style={{
              left: obstacle.position.x * CELL_SIZE + 2,
              top: obstacle.position.y * CELL_SIZE + 2,
              width: CELL_SIZE - 4,
              height: CELL_SIZE - 4,
              boxShadow: '0 0 10px hsl(350 100% 55% / 0.6), 0 0 20px hsl(350 100% 55% / 0.3)',
              border: '2px solid hsl(350 100% 55%)',
            }}
          >
            <img
              src={obstacle.logo}
              alt="Obstacle"
              className="w-full h-full object-cover"
            />
          </div>
        ))}

        {/* Start screen */}
        {!gameStarted && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm rounded-lg">
            <h2 className="text-3xl font-cyber neon-text-red mb-6 tracking-wide">READY?</h2>
            <button
              onClick={startGame}
              className="px-8 py-4 text-xl font-cyber border-2 border-primary rounded-lg 
                neon-border-cyan bg-card/50 text-foreground hover:bg-primary/20 
                transition-all duration-300 hover:scale-105"
            >
              START GAME
            </button>
          </div>
        )}

        {/* Pause overlay */}
        {isPaused && !gameOver && gameStarted && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm rounded-lg">
            <h2 className="text-4xl font-cyber neon-text-cyan tracking-widest">PAUSED</h2>
          </div>
        )}

        {/* Game over overlay */}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm rounded-lg">
            <h2 className="text-4xl font-cyber neon-text-red mb-4 tracking-widest">
              GAME OVER
            </h2>
            <p className="text-2xl font-cyber-alt text-foreground mb-2">
              <span className="neon-text-cyan">{score}</span>
            </p>
            {score >= highScore && score > 0 && (
              <p className="text-lg font-cyber-alt neon-text-cyan mb-4">NEW HIGH SCORE!</p>
            )}
            <div className="flex gap-4 mt-4">
              <button
                onClick={initGame}
                className="px-8 py-4 text-xl font-cyber border-2 border-secondary rounded-lg 
                  neon-border-red bg-card/50 text-foreground hover:bg-secondary/20 
                  transition-all duration-300 hover:scale-105"
              >
                PLAY AGAIN
              </button>
              <button
                onClick={() => {
                  setGameOver(false);
                  setGameStarted(false);
                }}
                className="px-8 py-4 text-xl font-cyber border-2 border-muted-foreground rounded-lg 
                  bg-card/50 text-foreground hover:bg-muted/50 
                  transition-all duration-300 hover:scale-105"
              >
                EXIT
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls info */}
      <div className="mt-6 text-muted-foreground font-cyber-alt text-center">
        <p>WASD / Arrow Keys • SPACE to pause</p>
      </div>
    </div>
  );
};

export default SnakeGame;
