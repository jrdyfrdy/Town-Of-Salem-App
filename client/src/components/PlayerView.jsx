import React, { useState, useEffect } from 'react';
import ChatBox from './ChatBox';

export default function PlayerView({ gameState, timeLeft, socket, messages }) { 
  const { phase, dayCount, players, me } = gameState;
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [actionConfirmed, setActionConfirmed] = useState(false);

  // Reset selections when phase changes
  useEffect(() => {
    setSelectedTarget(null);
    setActionConfirmed(false);
  }, [phase]);

  const handleAction = () => {
    if (selectedTarget && phase === 'NIGHT') {
      socket.emit('submit_night_action', selectedTarget);
      setActionConfirmed(true);
    } else if (selectedTarget && phase === 'DAY_VOTING') {
      socket.emit('submit_day_vote', selectedTarget);
      setActionConfirmed(true);
    }
  };

  const handleSendMessage = (text) => {
    socket.emit('chat_message', text);
  };

  // Convert exact phase into readable format
  const formatPhase = (p) => {
    if (!p) return 'Waiting...';
    return p.replace('_', ' ');
  };

  return (
    <div className="flex flex-col min-h-screen p-4 md:p-8 bg-gray-900 text-white gap-6">
      
      {/* HEADER: Phase & Timer */}
      <div className="text-center bg-gray-800 p-4 rounded-xl shadow-lg border-2 border-gray-700 relative overflow-hidden">
        {phase === 'NIGHT' && <div className="absolute inset-0 bg-blue-900 opacity-20 pointer-events-none"></div>}
        {phase === 'DAY_VOTING' && <div className="absolute inset-0 bg-red-900 opacity-10 pointer-events-none"></div>}
        
        <h1 className="text-3xl font-extrabold uppercase tracking-widest relative z-10">
          {formatPhase(phase)} {dayCount > 0 && <span className="text-gray-400 text-xl ml-2">| Day {dayCount}</span>}
        </h1>
        <p className={`text-5xl font-mono mt-2 relative z-10 ${timeLeft <= 10 && phase !== 'LOBBY' ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>
          {timeLeft > 0 ? `${timeLeft}s` : '00s'}
        </p>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6">
        
        {/* LEFT PANEL: Role Card */}
        <div className="lg:w-1/4 bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 h-fit">
          <h2 className="text-xl font-bold mb-4 border-b border-gray-600 pb-2 flex items-center gap-2">
             Profile Card
          </h2>
          <div className="bg-gray-900 p-4 rounded-lg text-center shadow-inner">
            <h3 className="text-sm text-gray-400 uppercase tracking-widest mb-1">Your Role</h3>
            <p className="text-3xl text-indigo-400 font-bold mb-4">{me?.role || '???'} </p>
          </div>
          
          <div className="mt-4 space-y-3">
            <div className="flex justify-between bg-gray-700 p-3 rounded">
              <span className="text-gray-400">Status</span>
              <span className={`font-bold ${me?.isAlive ? 'text-green-400' : 'text-red-500 line-through'}`}>
                {me?.isAlive ? 'Alive' : 'DEAD'}
              </span>
            </div>
            
            {me?.isBlackmailed && (
               <div className="bg-red-900 text-red-200 border border-red-500 p-3 rounded text-sm text-center font-bold">
                 SILENCED (Blackmailed)
               </div>
            )}
          </div>
        </div>

        {/* CENTER PANEL: Chat & Logs */}
        <div className="flex-1 h-[600px] lg:h-auto">
          <ChatBox 
            messages={messages} 
            onSendMessage={handleSendMessage} 
            phase={phase} 
            isBlackmailed={me?.isBlackmailed} 
            isDead={!me?.isAlive} 
          />
        </div>

        {/* RIGHT PANEL: Interaction & Graveyard */}
        <div className="lg:w-1/4 bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 flex flex-col">
          <h2 className="text-xl font-bold mb-4 border-b border-gray-600 pb-2">Town Roster</h2>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {players.filter(p => p.username !== 'Admin/Mod').map(p => {
              const isSelected = selectedTarget === p.id;
              const isSelf = p.id === me?.id;
              
              // Only allow selection if phase is interaction phase, target is alive, and we are alive
              const canSelect = me?.isAlive && p.isAlive && (phase === 'NIGHT' || phase === 'DAY_VOTING') && !actionConfirmed;

              return (
                <div 
                  key={p.id} 
                  className={`p-3 rounded-lg flex justify-between items-center transition-all ${
                     !p.isAlive 
                       ? 'bg-gray-900 opacity-50' 
                       : isSelected 
                         ? 'bg-blue-600 shadow-md ring-2 ring-blue-400' 
                         : canSelect
                           ? 'bg-gray-700 hover:bg-gray-600 cursor-pointer'
                           : 'bg-gray-700'
                  }`}
                  onClick={() => canSelect && setSelectedTarget(p.id)}
                >
                  <span className={`font-semibold ${!p.isAlive ? 'line-through text-gray-500' : ''}`}>
                    {p.username} {isSelf && '(You)'}
                  </span>
                  {!p.isAlive && <span className="text-xs text-red-500 font-bold uppercase">Dead</span>}
                </div>
              );
            })}
          </div>

          {/* Action Button Area */}
          {(phase === 'NIGHT' || phase === 'DAY_VOTING') && me?.isAlive ? (
            actionConfirmed ? (
              <div className="w-full mt-6 bg-green-900 bg-opacity-40 text-green-400 py-3 rounded-lg font-bold text-center border border-green-600 shadow-inner flex items-center justify-center gap-2 tracking-widest">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                ACTION CONFIRMED
              </div>
            ) : (
              <button 
                className="w-full mt-6 bg-red-600 hover:bg-red-500 py-3 rounded-lg font-bold text-lg transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
                disabled={!selectedTarget}
                onClick={handleAction}
              >
                {phase === 'NIGHT' ? 'Confirm Night Action' : 'Vote to Execute'}
              </button>
            )
          ) : (
             <div className="w-full mt-6 bg-gray-900 py-3 rounded-lg font-semibold text-gray-500 tracking-widest text-center border border-gray-700">
               {me?.isAlive ? 'NO ACTION REQUIRED' : 'YOU ARE DEAD'}
             </div>
          )}
        </div>

      </div>
    </div>
  );
}