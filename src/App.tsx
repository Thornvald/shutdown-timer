import { useState, useRef, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, useTexture, Stars } from "@react-three/drei";
import { motion } from "framer-motion";
import { Power, X, Minus, Plus, Maximize } from "lucide-react";
import "./App.css";

function Lasers({ isRunning }: { isRunning: boolean }) {
  const groupRef = useRef<any>(null);
  
  const lasers = useMemo(() => Array.from({ length: 30 }).map(() => ({
    position: [
      (Math.random() - 0.5) * 30,
      (Math.random() - 0.5) * 30,
      (Math.random() - 0.5) * 50 - 20
    ],
    speed: Math.random() * 40 + 40,
    color: Math.random() > 0.5 ? "#ef4444" : "#22c55e"
  })), []);

  useFrame((_, delta) => {
    if (isRunning && groupRef.current) {
      groupRef.current.children.forEach((child: any, i: number) => {
        child.position.z += lasers[i].speed * delta;
        if (child.position.z > 20) {
          child.position.z = -50;
          child.position.x = (Math.random() - 0.5) * 30;
          child.position.y = (Math.random() - 0.5) * 30;
        }
      });
    }
  });

  if (!isRunning) return null;

  return (
    <group ref={groupRef}>
      {lasers.map((laser, i) => (
        <mesh key={i} position={laser.position as [number, number, number]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 6, 8]} />
          <meshBasicMaterial color={laser.color} />
        </mesh>
      ))}
    </group>
  );
}

function Globe({ isRunning }: { isRunning: boolean }) {
  const globeRef = useRef<any>(null);
  const colorMap = useTexture("/earth.jpg");

  useFrame(({ clock }) => {
    if (globeRef.current) {
      globeRef.current.rotation.y = clock.getElapsedTime() * (isRunning ? 0.3 : 0.05);
      globeRef.current.rotation.x = 0.2; // slight tilt like Earth
    }
  });

  return (
    <>
      <Stars radius={50} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
      <Lasers isRunning={isRunning} />
      <group ref={globeRef} scale={1.8}>
        <Sphere args={[1.5, 64, 64]}>
          <meshStandardMaterial 
            map={colorMap}
            color={isRunning ? "#ff8888" : "#ffffff"} 
            roughness={0.6}
            metalness={0.1}
          />
        </Sphere>
        {/* Light glow shell */}
        <Sphere args={[1.52, 32, 32]}>
          <meshBasicMaterial 
            color={isRunning ? "#ef4444" : "#3b82f6"} 
            transparent
            opacity={isRunning ? 0.15 : 0.05}
            blending={2} 
          />
        </Sphere>
      </group>
    </>
  );
}

