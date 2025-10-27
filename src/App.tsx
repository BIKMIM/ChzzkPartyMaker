import { useEffect, useRef, useState } from 'react'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './App.css'

// --- Asset Imports --- (실제 파일 경로 확인 필요)
import wowDeathKnight from '@/assets/deathknight.png'
import wowDemonHunter from '@/assets/demon_hunter.png'
import wowDruid from '@/assets/druid.png'
import wowEvoker from '@/assets/evoker.png'
import wowHunter from '@/assets/hunter.png'
import wowMage from '@/assets/mage.png'
import wowMonk from '@/assets/monk.png'
import wowPaladin from '@/assets/paladin.png'
import wowPriest from '@/assets/priest.png'
import wowRogue from '@/assets/rogue.png'
import wowShaman from '@/assets/shaman.png'
import wowWarlock from '@/assets/warlock.png'
import wowWarrior from '@/assets/warrior.png'

// --- Interface Definitions ---
interface ChzzkMessageBody { profile: string; extras: string; msg: string; msgTime: number }
interface ChzzkProfile { userRoleCode: string; nickname: string }
interface ChzzkData { cmd: number; bdy?: ChzzkMessageBody[] }

// 역할 타입을 명확하게 정의
type Role = '탱커' | '딜러' | '힐러';

interface Member {
  class: string;
  nick: string;
  role: Role; // Role 타입 사용
  job: string;
  selected: boolean;
}
interface WoWJobs { specificity: string; role: Role } // Role 타입 사용
interface WoWClasses { class: string; image: string; color: string; jobs: WoWJobs[] }
interface MatchedWoWData { class: string; image: string; color: string; specificity: string; role: Role } // Role 타입 사용

