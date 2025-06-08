import React, { useState } from 'react';
import './App.css';

interface FieldState {
  grid: Plot[][];
}

interface Plot {
  isDug: boolean;
  isSown: boolean;
  water: number;
  fertilizer: number;
  stage: 'empty' | 'sprout' | 'growing' | 'mature' | 'dead';
  daysSinceWater: number;
  days: number;
}

interface PlayerState {
  money: number;
  potatoes: number;
  fertilizer: number;
  seeds: number;
  trowel?: { durability: number } | null;
}

const GRID_SIZE = 5;
const MAX_FIELD_SIZE = 12;
const TROWEL_MAX_DURABILITY = 20;

function createInitialField(): FieldState {
  return {
    grid: Array(GRID_SIZE)
      .fill(null)
      .map(() =>
        Array(GRID_SIZE)
          .fill(null)
          .map(() => ({
            isDug: false,
            isSown: false,
            water: 0,
            fertilizer: 0,
            stage: 'empty' as const,
            daysSinceWater: 0,
            days: 0,
          }))
      ),
  };
}

const initialPlayer: PlayerState = {
  money: 25, // Lower starting money
  potatoes: 0,
  fertilizer: 0,
  seeds: 3,
  trowel: null,
};

// --- Upgrades system ---
const UPGRADE_COSTS = {
  irrigation: 1200,
  fertilizer: 1800,
  tractor: 3500,
};

type Upgrades = {
  irrigation: boolean;
  fertilizer: boolean;
  tractor: boolean;
};

const initialUpgrades: Upgrades = {
  irrigation: false,
  fertilizer: false,
  tractor: false,
};