function formatTime(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function App() {
  const [minutes, setMinutes] = useState(30);
  const [isRunning, setIsRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (isRunning && secondsLeft === 0) {
      setIsRunning(false);
      setMsg("Timer finished.");
    }
    return () => clearInterval(interval);
  }, [isRunning, secondsLeft]);

  const handleStart = async () => {
    // Set UI state immediately for responsiveness
    setSecondsLeft(minutes * 60);
    setIsRunning(true);
    setMsg(`Starting timer for ${minutes} minutes...`);

    try {
      const res = await invoke("set_shutdown_timer", { minutes });
      setMsg(res as string);
    } catch (e) {
      setMsg(e as string);
      setIsRunning(false);
      setSecondsLeft(0);
    }
  };

  const handleCancel = async () => {
    // Set UI state immediately
    setIsRunning(false);
    setSecondsLeft(0);
    setMsg("Canceling timer...");

    try {
      const res = await invoke("cancel_shutdown_timer");
      setMsg(res as string);
    } catch (e) {
      setMsg(e as string);
    }
  };

  const closeWindow = async () => {
    await invoke("exit_app");
  };

  const toggleMaximize = async () => {
    const win = getCurrentWindow();
    if (await win.isMaximized()) {
      await win.unmaximize();
    } else {
      await win.maximize();
    }
  };

  return (
    <div className="relative w-screen h-screen rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800/80 shadow-2xl flex flex-col transition-all">
      {/* Drag Region */}
      <div data-tauri-drag-region className="absolute top-0 left-0 w-[calc(100%-100px)] h-10 z-40 cursor-move" />

      {/* Window Controls */}
      <div className="absolute top-0 right-0 w-[100px] h-10 z-50 flex items-center justify-end px-4 space-x-2 pointer-events-auto">
        <button 
          onClick={toggleMaximize} 
          className="text-zinc-500 hover:text-zinc-200 transition-colors p-1 rounded-full hover:bg-zinc-800/50"
        >
          <Maximize size={16} />
        </button>
        <button 
          onClick={closeWindow} 
          className="text-zinc-500 hover:text-zinc-200 transition-colors p-1 rounded-full hover:bg-zinc-800/50"
        >
          <X size={18} />
        </button>
      </div>

      {/* 3D Background */}
      <div className="absolute inset-0 z-0 opacity-80 pointer-events-none">
        <Canvas>
          <ambientLight intensity={1.5} />
          <directionalLight position={[10, 10, 5]} intensity={2.5} />
          <directionalLight position={[-10, -5, -5]} intensity={0.5} color="#444" />
          <Globe isRunning={isRunning} />
        </Canvas>
      </div>

      {/* Content */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 bg-black/30 pointer-events-none">
        
        <h1 className="text-xl font-bold tracking-[0.2em] text-white/90 mb-10 drop-shadow-md mt-6">
          {isRunning ? "COUNTDOWN" : "SLEEP"}
        </h1>

        <div className="flex-1 flex flex-col items-center justify-center w-full pointer-events-auto">
          {!isRunning ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-8"
            >
              <div className="flex items-center gap-6 bg-zinc-900/60 p-4 rounded-full border border-zinc-700/50 backdrop-blur-md shadow-lg">
                <button 
                  onClick={() => setMinutes(Math.max(1, minutes - 5))}
                  className="p-3 bg-zinc-800/50 hover:bg-zinc-700 rounded-full transition-colors text-zinc-300 hover:text-white"
                >
                  <Minus size={20} />
                </button>
                
                <div className="w-24 text-center">
                  <span className="text-6xl font-light text-white tracking-tighter">{minutes}</span>
                  <span className="text-[10px] text-zinc-400 block mt-1 tracking-widest font-medium">MINUTES</span>
                </div>

                <button 
                  onClick={() => setMinutes(minutes + 5)}
                  className="p-3 bg-zinc-800/50 hover:bg-zinc-700 rounded-full transition-colors text-zinc-300 hover:text-white"
                >
                  <Plus size={20} />
                </button>
              </div>

              <button 
                onClick={handleStart}
                className="mt-2 flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white px-8 py-3.5 rounded-full font-medium transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(59,130,246,0.4)]"
              >
                <Power size={18} />
                Start Timer
              </button>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-10"
            >
              <div className="text-center font-mono">
                <span className="text-6xl font-light text-red-400 tracking-tighter drop-shadow-[0_0_20px_rgba(248,113,113,0.5)]">
                  {formatTime(secondsLeft)}
                </span>
                <span className="text-xs text-red-200/80 block mt-3 tracking-[0.2em] font-sans font-medium">
                  TIME REMAINING
                </span>
              </div>

              <button 
                onClick={handleCancel}
                className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-200 px-8 py-3 rounded-full font-medium transition-all hover:scale-105 active:scale-95"
              >
                <X size={18} />
                Cancel
              </button>
            </motion.div>
          )}
        </div>

        <div className="h-10 flex items-center justify-center w-full">
          {msg && (
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[11px] text-zinc-400 bg-zinc-900/90 px-4 py-1.5 rounded-full backdrop-blur-md border border-zinc-800 shadow-lg text-center"
            >
              {msg}
            </motion.p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