// --- Main App Component ---
function App() {
  // --- State Variables ---
  const [members, setMembers] = useState<Member[]>([])
  const [isShow, setIsShow] = useState<boolean>(false)
  const [isRolling, setIsRolling] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [roleFilter, setRoleFilter] = useState({ tank: true, healer: true, dealer: true }); // 역할 필터

  // --- Refs ---
  const socketRef = useRef<WebSocket | null>(null)
  const isManualCloseRef = useRef(false)

  // --- WoW Class Data ---
  const wowClasses: WoWClasses[] = [
    { class: '전사', image: wowWarrior, color: '#C79C6E', jobs: [ { specificity: '무기', role: '딜러' }, { specificity: '분노', role: '딜러' }, { specificity: '방어', role: '탱커' } ] },
    { class: '성기사', image: wowPaladin, color: '#F58CBA', jobs: [ { specificity: '보호', role: '탱커' }, { specificity: '징벌', role: '딜러' }, { specificity: '신기', role: '힐러' } ] },
    { class: '죽음의기사', image: wowDeathKnight, color: '#C41F3B', jobs: [ { specificity: '혈기', role: '탱커' }, { specificity: '냉죽', role: '딜러' }, { specificity: '부정', role: '딜러' } ] },
    { class: '주술사', image: wowShaman, color: '#0070DE', jobs: [ { specificity: '정기', role: '딜러' }, { specificity: '고양', role: '딜러' }, { specificity: '복원', role: '힐러' } ] },
    { class: '사냥꾼', image: wowHunter, color: '#ABD473', jobs: [ { specificity: '야수', role: '딜러' }, { specificity: '사격', role: '딜러' }, { specificity: '생존', role: '딜러' } ] },
    { class: '도적', image: wowRogue, color: '#FFF569', jobs: [ { specificity: '암살', role: '딜러' }, { specificity: '무법', role: '딜러' }, { specificity: '잠행', role: '딜러' } ] },
    { class: '기원사', image: wowEvoker, color: '#33937F', jobs: [ { specificity: '황폐', role: '딜러' }, { specificity: '보존', role: '힐러' }, { specificity: '증강', role: '딜러' } ] },
    { class: '악마사냥꾼', image: wowDemonHunter, color: '#A330C9', jobs: [ { specificity: '복수', role: '탱커' }, { specificity: '파멸', role: '딜러' } ] },
    { class: '수도사', image: wowMonk, color: '#00FF96', jobs: [ { specificity: '양조', role: '탱커' }, { specificity: '풍운', role: '딜러' }, { specificity: '운무', role: '힐러' } ] },
    { class: '마법사', image: wowMage, color: '#69CCF0', jobs: [ { specificity: '냉법', role: '딜러' }, { specificity: '화염', role: '딜러' }, { specificity: '비전', role: '딜러' } ] },
    { class: '흑마법사', image: wowWarlock, color: '#9482C9', jobs: [ { specificity: '악마', role: '딜러' }, { specificity: '파괴', role: '딜러' }, { specificity: '고통', role: '딜러' } ] },
    { class: '사제', image: wowPriest, color: '#FFFFFF', jobs: [ { specificity: '수양', role: '힐러' }, { specificity: '신사', role: '힐러' }, { specificity: '암흑', role: '딜러' } ] },
    { class: '드루이드', image: wowDruid, color: '#FF7D0A', jobs: [ { specificity: '조화', role: '딜러' }, { specificity: '야성', role: '딜러' }, { specificity: '수호', role: '탱커' }, { specificity: '회복', role: '힐러' } ] }
  ];

  // --- Helper Function ---
  const findWoWClassBySpecificity = (msg: string): MatchedWoWData | null => {
    const searchTerm = msg.toLowerCase();
    for (const classData of wowClasses) {
      const matchedJob = classData.jobs.find(job => job.specificity === searchTerm);
      if (matchedJob) return {
          class: classData.class, image: classData.image, color: classData.color,
          specificity: matchedJob.specificity, role: matchedJob.role
      };
    }
    return null;
  };

  // --- WebSocket Message Handler ---
  const checkMessage = (role: string, nick: string, msg: string) => {
    // Show UI command
    if (role === 'streamer' && msg === '파티') {
      setIsShow(true);
      return; // Stop further processing for this command
    }
    // Cancel command
    if (msg === '취소') {
      setMembers((prev) => prev.filter((m) => !(m.nick === nick && !m.selected)));
      return; // Stop further processing
    }
    // Apply (Job/Spec) command
    const matchedData = findWoWClassBySpecificity(msg);
    if (matchedData) {
      setMembers((prev) => {
        const existingIndex = prev.findIndex(member => member.nick === nick);
        // Add new member if not found
        if (existingIndex === -1) {
          return [...prev, { nick, class: matchedData.class, role: matchedData.role, job: matchedData.specificity, selected: false }];
        }
        // Update existing member only if not already selected
        if (!prev[existingIndex].selected) {
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], class: matchedData.class, role: matchedData.role, job: matchedData.specificity };
          return updated;
        }
        // If already selected, do nothing
        return prev;
      });
    }
    // Ignore messages that are not commands or job names
  };


  // --- WebSocket Connection Logic ---
  const connectWebSocket = () => {
    // Prevent multiple connections
    if (socketRef.current && socketRef.current.readyState < 2) { // 0 = Connecting, 1 = Open
        console.log("WebSocket already connected or connecting.");
        return;
    }

    const ssID = Math.floor(Math.random() * 10) + 1;
    const serverUrl = `wss://kr-ss${ssID}.chat.naver.com/chat`;
    console.log(`Connecting to WebSocket: ${serverUrl}`);
    const socket = new WebSocket(serverUrl);
    socketRef.current = socket;
    isManualCloseRef.current = false; // Reset manual close flag on new connection attempt

    socket.addEventListener('open', () => {
      console.log('WebSocket connected.');
      const params = new URLSearchParams(window.location.search);
      const chatChannelID = params.get('chzzk');
      if (!chatChannelID) {
          console.error("chzzk 채널 ID가 URL 파라미터에 없습니다.");
          toast.error("chzzk 채널 ID가 URL에 없습니다!");
          // Consider closing the socket if channel ID is missing? Or just let it idle.
          // socket.close(); // Example: Close if ID is mandatory
          return;
      }
      console.log(`Sending join message for channel ID: ${chatChannelID}`);
      socket.send(JSON.stringify({ ver: '2', cmd: 100, svcid: 'game', cid: chatChannelID, bdy: { devType: 2001, auth: 'READ' }, tid: 1 }));
      // Send initial keep-alive ping immediately after connect
      socket.send(JSON.stringify({ ver: '2', cmd: 10000 }));
    });

    socket.addEventListener('message', (event) => {
      try {
          // console.log('WebSocket message received:', event.data); // For debugging
          const data: ChzzkData = JSON.parse(event.data);

          // Handle chat messages (cmd 93101)
          if (data.cmd === 93101 && data.bdy && Array.isArray(data.bdy)) {
              data.bdy.forEach(body => {
                  try {
                      if (typeof body.profile === 'string') {
                          const profile: ChzzkProfile = JSON.parse(body.profile);
                          // console.log(`Processing message from ${profile.nickname}: ${body.msg}`); // For debugging
                          checkMessage(profile.userRoleCode, profile.nickname, body.msg);
                      } else { console.warn("Received chat body with non-string profile:", body); }
                  } catch (e) { console.error("Error parsing chat profile JSON:", body.profile, e); }
              });
          }
          // Handle server ping response (cmd 0) - Send pong
          else if (data.cmd === 0) {
              // console.log("Received server ping (cmd 0), sending pong (cmd 10000)"); // For debugging
              socket.send(JSON.stringify({ ver: '2', cmd: 10000 }));
          }
          // Handle connection success confirmation (cmd 10100) - Maybe do nothing? Or confirm state.
          else if (data.cmd === 10100) {
              console.log("WebSocket connection confirmed by server (cmd 10100).");
          }
          // Handle other commands if necessary
          // else { console.log("Received unhandled cmd:", data.cmd); }

      } catch (e) {
          console.error("Error parsing WebSocket message:", event.data, e);
      }
    });

    socket.addEventListener('close', (event) => {
        console.log(`WebSocket closed: Code=${event.code}, Reason=${event.reason}, Manual=${isManualCloseRef.current}`);
        // Clear the ref if the socket is closed
        if (socketRef.current === socket) {
            socketRef.current = null;
        }
        // Attempt to reconnect only if it wasn't a manual close and not already reconnecting
        if (!isManualCloseRef.current) {
            console.log('Attempting to reconnect WebSocket in 5 seconds...');
            setTimeout(connectWebSocket, 5000); // Reconnect after 5 seconds
        }
    });

    socket.addEventListener('error', (error) => {
        console.error('WebSocket Error:', error);
        toast.error('채팅 서버 연결 오류 발생!');
        // Ensure socket is closed on error before attempting reconnect
        if (socketRef.current === socket) {
             socketRef.current?.close(); // Trigger close event listener
        }
        // The close listener will handle the reconnection attempt if not manual
    });
  };


  // --- Rollup Animation Logic ---
  const rollupAnimation = (targetMembers: Member[]) => {
    if (!Array.isArray(targetMembers) || targetMembers.length === 0) {
        toast.warn('선택 가능한 멤버가 없습니다');
        setIsRolling(false); return;
    }
    setIsRolling(true);
    let counter = 0;
    const interval = setInterval(() => {
        if (targetMembers.length === 0) { // Safety check inside interval
             clearInterval(interval); setIsRolling(false);
             toast.error("룰렛 오류: 대상 멤버 없음"); return;
        }
        const randomIndex = Math.floor(Math.random() * targetMembers.length);
        if (targetMembers[randomIndex]) {
            setSelectedMember(targetMembers[randomIndex]);
        } else {
            console.error("Animation Error: Index out of bounds?", randomIndex, targetMembers);
             clearInterval(interval); setIsRolling(false);
             toast.error("룰렛 멤버 선택 오류"); return;
        }
        counter++;

        // End condition for animation
        if (counter > 20) {
            clearInterval(interval);
            if (targetMembers.length === 0) { // Final safety check
                 setIsRolling(false); toast.error("최종 선택 오류: 대상 멤버 없음"); return;
            }
            const finalIndex = Math.floor(Math.random() * targetMembers.length);
             if (targetMembers[finalIndex]) {
                const selected = targetMembers[finalIndex];
                setSelectedMember(selected); // Keep showing final member

                // Update the members list after a delay
                setTimeout(() => {
                  setMembers((prev) => {
                    // 1. Mark the selected member
                    let updatedMembers = prev.map((m) =>
                      m.nick === selected.nick ? { ...m, selected: true } : m
                    );
                    // 2. Filter out other waiting members of the same critical role
                    if (selected.role === '탱커') {
                      updatedMembers = updatedMembers.filter(m => m.selected || m.role !== '탱커');
                    } else if (selected.role === '힐러') {
                      updatedMembers = updatedMembers.filter(m => m.selected || m.role !== '힐러');
                    }
                    return updatedMembers; // Return the final list
                  });
                  setIsRolling(false); // Stop rolling state
                  setSelectedMember(null); // Clear the displayed member in animation
                }, 1000); // Delay matches animation visibility
            } else {
                 console.error("Final Selection Error: Index out of bounds?", finalIndex, targetMembers);
                 setIsRolling(false); toast.error("최종 멤버 선택 오류");
            }
        }
    }, 100); // Animation frame speed
  };


  // --- Random Selection Button Handler ---
  const handleRandomAll = () => {
    const selectedParty = members.filter(m => m.selected);
    const hasTank = selectedParty.some(m => m.role === '탱커');
    const hasHealer = selectedParty.some(m => m.role === '힐러');
    const available = members.filter(m => !m.selected);

    // Filter available members based on roles needed and checkboxes
    const targetMembers = available.filter(m => {
      // Exclude already filled roles
      if (hasTank && m.role === '탱커') return false;
      if (hasHealer && m.role === '힐러') return false;
      // Include based on checkbox state
      if (roleFilter.tank && m.role === '탱커') return true;
      if (roleFilter.healer && m.role === '힐러') return true;
      if (roleFilter.dealer && m.role === '딜러') return true;
      return false; // Exclude if checkbox is unchecked for the role
    });

    // Validate the result before animating
    if (!Array.isArray(targetMembers)) {
        console.error("Error: targetMembers is not an array after filtering", targetMembers);
        toast.error("멤버 필터링 오류"); return;
    }

    if (targetMembers.length === 0) {
      // Provide more specific feedback
      const availableFilteredByCheckboxOnly = available.filter(m =>
        (roleFilter.tank && m.role === '탱커') ||
        (roleFilter.healer && m.role === '힐러') ||
        (roleFilter.dealer && m.role === '딜러')
      );
      if (availableFilteredByCheckboxOnly.length === 0) {
        toast.warn('선택한 역할의 대기 멤버가 없습니다!');
      } else {
        toast.warn('현재 파티 구성에 맞는 역할의 대기 멤버가 없습니다!');
      }
      return; // Stop if no members to choose from
    }

    // Start the animation
    rollupAnimation(targetMembers);
  };


  // --- Effect Hook for WebSocket connection ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('chzzk')) {
        connectWebSocket(); // Connect on mount if channel ID is present
    } else {
        toast.info("URL에 ?chzzk=채널ID 를 추가해주세요.");
    }

    // Cleanup function: close socket connection when component unmounts
    const handleBeforeUnload = () => { isManualCloseRef.current = true; socketRef.current?.close(); };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      isManualCloseRef.current = true; // Ensure reconnect doesn't happen on unmount
      socketRef.current?.close();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []); // Empty dependency array means run once on mount

  // --- JSX Rendering ---
  return (
    <>
      <ToastContainer position="top-center" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="dark" />

      {/* Main UI (Only render if isShow is true) */}
      {isShow && (
        <div className="w-[950px] h-[800px] bg-black bg-opacity-80 border border-gray-600 flex flex-row rounded-2xl overflow-hidden shadow-2xl">

          {/* Rolling Animation Overlay */}
          {isRolling && selectedMember && (
            <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
              <div className="bg-white p-8 rounded-2xl shadow-2xl animate-bounce">
                <div className="text-4xl font-bold text-center mb-4">🎀</div>
                <div className="text-2xl text-lime-400 font-bold mb-2">{selectedMember.nick}</div>
                <div className="text-lg text-gray-600">{selectedMember.job}</div>
                <div className="text-lg text-gray-600">{selectedMember.role}</div>
              </div>
            </div>
          )}

          {/* Left Area (Waiting List + Selected Party) */}
          <div className="flex flex-col flex-grow border-r border-gray-700">

            {/* Top Section: Waiting Members (2/3 height) */}
            <div className="h-2/3 overflow-y-auto p-3 bg-gray-900 bg-opacity-50 border-b border-gray-700">
              <div className="grid grid-cols-5 gap-1.5">
                {[...members].reverse().filter(member => !member.selected).map((member, index) => {
                  const classImage = wowClasses.find(c => c.class === member.class)?.image;
                  // Unique key using nick and index
                  return (
                    <div key={`${member.nick}-${index}`} className="group h-12 w-full [perspective:1000px]">
                      <div className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                        {/* Front of Waiting Card */}
                        <div
                          className="absolute inset-0 border border-gray-600 p-1.5 rounded bg-gray-800 bg-opacity-80 [backface-visibility:hidden] flex items-center justify-end"
                          style={{
                            backgroundImage: classImage ? `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(${classImage})` : 'none',
                            backgroundSize: '24px 24px', backgroundPosition: '4px center', backgroundRepeat: 'no-repeat'
                          }}>
                          <div className="text-right ml-8 overflow-hidden whitespace-nowrap"> {/* Prevent text overflow */}
                            <span className="text-[10px] text-gray-300">{member.role}</span>
                            <span className="text-[10px] text-gray-300 mx-0.5">|</span>
                            <span className="text-[10px] text-gray-400 truncate">{member.job}</span> {/* Truncate long job names */}
                            <div className="font-semibold text-[11px] text-white leading-tight mt-0.5 truncate">{member.nick}</div> {/* Truncate long names */}
                          </div>
                        </div>
                        {/* Back of Waiting Card */}
                        <div className="absolute inset-0 border border-gray-400 rounded bg-gray-100 [backface-visibility:hidden] [transform:rotateY(180deg)] flex items-center justify-center gap-1">
                          {/* Pass Button */}
                          <button onClick={() => setMembers(prev => prev.map(m => m.nick === member.nick ? { ...m, selected: true } : m))} className="px-1.5 py-0.5 bg-green-500 text-white text-[10px] rounded hover:bg-green-600">패스</button>
                          {/* Cancel Button */}
                          <button onClick={() => setMembers(prev => prev.filter(m => m.nick !== member.nick))} className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded hover:bg-red-600">취소</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div> {/* End Top Section */}

            {/* Bottom Section: Selected Members (1/3 height) */}
            <div className="h-1/3 overflow-y-auto p-4 bg-gray-800 bg-opacity-30 flex items-center">
              <div className="flex flex-row gap-4">
                {members
                  .filter(member => member.selected)
                  .sort((a, b) => { const order = { '탱커': 0, '딜러': 1, '힐러': 2 } as const; return order[a.role] - order[b.role]; }) // Added 'as const'
                  .map((member, index) => {
                    const classImage = wowClasses.find(c => c.class === member.class)?.image;
                    // Unique key for selected members
                    return (
                      <div key={`${member.nick}-selected-${index}`} className="group h-16 w-[100px] [perspective:1000px] flex-shrink-0">
                        <div className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                          {/* Front of Selected Card */}
                          <div
                            className="absolute inset-0 border border-gray-500 p-2 rounded-lg bg-gray-800 bg-opacity-80 [backface-visibility:hidden] flex items-center justify-end"
                            style={{
                              backgroundImage: classImage ? `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${classImage})` : 'none',
                              backgroundSize: 'contain', backgroundPosition: 'left center', backgroundRepeat: 'no-repeat'
                            }}>
                            <div className="text-right overflow-hidden whitespace-nowrap"> {/* Prevent overflow */}
                              <span className="text-xs text-gray-300">{member.role}</span>
                              <span className="text-xs text-gray-300 mx-1">|</span>
                              <span className="text-xs text-gray-400 truncate">{member.job}</span> {/* Truncate */}
                              <div className="font-semibold text-sm text-white mt-0.5 truncate">{member.nick}</div> {/* Truncate */}
                            </div>
                          </div>
                          {/* Back of Selected Card */}
                          <div className="absolute inset-0 border border-gray-400 p-2 rounded-lg bg-gray-100 [backface-visibility:hidden] [transform:rotateY(180deg)] flex items-center justify-center">
                            {/* Delete Button */}
                            <button onClick={() => setMembers(prev => prev.filter(m => m.nick !== member.nick))} className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors font-semibold">삭제</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div> {/* End Bottom Section */}

          </div> {/* End Left Area */}


          {/* Right Area (Controls - 350px width) */}
          <div className="w-[350px] h-[800px] p-4 overflow-y-auto bg-gray-900 bg-opacity-50 flex flex-col">
            {/* How to Apply */}
            <div className="mb-4 flex-shrink-0"> {/* Prevent shrinking */}
              <h3 className="font-bold text-lg mb-2 text-white">신청 방법</h3>
              <p className="text-xs text-gray-300 mb-3">채팅에 자신의 특성을 입력해주세요</p>
            </div>

            {/* Class/Spec List */}
            <div className="space-y-2 mb-4 grid grid-cols-2 gap-2 flex-shrink-0"> {/* Prevent shrinking */}
              {wowClasses.map((wowClass) => (
                <div key={wowClass.class} className="hover:bg-gray-800 p-1 rounded"> {/* Removed onClick */}
                  <div className="flex items-center gap-1.5">
                    <img src={wowClass.image} alt={wowClass.class} className="w-5 h-5 rounded-md flex-shrink-0" /> {/* Slightly smaller */}
                    <div className="flex flex-wrap gap-1"> {/* Allow specs to wrap */}
                      {wowClass.jobs.map((job) => (
                        <span key={job.specificity} className="text-[10px] px-1 py-0.5 rounded border" style={{ borderColor: wowClass.color, color: wowClass.color }}>
                          {job.specificity}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* How to Cancel */}
            <div className="mb-4 border-t border-gray-700 pt-3 flex-shrink-0"> {/* Prevent shrinking */}
              <h3 className="font-bold text-lg mb-2 text-white">취소 방법</h3>
              <p className="text-xs text-gray-300 mb-3">채팅에 <span className="text-white font-bold px-1.5 py-0.5 bg-red-900 bg-opacity-30 rounded">취소</span>를 입력해주세요</p>
            </div>

            {/* Spacer to push controls to the bottom */}
            <div className="flex-grow"></div>

            {/* Random Selection */}
            <div className="mb-4 border-t border-gray-700 pt-3 flex-shrink-0"> {/* Prevent shrinking */}
              <h3 className="font-bold text-lg mb-3 text-white">랜덤 선택</h3>
              {/* Role Checkboxes */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <label className="flex items-center space-x-2 cursor-pointer text-xs text-white bg-gray-700 px-2 py-1.5 rounded-md hover:bg-sky-700 justify-center">
                  <input type="checkbox" className="form-checkbox h-4 w-4 rounded bg-gray-800 border-gray-600 text-sky-500 focus:ring-sky-500" checked={roleFilter.tank} onChange={() => setRoleFilter(prev => ({ ...prev, tank: !prev.tank }))}/>
                  <span>탱커</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer text-xs text-white bg-gray-700 px-2 py-1.5 rounded-md hover:bg-rose-700 justify-center">
                  <input type="checkbox" className="form-checkbox h-4 w-4 rounded bg-gray-800 border-gray-600 text-rose-500 focus:ring-rose-500" checked={roleFilter.dealer} onChange={() => setRoleFilter(prev => ({ ...prev, dealer: !prev.dealer }))}/>
                  <span>딜러</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer text-xs text-white bg-gray-700 px-2 py-1.5 rounded-md hover:bg-emerald-700 justify-center">
                  <input type="checkbox" className="form-checkbox h-4 w-4 rounded bg-gray-800 border-gray-600 text-emerald-500 focus:ring-emerald-500" checked={roleFilter.healer} onChange={() => setRoleFilter(prev => ({ ...prev, healer: !prev.healer }))}/>
                  <span>힐러</span>
                </label>
              </div>
              {/* Random Button */}
              <div className="grid grid-cols-1 gap-2">
                <button onClick={handleRandomAll} disabled={isRolling} className="px-2 py-2 bg-gray-700 text-white text-xs rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed font-semibold whitespace-nowrap">
                  🎲 랜덤
                </button>
              </div>
            </div>

            {/* Close Button */}
            <div className="border-t border-gray-700 pt-3 flex-shrink-0"> {/* Prevent shrinking */}
              <button onClick={() => { setMembers([]); setSelectedMember(null); setIsShow(false); }} className="w-full px-4 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-semibold">
                🚫 종료
              </button>
            </div>
          </div> {/* End Right Area */}

        </div> // End isShow wrapper div
      )} {/* End isShow conditional rendering */}
    </>
  ); // End return
} // End App Function

export default App; // End of file
