
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  GameState, 
  Bullet, 
  Enemy, 
  Particle, 
  Star, 
  Entity 
} from './types';
import { 
  MAX_LEVEL, 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  SHORT_ROMANTIC_PHRASES, 
  ENEMY_SOURCES,
  PLAYER_SOURCE,
  LOVE_MESSAGES
} from './constants';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [currentMessage, setCurrentMessage] = useState("");

  // Usamos refs para la lógica del motor para evitar problemas de cierres (closures)
  const stateRef = useRef<GameState>('menu');
  const levelRef = useRef(1);

  const gameData = useRef({
    player: { x: 175, y: 600, w: 50, h: 50, speed: 8 } as Entity,
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    particles: [] as Particle[],
    stars: [] as Star[],
    spawnTimer: 0,
    enemiesNeeded: 0,
    shootCooldown: 0,
    keys: { left: false, right: false, fire: false },
    images: {
      player: new Image(),
      enemies: [] as HTMLImageElement[]
    }
  });

  // Inicialización de recursos
  useEffect(() => {
    const { images } = gameData.current;
    images.player.src = PLAYER_SOURCE;
    
    images.enemies = [];
    ENEMY_SOURCES.forEach((src) => {
      const img = new Image();
      img.src = src;
      images.enemies.push(img);
    });

    if (gameData.current.stars.length === 0) {
      for (let i = 0; i < 80; i++) {
        gameData.current.stars.push({
          x: Math.random() * CANVAS_WIDTH,
          y: Math.random() * CANVAS_HEIGHT,
          speed: Math.random() * 2 + 0.5,
          size: Math.random() * 2 + 1
        });
      }
    }
  }, []);

  // Sincronizar refs con el estado de React
  useEffect(() => {
    stateRef.current = gameState;
    levelRef.current = level;
  }, [gameState, level]);

  const drawHeart = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, fillColor = '#ff69b4', strokeColor = '#ff1493') => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 25, size / 25);
    ctx.beginPath();
    ctx.moveTo(12.5, 2);
    ctx.bezierCurveTo(12.5, -5, 6, -12, 0, -7);
    ctx.bezierCurveTo(-6, -12, -12.5, -5, -12.5, 2);
    ctx.bezierCurveTo(-12.5, 12, -5, 20, 0, 18);
    ctx.bezierCurveTo(5, 20, 12.5, 12, 12.5, 2);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
  };

  const createParticles = (x: number, y: number, num = 12) => {
    for (let i = 0; i < num; i++) {
      gameData.current.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 35,
        size: 8 + Math.random() * 8
      });
    }
  };

  const spawnEnemy = () => {
    const curLevel = levelRef.current;
    const startX = 30 + Math.random() * (CANVAS_WIDTH - 80);
    let enemySpeed = 1.2 + (curLevel * 0.4);

    gameData.current.enemies.push({
      x: startX,
      y: -60,
      vx: 0,
      vy: enemySpeed,
      time: Math.random() * Math.PI * 2,
      size: 55,
      imgIndex: (curLevel - 1) % ENEMY_SOURCES.length
    });
  };

  const update = useCallback(() => {
    if (stateRef.current !== 'playing') return;

    const { player, bullets, enemies, particles, stars, keys } = gameData.current;

    if (keys.left) player.x = Math.max(0, player.x - player.speed);
    if (keys.right) player.x = Math.min(CANVAS_WIDTH - player.w, player.x + player.speed);

    if (gameData.current.shootCooldown > 0) gameData.current.shootCooldown--;
    if (keys.fire && gameData.current.shootCooldown === 0) {
      bullets.push({ x: player.x + player.w / 2 - 10, y: player.y, vy: -15, size: 22 });
      gameData.current.shootCooldown = 12;
    }

    if (gameData.current.enemiesNeeded > 0) {
      gameData.current.spawnTimer--;
      if (gameData.current.spawnTimer <= 0) {
        spawnEnemy();
        gameData.current.enemiesNeeded--;
        gameData.current.spawnTimer = Math.max(20, 50 - levelRef.current * 5);
      }
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
      bullets[i].y += bullets[i].vy;
      if (bullets[i].y < -50) bullets.splice(i, 1);
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.time += 0.08;
      e.x += Math.sin(e.time) * 1.5;
      e.y += e.vy;
      
      if (e.y > CANVAS_HEIGHT) {
        enemies.splice(i, 1);
        setLives(l => {
          if (l <= 1) { setGameState('gameOver'); return 0; }
          return l - 1;
        });
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    stars.forEach(s => {
      s.y += s.speed;
      if (s.y > CANVAS_HEIGHT) s.y = 0;
    });

    // Colisiones
    bullets.forEach((b, bi) => {
      enemies.forEach((e, ei) => {
        const dist = Math.hypot(b.x + 11 - (e.x + e.size / 2), b.y - (e.y + e.size / 2));
        if (dist < 40) {
          createParticles(e.x + e.size / 2, e.y + e.size / 2);
          enemies.splice(ei, 1);
          bullets.splice(bi, 1);
          setScore(s => s + 100);
        }
      });
    });

    enemies.forEach((e, ei) => {
      const dist = Math.hypot(player.x + player.w / 2 - (e.x + e.size / 2), player.y + player.h / 2 - (e.y + e.size / 2));
      if (dist < 40) {
        createParticles(player.x + player.w / 2, player.y + player.h / 2, 25);
        enemies.splice(ei, 1);
        setLives(l => {
          if (l <= 1) { setGameState('gameOver'); return 0; }
          return l - 1;
        });
      }
    });

    // Finalizar nivel
    if (gameData.current.enemiesNeeded === 0 && enemies.length === 0 && stateRef.current === 'playing') {
      setCurrentMessage(LOVE_MESSAGES[(levelRef.current - 1) % LOVE_MESSAGES.length]);
      setGameState('levelComplete');
    }
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Fondo Galáctico
    const g = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    g.addColorStop(0, '#020024'); g.addColorStop(0.5, '#2d004d'); g.addColorStop(1, '#000000');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    gameData.current.stars.forEach(s => {
      ctx.fillStyle = `rgba(255, 255, 255, ${s.size / 3})`;
      ctx.fillRect(s.x, s.y, s.size, s.size);
    });

    const { player, bullets, enemies, particles, images } = gameData.current;

    particles.forEach(p => {
      ctx.save(); ctx.globalAlpha = p.life / 35;
      drawHeart(ctx, p.x, p.y, p.size, '#ff1493');
      ctx.restore();
    });

    // Dibujar Jugadora (Elizabeth)
    ctx.save();
    ctx.shadowColor = '#ff69b4'; ctx.shadowBlur = 25;
    if (images.player.complete && images.player.naturalWidth > 0) {
      ctx.drawImage(images.player, player.x, player.y, player.w, player.h);
    } else {
      drawHeart(ctx, player.x + player.w/2, player.y + player.h/2, 45, '#ffb6c1');
    }
    ctx.restore();

    bullets.forEach(b => drawHeart(ctx, b.x, b.y, b.size, '#ff00ff'));

    // Dibujar Enemigos
    enemies.forEach(e => {
      ctx.save(); ctx.shadowColor = '#ff1493'; ctx.shadowBlur = 15;
      const eImg = images.enemies[e.imgIndex];
      if (eImg && eImg.complete && eImg.naturalWidth > 0) {
        ctx.drawImage(eImg, e.x, e.y, e.size, e.size);
      } else {
        drawHeart(ctx, e.x + e.size/2, e.y + e.size/2, e.size * 0.9, '#dc143c');
      }
      ctx.restore();
    });
  }, []);

  useEffect(() => {
    let animationId: number;
    const loop = () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        update();
        draw(ctx);
      }
      animationId = requestAnimationFrame(loop);
    };
    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [update, draw]);

  // Controles de teclado
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') gameData.current.keys.left = true;
      if (e.key === 'ArrowRight') gameData.current.keys.right = true;
      if (e.key === ' ' || e.key === 'Enter') gameData.current.keys.fire = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') gameData.current.keys.left = false;
      if (e.key === 'ArrowRight') gameData.current.keys.right = false;
      if (e.key === ' ' || e.key === 'Enter') gameData.current.keys.fire = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  const resetStage = (targetLevel: number) => {
    gameData.current.enemies = [];
    gameData.current.bullets = [];
    gameData.current.particles = [];
    gameData.current.enemiesNeeded = 8 + (targetLevel * 2);
    gameData.current.spawnTimer = 30;
    gameData.current.player.x = 175;
  };

  const handleStart = () => {
    setScore(0); setLives(3); setLevel(1);
    resetStage(1);
    setGameState('playing');
  };

  const handleContinue = () => {
    if (gameState === 'levelComplete') {
      if (level >= MAX_LEVEL) {
        setGameState('win');
      } else {
        const next = level + 1;
        setLevel(next);
        resetStage(next);
        setGameState('playing');
      }
    } else {
      setGameState('menu');
    }
  };

  return (
    <div className="relative w-full h-screen bg-black flex items-center justify-center select-none overflow-hidden font-sans">
      <div className="relative border-2 border-pink-500/50 rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(255,105,180,0.3)] bg-black">
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />

        {/* HUD - Información en pantalla */}
        <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center text-white pointer-events-none z-10">
          <div className="bg-black/40 backdrop-blur-md p-3 rounded-2xl border border-pink-500/20">
            <div className="text-pink-400 font-bold text-xs uppercase tracking-widest">Nivel {level}</div>
            <div className="text-xl font-bold font-mono text-pink-100">{score.toString().padStart(5, '0')}</div>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: lives }).map((_, i) => (
              <span key={i} className="text-2xl drop-shadow-[0_0_8px_rgba(255,0,0,0.8)]">💖</span>
            ))}
          </div>
        </div>

        {/* MENÚ PRINCIPAL */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center text-center p-10 z-20">
            <h1 className="text-6xl font-romantic text-pink-500 mb-8 drop-shadow-[0_0_15px_rgba(255,105,180,0.8)]">Amor Galáctico</h1>
            <p className="text-pink-100 text-lg mb-12 italic max-w-[280px]">Mi Elizabeth, destruye las sombras con el poder de tus corazones. 🚀</p>
            <button onClick={handleStart} className="bg-pink-600 hover:bg-pink-500 text-white px-14 py-5 rounded-full text-2xl font-bold shadow-[0_0_30px_rgba(219,39,119,0.6)] active:scale-95 transition-all">Empezar 💕</button>
          </div>
        )}

        {/* PANTALLA NIVEL COMPLETADO (CARTA DE AMOR ESTÁTICA) */}
        {gameState === 'levelComplete' && (
          <div className="absolute inset-0 bg-[#1a0029] flex flex-col items-center justify-center p-8 z-30 text-center">
            <div className="w-full max-w-sm bg-black/40 border-2 border-pink-500/30 rounded-[40px] p-8 backdrop-blur-sm shadow-2xl flex flex-col items-center">
              <div className="mb-6">
                <img 
                  src={ENEMY_SOURCES[(level - 1) % ENEMY_SOURCES.length]} 
                  className="w-40 h-40 object-cover rounded-3xl border-4 border-pink-500 shadow-[0_0_25px_rgba(236,72,153,0.5)]"
                  alt="Stage Image"
                />
              </div>
              <h2 className="text-3xl font-romantic text-pink-400 mb-4 tracking-wide italic">¡Victoria, Mi Elizabeth!</h2>
              <div className="w-12 h-1 bg-pink-500/30 mb-6 rounded-full"></div>
              <p className="text-pink-50 text-lg leading-relaxed mb-10 italic">
                "{currentMessage}"
              </p>
              <button onClick={handleContinue} className="w-full bg-gradient-to-r from-pink-600 to-rose-500 text-white py-4 rounded-2xl font-bold text-xl shadow-lg active:scale-95 transition-transform uppercase tracking-wider">
                Continuar 💕
              </button>
            </div>
          </div>
        )}

        {/* VICTORIA FINAL */}
        {gameState === 'win' && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center p-10 text-center z-40">
            <h2 className="text-5xl font-romantic text-yellow-400 mb-10 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)] leading-tight">¡Reina de mi Universo, Mi Elizabeth! 👑</h2>
            <img src={PLAYER_SOURCE} className="w-64 h-64 object-cover rounded-full border-8 border-yellow-500/50 shadow-[0_0_60px_rgba(250,204,21,0.5)] mb-10" alt="Victory" />
            <p className="text-white text-xl mb-12 italic leading-relaxed">Has conquistado cada rincón de mi galaxia y de mi alma, mi Elizabeth. Eres eterna.</p>
            <button onClick={() => setGameState('menu')} className="bg-yellow-500 text-black px-16 py-4 rounded-full font-bold text-xl shadow-xl active:scale-95">Reiniciar 💕</button>
          </div>
        )}

        {/* GAME OVER */}
        {gameState === 'gameOver' && (
          <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-10 z-50 text-center">
            <h2 className="text-5xl font-romantic text-rose-500 mb-8 leading-tight">No te rindas mi Elizabeth</h2>
            <p className="text-white/70 text-lg mb-12 italic">Nuestro amor es más fuerte que cualquier caída, mi Elizabeth. ¡Vuelve a intentarlo!</p>
            <button onClick={handleStart} className="bg-white text-black px-12 py-4 rounded-full font-bold text-xl hover:bg-pink-100 active:scale-95 transition-colors shadow-2xl">Reintentar 💖</button>
          </div>
        )}
      </div>

      {/* CONTROLES MÓVILES */}
      <div className="fixed bottom-10 w-full flex justify-between px-8 md:px-40 pointer-events-none z-50">
        <div className="flex gap-4 pointer-events-auto">
          <button 
            onTouchStart={() => gameData.current.keys.left = true} 
            onTouchEnd={() => gameData.current.keys.left = false} 
            className="w-20 h-20 rounded-3xl bg-white/5 border-2 border-white/10 flex items-center justify-center text-4xl text-white backdrop-blur-xl active:bg-pink-500/40 transition-colors shadow-lg"
          >
            ←
          </button>
          <button 
            onTouchStart={() => gameData.current.keys.right = true} 
            onTouchEnd={() => gameData.current.keys.right = false} 
            className="w-20 h-20 rounded-3xl bg-white/5 border-2 border-white/10 flex items-center justify-center text-4xl text-white backdrop-blur-xl active:bg-pink-500/40 transition-colors shadow-lg"
          >
            →
          </button>
        </div>
        <button 
          onTouchStart={() => gameData.current.keys.fire = true} 
          onTouchEnd={() => gameData.current.keys.fire = false} 
          className="pointer-events-auto w-24 h-24 rounded-full bg-gradient-to-tr from-pink-600 to-rose-400 border-4 border-white/20 flex items-center justify-center text-5xl shadow-2xl active:scale-90 transition-transform"
        >
          💖
        </button>
      </div>
    </div>
  );
};

export default App;