function App() {
  const [field, setField] = useState<FieldState>(createInitialField());
  const [player, setPlayer] = useState<PlayerState>(initialPlayer);
  const [selected, setSelected] = useState<{x: number, y: number} | null>(null);
  const [day, setDay] = React.useState(1);
  const [timer, setTimer] = React.useState(20); // 20 seconds per day (was 10)
  const [selectedTool, setSelectedTool] = React.useState<null | 'dig' | 'sow' | 'water' | 'fertilize' | 'harvest' | 'trowel'>(null);
  const [showInventory, setShowInventory] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [fieldSize, setFieldSize] = useState(GRID_SIZE);
  const [title, setTitle] = useState('POTATOES!!!');
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  // Quality of life: Add a visual indicator for auto/manual save
  const [eventLog, setEventLog] = useState<{ msg: string; type: 'good' | 'bad' } | null>(null);
  const eventLogTimeout = React.useRef<NodeJS.Timeout | null>(null);

  // Help dialog state
  const [showHelp, setShowHelp] = useState(false);

  // Tool menu state
  const [showToolMenu, setShowToolMenu] = useState(false);
  const [toolMenuPos, setToolMenuPos] = React.useState<{top: number, left: number} | null>(null);
  // Upgrades state (fix missing setUpgrades)
  const [upgrades, setUpgrades] = useState<Upgrades>(initialUpgrades);

  // Ref for Tools button to anchor dropdown
  const toolsBtnRef = React.useRef<HTMLButtonElement | null>(null);
  // Ref for Tools dropdown
  const toolsDropdownRef = React.useRef<HTMLDivElement | null>(null);

  // Show/hide tool menu and set position
  const handleShowToolMenu = () => {
    if (toolsBtnRef.current) {
      const rect = toolsBtnRef.current.getBoundingClientRect();
      setToolMenuPos({
        top: rect.bottom + window.scrollY + 4, // 4px gap below button
        left: rect.left + window.scrollX
      });
    }
    setShowToolMenu(v => !v);
  };

  // --- Weather system ---
  type Weather = 'none' | 'rain';
  const [weather, setWeather] = React.useState<Weather>('none');
  const [rainDaysLeft, setRainDaysLeft] = React.useState(0); // How many days rain will last (0 = not raining)
  const [rainForecast, setRainForecast] = React.useState<{chance: number, duration: number}>({chance: 0, duration: 0});
  const [showWeatherDialog, setShowWeatherDialog] = React.useState(false);
  const [stopChance, setStopChance] = React.useState<number | null>(null);

  // Weather logic: forecast rain for next day at end of each day
  React.useEffect(() => {
    // Only forecast if timer just reset (new day)
    // Rain chance: 10-60% random each day
    if (timer === 20) {
      const chance = Math.floor(Math.random() * 51) + 10; // 10-60%
      const willRain = Math.random() * 100 < chance;
      setRainForecast({
        chance,
        duration: willRain ? Math.floor(Math.random() * 3) + 1 : 0
      });
    }
  }, [timer]);

  // Stop rain when days run out
  React.useEffect(() => {
    if (weather === 'rain' && rainDaysLeft === 0) {
      setWeather('none');
      setStopChance(null);
    }
  }, [rainDaysLeft, weather]);

  // Helper to show event log
  const showEvent = (msg: string, type: 'good' | 'bad' = 'bad') => {
    setEventLog({ msg, type });
    if (eventLogTimeout.current) clearTimeout(eventLogTimeout.current);
    eventLogTimeout.current = setTimeout(() => setEventLog(null), 2000);
  };

  const nextDay = () => {
    // Decrement rain days left at the start of the day
    setRainDaysLeft(prev => {
      const newDays = prev > 0 ? prev - 1 : 0;
      // Set weather state for this day
      setWeather(newDays > 0 ? 'rain' : 'none');
      return newDays;
    });
    setDay(d => d + 1);
    setField(prev => {
      const grid = prev.grid.map(row => row.map(plot => {
        let newPlot = { ...plot };
        // Rain: water all dug plots (not just sown)
        if (rainDaysLeft > 0 && newPlot.isDug && newPlot.stage !== 'dead') {
          newPlot.water += 1;
          newPlot.daysSinceWater = 0;
        }
        // Irrigation upgrade: water all sown, non-dead plots
        if (upgrades.irrigation && newPlot.isSown && newPlot.stage !== 'dead') {
          newPlot.water += 1;
          newPlot.daysSinceWater = 0;
        }
        if (newPlot.isSown && newPlot.stage !== 'dead' && newPlot.stage !== 'empty') {
          newPlot.days++;
          if (newPlot.water > 0) {
            newPlot.daysSinceWater = 0;
            newPlot.water--;
          } else {
            newPlot.daysSinceWater++;
          }
          // Death by drought
          if (newPlot.daysSinceWater >= 3) {
            newPlot.stage = 'dead';
          }
          // Growth logic
          const fertBonus = upgrades.fertilizer || newPlot.fertilizer > 0;
          if (newPlot.stage === 'sprout' && newPlot.days >= (fertBonus ? 1 : 2)) {
            newPlot.stage = 'growing';
            newPlot.days = 0;
          } else if (newPlot.stage === 'growing' && newPlot.days >= (fertBonus ? 1 : 2)) {
            newPlot.stage = 'mature';
          }
        }
        return newPlot;
      }));
      return { grid };
    });
  };

  // --- Weather state update: runs after day/field update ---
  React.useEffect(() => {
    // Only run when day changes (not on mount)
    if (day === 1) return;
    if (rainForecast.duration > 0) {
      setWeather('rain');
      setRainDaysLeft(rainForecast.duration);
      setStopChance(Math.floor(Math.random() * 41) + 30);
    } else {
      setWeather('none');
      setRainDaysLeft(0);
      setStopChance(null);
    }
  }, [day]);

  // --- Render rain overlay immediately if rain is scheduled for today or tomorrow ---
  const showRainOverlay = weather === 'rain' || rainDaysLeft > 0 || rainForecast.duration > 0;

  const handlePlotClick = (x: number, y: number) => {
    if (!selectedTool) {
      setSelected({ x, y });
      showEvent('Select a tool to use.', 'bad');
      return;
    }
    actOnPlot(selectedTool, x, y);
    setSelected(null);
    // Do NOT reset selectedTool here; it stays until user picks another tool
  };

  const actOnPlot = (action: 'dig' | 'sow' | 'water' | 'fertilize' | 'harvest' | 'trowel', x: number, y: number) => {
    setField(prev => {
      const grid = prev.grid.map(row => row.map(plot => ({...plot})));
      const plot = grid[y][x];
      if (action === 'dig') {
        if (!plot.isDug) {
          plot.isDug = true;
          showEvent('You dug the plot!', 'good');
        } else {
          showEvent('Plot already dug.', 'bad');
        }
      } else if (action === 'sow') {
        if (plot.isDug && !plot.isSown && player.seeds > 0) {
          plot.isSown = true;
          plot.stage = 'sprout';
          plot.days = 0;
          plot.daysSinceWater = 0;
          setPlayer(p => ({...p, seeds: p.seeds - 1}));
          showEvent('You sowed potato seeds!', 'good');
        } else if (!plot.isDug) {
          showEvent('Dig the plot first.', 'bad');
        } else if (plot.isSown) {
          showEvent('Already sown.', 'bad');
        } else {
          showEvent('No seeds left!', 'bad');
        }
      } else if (action === 'water') {
        if (plot.isSown && plot.stage !== 'dead') {
          plot.water += 1;
          plot.daysSinceWater = 0;
          showEvent('You watered the plot!', 'good');
        } else if (plot.stage === 'dead') {
          showEvent('This potato is dead.', 'bad');
        } else {
          showEvent('Sow seeds before watering.', 'bad');
        }
      } else if (action === 'fertilize') {
        if (plot.isSown && player.fertilizer > 0 && plot.stage !== 'dead') {
          plot.fertilizer += 1;
          setPlayer(p => ({...p, fertilizer: p.fertilizer - 1}));
          showEvent('You fertilized the plot!', 'good');
        } else if (!plot.isSown) {
          showEvent('Sow seeds before fertilizing.', 'bad');
        } else if (plot.stage === 'dead') {
          showEvent('This potato is dead.', 'bad');
        } else {
          showEvent('No fertilizer left!', 'bad');
        }
      } else if (action === 'harvest') {
        if (plot.isSown && plot.stage === 'mature') {
          setPlayer(p => ({...p, potatoes: p.potatoes + 1}));
          grid[y][x] = {isDug: true, isSown: false, water: 0, fertilizer: 0, stage: 'empty', daysSinceWater: 0, days: 0};
          showEvent('You harvested potatoes!', 'good');
        } else if (plot.stage === 'dead') {
          showEvent('This potato is dead.', 'bad');
        } else {
          showEvent('Plot not ready for harvest.', 'bad');
        }
      } else if (action === 'trowel') {
        if (plot.stage === 'dead' && player.trowel && player.trowel.durability > 0) {
          grid[y][x] = {isDug: true, isSown: false, water: 0, fertilizer: 0, stage: 'empty', daysSinceWater: 0, days: 0};
          setPlayer(p => p.trowel ? {...p, trowel: { durability: p.trowel!.durability - 1 }} : p);
          showEvent('Removed dead plant with the trowel!', 'good');
        } else if (!player.trowel || player.trowel.durability <= 0) {
          showEvent('You need a trowel with durability to remove dead plants!', 'bad');
        } else {
          showEvent('Can only use trowel on dead plants.', 'bad');
        }
      }
      return {grid};
    });
  };

  const sellPotatoes = () => {
    if (player.potatoes > 0) {
      setPlayer(p => ({...p, money: p.money + Number(p.potatoes) * 15, potatoes: 0}));
      showEvent(`Sold potatoes for $${Number(player.potatoes) * 15}!`, 'good');
    } else {
      showEvent('No potatoes to sell!', 'bad');
    }
  };

  // Shop logic
  const buyItem = (item: 'fertilizer' | 'seeds' | 'plot' | 'rename' | 'trowel') => {
    if (item === 'fertilizer') {
      if (player.money >= 10) {
        setPlayer(p => ({...p, money: p.money - 10, fertilizer: p.fertilizer + 1}));
        showEvent('Bought 1 fertilizer!', 'good');
      } else {
        showEvent('Not enough money for fertilizer.', 'bad');
      }
    } else if (item === 'seeds') {
      if (player.money >= 8) {
        setPlayer(p => ({...p, money: p.money - 8, seeds: p.seeds + 1}));
        showEvent('Bought 1 seed!', 'good');
      } else {
        showEvent('Not enough money for seeds.', 'bad');
      }
    } else if (item === 'plot') {
      if (player.money >= 200 && fieldSize < MAX_FIELD_SIZE) {
        setFieldSize(size => size + 1);
        setField(prev => {
          const newGrid = prev.grid.map(row => [
            ...row,
            { isDug: false, isSown: false, water: 0, fertilizer: 0, stage: 'empty' as const, daysSinceWater: 0, days: 0 }
          ]);
          newGrid.push(Array(fieldSize + 1).fill(null).map(() => ({
            isDug: false, isSown: false, water: 0, fertilizer: 0, stage: 'empty' as const, daysSinceWater: 0, days: 0
          })));
          return { grid: newGrid };
        });
        setPlayer(p => ({...p, money: p.money - 200}));
        showEvent('Bought a plot extension!', 'good');
      } else if (fieldSize >= MAX_FIELD_SIZE) {
        showEvent(`Maximum field size reached! (${MAX_FIELD_SIZE}x${MAX_FIELD_SIZE})`, 'bad');
      } else {
        showEvent('Not enough money for plot extension.', 'bad');
      }
    } else if (item === 'rename') {
      if (player.money >= 5000) {
        setShowRenameDialog(true);
      } else {
        showEvent('Not enough money to rename your farm!', 'bad');
      }
    } else if (item === 'trowel') {
      if (player.money >= 2500) {
        if (!player.trowel || player.trowel.durability <= 0) {
          setPlayer(p => ({...p, money: p.money - 2500, trowel: { durability: TROWEL_MAX_DURABILITY }}));
          showEvent('Bought a trowel! Use it to remove dead plants.', 'good');
        } else {
          showEvent('You already have a trowel!', 'bad');
        }
      } else {
        showEvent('Not enough money for trowel.', 'bad');
      }
    }
  };

  // Upgrade purchase logic
  const buyUpgrade = (upgrade: keyof Upgrades) => {
    if (upgrades[upgrade]) {
      showEvent('Upgrade already owned!', 'bad');
      return;
    }
    const cost = UPGRADE_COSTS[upgrade];
    if (player.money >= cost) {
      setPlayer(p => ({ ...p, money: p.money - cost }));
      setUpgrades((u: Upgrades) => ({ ...u, [upgrade]: true }));
      showEvent(`Bought ${upgrade.charAt(0).toUpperCase() + upgrade.slice(1)} upgrade!`, 'good');
    } else {
      showEvent('Not enough money for this upgrade.', 'bad');
    }
  };

  const handleRename = () => {
    if (newTitle.trim().length > 0) {
      setPlayer(p => ({...p, money: p.money - 1500}));
      setTitle(newTitle.trim());
      setShowRenameDialog(false);
      setNewTitle('');
      showEvent('Farm name updated!', 'good');
    } else {
      showEvent('Please enter a valid name.', 'bad');
    }
  };

  React.useEffect(() => {
    if (timer === 0) {
      nextDay();
      setTimer(20); // Reset to 20 seconds per day
      return;
    }
    const interval = setInterval(() => {
      setTimer(t => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // Load game state from localStorage on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('potato-farm-save');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.field && parsed.player && parsed.day && parsed.fieldSize && parsed.title) {
          setField(parsed.field);
          setPlayer(parsed.player);
          setDay(parsed.day);
          setFieldSize(parsed.fieldSize);
          setTitle(parsed.title);
        }
      } catch {}
    }
  }, []);

  // Save game state to localStorage on relevant changes
  React.useEffect(() => {
    const saveData = {
      field,
      player,
      day,
      fieldSize,
      title
    };
    localStorage.setItem('potato-farm-save', JSON.stringify(saveData));
  }, [field, player, day, fieldSize, title]);

  // Manual save function (with indicator)
  const saveGame = () => {
    const saveData = {
      field,
      player,
      day,
      fieldSize,
      title
    };
    localStorage.setItem('potato-farm-save', JSON.stringify(saveData));
    showEvent('Game progress saved!', 'good');
  };

  // Auto-save every minute
  React.useEffect(() => {
    const interval = setInterval(() => {
      const saveData = {
        field,
        player,
        day,
        fieldSize,
        title
      };
      localStorage.setItem('potato-farm-save', JSON.stringify(saveData));
    }, 60000); // 60 seconds
    return () => clearInterval(interval);
  }, [field, player, day, fieldSize, title]);

  // Developer console state
  const [showDevConsole, setShowDevConsole] = React.useState(false);
  const [devConsoleInput, setDevConsoleInput] = React.useState('');
  const [devConsoleLog, setDevConsoleLog] = React.useState<string[]>([]);
  const devCodeRef = React.useRef('');

  // --- DEBUG OVERLAY ---
  const [showDebug, setShowDebug] = React.useState(false);
  const debugInfo = (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      background: 'rgba(0,0,0,0.85)',
      color: '#fff',
      fontSize: 14,
      zIndex: 9999,
      padding: '10px 18px',
      borderTopRightRadius: 12,
      maxWidth: 420,
      pointerEvents: 'auto',
      lineHeight: 1.6
    }}>
      <b>DEBUG INFO</b><br/>
      <b>weather:</b> {String(weather)}<br/>
      <b>rainDaysLeft:</b> {String(rainDaysLeft)}<br/>
      <b>rainForecast:</b> {JSON.stringify(rainForecast)}<br/>
      <b>timer:</b> {String(timer)}<br/>
      <b>showRainOverlay:</b> {weather === 'rain' ? 'YES' : 'NO'}<br/>
      <b>Plots (watered):</b> {field.grid.flat().filter(p => p.water > 0).length}<br/>
      <b>Plots (dug):</b> {field.grid.flat().filter(p => p.isDug).length}<br/>
      <b>Plots (sown):</b> {field.grid.flat().filter(p => p.isSown).length}<br/>
      <button style={{marginTop:8,padding:'2px 10px',borderRadius:6,border:'none',background:'#ffb74d',color:'#222',fontWeight:700,cursor:'pointer'}} onClick={()=>setShowDebug(false)}>Close Debug</button>
    </div>
  );

  // Developer console command handler
  const handleDevConsoleCommand = (cmd: string) => {
    let output = '';
    const command = cmd.trim().toLowerCase();
    if (command === 'help') {
      output = 'Available commands: help, reset, close, enable_weather: rain <days>, enable_weather: none 0, enable_debug, disable_debug';
    } else if (command === 'enable_debug') {
      setShowDebug(true);
      output = 'Debug info enabled.';
    } else if (command === 'disable_debug') {
      setShowDebug(false);
      output = 'Debug info disabled.';
    } else if (command.startsWith('enable_weather')) {
      // Syntax: enable_weather: <type> <days>
      const parts = command.replace('enable_weather:', '').trim().split(/\s+/);
      const type = parts[0];
      const days = parseInt(parts[1]);
      if ((type === 'rain' || type === 'none') && !isNaN(days) && days >= 0) {
        if (type === 'rain') {
          setRainForecast({ chance: 100, duration: days });
          setRainDaysLeft(days); // <-- ensure rain starts immediately
          output = `Weather set to rain for ${days} day(s).`;
        } else {
          setRainForecast({ chance: 0, duration: 0 });
          setRainDaysLeft(0);
          output = 'Weather set to none.';
        }
      } else {
        output = 'Usage: enable_weather: rain <days> or enable_weather: none 0';
      }
    } else if (command === 'close') {
      setShowDevConsole(false);
      output = 'Console closed.';
    } else {
      output = 'Unknown command. Type help for a list.';
    }
    setDevConsoleLog(log => [...log, `> ${cmd}`, output]);
  };

  // Quality of life: Add keyboard shortcuts for quick actions
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Only trigger on keydown events for visible elements (not in input/textarea)
      const active = document.activeElement;
      const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable);
      if (!showDevConsole && !isInput && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        devCodeRef.current += e.key.toLowerCase();
        if (!'aquacheese'.startsWith(devCodeRef.current)) devCodeRef.current = '';
        if (devCodeRef.current === 'aquacheese') {
          setShowDevConsole(true);
          devCodeRef.current = '';
        }
      } else if (!['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
        devCodeRef.current = '';
      }
      // Keyboard shortcuts (no overlap)
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveGame();
        return;
      }
      if (!e.ctrlKey && !e.altKey && !e.metaKey && !showDevConsole) {
        switch (e.key.toLowerCase()) {
          case 'i': setShowInventory(v => !v); break;
          case 'o': setShowShop(v => !v); break;
          case 'n': nextDay(); break;
          case '1': setSelectedTool('dig'); break;
          case '2': setSelectedTool('sow'); break;
          case '3': setSelectedTool('water'); break;
          case '4': setSelectedTool('fertilize'); break;
          case '5': setSelectedTool('harvest'); break;
          case 't': setSelectedTool('trowel'); break;
          default: break;
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nextDay, saveGame, showDevConsole]);

  // --- Mobile: Hidden dev console tap sequence ---
  const tapCountRef = React.useRef(0);
  const tapTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const handleTitleTap = () => {
    if (!isMobile) return;
    tapCountRef.current += 1;
    if (tapCountRef.current === 1) {
      // Start/reset timer
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, 2000);
    }
    if (tapCountRef.current >= 7) {
      setShowDevConsole(true);
      tapCountRef.current = 0;
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    }
  };

  // Dark mode state
  const [darkMode, setDarkMode] = React.useState(() => {
    // Try to load from localStorage, else use system preference
    const saved = localStorage.getItem('potato-farm-dark');
    if (saved !== null) return saved === 'true';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  React.useEffect(() => {
    localStorage.setItem('potato-farm-dark', darkMode ? 'true' : 'false');
    document.body.classList.toggle('dark-mode', darkMode);
    document.documentElement.classList.toggle('dark-mode', darkMode);
  }, [darkMode]);

  // --- Rain overlay (grid-based, always fits desktop) ---
  const RainOverlay = () => {
    // Always use desktop dimensions
    const width = window.innerWidth;
    const height = window.innerHeight;
    const tileSize = 96;
    const cols = Math.ceil(width / tileSize) + 2; // +2 for diagonal entry
    const rows = Math.ceil(height / tileSize) + 10; // +10 for extra bottom coverage
    // Animate grid
    const [offset, setOffset] = React.useState(0);
    React.useEffect(() => {
      let running = true;
      function animate() {
        setOffset(o => (o + 3) % (tileSize * 2)); // speed and wrap
        if (running) requestAnimationFrame(animate);
      }
      animate();
      return () => { running = false; };
    }, []);
    return (
      <div style={{
        pointerEvents: 'none',
        position: 'fixed',
        top: 0, left: 0, width: '100vw', height: '100vh',
        zIndex: 999,
        overflow: 'hidden',
      }} aria-hidden="true">
        {Array.from({length: rows}).map((_, row) =>
          Array.from({length: cols}).map((_, col) => {
            // Diagonal movement: offset both x and y
            // Shift grid so rain starts off-screen in the top-right and ends off-screen in the bottom-left
            const x = (col - 2) * tileSize - offset + tileSize * 1.5;
            const y = (row - 2) * tileSize + offset - tileSize * 1.5;
            // Only render if in viewport (with a buffer for smooth entry/exit)
            if (x > width + tileSize || y > height + 16 * tileSize || x < -4 * tileSize || y < -2 * tileSize) return null;
            return (
              <img
                key={row + '-' + col}
                src="/POTATO/potato rain.png"
                alt="rain"
                style={{
                  position: 'absolute',
                  left: x,
                  top: y,
                  width: tileSize,
                  height: tileSize,
                  opacity: 0.38,
                  filter: 'drop-shadow(0 2px 8px #4fc3f7cc)',
                  userSelect: 'none',
                  pointerEvents: 'none',
                  mixBlendMode: darkMode ? 'screen' : 'multiply',
                }}
                draggable={false}
              />
            );
          })
        )}
      </div>
    );
  };

  // --- Weather dialog animation state (moved to App scope) ---
  const [weatherDialogAnimatedIn, setWeatherDialogAnimatedIn] = React.useState(false);

  // --- Weather dialog (iOS Weather app style) ---
  // Remove the default .inventory-dialog pop-in animation for weather dialog
  const WeatherDialog = React.useCallback(({ hasAnimatedIn, setHasAnimatedIn }: { hasAnimatedIn: boolean, setHasAnimatedIn: (v: boolean) => void }) => {
    const isRaining = weather === 'rain' && rainDaysLeft > 0;
    const willRain = rainForecast.duration > 0;
    React.useEffect(() => {
      if (!hasAnimatedIn) {
        const timer = setTimeout(() => setHasAnimatedIn(true), 400);
        return () => clearTimeout(timer);
      }
    }, [hasAnimatedIn, setHasAnimatedIn]);
    // Only apply weather-dialog-animate-in, not the default pop-in
    const dialogClass = `inventory-dialog weather-dialog${!hasAnimatedIn ? ' weather-dialog-animate-in' : ''}`;
    return (
      <div className="inventory-dialog-overlay" onClick={() => setShowWeatherDialog(false)}>
        <div
          className={dialogClass}
          style={{
            animation: !hasAnimatedIn ? undefined : 'none', // prevent default pop-in after first
            maxWidth: 340,
            padding: 0,
            borderRadius: 24,
            overflow: 'hidden',
            background: isRaining
              ? 'linear-gradient(135deg, #4fc3f7 60%, #01579b 100%)'
              : willRain
              ? 'linear-gradient(135deg, #e3f2fd 60%, #90caf9 100%)'
              : 'linear-gradient(135deg, #fffde4 60%, #e3f2fd 100%)',
            color: isRaining ? '#fff' : '#23293a',
            boxShadow: '0 8px 36px #4a90e255',
            transition: 'box-shadow 0.3s',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{padding: '1.5em 1.2em 1.2em 1.2em', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <button className="close-btn" onClick={() => setShowWeatherDialog(false)} style={{position:'absolute',top:10,right:10,background:'#fff3',color:'#23293a',fontWeight:700}}>&times;</button>
            <div style={{fontSize: '2.8em', margin: '0.2em 0 0.1em 0'}}>{isRaining ? '🌧️' : willRain ? '🌦️' : '☀️'}</div>
            <div style={{fontSize: '2.2em', fontWeight: 700, marginBottom: 2}}>{isRaining ? 'Rain' : willRain ? 'Rain Likely' : 'Clear'}</div>
            <div style={{fontSize: '1.1em', marginBottom: 10, opacity: 0.92}}>{isRaining ? `Raining now. ${rainDaysLeft} day${rainDaysLeft > 1 ? 's' : ''} left.` : willRain ? `Rain likely tomorrow for ${rainForecast.duration} day${rainForecast.duration > 1 ? 's' : ''}.` : 'Clear skies expected.'}</div>
            <div style={{width:'100%',margin:'1.2em 0 0.5em 0',padding:'1em',borderRadius:16,background:isRaining?'#01579b99':'#fff9',color:isRaining?'#fff':'#23293a',boxShadow:'0 2px 8px #0001',textAlign:'center'}}>
              {isRaining ? (
                <>
                  <b>Chance rain stops tomorrow:</b><br/>
                  <span style={{fontSize:'1.5em',fontWeight:700}}>{stopChance ?? '--'}%</span><br/>
                  <span style={{fontSize:'0.98em',opacity:0.8}}>Rain will last {rainDaysLeft} more day{rainDaysLeft > 1 ? 's' : ''} unless it stops early.</span>
                </>
              ) : (
                <>
                  <b>Chance of rain tomorrow:</b><br/>
                  <span style={{fontSize:'1.5em',fontWeight:700}}>{rainForecast.chance}%</span><br/>
                  {willRain ? (
                    <span style={{fontSize:'0.98em',opacity:0.8}}>Rain expected for {rainForecast.duration} day{rainForecast.duration > 1 ? 's' : ''}.</span>
                  ) : (
                    <span style={{fontSize:'0.98em',opacity:0.8}}>No rain expected.</span>
                  )}
                </>
              )}
            </div>
            <div style={{fontSize: '0.98em', color: isRaining?'#fff':'#888', marginTop: 8, opacity: 0.85}}>
              Rain waters all dug plots automatically.<br/>
              <span style={{fontSize:'0.93em',opacity:0.7}}>Forecast changes daily at sunrise.</span>
            </div>
          </div>
        </div>
        <style>{`
          .weather-dialog-animate-in {
            animation: weatherDialogIn 0.4s cubic-bezier(.4,1.6,.4,1) 1;
          }
          @keyframes weatherDialogIn {
            0% { opacity: 0; transform: translateY(40px) scale(0.98); }
            100% { opacity: 1; transform: none; }
          }
        `}</style>
      </div>
    );
  }, [weather, rainDaysLeft, rainForecast, stopChance, showWeatherDialog]);

  // When dialog is opened, reset animation state ONCE
  React.useEffect(() => {
    if (showWeatherDialog) {
      setWeatherDialogAnimatedIn(false);
    }
  }, [showWeatherDialog]);

  // --- Tools dropdown outside click close logic ---
  React.useEffect(() => {
    if (!showToolMenu) return;
    function handleClick(e: MouseEvent) {
      const dropdown = toolsDropdownRef.current;
      const btn = toolsBtnRef.current;
      if (
        dropdown && !dropdown.contains(e.target as Node) &&
        btn && !btn.contains(e.target as Node)
      ) {
        setShowToolMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showToolMenu]);

  return (
    <div className={`app-container${darkMode ? ' dark-mode' : ''}`}>
      {/* Rain overlay (does not block clicks) */}
      {showRainOverlay && <RainOverlay />}
      {/* Weather floating button (top right, always visible) */}
      <button
        onClick={() => setShowWeatherDialog(true)}
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 2001,
          padding: '0.7em 1.3em',
          borderRadius: 18,
          border: 'none',
          background: weather === 'rain' || rainForecast.duration > 0 ? '#4fc3f7' : '#e3f2fd',
          color: '#23293a',
          fontWeight: 700,
          fontSize: '1.15em',
          boxShadow: weather === 'rain' || rainForecast.duration > 0 ? '0 0 16px #4fc3f7aa' : '0 2px 8px #bfa76f22',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          transition: 'background 0.3s, box-shadow 0.3s',
          outline: weather === 'rain' || rainForecast.duration > 0 ? '2px solid #039be5' : undefined,
          animation: (weather === 'rain' || rainForecast.duration > 0) ? 'weatherPulse 1.2s infinite alternate' : undefined
        }}
        title="Weather forecast"
      >
        <span role="img" aria-label="weather">{weather === 'rain' || rainForecast.duration > 0 ? '🌧️' : '🌦️'}</span> Weather
      </button>
      {showWeatherDialog && (
        <WeatherDialog hasAnimatedIn={weatherDialogAnimatedIn} setHasAnimatedIn={setWeatherDialogAnimatedIn} />
      )}
      <style>{`
        @keyframes weatherPulse {
          0% { box-shadow: 0 0 16px #4fc3f7aa; }
          100% { box-shadow: 0 0 32px #4fc3f7ee; }
        }
      `}</style>
      <h1 onClick={handleTitleTap}>{title}</h1>
      <div className="status-bar">
        <div style={{ fontWeight: 'bold', fontSize: '1.1em' }}>Next day in: {timer}s</div>
        <div>Day: {day}</div>
        <div>Money: ${player.money}</div>
        <div>Potatoes in inventory: {player.potatoes}</div>
        <div>Selected Plot: {selected ? `${selected.x+1},${selected.y+1}` : 'None'}</div>
        <button onClick={() => setShowInventory(v => !v)} style={{marginLeft: 8, padding: '0.3rem 1rem', borderRadius: 5, border: 'none', background: '#ffb74d', color: '#222', cursor: 'pointer'}}>Inventory</button>
        <button
          ref={toolsBtnRef}
          onClick={handleShowToolMenu}
          style={{
            marginLeft: 8,
            padding: '0.3rem 1rem',
            borderRadius: 5,
            border: 'none',
            background: '#b3e5fc',
            color: '#222',
            cursor: 'pointer',
            fontWeight: 700,
            position: 'relative',
            zIndex: 2100
          }}
        >
          🛠️ Tools
        </button>
        {/* Tools dropdown menu, styled for light/dark mode and floats next to the button */}
        {showToolMenu && toolMenuPos && (
          <div
            id="tools-dropdown-menu"
            ref={toolsDropdownRef}
            style={{
              position: 'absolute',
              top: toolMenuPos.top,
              left: toolMenuPos.left,
              background: darkMode ? '#23293a' : '#fff',
              color: darkMode ? '#ffe082' : '#23293a',
              border: darkMode ? '1.5px solid #4fc3f7' : '1.5px solid #b3e5fc',
              borderRadius: 14,
              boxShadow: darkMode ? '0 6px 32px #000a' : '0 6px 32px #4fc3f733',
              minWidth: 210,
              padding: '0.7em 0.2em 0.7em 0.2em',
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
              zIndex: 3001,
              animation: `${showToolMenu ? 'dropdownFadeIn' : 'dropdownFadeOut'} 0.22s cubic-bezier(.4,1.6,.4,1)`,
              transition: 'opacity 0.22s cubic-bezier(.4,1.6,.4,1), transform 0.22s cubic-bezier(.4,1.6,.4,1)',
              opacity: showToolMenu ? 1 : 0,
              transform: showToolMenu ? 'translateY(0)' : 'translateY(-10px)'
            }}
            tabIndex={-1}
          >
            <button onClick={()=>{setSelectedTool('dig'); if (isMobile) setShowToolMenu(false);}} style={{padding:'0.7em 1.2em',border:'none',background:selectedTool==='dig'?(darkMode?'#ffd54f22':'#ffd54f'):'transparent',fontWeight:700,textAlign:'left',cursor:'pointer',color:darkMode?'#ffe082':'#23293a',borderRadius:8}}>Dig</button>
            <button onClick={()=>{setSelectedTool('sow'); if (isMobile) setShowToolMenu(false);}} style={{padding:'0.7em 1.2em',border:'none',background:selectedTool==='sow'?(darkMode?'#ffd54f22':'#ffd54f'):'transparent',fontWeight:700,textAlign:'left',cursor:'pointer',color:darkMode?'#ffe082':'#23293a',borderRadius:8}}>Sow</button>
            <button onClick={()=>{setSelectedTool('water'); if (isMobile) setShowToolMenu(false);}} style={{padding:'0.7em 1.2em',border:'none',background:selectedTool==='water'?(darkMode?'#ffd54f22':'#ffd54f'):'transparent',fontWeight:700,textAlign:'left',cursor:'pointer',color:darkMode?'#ffe082':'#23293a',borderRadius:8}}>Water</button>
            <button onClick={()=>{setSelectedTool('fertilize'); if (isMobile) setShowToolMenu(false);}} style={{padding:'0.7em 1.2em',border:'none',background:selectedTool==='fertilize'?(darkMode?'#ffd54f22':'#ffd54f'):'transparent',fontWeight:700,textAlign:'left',cursor:'pointer',color:darkMode?'#ffe082':'#23293a',borderRadius:8}}>Fertilize</button>
            <button onClick={()=>{setSelectedTool('harvest'); if (isMobile) setShowToolMenu(false);}} style={{padding:'0.7em 1.2em',border:'none',background:selectedTool==='harvest'?(darkMode?'#ffd54f22':'#ffd54f'):'transparent',fontWeight:700,textAlign:'left',cursor:'pointer',color:darkMode?'#ffe082':'#23293a',borderRadius:8}}>Harvest</button>
            <button onClick={()=>{setSelectedTool('trowel'); if (isMobile) setShowToolMenu(false);}} style={{padding:'0.7em 1.2em',border:'none',background:selectedTool==='trowel'?(darkMode?'#ffd54f22':'#ffd54f'):'transparent',fontWeight:700,textAlign:'left',cursor:'pointer',color:darkMode?'#ffe082':'#23293a',borderRadius:8}}>Trowel</button>
            <button onClick={()=>{nextDay(); if (isMobile) setShowToolMenu(false);}} style={{padding:'0.7em 1.2em',border:'none',background:darkMode?'#aed58122':'#aed581',fontWeight:700,textAlign:'left',cursor:'pointer',color:darkMode?'#fffde4':'#23293a',borderRadius:8,marginTop:4}}>Next Day</button>
          </div>
        )}
        <button onClick={() => setShowShop(v => !v)} style={{marginLeft: 8, padding: '0.3rem 1rem', borderRadius: 5, border: 'none', background: '#8bc34a', color: '#222', cursor: 'pointer'}}>Shop</button>
        <button onClick={saveGame} style={{marginLeft: 8, padding: '0.3rem 1rem', borderRadius: 5, border: 'none', background: '#ffd54f', color: '#222', cursor: 'pointer'}}>Save</button>
        <button onClick={() => setDarkMode(d => !d)} style={{marginLeft: 8, padding: '0.3rem 1rem', borderRadius: 5, border: 'none', background: darkMode ? '#23293a' : '#fffbe7', color: darkMode ? '#ffe082' : '#23293a', cursor: 'pointer', fontWeight: 700}} title="Toggle light/dark mode">{darkMode ? '☀️ Light' : '🌙 Dark'}</button>
        <button onClick={() => setShowHelp(true)} style={{marginLeft: 8, padding: '0.3rem 1rem', borderRadius: 5, border: 'none', background: '#90caf9', color: '#222', cursor: 'pointer', fontWeight: 700}}>Help</button>
      </div>
      {/* Event log now appears between tools and field */}
      <div className={`event-log${eventLog ? ' visible' : ''}${eventLog ? ' ' + eventLog.type : ''}`}>{eventLog?.msg}</div>
      {/* Developer Console (hidden, appears on aquacheese) */}
      {showDevConsole && (
        <div className="dev-console-overlay" onClick={() => setShowDevConsole(false)}>
          <div className="dev-console" onClick={e => e.stopPropagation()}>
            <div className="dev-console-header">Potato Dev Console <span style={{float:'right',cursor:'pointer'}} onClick={()=>setShowDevConsole(false)}>&times;</span></div>
            <div className="dev-console-body">
              <div className="dev-console-log">
                {devConsoleLog.length === 0 ? <div style={{color:'#888'}}>Type 'help' for commands.</div> : devConsoleLog.map((line,i)=>(<div key={i}>{line}</div>))}
              </div>
              <form onSubmit={e=>{e.preventDefault();handleDevConsoleCommand(devConsoleInput);setDevConsoleInput('');}}>
                <input autoFocus className="dev-console-input" value={devConsoleInput} onChange={e=>setDevConsoleInput(e.target.value)} placeholder="Enter command..." />
              </form>
            </div>
          </div>
        </div>
      )}
      {showHelp && (
        <div className="inventory-dialog-overlay" onClick={() => setShowHelp(false)}>
          <div className="inventory-dialog" onClick={e => e.stopPropagation()} style={{maxWidth: 600, textAlign: 'left', maxHeight: '80vh', overflowY: 'auto'}}>
            <button className="close-btn" onClick={() => setShowHelp(false)}>&times;</button>
            <h2>How to Play</h2>
            <div style={{fontSize: '1.08em', lineHeight: 1.7}}>
              <b>Welcome to Potato Farming!</b><br/><br/>
              <b>Goal:</b> Grow, harvest, and sell potatoes to expand your farm and become a potato tycoon.<br/><br/>
              <b>Game Mechanics:</b><br/>
              <ul style={{marginLeft: 18}}>
                <li><b>Tools:</b> Click the <b>🛠️ Tools</b> button in the status bar to open the tool menu. Select a tool, then click a plot to use it. Tools include Dig, Sow Seeds, Water, Fertilize, Harvest, Trowel, and Next Day.</li>
                <li><b>Dig:</b> Use the shovel to dig empty plots before sowing seeds.</li>
                <li><b>Sow Seeds:</b> Plant potato seeds in dug plots. You need seeds (buy in shop).</li>
                <li><b>Water:</b> Water sown potatoes daily to keep them alive. If unwatered for 3 days, they die. <b>Irrigation upgrade</b> will water all plots automatically each day.</li>
                <li><b>Fertilize:</b> Fertilizer (buy in shop) makes potatoes grow faster. <b>Fertilizer System upgrade</b> makes all crops grow faster automatically.</li>
                <li><b>Harvest:</b> When a potato is mature (🥔🥔), harvest it to collect potatoes. <b>Tractor upgrade</b> will harvest all mature potatoes for you at the start of each day.</li>
                <li><b>Trowel:</b> Use the trowel (buy in shop) to remove dead plants (💀). Trowels have limited durability.</li>
                <li><b>Next Day:</b> Advances the day. Plants grow, water decreases, and unwatered plants may die.</li>
                <li><b>Shop:</b> Buy seeds, fertilizer, field expansions, rename your farm, trowels, and <b>upgrades</b> (Irrigation, Fertilizer System, Tractor).</li>
                <li><b>Inventory:</b> View your potatoes, seeds, fertilizer, trowel durability, and owned upgrades.</li>
                <li><b>Selling:</b> Sell all harvested potatoes from the inventory for money.</li>
                <li><b>Expanding:</b> Buy plot extensions to increase your field size (up to 12x12).</li>
                <li><b>Reset Progress:</b> Permanently erases your save and restarts the game.</li>
                <li><b>Light/Dark Mode:</b> Toggle the color theme for comfort.</li>
                <li><b>Developer Console:</b> (Secret) Type "aquacheese" (desktop) or tap the title 7 times (mobile) for cheats.</li>
              </ul>
              <b>Upgrades:</b>
              <ul style={{marginLeft: 18}}>
                <li><b>Irrigation:</b> Waters all sown, non-dead plots automatically each day.</li>
                <li><b>Fertilizer System:</b> All crops grow faster (growth time halved).</li>
                <li><b>Tractor:</b> Auto-harvests all mature potatoes at the start of each day.</li>
              </ul>
              <b>Tips:</b>
              <ul style={{marginLeft: 18}}>
                <li>Keep potatoes watered every day! (Or buy irrigation.)</li>
                <li>Fertilizer and the Fertilizer System make crops grow faster.</li>
                <li>Dead plants must be removed with a trowel before reusing the plot.</li>
                <li>Expand your field to grow more potatoes and earn more money.</li>
                <li>Use the shop to buy more seeds, fertilizer, tools, and upgrades as you earn money.</li>
                <li>Keyboard shortcuts: Ctrl+S to save, I for inventory, O for shop, N for next day, 1-5/T for tools.</li>
              </ul>
              <b>Have fun farming!</b>
            </div>
          </div>
        </div>
      )}
      <div className="field-grid">
        {Array(fieldSize).fill(null).map((_, y) => (
          <div className="field-row" key={y}>
            {Array(fieldSize).fill(null).map((_, x) => {
              const plot = field.grid[y] && field.grid[y][x] ? field.grid[y][x] : { isDug: false, isSown: false, water: 0, fertilizer: 0, stage: 'empty' as const, daysSinceWater: 0, days: 0 };
              return (
                <div
                  key={x}
                  className={`plot${selected && selected.x === x && selected.y === y ? ' selected' : ''} ${plot.isDug ? 'dug' : ''} ${plot.isSown ? 'sown' : ''} stage-${plot.stage}`}
                  onClick={() => handlePlotClick(x, y)}
                  style={{ position: 'relative' }}
                >
                  {plot.stage === 'empty' && ''}
                  {plot.stage === 'sprout' && '🌱'}
                  {plot.stage === 'growing' && '🥔'}
                  {plot.stage === 'mature' && '🥔🥔'}
                  {plot.stage === 'dead' && '💀'}
                  {/* Show water drops if watered, or warning if dry */}
                  {plot.isDug && plot.stage !== 'empty' && plot.stage !== 'dead' && (
                    <span style={{
                      position: 'absolute',
                      left: 2,
                      bottom: 2,
                      fontSize: '1.1em',
                      opacity: 0.85
                    }}>
                      {plot.water > 0 ? '💧'.repeat(Math.min(plot.water, 3)) : <span style={{color:'#c62828'}}>!</span>}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {showShop && (
        <div className="inventory-dialog-overlay" onClick={() => setShowShop(false)}>
          <div className="inventory-dialog" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowShop(false)}>&times;</button>
            <h2>Shop</h2>
            <div style={{marginBottom: 8}}>Money: ${player.money}</div>
            <button onClick={() => buyItem('fertilizer')} style={{margin: 4, padding: '0.5rem 1.2rem', fontSize: '1rem', borderRadius: 5, border: 'none', background: '#b3e5fc', color: '#222', cursor: 'pointer'}}>Buy Fertilizer ($10)</button>
            <button onClick={() => buyItem('seeds')} style={{margin: 4, padding: '0.5rem 1.2rem', fontSize: '1rem', borderRadius: 5, border: 'none', background: '#ffe082', color: '#222', cursor: 'pointer'}}>Buy Seeds ($8)</button>
            <button onClick={() => buyItem('plot')} style={{margin: 4, padding: '0.5rem 1.2rem', fontSize: '1rem', borderRadius: 5, border: 'none', background: '#c8e6c9', color: '#222', cursor: 'pointer'}}>Buy Plot Extension ($200)</button>
            <button onClick={() => buyItem('rename')} style={{margin: 4, padding: '0.5rem 1.2rem', fontSize: '1rem', borderRadius: 5, border: 'none', background: '#ffd54f', color: '#222', cursor: 'pointer'}}>Rename Farm ($5000)</button>
            <button onClick={() => buyItem('trowel')} style={{margin: 4, padding: '0.5rem 1.2rem', fontSize: '1rem', borderRadius: 5, border: 'none', background: '#bdbdbd', color: '#222', cursor: 'pointer', fontWeight: 700}}>Buy Trowel ($2500)</button>
            <div style={{marginTop: 18, marginBottom: 6, fontWeight: 600, color: '#795548'}}>Upgrades</div>
            <button onClick={() => buyUpgrade('irrigation')} disabled={upgrades.irrigation} style={{margin: 4, padding: '0.5rem 1.2rem', fontSize: '1rem', borderRadius: 5, border: 'none', background: upgrades.irrigation ? '#bdbdbd' : '#4fc3f7', color: '#222', cursor: upgrades.irrigation ? 'not-allowed' : 'pointer', fontWeight: 700}}>Irrigation (${UPGRADE_COSTS.irrigation}) {upgrades.irrigation ? '✓' : ''}</button>
            <button onClick={() => buyUpgrade('fertilizer')} disabled={upgrades.fertilizer} style={{margin: 4, padding: '0.5rem 1.2rem', fontSize: '1rem', borderRadius: 5, border: 'none', background: upgrades.fertilizer ? '#bdbdbd' : '#aed581', color: '#222', cursor: upgrades.fertilizer ? 'not-allowed' : 'pointer', fontWeight: 700}}>Fertilizer System (${UPGRADE_COSTS.fertilizer}) {upgrades.fertilizer ? '✓' : ''}</button>
            <button onClick={() => buyUpgrade('tractor')} disabled={upgrades.tractor} style={{margin: 4, padding: '0.5rem 1.2rem', fontSize: '1rem', borderRadius: 5, border: 'none', background: upgrades.tractor ? '#bdbdbd' : '#ffb74d', color: '#222', cursor: upgrades.tractor ? 'not-allowed' : 'pointer', fontWeight: 700}}>Tractor (${UPGRADE_COSTS.tractor}) {upgrades.tractor ? '✓' : ''}</button>
            <div style={{marginTop: 12, fontSize: '0.95em', color: '#888'}}>Max field size: {MAX_FIELD_SIZE}x{MAX_FIELD_SIZE}</div>
          </div>
        </div>
      )}
      {showRenameDialog && (
        <div className="inventory-dialog-overlay" onClick={() => setShowRenameDialog(false)}>
          <div className="inventory-dialog" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowRenameDialog(false)}>&times;</button>
            <h2>Rename Your Farm</h2>
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              maxLength={32}
              style={{ fontSize: '1.1em', padding: '0.5em', borderRadius: 6, border: '1px solid #bfa76f', width: '90%', marginBottom: 12 }}
              placeholder="Enter new farm name"
            />
            <button onClick={handleRename} style={{ marginTop: 8, padding: '0.5rem 1.2rem', fontSize: '1rem', borderRadius: 5, border: 'none', background: '#ffd54f', color: '#222', cursor: 'pointer' }}>Confirm Rename (-$1500)</button>
          </div>
        </div>
      )}
      {showInventory && (
        <div className="inventory-dialog-overlay" onClick={() => setShowInventory(false)}>
          <div className="inventory-dialog" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowInventory(false)}>&times;</button>
            <h2>Inventory</h2>
            <div>Potatoes: {player.potatoes}</div>
            <div>Seeds: {player.seeds}</div>
            <div>Fertilizer: {player.fertilizer}</div>
            {player.trowel && player.trowel.durability > 0 && (
              <div style={{marginTop: 10, marginBottom: 10}}>
                <div style={{fontWeight: 600, color: '#795548', marginBottom: 4}}>Trowel</div>
                <div className="trowel-bar">
                  <div className="trowel-bar-inner" style={{width: `${(player.trowel.durability/TROWEL_MAX_DURABILITY)*100}%`, background: player.trowel.durability > 3 ? 'linear-gradient(90deg,#4caf50 60%,#ffeb3b 100%)' : 'linear-gradient(90deg,#e57373 60%,#ffeb3b 100%)'}}></div>
                  <span className="trowel-bar-label">{player.trowel.durability} / {TROWEL_MAX_DURABILITY}</span>
                </div>
              </div>
            )}
            <div style={{marginTop: 12, fontWeight: 600, color: '#795548'}}>Upgrades Owned:</div>
            <ul style={{margin: 0, padding: '0 0 0 18px', color: '#333', fontSize: '1em'}}>
              {upgrades.irrigation && <li>Irrigation (auto-waters daily)</li>}
              {upgrades.fertilizer && <li>Fertilizer System (all crops grow faster)</li>}
              {upgrades.tractor && <li>Tractor (auto-harvests mature potatoes)</li>}
              {!upgrades.irrigation && !upgrades.fertilizer && !upgrades.tractor && <li>None</li>}
            </ul>
            <button onClick={sellPotatoes} style={{ marginTop: 8, padding: '0.5rem 1.2rem', fontSize: '1rem', borderRadius: 5, border: 'none', background: '#ffb74d', color: '#222', cursor: 'pointer' }}>Sell All Potatoes (${Number(player.potatoes) * 15})</button>
          </div>
        </div>
      )}
      {/* RESET PROGRESS BUTTON */}
      <button
        className="reset-btn"
        onClick={() => {
          if (window.confirm('Are you sure you want to RESET ALL PROGRESS? This cannot be undone!')) {
            localStorage.removeItem('potato-farm-save');
            window.location.reload();
          }
        }}
      >
        RESET PROGRESS
      </button>
      {showDebug && debugInfo}
    </div>
  );
}

// Utility to detect mobile (if not already defined)
const isMobile = typeof window !== 'undefined' && (
  /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent) ||
  (window.matchMedia && window.matchMedia('(max-width: 800px)').matches)
);

export default App;

